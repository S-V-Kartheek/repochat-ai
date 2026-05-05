import asyncio
from pathlib import Path
from types import SimpleNamespace

from app.routers import ingest


def test_run_ingestion_pipeline_success_updates_progress(monkeypatch, tmp_path: Path):
    repo_id = "repo-success"
    ingest.INGEST_STATUS[repo_id] = {
        "status": "pending",
        "current_stage": "Queued",
        "total_chunks": 0,
        "embedded_chunks": 0,
        "progress_pct": 0.0,
    }

    file_path = tmp_path / "src.py"
    file_path.write_text("print('ok')\n", encoding="utf-8")

    monkeypatch.setattr(ingest.repo_cloner, "clone_repo", lambda *_: tmp_path)
    monkeypatch.setattr(
        ingest.repo_cloner,
        "get_repo_files",
        lambda *_args, **_kwargs: [Path("src.py")],
    )
    monkeypatch.setattr(ingest.ast_parser, "parse_file", lambda *_: {"ok": True})

    fake_chunk = SimpleNamespace(
        content="print('ok')",
        chunk_id="chunk-1",
        repo_id=repo_id,
        file_path="src.py",
        language="python",
        start_line=1,
        end_line=1,
        function_names=[],
        class_names=[],
        method_names=[],
        imports=[],
    )
    monkeypatch.setattr(ingest.chunker, "chunk_file", lambda *_: [fake_chunk])
    monkeypatch.setattr(ingest.vector_store, "ensure_collection_exists", lambda: asyncio.sleep(0))
    monkeypatch.setattr(ingest.vector_store, "upsert_chunks", lambda *_: asyncio.sleep(0))
    monkeypatch.setattr(ingest.embedder, "embed_texts", lambda texts: [[0.1] for _ in texts])

    async def fake_to_thread(func, *args, **kwargs):
        return func(*args, **kwargs)

    monkeypatch.setattr(asyncio, "to_thread", fake_to_thread)

    asyncio.run(ingest.run_ingestion_pipeline(repo_id, "https://example.com/repo", ["python"]))

    status = ingest.INGEST_STATUS[repo_id]
    assert status["status"] == "done"
    assert status["embedded_chunks"] == 1
    assert status["progress_pct"] == 100.0


def test_run_ingestion_pipeline_sets_error_state_on_failure(monkeypatch):
    repo_id = "repo-error"
    ingest.INGEST_STATUS[repo_id] = {
        "status": "pending",
        "current_stage": "Queued",
        "total_chunks": 0,
        "embedded_chunks": 0,
        "progress_pct": 0.0,
    }

    def raise_clone(*_args, **_kwargs):
        raise RuntimeError("clone failed")

    monkeypatch.setattr(ingest.repo_cloner, "clone_repo", raise_clone)

    asyncio.run(ingest.run_ingestion_pipeline(repo_id, "https://example.com/repo", ["python"]))

    status = ingest.INGEST_STATUS[repo_id]
    assert status["status"] == "error"
    assert status["current_stage"] == "Failed"
    assert "clone failed" in status["error"]
