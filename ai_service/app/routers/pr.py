"""
Router: /api/v1/pr
PR diff analysis and plain-English summarization.
"""

import re
from collections import Counter
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException

from app.models.schemas import PRRequest, PRResponse

router = APIRouter()

PR_URL_RE = re.compile(r"^/([^/]+)/([^/]+)/pull/(\d+)/?$")
FUNCTION_RE = re.compile(
    r"^\+\s*(?:export\s+)?(?:async\s+)?(?:def|function|class)\s+([A-Za-z_][\w]*)|"
    r"^\+\s*(?:const|let|var)\s+([A-Za-z_][\w]*)\s*=\s*(?:async\s*)?\("
)


def _parse_pr_url(pr_url: str) -> tuple[str, str, str]:
    parsed = urlparse(pr_url)
    if parsed.netloc.lower() != "github.com":
        raise ValueError("Only github.com pull request URLs are supported.")
    match = PR_URL_RE.match(parsed.path.rstrip("/"))
    if not match:
        raise ValueError("Expected a GitHub PR URL like https://github.com/owner/repo/pull/123.")
    return match.group(1), match.group(2), match.group(3)


def _summarize_diff(diff_text: str) -> tuple[str, list[str], list[str], str]:
    files: list[str] = []
    changed_functions: list[str] = []
    additions = 0
    deletions = 0
    current_file = ""
    file_additions: Counter[str] = Counter()
    file_deletions: Counter[str] = Counter()

    for line in diff_text.splitlines():
        if line.startswith("diff --git "):
            parts = line.split(" b/", 1)
            current_file = parts[1] if len(parts) == 2 else line.rsplit(" ", 1)[-1]
            files.append(current_file)
            continue

        if line.startswith("+++") or line.startswith("---"):
            continue
        if line.startswith("+"):
            additions += 1
            if current_file:
                file_additions[current_file] += 1
            match = FUNCTION_RE.search(line)
            name = next((group for group in (match.groups() if match else []) if group), None)
            if name and name not in changed_functions:
                changed_functions.append(name)
        elif line.startswith("-"):
            deletions += 1
            if current_file:
                file_deletions[current_file] += 1

    top_files = [
        f"{file} (+{file_additions[file]}/-{file_deletions[file]})"
        for file in files[:8]
    ]

    diff_overview = (
        f"{len(files)} files changed with {additions} additions and {deletions} deletions. "
        f"Most visible files: {', '.join(top_files) if top_files else 'none detected'}."
    )

    summary = (
        f"This PR updates {len(files)} file{'s' if len(files) != 1 else ''}, "
        f"touching {', '.join(files[:4]) if files else 'no parsed files'}. "
        f"It adds {additions} lines and removes {deletions}, so review should focus on "
        f"the changed files, edge cases, and downstream behavior tied to those modules."
    )

    warnings: list[str] = []
    lowered_files = [file.lower() for file in files]
    if additions + deletions > 500:
        warnings.append("Large diff: split review attention by file area and run the full test suite.")
    if any("auth" in file or "security" in file for file in lowered_files):
        warnings.append("Security-sensitive files changed: verify authentication and authorization behavior.")
    if any("package" in file or "lock" in file or "requirements" in file for file in lowered_files):
        warnings.append("Dependency files changed: verify install/build reproducibility and supply-chain risk.")
    if any("schema" in file or "migration" in file or "prisma" in file for file in lowered_files):
        warnings.append("Data model or migration files changed: verify backwards compatibility.")
    if not any("test" in file or "spec" in file for file in lowered_files):
        warnings.append("No test files were changed: consider adding or running targeted regression tests.")
    if not warnings:
        warnings.append("No obvious high-risk patterns detected from the diff metadata.")

    return summary, warnings, changed_functions[:20], diff_overview


@router.post("/summarize", response_model=PRResponse, summary="Summarize a GitHub PR")
async def summarize_pr(request: PRRequest):
    try:
        owner, repo, number = _parse_pr_url(request.pr_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    diff_url = f"https://github.com/{owner}/{repo}/pull/{number}.diff"
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(diff_url)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Could not fetch PR diff from GitHub: {exc}") from exc

    summary, warnings, changed_functions, diff_overview = _summarize_diff(response.text)
    return PRResponse(
        summary=summary,
        impact_warnings=warnings,
        changed_functions=changed_functions,
        diff_overview=diff_overview,
    )


@router.post("/webhook", summary="GitHub webhook handler")
async def github_webhook(payload: dict):
    return {"received": True, "event": payload.get("action", "unknown")}
