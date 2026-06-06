"""
RepoTalk AI Service — Configuration
Loads environment variables with sensible defaults.
"""

import os
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- App ---
    APP_NAME: str = "RepoTalk AI Service"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # --- LLM Provider ---
    LLM_PROVIDER: Literal["groq", "ollama"] = "groq"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"

    # --- Embeddings ---
    EMBEDDING_MODEL: str = "nomic-ai/nomic-embed-code-v1"
    EMBEDDING_DEVICE: str = "cpu"

    # --- Qdrant ---
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "repotalk_chunks"

    # --- GitHub ---
    GITHUB_TOKEN: str = ""

    # --- Langfuse ---
    LANGFUSE_PUBLIC_KEY: str = ""
    LANGFUSE_SECRET_KEY: str = ""
    LANGFUSE_HOST: str = "http://localhost:3001"

    # --- Paths ---
    REPOS_DIR: str = "./repos_cache"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"


settings = Settings()
