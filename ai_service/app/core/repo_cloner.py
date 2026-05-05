"""
Core: GitHub Repo Cloner
Handles cloning and local management of GitHub repositories.

Phase 1 — Week 1 implementation.
"""

import os
import shutil
from pathlib import Path
from git import Repo, exc
from app.config import settings

CLONE_BASE_DIR = Path(settings.REPOS_DIR)

# Excluded directories and file patterns
EXCLUDED_DIRS = {
    "node_modules", ".git", "__pycache__", "dist", "build",
    "venv", ".venv", "env", ".env", "coverage", ".next", "out"
}

EXCLUDED_EXTENSIONS = {
    ".min.js", ".lock", ".log", ".pyc", ".pyo", ".pyd",
    ".so", ".dll", ".dylib", ".exe", ".bin", ".sqlite", 
    ".jpeg", ".jpg", ".png", ".gif", ".svg", ".ico"
}

MAX_FILE_SIZE_BYTES = 500 * 1024  # 500KB
MAX_VIEW_FILE_SIZE_BYTES = 1024 * 1024  # 1MB


def clone_repo(repo_url: str, repo_id: str) -> Path:
    """
    Clone a GitHub repository to local disk.
    If it exists, fetch and pull latest.
    """
    repo_path = CLONE_BASE_DIR / repo_id
    if not CLONE_BASE_DIR.exists():
        CLONE_BASE_DIR.mkdir(parents=True, exist_ok=True)
    
    auth_url = repo_url
    if settings.GITHUB_TOKEN and repo_url.startswith("https://"):
        auth_url = repo_url.replace("https://", f"https://oauth2:{settings.GITHUB_TOKEN}@")
    
    try:
        if repo_path.exists() and (repo_path / ".git").exists():
            repo = Repo(repo_path)
            origin = repo.remotes.origin
            origin.pull()
        else:
            Repo.clone_from(auth_url, repo_path, depth=1)
    except exc.GitCommandError as e:
        raise ValueError(f"Failed to clone repository: {str(e)}")
        
    return repo_path


def get_repo_root(repo_id: str) -> Path:
    """Return the on-disk path for a cached repo clone."""
    return CLONE_BASE_DIR / repo_id


def get_repo_files(repo_path: Path, language_filter: list[str] | None = None) -> list[Path]:
    """
    Walk the cloned repo and return all source files relative to repo_path.
    Filters by language extensions and file size/ignored directories.
    """
    source_files = []
    
    if language_filter:
        # ensure extensions start with '.'
        language_filter = [ext if ext.startswith('.') else f".{ext}" for ext in language_filter]
        
    for root, dirs, files in os.walk(repo_path):
        # Exclude directories in place (skip hidden dirs like .github)
        dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not d.startswith('.')]
        
        for file in files:
            path = Path(root) / file
            
            # Filter by extension
            if path.suffix in EXCLUDED_EXTENSIONS:
                continue
                
            if language_filter and path.suffix not in language_filter:
                continue
                
            # Filter by size
            if path.stat().st_size > MAX_FILE_SIZE_BYTES:
                continue
                
            source_files.append(path.relative_to(repo_path))
            
    return source_files


def _is_visible_dir(name: str) -> bool:
    return name not in EXCLUDED_DIRS and not name.startswith(".")


def _is_viewable_file(path: Path) -> bool:
    if path.name.startswith("."):
        return False
    if path.suffix in EXCLUDED_EXTENSIONS:
        return False
    return True


def build_repo_file_tree(repo_path: Path, base_path: Path | None = None) -> list[dict]:
    """
    Build a nested file tree rooted at repo_path.
    Hidden and excluded directories are skipped to keep the explorer focused.
    """
    if base_path is None:
        base_path = repo_path

    entries: list[dict] = []

    for child in sorted(repo_path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        if child.is_dir():
            if not _is_visible_dir(child.name):
                continue
            rel_path = child.relative_to(base_path).as_posix()
            entries.append(
                {
                    "name": child.name,
                    "path": rel_path,
                    "type": "directory",
                    "children": build_repo_file_tree(child, base_path),
                }
            )
            continue

        if not _is_viewable_file(child):
            continue

        rel_path = child.relative_to(base_path).as_posix()
        entries.append(
            {
                "name": child.name,
                "path": rel_path,
                "type": "file",
                "children": [],
            }
        )

    return entries


def resolve_repo_file(repo_path: Path, relative_path: str) -> Path:
    """
    Resolve a repo-relative path safely.
    Rejects traversal outside the cloned repository root.
    """
    normalized = Path(relative_path.replace("\\", "/"))
    target = (repo_path / normalized).resolve()

    try:
        target.relative_to(repo_path.resolve())
    except ValueError as exc:
        raise ValueError("Invalid file path") from exc

    if not target.exists() or not target.is_file():
        raise FileNotFoundError(relative_path)

    return target


def read_repo_file_text(repo_path: Path, relative_path: str) -> str:
    """Read a cached repo file as UTF-8 text for the explorer code viewer."""
    target = resolve_repo_file(repo_path, relative_path)

    if target.stat().st_size > MAX_VIEW_FILE_SIZE_BYTES:
        raise ValueError("File is too large to preview")

    return target.read_text(encoding="utf-8", errors="replace")


def cleanup_repo(repo_id: str) -> None:
    """Delete the local clone for a repo after ingestion is complete (save disk space)."""
    repo_path = CLONE_BASE_DIR / repo_id
    if repo_path.exists():
        shutil.rmtree(repo_path, ignore_errors=True)
