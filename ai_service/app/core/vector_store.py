"""
Core: Qdrant Vector Store Client
Manages interactions with Qdrant and provides a local in-memory fallback.
"""

from pathlib import Path
import math
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as rest
from app.config import settings
from app.core.chunker import Chunk

# ---------------------------------------------------------------------------
# Collection Config
# ---------------------------------------------------------------------------
COLLECTION_NAME = settings.QDRANT_COLLECTION
DISTANCE = rest.Distance.COSINE


def get_vector_size() -> int:
    model_name = settings.EMBEDDING_MODEL.lower()
    # Fast, no-model-load dimension mapping for common embedding models used here.
    if "nomic-embed" in model_name:
        return 768
    if "all-minilm-l6-v2" in model_name:
        return 384
    if "bge-m3" in model_name:
        return 1024
    if "bge-small" in model_name:
        return 384
    # Safe default
    return 768


def _extract_vector_size(vectors_config: object) -> int | None:
    """
    Safely extract vector size from Qdrant collection config.
    Handles both single-vector and named-vector configurations.
    """
    if vectors_config is None:
        return None

    size = getattr(vectors_config, "size", None)
    if isinstance(size, int):
        return size

    if isinstance(vectors_config, dict) and vectors_config:
        first = next(iter(vectors_config.values()))
        named_size = getattr(first, "size", None)
        if isinstance(named_size, int):
            return named_size

    return None


# ---------------------------------------------------------------------------
# Client (singleton)
# ---------------------------------------------------------------------------
_client: AsyncQdrantClient | None = None
_using_embedded_local = False
_using_in_memory_store = False
_memory_rows: list[dict] = []


def _embedded_qdrant_path() -> str:
    base = Path(__file__).resolve().parents[2] / ".qdrant_local"
    base.mkdir(parents=True, exist_ok=True)
    return str(base)


def _build_embedded_qdrant_client() -> AsyncQdrantClient:
    global _using_embedded_local
    _using_embedded_local = True
    path = _embedded_qdrant_path()
    print(f"[WARN] Falling back to embedded local Qdrant at: {path}")
    return AsyncQdrantClient(path=path)


def _is_local_qdrant_target(url: str) -> bool:
    return (
        url.startswith("http://localhost")
        or url.startswith("http://127.0.0.1")
        or url.startswith("http://qdrant")
    )


def _is_placeholder_qdrant_target(url: str) -> bool:
    lowered = url.lower()
    return (
        "your-cluster.cloud.qdrant.io" in lowered
        or "your-qdrant" in lowered
        or "<qdrant" in lowered
        or "changeme" in lowered
    )


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


async def get_qdrant_client() -> AsyncQdrantClient:
    """Lazy-initialize the Qdrant async client (singleton)."""
    global _client
    if _client is None:
        if _is_placeholder_qdrant_target(settings.QDRANT_URL):
            _client = _build_embedded_qdrant_client()
        elif _is_local_qdrant_target(settings.QDRANT_URL):
            _client = AsyncQdrantClient(url=settings.QDRANT_URL, timeout=5)
        else:
            _client = AsyncQdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY,
                timeout=10,
            )
    return _client


async def ensure_collection_exists() -> None:
    """
    Create the Qdrant collection if it doesn't exist.
    Called once at application startup.
    """
    global _client, _using_in_memory_store

    if _is_placeholder_qdrant_target(settings.QDRANT_URL):
        _using_in_memory_store = True
        print("[WARN] Using in-memory vector store fallback (placeholder QDRANT_URL).")
        return

    client = await get_qdrant_client()
    expected_size = get_vector_size()

    try:
        collections = await client.get_collections()
    except Exception as e:
        if _is_local_qdrant_target(settings.QDRANT_URL):
            print(f"[WARN] Qdrant at {settings.QDRANT_URL} unavailable ({e}).")
            try:
                _client = _build_embedded_qdrant_client()
                client = _client
                collections = await client.get_collections()
            except Exception as local_err:
                _using_in_memory_store = True
                print(f"[WARN] Embedded local Qdrant unavailable ({local_err}). Using in-memory vector store.")
                return
        else:
            raise

    if not any(c.name == COLLECTION_NAME for c in collections.collections):
        await client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=rest.VectorParams(
                size=expected_size,
                distance=DISTANCE,
            ),
        )
        await client.create_payload_index(
            COLLECTION_NAME,
            field_name="repo_id",
            field_schema=rest.PayloadSchemaType.KEYWORD,
        )
        return

    collection_info = await client.get_collection(COLLECTION_NAME)
    actual_size = _extract_vector_size(collection_info.config.params.vectors)

    if actual_size is not None and actual_size != expected_size:
        print(
            f"[WARN] Qdrant vector size mismatch for '{COLLECTION_NAME}': "
            f"existing={actual_size}, expected={expected_size}. Recreating collection."
        )
        await client.delete_collection(collection_name=COLLECTION_NAME)
        await client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=rest.VectorParams(
                size=expected_size,
                distance=DISTANCE,
            ),
        )
        await client.create_payload_index(
            COLLECTION_NAME,
            field_name="repo_id",
            field_schema=rest.PayloadSchemaType.KEYWORD,
        )


