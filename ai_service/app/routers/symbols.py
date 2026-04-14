"""
Router: /api/v1/symbols
AST-powered symbol lookup — find function/class definitions by name.

Phase 1 — Week 3 implementation.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import SymbolRequest, SymbolResult

router = APIRouter()


@router.post("/lookup", response_model=list[SymbolResult], summary="Find a symbol by name")
async def lookup_symbol(request: SymbolRequest):
    """
    Given a symbol name (e.g. "authenticate"), search Qdrant metadata
    for all matching function/class definitions and return their file:line locations.

    Uses the AST metadata stored during ingestion (function_names, class_names fields).
    """
    # TODO: Implement in Phase 1 - Week 3
    raise HTTPException(status_code=501, detail="Not implemented yet — Phase 1 Week 3")


@router.get("/{repo_id}/all", summary="List all symbols for a repo")
async def list_all_symbols(repo_id: str):
    """
    Return all extracted symbols (functions + classes) for a repo.
    Used to build the repo file tree and symbol index in the frontend sidebar.
    """
    # TODO: Implement in Phase 1 - Week 3
    raise HTTPException(status_code=501, detail="Not implemented yet — Phase 1 Week 3")
