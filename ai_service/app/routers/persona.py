"""
Router: /api/v1/persona
Phase 3 — Repo Identity Card

Pipeline:
  1. Scan Qdrant for manifest files (package.json, requirements.txt, etc.) → tech stack
  2. Retrieve all unique file paths → file tree + entry-point detection
  3. Sample 12 representative code chunks → LLM context
  4. Single LLM call → structured JSON persona (with heuristic fallback)
  5. In-memory cache (gateway caches in DB)
"""

from __future__ import annotations

import json
import uuid
import asyncio
import os
from typing import Any

from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.schemas import PersonaRequest, PersonaResponse, SuggestedQuestion
from app.core.vector_store import get_qdrant_client
from app.core.llm_provider import get_llm_client, get_model_name
from app.config import settings

router = APIRouter()

# In-memory cache: repo_id → PersonaResponse dict
PERSONA_CACHE: dict[str, dict] = {}

# ─────────────────────────────────────────────────────────────────────────────
# Manifest detection helpers
# ─────────────────────────────────────────────────────────────────────────────

MANIFEST_MAP = {
    "package.json": ("JavaScript/TypeScript", ["Node.js"]),
    "requirements.txt": ("Python", ["Python"]),
    "pyproject.toml": ("Python", ["Python"]),
    "setup.py": ("Python", ["Python"]),
    "Pipfile": ("Python", ["Python"]),
    "go.mod": ("Go", ["Go"]),
    "Cargo.toml": ("Rust", ["Rust"]),
    "pom.xml": ("Java", ["Java", "Maven"]),
    "build.gradle": ("Java", ["Java", "Gradle"]),
    "Gemfile": ("Ruby", ["Ruby"]),
    "composer.json": ("PHP", ["PHP"]),
    "mix.exs": ("Elixir", ["Elixir"]),
    "pubspec.yaml": ("Dart", ["Flutter/Dart"]),
    "CMakeLists.txt": ("C/C++", ["CMake"]),
}

FRAMEWORK_CLUES = {
    "next.config": ("TypeScript", "Next.js"),
    "nuxt.config": ("JavaScript", "Nuxt.js"),
    "angular.json": ("TypeScript", "Angular"),
    "svelte.config": ("JavaScript", "Svelte"),
    "vite.config": ("JavaScript", "Vite"),
    "webpack.config": ("JavaScript", "Webpack"),
    "tailwind.config": ("CSS", "Tailwind CSS"),
    "docker-compose": ("DevOps", "Docker"),
    "Dockerfile": ("DevOps", "Docker"),
    ".github/workflows": ("DevOps", "GitHub Actions"),
    "prisma/schema": ("TypeScript", "Prisma"),
    "drizzle.config": ("TypeScript", "Drizzle"),
    "fastapi": ("Python", "FastAPI"),
    "django": ("Python", "Django"),
    "flask": ("Python", "Flask"),
    "express": ("JavaScript", "Express"),
    "nestjs": ("TypeScript", "NestJS"),
    "spring": ("Java", "Spring Boot"),
}

COLLECTION_NAME = settings.QDRANT_COLLECTION


# ─────────────────────────────────────────────────────────────────────────────
# Qdrant helpers
# ─────────────────────────────────────────────────────────────────────────────

async def get_repo_file_paths(repo_id: str, limit: int = 500) -> list[str]:
    """Return unique file paths for chunks belonging to this repo."""
    client = await get_qdrant_client()
    try:
        results, _ = await client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter={
                "must": [{"key": "repo_id", "match": {"value": repo_id}}]
            },
            limit=limit,
            with_payload=True,
            with_vectors=False,
        )
        seen: set[str] = set()
        paths: list[str] = []
        for point in results:
            f = (point.payload or {}).get("file", "")
            if f and f not in seen:
                seen.add(f)
                paths.append(f)
        return paths
    except Exception:
        return []


