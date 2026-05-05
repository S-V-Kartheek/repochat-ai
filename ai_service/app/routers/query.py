"""
Router: /api/v1/query
Retrieves relevant chunks from Qdrant and generates a grounded answer
via the configured LLM (Groq or Ollama).

Phase 1 — Week 2 implementation.
"""

import json
import re
from copy import deepcopy
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI, RateLimitError
from app.models.schemas import QueryRequest, QueryResponse, Citation
from app.core.embedder import embed_query
from app.core.vector_store import hybrid_search
from app.core.prompt_builder import build_query_prompt, extract_citations, extract_follow_ups, build_context_aware_query
from app.core.llm_provider import get_llm_client, get_model_name
from app.config import settings

router = APIRouter()

RETRY_AFTER_PATTERN = re.compile(r"try again in ([0-9hms\.\s]+)", re.IGNORECASE)
LOW_TOKEN_MAX_OUTPUT = 192
LOW_TOKEN_CHUNK_COUNT = 1
LOW_TOKEN_CHARS_PER_CHUNK = 500


def _compact_chunks_for_low_token_retry(chunks: list[dict]) -> list[dict]:
    compacted: list[dict] = []
    for chunk in chunks[:LOW_TOKEN_CHUNK_COUNT]:
        reduced = deepcopy(chunk)
        content = str(reduced.get("content", ""))
        reduced["content"] = content[:LOW_TOKEN_CHARS_PER_CHUNK]
        compacted.append(reduced)
    return compacted


def _rate_limit_user_message(error_text: str) -> str:
    wait = "a while"
    match = RETRY_AFTER_PATTERN.search(error_text)
    if match:
        wait = match.group(1).strip()
    return (
        "Groq usage limit reached for today. "
        f"Please try again in about {wait}. "
        "If you need immediate answers, switch LLM_PROVIDER to ollama for local fallback."
    )


async def _try_ollama_completion(
    messages: list[dict],
    *,
    stream: bool,
    temperature: float = 0.2,
    max_tokens: int = 768,
):
    # Use a short timeout so we fail fast if local Ollama isn't available.
    ollama_client = AsyncOpenAI(
        base_url=f"{settings.OLLAMA_BASE_URL}/v1",
        api_key="ollama",
        timeout=20.0,
    )
    return await ollama_client.chat.completions.create(
        model=settings.OLLAMA_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=stream,
    )


