"""
Pydantic request/response models for the AI Service.
Shared across all routers.
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------
class IngestRequest(BaseModel):
    repo_url: str = Field(..., json_schema_extra={"example": "https://github.com/tiangolo/fastapi"})
    languages: list[str] = Field(
        default=["python", "javascript", "typescript", "java", "go"],
        description="File extensions to include. Leave empty for all supported languages.",
    )
    user_id: str = Field(..., description="Clerk user ID — stored as collection owner.")
    repo_id: str = Field(..., description="Unique repo ID from the Node gateway DB.")


class IngestResponse(BaseModel):
    repo_id: str
    status: str                  # "ingesting" | "done" | "error"
    chunks_created: int = 0
    message: str = ""


# ---------------------------------------------------------------------------
# Query
# ---------------------------------------------------------------------------
class QueryRequest(BaseModel):
    question: str = Field(..., json_schema_extra={"example": "Where is authentication handled?"})
    repo_id: str
    session_id: str
    history: list[dict] = Field(
        default=[],
        description="Last N messages for multi-turn context. [{role, content}]",
    )
    top_k: int = Field(default=5, description="Number of chunks to retrieve.")


class Citation(BaseModel):
    file: str
    start_line: int
    end_line: int
    snippet: str
    score: float


class QueryResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    answer: str
    citations: list[Citation]
    session_id: str
    model_used: str


# ---------------------------------------------------------------------------
# Symbols
# ---------------------------------------------------------------------------
class SymbolRequest(BaseModel):
    symbol_name: str = Field(..., json_schema_extra={"example": "authenticate"})
    repo_id: str


class SymbolResult(BaseModel):
    name: str
    kind: str    # "function" | "class" | "method"
    file: str
    start_line: int
    end_line: int


# ---------------------------------------------------------------------------
# Persona
# ---------------------------------------------------------------------------
class PersonaRequest(BaseModel):
    repo_id: str
    repo_url: str


class SuggestedQuestion(BaseModel):
    label: str           # Short label shown on chip, e.g. "Auth flow"
    question: str        # Full question text injected into chat
    category: str        # "architecture" | "implementation" | "debugging" | "onboarding"


class PersonaResponse(BaseModel):
    # Core identity
    repo_name: str
    dominant_language: str
    stack: list[str]                 # ["FastAPI", "Python 3.11", "Qdrant", ...]
    frameworks: list[str]
    repo_type: str                   # "web-api" | "frontend" | "cli" | "library" | "monorepo"
    architecture_style: str          # "MVC" | "microservices" | "layered" | etc.
    expertise_level: str             # "beginner-friendly" | "intermediate" | "expert"

    # Content
    file_tree: str                   # ASCII tree of top-level structure
    architecture_overview: str       # 2–3 paragraph description
    onboarding_guide: str            # Markdown step-by-step guide
    conventions: str                 # Detected code style / patterns
    key_entry_points: list[str]      # Most important files to understand first

    # Suggested questions
    suggested_questions: list[SuggestedQuestion]

    # Metrics
    total_files: int
    total_chunks: int


# ---------------------------------------------------------------------------
# PR Summarizer
# ---------------------------------------------------------------------------
class PRRequest(BaseModel):
    pr_url: str = Field(..., json_schema_extra={"example": "https://github.com/owner/repo/pull/42"})
    repo_id: str = "standalone"


class PRResponse(BaseModel):
    summary: str
    impact_warnings: list[str]
    changed_functions: list[str]
    diff_overview: str


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
class EvalRequest(BaseModel):
    question: str
    answer: str
    contexts: list[str]     # The retrieved chunks that generated the answer
    repo_id: str
    message_id: str


class EvalResponse(BaseModel):
    faithfulness: float
    answer_relevancy: float
    context_precision: float
    overall: str            # "high" | "medium" | "low"
    message_id: str
