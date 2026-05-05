"""
Core: Embedding Module
Runs local embeddings via sentence-transformers.
"""

from sentence_transformers import SentenceTransformer
from app.config import settings

# Model is loaded once at startup (singleton pattern to avoid repeated loading)
_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    """
    Lazy-loads the embedding model on first call.
    Subsequent calls return the cached instance.
    """
    global _model
    if _model is None:
        import torch

        device = settings.EMBEDDING_DEVICE
        if device == "cuda" and not torch.cuda.is_available():
            print("[WARN] CUDA requested but not available. Falling back to CPU for embeddings.")
            device = "cpu"

        # Primary model
        primary_model = settings.EMBEDDING_MODEL
        # Fallback model (very reliable, small, typically no trust_remote_code)
        fallback_model = "all-MiniLM-L6-v2"

        try:
            print(f"Loading primary embedding model: {primary_model}...")
            _model = SentenceTransformer(primary_model, device=device, trust_remote_code=True)
        except Exception as e:
            print(f"[WARN] Failed to load primary model '{primary_model}'. Error: {e}")
            print(f"[WARN] Falling back to alternative model: {fallback_model}...")
            try:
                _model = SentenceTransformer(fallback_model, device=device)
            except Exception as fallback_e:
                print(f"[ERROR] Failed to load fallback model '{fallback_model}'. Error: {fallback_e}")
                raise RuntimeError(
                    "Could not load any embedding models. "
                    f"Primary error: {e}, Fallback error: {fallback_e}"
                )

    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Encode a list of text strings into embedding vectors."""
    if not texts:
        return []
    model = get_embedding_model()
    prefixed_texts = [f"search_document: {t}" for t in texts]
    embeddings = model.encode(prefixed_texts, normalize_embeddings=True)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """Encode a single query string for retrieval."""
    model = get_embedding_model()
    prefixed_query = f"search_query: {query}"
    return model.encode([prefixed_query], normalize_embeddings=True)[0].tolist()