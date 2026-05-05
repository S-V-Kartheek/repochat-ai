"""
Router: /api/v1/pr
PR diff analysis and plain-English summarization.

Phase 3 — Week 8 implementation.
"""

import re
import json
from fastapi import APIRouter, HTTPException
import httpx
from app.models.schemas import PRRequest, PRResponse
from app.core.llm_provider import get_llm_client, get_model_name
from app.config import settings

router = APIRouter()

# ── Helpers ────────────────────────────────────────────────────────────────────

def _parse_pr_url(pr_url: str) -> tuple[str, str, int]:
    """Extract (owner, repo, pr_number) from a GitHub PR URL."""
    match = re.match(
        r"https?://github\.com/([^/]+)/([^/]+)/pull/(\d+)(?:/|$|\?)",
        pr_url.strip(),
    )
    if not match:
        raise ValueError(f"Invalid GitHub PR URL: {pr_url}")
    return match.group(1), match.group(2), int(match.group(3))


def _is_placeholder_github_token(token: str) -> bool:
    value = token.strip().lower()
    if not value:
        return True
    placeholder_markers = (
        "ghp_your_",
        "your_github",
        "github_pat_your_",
        "token_here",
        "changeme",
        "<",
    )
    return any(marker in value for marker in placeholder_markers)


def _build_github_headers(accept: str, include_auth: bool = True) -> dict[str, str]:
    headers: dict[str, str] = {
        "Accept": accept,
        "User-Agent": "RepoTalk-AI-Service",
    }
    token = settings.GITHUB_TOKEN.strip()
    if include_auth and token and not _is_placeholder_github_token(token):
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _raise_for_github_error(resp: httpx.Response, resource_label: str) -> None:
    status = resp.status_code
    if status < 400:
        return

    if status == 404:
        raise HTTPException(
            status_code=404,
            detail=(
                f"{resource_label} not found. Check the PR URL. "
                "If the repo is private, set a valid GITHUB_TOKEN."
            ),
        )

    if status == 401:
        raise HTTPException(
            status_code=401,
            detail=(
                "GitHub authentication failed (401). "
                "Your GITHUB_TOKEN may be invalid or expired. "
                "For public repos, remove invalid tokens and retry."
            ),
        )

    if status == 403:
        message = (resp.text or "").lower()
        if "rate limit" in message:
            raise HTTPException(
                status_code=429,
                detail=(
                    "GitHub API rate limit reached. "
                    "Retry later or set a valid GITHUB_TOKEN to increase limits."
                ),
            )
        raise HTTPException(
            status_code=403,
            detail=(
                "GitHub access forbidden (403). "
                "Repository may be private or token scopes are insufficient."
            ),
        )

    raise HTTPException(
        status_code=502,
        detail=f"GitHub API error while fetching {resource_label}: HTTP {status}",
    )


async def _github_get(url: str, accept: str, resource_label: str) -> httpx.Response:
    """
    Fetch from GitHub API with optional auth header.
    If auth fails with 401/403 (often bad token), retry once without auth so
    public repositories still work.
    """
    authed_headers = _build_github_headers(accept, include_auth=True)
    unauth_headers = _build_github_headers(accept, include_auth=False)
    had_auth_header = "Authorization" in authed_headers

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers=authed_headers)

        if had_auth_header and resp.status_code in (401, 403):
            fallback = await client.get(url, headers=unauth_headers)
            if fallback.status_code < 400:
                return fallback
            resp = fallback

        _raise_for_github_error(resp, resource_label)
        return resp