async def get_sample_chunks(repo_id: str, n: int = 12) -> list[dict]:
    """Return n representative chunks (content + file) for LLM context."""
    client = await get_qdrant_client()
    try:
        results, _ = await client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter={
                "must": [{"key": "repo_id", "match": {"value": repo_id}}]
            },
            limit=n * 5,  # over-fetch, then sample evenly
            with_payload=True,
            with_vectors=False,
        )
        if not results:
            return []
        # Evenly spaced sample
        step = max(1, len(results) // n)
        sampled = results[::step][:n]
        return [
            {
                "file": (p.payload or {}).get("file", "unknown"),
                "content": (p.payload or {}).get("content", "")[:800],
            }
            for p in sampled
        ]
    except Exception:
        return []


async def get_chunk_count(repo_id: str) -> int:
    client = await get_qdrant_client()
    try:
        result = await client.count(
            collection_name=COLLECTION_NAME,
            count_filter={
                "must": [{"key": "repo_id", "match": {"value": repo_id}}]
            },
        )
        return result.count
    except Exception:
        return 0


# ─────────────────────────────────────────────────────────────────────────────
# Heuristic analysis
# ─────────────────────────────────────────────────────────────────────────────

def analyze_files_heuristically(paths: list[str]) -> dict:
    """Derive stack/frameworks from file paths without LLM."""
    lang_votes: dict[str, int] = {}
    frameworks: set[str] = set()
    dominant_language = "Unknown"

    all_paths_str = "\n".join(paths).lower()

    # Manifest detection
    for manifest, (lang, fws) in MANIFEST_MAP.items():
        if any(p.lower().endswith(manifest.lower()) or manifest.lower() in p.lower() for p in paths):
            lang_votes[lang] = lang_votes.get(lang, 0) + 5
            for fw in fws:
                frameworks.add(fw)

    # Framework clues from file names
    for clue, (lang, fw) in FRAMEWORK_CLUES.items():
        if clue.lower() in all_paths_str:
            lang_votes[lang] = lang_votes.get(lang, 0) + 2
            frameworks.add(fw)

    # Extension counting
    ext_map = {
        ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
        ".go": "Go", ".java": "Java", ".rs": "Rust", ".rb": "Ruby",
        ".php": "PHP", ".cs": "C#", ".cpp": "C++", ".c": "C",
        ".tsx": "TypeScript", ".jsx": "JavaScript", ".kt": "Kotlin",
    }
    for path in paths:
        ext = os.path.splitext(path)[1].lower()
        if ext in ext_map:
            lang = ext_map[ext]
            lang_votes[lang] = lang_votes.get(lang, 0) + 1

    if lang_votes:
        dominant_language = max(lang_votes, key=lambda k: lang_votes[k])

    # Stack = all languages with votes
    stack = sorted(lang_votes.keys(), key=lambda k: lang_votes[k], reverse=True)

    # Repo type heuristic
    repo_type = "unknown"
    if any("next.config" in p or "app/" in p or "pages/" in p for p in paths):
        repo_type = "frontend"
    elif any("api/" in p or "routes/" in p or "controllers/" in p for p in paths):
        repo_type = "web-api"
    elif any("main.py" in p or "main.go" in p or "main.rs" in p for p in paths):
        repo_type = "cli"
    elif any("setup.py" in p or "pyproject.toml" in p for p in paths):
        if not any("api/" in p or "routes/" in p for p in paths):
            repo_type = "library"
    elif any("docker-compose" in p for p in paths):
        repo_type = "monorepo"

    # Entry points
    entry_candidates = [
        "main.py", "main.go", "main.rs", "main.js", "main.ts",
        "index.py", "index.js", "index.ts", "app.py", "app.ts",
        "server.py", "server.js", "server.ts", "manage.py",
        "src/index.ts", "src/main.ts", "app/main.py",
    ]
    key_entry_points = [
        p for p in paths
        if any(p.endswith(e) or p == e for e in entry_candidates)
    ][:5]

    # File tree (top-level dirs + sample files)
    top_dirs: dict[str, list[str]] = {}
    for p in paths[:200]:
        parts = p.split("/")
        top = parts[0] if len(parts) > 1 else "."
        top_dirs.setdefault(top, []).append(p)

    tree_lines = []
    for d, files in sorted(top_dirs.items())[:12]:
        tree_lines.append(f"├── {d}/")
        for f in files[:3]:
            tree_lines.append(f"│   └── {f.split('/')[-1]}")
    file_tree = "\n".join(tree_lines)

    return {
        "dominant_language": dominant_language,
        "stack": stack[:8],
        "frameworks": list(frameworks)[:6],
        "repo_type": repo_type,
        "key_entry_points": key_entry_points,
        "file_tree": file_tree,
    }


# ─────────────────────────────────────────────────────────────────────────────
# LLM-powered persona generation
# ─────────────────────────────────────────────────────────────────────────────

PERSONA_PROMPT_TEMPLATE = """\
You are a senior software architect analyzing a GitHub repository.
Based on the file paths and code samples below, generate a comprehensive repository profile as valid JSON.

Repository: {repo_name}
URL: {repo_url}
Tech stack detected: {stack}
Frameworks: {frameworks}
File count: {file_count}
Chunk count: {chunk_count}

Top-level file structure:
{file_tree}

Code samples (representative chunks):
{code_samples}

Respond with ONLY a valid JSON object (no markdown, no explanation) matching this exact schema:
{{
  "repo_name": "<short display name>",
  "repo_type": "<one of: web-api | frontend | cli | library | monorepo | ml-model | unknown>",
  "dominant_language": "<primary language>",
  "architecture_style": "<e.g., MVC | RAG pipeline | microservices | monolith | serverless | event-driven>",
  "expertise_level": "<one of: beginner-friendly | intermediate | expert>",
  "frameworks": ["<fw1>", "<fw2>"],
  "stack": ["<lang1>", "<lang2>"],
  "architecture_overview": "<2-3 sentence description of what this codebase does and how it's structured>",
  "key_entry_points": ["<path1>", "<path2>"],
  "onboarding_guide": "<markdown string: 3-4 step getting started guide for a new developer>",
  "file_tree": "<compact text tree of key directories>",
  "suggested_questions": [
    {{"id": "q1", "category": "architecture", "question": "<question about system design>"}},
    {{"id": "q2", "category": "implementation", "question": "<question about a key feature>"}},
    {{"id": "q3", "category": "onboarding", "question": "<question a new dev would ask>"}},
    {{"id": "q4", "category": "debugging", "question": "<question about error handling or tests>"}},
    {{"id": "q5", "category": "architecture", "question": "<question about data flow or APIs>"}}
  ]
}}
"""


async def generate_with_llm(
    repo_id: str,
    repo_url: str,
    repo_name: str,
    heuristics: dict,
    chunks: list[dict],
    file_count: int,
    chunk_count: int,
) -> dict:
    """Call the LLM to generate a rich persona. Returns a dict matching PersonaResponse."""
    client = get_llm_client()
    model = get_model_name()

    code_samples = "\n\n".join(
        f"// {c['file']}\n{c['content'][:600]}" for c in chunks[:10]
    )

    prompt = PERSONA_PROMPT_TEMPLATE.format(
        repo_name=repo_name or repo_url.split("/")[-1],
        repo_url=repo_url,
        stack=", ".join(heuristics.get("stack", [])),
        frameworks=", ".join(heuristics.get("frameworks", [])),
        file_count=file_count,
        chunk_count=chunk_count,
        file_tree=heuristics.get("file_tree", ""),
        code_samples=code_samples,
    )

    response = await client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000,
    )

    raw = response.choices[0].message.content or "{}"
    # Strip markdown fences if model adds them
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw[raw.find("{"):raw.rfind("}") + 1]

    return json.loads(raw)


