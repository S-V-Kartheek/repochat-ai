import asyncio
from types import SimpleNamespace

from app.models.schemas import QueryRequest
from app.routers import query as query_router


def test_query_repo_returns_citations_from_retrieved_chunks(monkeypatch):
    request = QueryRequest(
        repo_id="repo-1",
        session_id="sess-1",
        question="Where is login handled?",
        history=[],
        top_k=5,
    )

    monkeypatch.setattr(query_router, "build_context_aware_query", lambda q, _h: q)
    monkeypatch.setattr(query_router, "embed_query", lambda _q: [0.1, 0.2])

    async def fake_hybrid_search(**_kwargs):
        return [
            {
                "file_path": "src/auth.py",
                "start_line": 10,
                "end_line": 30,
                "content": "def login(user): return True",
                "score": 0.9,
            }
        ]

    monkeypatch.setattr(query_router, "hybrid_search", fake_hybrid_search)
    monkeypatch.setattr(
        query_router,
        "build_query_prompt",
        lambda **_kwargs: [{"role": "user", "content": "prompt"}],
    )
    monkeypatch.setattr(query_router, "get_model_name", lambda: "test-model")
    monkeypatch.setattr(query_router, "extract_follow_ups", lambda answer: (answer, []))

    class FakeCompletions:
        async def create(self, **_kwargs):
            return SimpleNamespace(
                choices=[
                    SimpleNamespace(
                        message=SimpleNamespace(
                            content="Login logic is in [src/auth.py:10-20]."
                        )
                    )
                ]
            )

    class FakeChat:
        completions = FakeCompletions()

    class FakeClient:
        chat = FakeChat()

    monkeypatch.setattr(query_router, "get_llm_client", lambda: FakeClient())

    response = asyncio.run(query_router.query_repo(request))

    assert response.model_used == "test-model"
    assert len(response.citations) == 1
    assert response.citations[0].file == "src/auth.py"
    assert response.citations[0].start_line == 10
    assert response.citations[0].end_line == 20


def test_query_repo_returns_no_context_message_when_search_empty(monkeypatch):
    request = QueryRequest(
        repo_id="repo-empty",
        session_id="sess-empty",
        question="Unknown question",
        history=[],
        top_k=5,
    )

    monkeypatch.setattr(query_router, "build_context_aware_query", lambda q, _h: q)
    monkeypatch.setattr(query_router, "embed_query", lambda _q: [0.1])

    async def fake_hybrid_search(**_kwargs):
        return []

    monkeypatch.setattr(query_router, "hybrid_search", fake_hybrid_search)
    monkeypatch.setattr(query_router, "get_model_name", lambda: "test-model")

    response = asyncio.run(query_router.query_repo(request))

    assert "couldn't find any relevant code" in response.answer.lower()
    assert response.citations == []
