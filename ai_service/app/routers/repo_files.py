"""
Router: /api/v1/repos
Repository explorer endpoints for file tree and full-file content previews.
"""

from fastapi import APIRouter, HTTPException, Query

from app.core import repo_cloner
from app.core.prompt_builder import get_language_for_file
from app.models.schemas import RepoFileContentResponse, RepoFileTreeResponse

router = APIRouter()


def _get_cached_repo_root(repo_id: str):
    repo_path = repo_cloner.get_repo_root(repo_id)
    if not repo_path.exists():
        raise HTTPException(status_code=404, detail="Cached repo not found")
    return repo_path


@router.get("/{repo_id}/tree", response_model=RepoFileTreeResponse, summary="Get repository file tree")
async def get_repo_tree(repo_id: str):
    repo_path = _get_cached_repo_root(repo_id)
    tree = repo_cloner.build_repo_file_tree(repo_path)
    return RepoFileTreeResponse(repo_id=repo_id, tree=tree)


@router.get("/{repo_id}/file", response_model=RepoFileContentResponse, summary="Get full file contents")
async def get_repo_file(repo_id: str, path: str = Query(..., min_length=1)):
    repo_path = _get_cached_repo_root(repo_id)

    try:
        content = repo_cloner.read_repo_file_text(repo_path, path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="File not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return RepoFileContentResponse(
        repo_id=repo_id,
        path=path,
        language=get_language_for_file(path),
        content=content,
    )
