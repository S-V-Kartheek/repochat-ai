"""
Core: Embedding Module
Runs nomic-embed-code-v1 locally via sentence-transformers.
No API calls, no usage costs — runs on CPU or GPU.

Phase 1 — Week 1 implementation.
"""

from sentence_transformers import SentenceTransformer
from app.config import settings

# Model is loaded once at startup (singleton pattern to avoid repeated loading)
_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    """
    Lazy-loads the embedding model on first call.
    Subsequent calls return the cached instance.
    Downloads model from HuggingFace on first run (~150MB for nomic-embed-code-v1).
    """
    global _model
    if _model is None:
        import torch
        device = settings.EMBEDDING_DEVICE
        if device == "cuda" and not torch.cuda.is_available():
            print("⚠️ CUDA requested but not available. Falling back to CPU for embeddings.")
            device = "cpu"
        
        # Primary model
        primary_model = settings.EMBEDDING_MODEL
        # Fallback model (very reliable, small, doesn't require trust_remote_code typically)
        fallback_model = "all-MiniLM-L6-v2"
        
        try:
            print(f"Loading primary embedding model: {primary_model}...")
            _model = SentenceTransformer(primary_model, device=device, trust_remote_code=True)
        except Exception as e:
            print(f"❌ Failed to load primary model '{primary_model}'. Error: {e}")
            print(f"⚠️ Falling back to alternative model: {fallback_model}...")
            try:
                _model = SentenceTransformer(fallback_model, device=device)
            except Exception as fallback_e:
                print(f"❌ Failed to load fallback model '{fallback_model}'. Error: {fallback_e}")
                raise RuntimeError(f"Could not load any embedding models. Primary error: {e}, Fallback error: {fallback_e}")
            
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Encode a list of text strings into embedding vectors.
    """
    if not texts:
        return []
    model = get_embedding_model()
    # For nomic-embed-code, document prefix is recommended
    prefixed_texts = [f"search_document: {t}" for t in texts]
    embeddings = model.encode(prefixed_texts, normalize_embeddings=True)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """
    Encode a single query string for retrieval.
    Uses "search_query: " prefix (nomic instruction format for retrieval).
    """
    model = get_embedding_model()
    prefixed_query = f"search_query: {query}"
    # encode returns an array, we get the first (and only) item
    return model.encode([prefixed_query], normalize_embeddings=True)[0].tolist()