async def _fetch_pr_diff(owner: str, repo: str, pr_number: int) -> str:
    """Fetch the raw diff for a PR via the GitHub API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    resp = await _github_get(
        url=url,
        accept="application/vnd.github.v3.diff",
        resource_label=f"PR diff #{pr_number}",
    )
    return resp.text


async def _fetch_pr_metadata(owner: str, repo: str, pr_number: int) -> dict:
    """Fetch PR metadata (title, body, author, etc.)."""
    url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
    resp = await _github_get(
        url=url,
        accept="application/vnd.github.v3+json",
        resource_label=f"PR metadata #{pr_number}",
    )
    return resp.json()


def _extract_changed_files(diff: str) -> list[str]:
    """Parse diff headers to extract list of changed file paths."""
    return re.findall(r"^diff --git a/(.+?) b/", diff, re.MULTILINE)


def _truncate_diff(diff: str, max_chars: int = 6000) -> str:
    """Truncate diff to fit within LLM context window."""
    if len(diff) <= max_chars:
        return diff
    return diff[:max_chars] + "\n\n... (diff truncated for brevity)"


@router.post("/summarize", response_model=PRResponse, summary="Summarize a GitHub PR")
async def summarize_pr(request: PRRequest):
    """
    Given a GitHub PR URL:
      1. Fetch PR diff via GitHub API (using GITHUB_TOKEN)
      2. Parse changed files and identify modified functions
      3. Generate plain-English summary of changes using LLM
      4. List impact warnings: which functions/files are affected
      5. Return structured PR summary + impact report
    """
    try:
        owner, repo, pr_number = _parse_pr_url(request.pr_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Fetch diff and metadata in parallel
    try:
        diff = await _fetch_pr_diff(owner, repo, pr_number)
        metadata = await _fetch_pr_metadata(owner, repo, pr_number)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch PR from GitHub: {e}")

    changed_files = _extract_changed_files(diff)
    truncated_diff = _truncate_diff(diff)

    pr_title = metadata.get("title", f"PR #{pr_number}")
    pr_body = (metadata.get("body") or "")[:1500]
    pr_author = metadata.get("user", {}).get("login", "unknown")

    # LLM summarization
    system_prompt = """You are RepoTalk PR Summarizer. Given a GitHub PR diff and metadata, generate a JSON object with these exact keys:
- "summary": A clear, 2-4 paragraph plain-English summary of what this PR does. Mention the purpose, key changes, and approach.
- "impact_warnings": A JSON array of strings. Each string is a potential risk, breaking change, or important side effect. If none, return an empty array.
- "changed_functions": A JSON array of strings listing function/method names that were modified or added. Include class names if relevant (e.g. "UserService.authenticate"). If you can't determine specific functions, list the key files changed.

Return ONLY valid JSON. No markdown fences, no explanation."""

    user_prompt = f"""PR: {request.pr_url}
Title: {pr_title}
Author: {pr_author}
Description: {pr_body or '(No description provided)'}

Changed files ({len(changed_files)}):
{chr(10).join(f'- {f}' for f in changed_files[:30])}

Diff:
{truncated_diff}"""

    client = get_llm_client()
    model = get_model_name()

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=1500,
        )
        raw = response.choices[0].message.content or "{}"
        raw = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        raw = re.sub(r"\s*```$", "", raw.strip())
        parsed = json.loads(raw)
    except Exception as e:
        print(f"PR summarization LLM failed: {e}")
        parsed = {}

    return PRResponse(
        summary=parsed.get("summary", f"Summary generation failed for {request.pr_url}. The PR modifies {len(changed_files)} files."),
        impact_warnings=parsed.get("impact_warnings", []),
        changed_functions=parsed.get("changed_functions", changed_files[:20]),
        diff_overview=f"**{pr_title}** by @{pr_author}\n\n{len(changed_files)} files changed:\n" + "\n".join(f"- `{f}`" for f in changed_files[:30]),
    )


@router.post("/webhook", summary="GitHub webhook handler")
async def github_webhook(payload: dict):
    """
    Receives GitHub push/PR webhook events.
    On push: re-indexes changed chunks in Qdrant.
    On PR open: triggers impact analysis.
    """
    action = payload.get("action", "")
    event_type = "unknown"

    if "pull_request" in payload:
        event_type = "pull_request"
        pr = payload["pull_request"]
        pr_number = pr.get("number", "?")
        repo_name = payload.get("repository", {}).get("full_name", "unknown")
        return {
            "received": True,
            "event": event_type,
            "action": action,
            "pr": pr_number,
            "repo": repo_name,
            "message": f"Webhook received for PR #{pr_number} ({action}). Automated analysis is not yet enabled.",
        }

    if "commits" in payload:
        event_type = "push"
        commits = payload.get("commits", [])
        repo_name = payload.get("repository", {}).get("full_name", "unknown")
        return {
            "received": True,
            "event": event_type,
            "commits": len(commits),
            "repo": repo_name,
            "message": f"Push webhook received ({len(commits)} commits). Re-indexing is not yet automated.",
        }

    return {
        "received": True,
        "event": event_type,
        "message": "Webhook received but event type is not handled.",
    }
