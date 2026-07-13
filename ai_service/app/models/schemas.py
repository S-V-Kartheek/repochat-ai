"""
Pydantic request/response models for the AI Service.
Shared across all routers.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------
class IngestRequest(BaseModel):
    repo_url: str = Field(..., example="https://github.com/tiangolo/fastapi")
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
    question: str = Field(..., example="Where is authentication handled?")
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
    answer: str
    citations: list[Citation]
    session_id: str
    model_used: str


# ---------------------------------------------------------------------------
# Symbols
# ---------------------------------------------------------------------------
class SymbolRequest(BaseModel):
    symbol_name: str = Field(..., example="authenticate")
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
class SuggestedQuestion(BaseModel):
    id: str
    question: str
    category: str   # "architecture" | "implementation" | "debugging" | "onboarding"
    label: Optional[str] = None


class PersonaRequest(BaseModel):
    repo_id: str
    repo_url: str
    repo_name: str = ""


class PersonaResponse(BaseModel):
    repo_name: str
    repo_type: str              # "web-api" | "frontend" | "cli" | "library" | "monorepo" | "ml-model" | "unknown"
    dominant_language: str
    architecture_style: str     # "monolith" | "microservices" | "MVC" | "RAG" | "serverless" | etc.
    expertise_level: str        # "beginner-friendly" | "intermediate" | "expert"
    frameworks: list[str] = []
    stack: list[str] = []
    architecture_overview: str = ""
    key_entry_points: list[str] = []
    total_files: int = 0
    total_chunks: int = 0
    suggested_questions: list[SuggestedQuestion] = []
    onboarding_guide: str = ""
    file_tree: str = ""


# ---------------------------------------------------------------------------
# PR Summarizer
# ---------------------------------------------------------------------------
class PRRequest(BaseModel):
    pr_url: str = Field(..., example="https://github.com/owner/repo/pull/42")
    repo_id: str


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
