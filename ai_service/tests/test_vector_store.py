import asyncio
from types import SimpleNamespace

from app.core import vector_store


def test_extract_vector_size_supports_single_and_named_configs():
    single = SimpleNamespace(size=768)
    assert vector_store._extract_vector_size(single) == 768

    named = {"default": SimpleNamespace(size=384)}
    assert vector_store._extract_vector_size(named) == 384

    unknown = SimpleNamespace(foo=1)
    assert vector_store._extract_vector_size(unknown) is None


def test_hybrid_search_maps_results_payload(monkeypatch):
    captured = {}

    class FakeClient:
        async def search(self, **kwargs):
            captured.update(kwargs)
            return [
                SimpleNamespace(
                    id="chunk-1",
                    score=0.88,
                    payload={
                        "file_path": "src/auth.py",
                        "start_line": 10,
                        "end_line": 22,
                        "content": "def login(): pass",
                        "function_names": ["login"],
                        "class_names": ["AuthService"],
                        "method_names": [],
                    },
                )
            ]

    async def fake_get_client():
        return FakeClient()

    monkeypatch.setattr(vector_store, "get_qdrant_client", fake_get_client)

    results = asyncio.run(
        vector_store.hybrid_search(
            repo_id="repo-1",
            query_vector=[0.1, 0.2],
            query_text="where is login",
            top_k=3,
        )
    )

    assert captured["collection_name"] == vector_store.COLLECTION_NAME
    assert captured["limit"] == 3
    assert results == [
        {
            "chunk_id": "chunk-1",
            "file_path": "src/auth.py",
            "start_line": 10,
            "end_line": 22,
            "content": "def login(): pass",
            "score": 0.88,
            "function_names": ["login"],
            "class_names": ["AuthService"],
            "method_names": [],
        }
    ]