async def upsert_chunks(chunks: list[Chunk], embeddings: list[list[float]]) -> int:
    """Upsert a batch of chunks with their embeddings."""
    if not chunks:
        return 0

    if _using_in_memory_store:
        for c, emb in zip(chunks, embeddings):
            _memory_rows.append(
                {
                    "chunk_id": c.chunk_id,
                    "vector": emb,
                    "repo_id": c.repo_id,
                    "file_path": c.file_path,
                    "language": c.language,
                    "start_line": c.start_line,
                    "end_line": c.end_line,
                    "function_names": c.function_names,
                    "class_names": c.class_names,
                    "method_names": c.method_names,
                    "imports": c.imports,
                    "content": c.content,
                }
            )
        return len(chunks)

    client = await get_qdrant_client()
    points = [
        rest.PointStruct(
            id=c.chunk_id,
            vector=emb,
            payload={
                "repo_id": c.repo_id,
                "file_path": c.file_path,
                "language": c.language,
                "start_line": c.start_line,
                "end_line": c.end_line,
                "function_names": c.function_names,
                "class_names": c.class_names,
                "method_names": c.method_names,
                "imports": c.imports,
                "content": c.content,
            },
        )
        for c, emb in zip(chunks, embeddings)
    ]

    batch_size = 100
    for i in range(0, len(points), batch_size):
        await client.upsert(
            collection_name=COLLECTION_NAME,
            points=points[i:i + batch_size],
        )

    return len(points)


async def hybrid_search(
    repo_id: str,
    query_vector: list[float],
    query_text: str,
    top_k: int = 5,
) -> list[dict]:
    """Dense search with optional in-memory fallback."""
    if _using_in_memory_store:
        rows = [r for r in _memory_rows if r["repo_id"] == repo_id]
        scored = [
            {
                "chunk_id": r["chunk_id"],
                "file_path": r["file_path"],
                "start_line": r["start_line"],
                "end_line": r["end_line"],
                "content": r["content"],
                "score": _cosine_similarity(query_vector, r["vector"]),
                "function_names": r.get("function_names", []),
                "class_names": r.get("class_names", []),
                "method_names": r.get("method_names", []),
            }
            for r in rows
        ]
        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

    client = await get_qdrant_client()
    results = await client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter=rest.Filter(
            must=[
                rest.FieldCondition(
                    key="repo_id",
                    match=rest.MatchValue(value=repo_id),
                )
            ]
        ),
        limit=top_k,
        with_payload=True,
    )

    return [
        {
            "chunk_id": r.id,
            "file_path": r.payload["file_path"],
            "start_line": r.payload["start_line"],
            "end_line": r.payload["end_line"],
            "content": r.payload["content"],
            "score": r.score,
            "function_names": r.payload.get("function_names", []),
            "class_names": r.payload.get("class_names", []),
            "method_names": r.payload.get("method_names", []),
        }
        for r in results
    ]


async def delete_repo_vectors(repo_id: str) -> int:
    """Delete all vectors associated with a repo_id."""
    global _memory_rows
    if _using_in_memory_store:
        before = len(_memory_rows)
        _memory_rows = [r for r in _memory_rows if r["repo_id"] != repo_id]
        return before - len(_memory_rows)

    client = await get_qdrant_client()
    try:
        response = await client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=rest.FilterSelector(
                filter=rest.Filter(
                    must=[
                        rest.FieldCondition(
                            key="repo_id",
                            match=rest.MatchValue(value=repo_id),
                        )
                    ]
                )
            ),
        )
        return getattr(response, "points_deleted", True)
    except Exception as e:
        print(f"Error deleting vectors for {repo_id}: {e}")
        return 0


async def list_repo_chunks(repo_id: str, batch_size: int = 256) -> list[dict]:
    """Return all stored chunk payloads for a repo."""
    if _using_in_memory_store:
        return [
            {
                "repo_id": r["repo_id"],
                "file_path": r["file_path"],
                "language": r["language"],
                "start_line": r["start_line"],
                "end_line": r["end_line"],
                "function_names": r.get("function_names", []),
                "class_names": r.get("class_names", []),
                "method_names": r.get("method_names", []),
                "imports": r.get("imports", []),
                "content": r["content"],
            }
            for r in _memory_rows
            if r["repo_id"] == repo_id
        ]

    client = await get_qdrant_client()
    offset = None
    chunks: list[dict] = []

    while True:
        records, offset = await client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=rest.Filter(
                must=[
                    rest.FieldCondition(
                        key="repo_id",
                        match=rest.MatchValue(value=repo_id),
                    )
                ]
            ),
            limit=batch_size,
            with_payload=True,
            with_vectors=False,
            offset=offset,
        )

        for record in records:
            if record.payload:
                chunks.append(dict(record.payload))

        if offset is None:
            break

    return chunks
