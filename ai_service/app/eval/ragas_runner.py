"""
Eval: RAGAS Runner
Executes RAGAS evaluation using Groq/Ollama as the evaluator LLM.
NO OpenAI dependency — fully free.

Phase 2 — Week 6 implementation.
"""

from typing import List, Dict, Any
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy
from datasets import Dataset

from langchain_groq import ChatGroq
from langchain_core.embeddings import Embeddings
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper

from app.config import settings
from app.core.embedder import embed_texts
from app.models.schemas import EvalRequest, EvalResponse


class LocalEmbeddings(Embeddings):
    """Langchain compatible embedding wrapper for our local embedder."""
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return embed_texts(texts)
    def embed_query(self, text: str) -> List[float]:
        return embed_texts([text])[0]


def get_ragas_llm():
    base_llm = None
    if settings.LLM_PROVIDER == "groq" and settings.GROQ_API_KEY:
        base_llm = ChatGroq(
            temperature=0.0,
            groq_api_key=settings.GROQ_API_KEY,
            model_name=settings.GROQ_MODEL,
        )
    else:
        # Fallback to Ollama or standard ChatOpenAI
        from langchain_community.chat_models import ChatOllama
        base_llm = ChatOllama(
            model=settings.OLLAMA_MODEL,
            base_url=settings.OLLAMA_BASE_URL,
            temperature=0.0,
        )
    return LangchainLLMWrapper(base_llm)


async def run_ragas_evaluation(request: EvalRequest) -> EvalResponse:
    """
    Run RAGAS metrics on a single question-answer-context triplet.
    """
    llm = get_ragas_llm()
    embeddings = LangchainEmbeddingsWrapper(LocalEmbeddings())

    # RAGAS metrics
    metrics = [
        faithfulness,
        answer_relevancy,
    ]

    # Initialize RAGAS metrics with our models
    for m in metrics:
        m.llm = llm
        m.embeddings = embeddings

    # Ragas expects a HuggingFace Dataset
    data = {
        "question": [request.question],
        "answer": [request.answer],
        "contexts": [request.contexts],
    }

    dataset = Dataset.from_dict(data)

    had_error = False
    try:
        result = evaluate(
            dataset,
            metrics=metrics,
            llm=llm,
            embeddings=embeddings,
            raise_exceptions=False,
        )

        scores = result.to_pandas().to_dict(orient="records")[0]
    except Exception as e:
        print(f"RAGAS evaluation failed: {e}")
        scores = {}
        had_error = True

    import math
    def clean_score(val):
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return 0.0
        return float(val)

    f_score = clean_score(scores.get("faithfulness"))
    r_score = clean_score(scores.get("answer_relevancy"))
    p_score = 0.0 # Context precision requires ground truth, we can omit it for reference-free eval.

    grade = "unknown" if had_error else get_overall_grade(f_score, r_score, p_score)

    return EvalResponse(
        faithfulness=f_score,
        answer_relevancy=r_score,
        context_precision=p_score,
        overall=grade,
        message_id=request.message_id
    )


def get_overall_grade(faithfulness: float, relevancy: float, precision: float) -> str:
    """
    Compute an overall quality grade from individual RAGAS metrics.
    Returns: "high" (avg > 0.8), "medium" (0.6–0.8), "low" (< 0.6)
    """
    # Precision is not calculated right now so we average faithfulness and relevancy
    avg = (faithfulness + relevancy) / 2
    if avg > 0.8:
        return "high"
    elif avg >= 0.6:
        return "medium"
    else:
        return "low"