@router.post("/", response_model=QueryResponse, summary="Ask a question about a repo")
async def query_repo(request: QueryRequest):
    """
    Full RAG pipeline (non-streaming):
      1. Embed the question
      2. Retrieve top-k chunks from Qdrant
      3. Build grounding prompt
      4. Call LLM (Groq / Ollama)
      5. Extract citations
      6. Return structured response
    """
    try:
        # 1. Embed the question
        enhanced_query = build_context_aware_query(request.question, request.history)
        query_vector = embed_query(enhanced_query)

        # 2. Retrieve from Qdrant
        retrieved_chunks = await hybrid_search(
            repo_id=request.repo_id,
            query_vector=query_vector,
            query_text=request.question,
            top_k=request.top_k,
        )

        if not retrieved_chunks:
            return QueryResponse(
                answer="I couldn't find any relevant code in this repository for your question. "
                       "The repository may not have been ingested yet, or the question doesn't match any indexed code.",
                citations=[],
                session_id=request.session_id,
                model_used=get_model_name(),
            )

        # 3. Build prompt
        messages = build_query_prompt(
            question=request.question,
            retrieved_chunks=retrieved_chunks,
            conversation_history=request.history,
        )

        # 4. Call LLM (non-streaming)
        client = get_llm_client()
        model_used = get_model_name()
        used_chunks = retrieved_chunks

        try:
            response = await client.chat.completions.create(
                model=model_used,
                messages=messages,
                temperature=0.2,       # Low temp for factual, grounded answers
                max_tokens=2048,
            )
        except RateLimitError as rate_err:
            # First fallback: retry with a tiny context + output budget.
            try:
                used_chunks = _compact_chunks_for_low_token_retry(retrieved_chunks)
                low_token_messages = build_query_prompt(
                    question=request.question,
                    retrieved_chunks=used_chunks,
                    conversation_history=request.history,
                )
                response = await client.chat.completions.create(
                    model=model_used,
                    messages=low_token_messages,
                    temperature=0.2,
                    max_tokens=LOW_TOKEN_MAX_OUTPUT,
                )
            except RateLimitError:
                # Second fallback: try Ollama if available.
                try:
                    response = await _try_ollama_completion(
                        messages=messages,
                        stream=False,
                        temperature=0.2,
                        max_tokens=768,
                    )
                    model_used = f"{settings.OLLAMA_MODEL} (ollama-fallback)"
                except Exception:
                    return QueryResponse(
                        answer=_rate_limit_user_message(str(rate_err)),
                        citations=[],
                        session_id=request.session_id,
                        model_used=f"{get_model_name()} (rate-limited)",
                    )

        raw_answer = response.choices[0].message.content or ""
        if not raw_answer.strip():
            raw_answer = "I could not generate a complete answer for this question. Please try rephrasing and ask again."

        # 5. Extract follow-ups and clean answer
        answer, follow_ups = extract_follow_ups(raw_answer)

        # 6. Extract citations
        raw_citations = extract_citations(answer, used_chunks)
        citations = [
            Citation(
                file=c["file"],
                start_line=c["start_line"],
                end_line=c["end_line"],
                snippet=c["snippet"],
                score=c["score"],
            )
            for c in raw_citations
        ]

        return QueryResponse(
            answer=answer,
            citations=citations,
            session_id=request.session_id,
            model_used=model_used,
            follow_ups=follow_ups,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query pipeline error: {str(e)}")


@router.post("/stream", summary="Ask with streaming SSE response")
async def query_repo_stream(request: QueryRequest):
    """
    Same RAG pipeline but streams the LLM response token-by-token as SSE.
    The Node gateway forwards this stream directly to the frontend.

    SSE format:
      data: {"token": "The"}\n\n
      data: {"token": " authenticate"}\n\n
      data: {"done": true, "citations": [...]}\n\n
    """

    async def event_generator():
        try:
            # 1. Embed
            enhanced_query = build_context_aware_query(request.question, request.history)
            query_vector = embed_query(enhanced_query)

            # 2. Retrieve
            retrieved_chunks = await hybrid_search(
                repo_id=request.repo_id,
                query_vector=query_vector,
                query_text=request.question,
                top_k=request.top_k,
            )

            if not retrieved_chunks:
                no_result_msg = "I couldn't find any relevant code in this repository for your question."
                yield f"data: {json.dumps({'token': no_result_msg})}\n\n"
                yield f"data: {json.dumps({'done': True, 'citations': [], 'session_id': request.session_id})}\n\n"
                return

            # 3. Build prompt
            messages = build_query_prompt(
                question=request.question,
                retrieved_chunks=retrieved_chunks,
                conversation_history=request.history,
            )

            # 4. Stream from LLM
            client = get_llm_client()
            model_used = get_model_name()
            used_chunks = retrieved_chunks

            try:
                stream = await client.chat.completions.create(
                    model=model_used,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=2048,
                    stream=True,
                )
            except RateLimitError as rate_err:
                # First fallback: retry with tiny token budget.
                try:
                    used_chunks = _compact_chunks_for_low_token_retry(retrieved_chunks)
                    low_token_messages = build_query_prompt(
                        question=request.question,
                        retrieved_chunks=used_chunks,
                        conversation_history=request.history,
                    )
                    stream = await client.chat.completions.create(
                        model=model_used,
                        messages=low_token_messages,
                        temperature=0.2,
                        max_tokens=LOW_TOKEN_MAX_OUTPUT,
                        stream=True,
                    )
                except RateLimitError:
                    # Second fallback: Ollama local.
                    try:
                        stream = await _try_ollama_completion(
                            messages=messages,
                            stream=True,
                            temperature=0.2,
                            max_tokens=768,
                        )
                        model_used = f"{settings.OLLAMA_MODEL} (ollama-fallback)"
                    except Exception:
                        message = _rate_limit_user_message(str(rate_err))
                        yield f"data: {json.dumps({'token': message})}\n\n"
                        yield f"data: {json.dumps({'done': True, 'citations': [], 'session_id': request.session_id, 'model_used': f'{get_model_name()} (rate-limited)'})}\n\n"
                        return

            full_answer = ""
            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    token = delta.content
                    full_answer += token
                    yield f"data: {json.dumps({'token': token})}\n\n"

            if not full_answer.strip():
                full_answer = "I could not generate a complete answer for this question. Please try rephrasing and ask again."
                yield f"data: {json.dumps({'token': full_answer})}\n\n"

            # 5. Extract follow-ups and clean answer
            clean_answer, follow_ups = extract_follow_ups(full_answer)

            # 6. Extract citations after full answer is assembled
            raw_citations = extract_citations(clean_answer, used_chunks)
            citations_payload = [
                {
                    "file": c["file"],
                    "start_line": c["start_line"],
                    "end_line": c["end_line"],
                    "snippet": c["snippet"],
                    "score": c["score"],
                }
                for c in raw_citations
            ]

            # Final SSE event with citations and follow-up suggestions
            yield f"data: {json.dumps({'done': True, 'citations': citations_payload, 'session_id': request.session_id, 'model_used': model_used, 'follow_ups': follow_ups})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering for Render
        },
    )