# ─────────────────────────────────────────────────────────────────────────────
# Core generation function (shared by POST / and POST /{id}/refresh)
# ─────────────────────────────────────────────────────────────────────────────

async def _build_persona(repo_id: str, repo_url: str, repo_name: str) -> dict:
    """Full pipeline: heuristics → optional LLM → merged result dict."""
    # 1. Gather data from Qdrant
    file_paths, sample_chunks, chunk_count = await asyncio.gather(
        get_repo_file_paths(repo_id),
        get_sample_chunks(repo_id),
        get_chunk_count(repo_id),
    )

    file_count = len(file_paths)
    heuristics = analyze_files_heuristically(file_paths)

    # 2. Attempt LLM enrichment
    llm_data: dict = {}
    try:
        llm_data = await asyncio.wait_for(
            generate_with_llm(
                repo_id=repo_id,
                repo_url=repo_url,
                repo_name=repo_name,
                heuristics=heuristics,
                chunks=sample_chunks,
                file_count=file_count,
                chunk_count=chunk_count,
            ),
            timeout=60.0,
        )
    except Exception as e:
        print(f"[persona] LLM call failed for {repo_id}: {e} — using heuristics only")

    # 3. Merge: LLM data wins, heuristics fill gaps
    display_name = (
        llm_data.get("repo_name")
        or repo_name.split("/")[-1]
        or repo_url.split("/")[-1]
    )

    # Build suggested questions
    raw_qs = llm_data.get("suggested_questions", [])
    suggested_questions = []
    for i, q in enumerate(raw_qs[:5]):
        if isinstance(q, dict) and q.get("question"):
            suggested_questions.append({
                "id": q.get("id") or f"q{i+1}",
                "question": q["question"],
                "category": q.get("category", "architecture"),
                "label": q.get("label"),
            })

    if not suggested_questions:
        # Fallback static questions
        suggested_questions = [
            {"id": "q1", "question": "What is the overall architecture of this project?", "category": "architecture"},
            {"id": "q2", "question": "Where is the main entry point of the application?", "category": "onboarding"},
            {"id": "q3", "question": "How is authentication or authorization handled?", "category": "implementation"},
            {"id": "q4", "question": "What are the key data models or database schemas?", "category": "implementation"},
        ]

    result = {
        "repo_name": display_name,
        "repo_type": llm_data.get("repo_type") or heuristics.get("repo_type", "unknown"),
        "dominant_language": llm_data.get("dominant_language") or heuristics.get("dominant_language", "Unknown"),
        "architecture_style": llm_data.get("architecture_style") or "unknown",
        "expertise_level": llm_data.get("expertise_level") or "intermediate",
        "frameworks": llm_data.get("frameworks") or heuristics.get("frameworks", []),
        "stack": llm_data.get("stack") or heuristics.get("stack", []),
        "architecture_overview": llm_data.get("architecture_overview") or "",
        "key_entry_points": llm_data.get("key_entry_points") or heuristics.get("key_entry_points", []),
        "total_files": file_count,
        "total_chunks": chunk_count,
        "suggested_questions": suggested_questions,
        "onboarding_guide": llm_data.get("onboarding_guide") or "",
        "file_tree": llm_data.get("file_tree") or heuristics.get("file_tree", ""),
    }

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/", response_model=PersonaResponse, summary="Generate repo persona")
async def generate_persona(request: PersonaRequest):
    """
    Generate (and cache) a Repo Identity Card for the given repo_id.
    Runs heuristic manifest detection + LLM enrichment.
    Returns the full PersonaResponse.
    """
    # Return from cache if available
    if request.repo_id in PERSONA_CACHE:
        return PersonaResponse(**PERSONA_CACHE[request.repo_id])

    result = await _build_persona(
        repo_id=request.repo_id,
        repo_url=request.repo_url,
        repo_name=request.repo_name,
    )

    PERSONA_CACHE[request.repo_id] = result
    return PersonaResponse(**result)


@router.get("/{repo_id}", response_model=PersonaResponse, summary="Get cached persona")
async def get_persona(repo_id: str):
    """
    Return the previously generated persona for a repo.
    404 if not yet generated.
    """
    if repo_id not in PERSONA_CACHE:
        raise HTTPException(status_code=404, detail="Persona not yet generated. Call POST /api/v1/persona/ first.")
    return PersonaResponse(**PERSONA_CACHE[repo_id])


@router.post("/{repo_id}/refresh", response_model=PersonaResponse, summary="Force-regenerate persona")
async def refresh_persona(repo_id: str, request: PersonaRequest):
    """
    Force regeneration of the persona (ignores cache).
    Updates the in-memory cache with fresh data.
    """
    result = await _build_persona(
        repo_id=repo_id,
        repo_url=request.repo_url,
        repo_name=request.repo_name,
    )

    PERSONA_CACHE[repo_id] = result
    return PersonaResponse(**result)
