from pathlib import Path

import pytest

from app.core.repo_cloner import build_repo_file_tree, read_repo_file_text, resolve_repo_file

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_build_repo_file_tree_returns_nested_project_entries():
    repo_root = REPO_ROOT / "frontend" / "components"

    tree = build_repo_file_tree(repo_root)

    names = [entry["name"] for entry in tree]
    assert "repo" in names
    repo_dir = next(entry for entry in tree if entry["name"] == "repo")
    assert repo_dir["type"] == "directory"
    assert any(child["path"] == "repo/CodeViewerPane.tsx" for child in repo_dir["children"])


def test_resolve_repo_file_rejects_path_traversal():
    repo_root = REPO_ROOT / "ai_service" / "app"

    with pytest.raises(ValueError):
        resolve_repo_file(repo_root, "../requirements.txt")


def test_read_repo_file_text_returns_existing_file_contents():
    repo_root = REPO_ROOT / "frontend" / "components" / "repo"

    content = read_repo_file_text(repo_root, "CodeViewerPane.tsx")

    assert "CodeViewerPane" in content
