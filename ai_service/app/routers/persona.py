"""
Router: /api/v1/persona
Repo profiling — generates the Repo Identity Card, architecture overview,
onboarding guide, and 5 context-aware suggested starter questions.

Full implementation — production-grade with caching & error resilience.
"""

import json
import re
from collections import Counter
from pathlib import PurePosixPath

from fastapi import APIRouter, HTTPException
from app.models.schemas import PersonaRequest, PersonaResponse, SuggestedQuestion
from app.core.vector_store import list_repo_chunks, get_qdrant_client
from app.core.llm_provider import get_llm_client, get_model_name
from app.config import settings

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory persona cache  (swap for Redis in prod)
# ---------------------------------------------------------------------------
_persona_cache: dict[str, PersonaResponse] = {}


# ---------------------------------------------------------------------------
# Helpers: Stack & Language Detection
# ---------------------------------------------------------------------------

LANGUAGE_MAP: dict[str, str] = {
    "py": "Python", "js": "JavaScript", "ts": "TypeScript",
    "jsx": "JavaScript", "tsx": "TypeScript", "java": "Java",
    "go": "Go", "rb": "Ruby", "rs": "Rust", "cs": "C#",
    "cpp": "C++", "c": "C", "php": "PHP", "swift": "Swift",
    "kt": "Kotlin", "scala": "Scala", "r": "R", "m": "Objective-C",
    "sol": "Solidity", "hs": "Haskell", "ml": "OCaml",
}

FRAMEWORK_SIGNALS: dict[str, list[str]] = {
    "FastAPI":      ["fastapi", "from fastapi", "APIRouter"],
    "Django":       ["django", "from django", "INSTALLED_APPS"],
    "Flask":        ["from flask", "Flask(__name__)"],
    "Next.js":      ["next/app", "next/navigation", "getServerSideProps", "\"next\""],
    "React":        ["import React", "from 'react'", "useState", "useEffect"],
    "Express":      ["express()", "app.use(", "Router()"],
    "NestJS":       ["@Module", "@Controller", "@Injectable"],
    "Spring Boot":  ["@SpringBootApplication", "spring.boot"],
    "Vue.js":       ["createApp", "defineComponent", "vue"],
    "Angular":      ["@NgModule", "@Component", "angular"],
    "Svelte":       [".svelte", "svelte/store"],
    "Prisma":       ["prisma", "PrismaClient", "@prisma/client"],
    "SQLAlchemy":   ["sqlalchemy", "Base.metadata", "Session"],
    "Pydantic":     ["BaseModel", "pydantic"],
    "LangChain":    ["langchain", "from langchain"],
    "PyTorch":      ["torch", "nn.Module"],
    "TensorFlow":   ["tensorflow", "tf.keras"],
    "Qdrant":       ["qdrant", "QdrantClient"],
    "Redis":        ["redis", "Redis("],
    "Celery":       ["celery", "app.task"],
    "Docker":       ["dockerfile", "docker-compose"],
    "Kubernetes":   ["apiVersion", "kind: Deployment"],
    "GraphQL":      ["graphql", "type Query", "gql`"],
    "tRPC":         ["createTRPCRouter", "publicProcedure"],
}

REPO_TYPE_SIGNALS: dict[str, list[str]] = {
    "web-api":    ["router", "endpoint", "Controller", "APIRouter", "app.get", "app.post"],
    "frontend":   ["component", "useState", "render", "css", "styled", "tailwind"],
    "cli":        ["argparse", "click", "typer", "sys.argv", "commander"],
    "library":    ["setup.py", "pyproject.toml", "__init__.py", "package.json"],
    "monorepo":   ["packages/", "apps/", "workspace", "lerna", "turbo"],
    "ml-model":   ["model.fit", "train_test_split", "DataLoader", "nn.Module"],
}


def detect_language_and_stack(chunks: list[dict]) -> tuple[str, list[str], list[str], str]:
    """
    Returns (dominant_language, stack_list, frameworks_list, repo_type)
    from chunk payloads.
    """
    lang_counter: Counter = Counter()
    content_sample = ""
    file_paths: list[str] = []

    for chunk in chunks[:200]:  # Sample first 200 chunks for performance
        lang = chunk.get("language", "")
        if lang:
            lang_counter[lang] += 1
        file_paths.append(chunk.get("file_path", ""))
        if len(content_sample) < 8000:
            content_sample += chunk.get("content", "") + "\n"

    # Dominant language
    dominant_ext = lang_counter.most_common(1)[0][0] if lang_counter else "unknown"
    dominant_language = LANGUAGE_MAP.get(dominant_ext, dominant_ext.upper())

    # Build full stack
    stack: list[str] = []
    unique_langs = {LANGUAGE_MAP.get(l, l.upper()) for l in lang_counter if l in LANGUAGE_MAP}
    stack.extend(sorted(unique_langs))

    # Framework detection
    frameworks: list[str] = []
    combined_content = content_sample.lower()
    combined_paths = " ".join(file_paths).lower()

    for fw, signals in FRAMEWORK_SIGNALS.items():
        if any(sig.lower() in combined_content or sig.lower() in combined_paths
               for sig in signals):
            frameworks.append(fw)

    # Repo type detection
    repo_type = "library"  # default
    type_scores: dict[str, int] = {}
    for rtype, signals in REPO_TYPE_SIGNALS.items():
        score = sum(1 for sig in signals if sig.lower() in combined_content)
        if score > 0:
            type_scores[rtype] = score
    if type_scores:
        repo_type = max(type_scores, key=lambda k: type_scores[k])

    # Combine stack + key frameworks
    for fw in frameworks[:6]:
        if fw not in stack:
            stack.append(fw)

    return dominant_language, stack[:10], frameworks[:8], repo_type


def build_file_tree(file_paths: list[str], max_depth: int = 3) -> str:
    """Build ASCII directory tree from flat list of file paths."""
    tree: dict = {}

    for fp in file_paths:
        parts = PurePosixPath(fp.replace("\\", "/")).parts
        parts = parts[:max_depth]
        node = tree
        for part in parts:
            node = node.setdefault(part, {})

    def render(node: dict, prefix: str = "", is_last: bool = True) -> list[str]:
        lines: list[str] = []
        items = sorted(node.items())
        for idx, (name, children) in enumerate(items):
            last = idx == len(items) - 1
            connector = "└── " if last else "├── "
            lines.append(f"{prefix}{connector}{name}")
            if children:
                ext = "    " if last else "│   "
                lines.extend(render(children, prefix + ext, last))
        return lines

    lines = render(tree)
    return "\n".join(lines[:60])  # Cap at 60 lines


def extract_key_entry_points(file_paths: list[str], frameworks: list[str]) -> list[str]:
    """Identify the most important files to understand the codebase."""
    priority_patterns = [
        r"main\.(py|ts|js|go|rs)$",
        r"app\.(py|ts|js)$",
        r"index\.(ts|js)$",
        r"server\.(ts|js|py)$",
        r"settings?\.(py|ts|js)$",
        r"config\.(py|ts|js)$",
        r"schema(s)?\.(py|ts|prisma)$",
        r"model(s)?\.(py|ts)$",
        r"router(s)?\.(py|ts)$",
        r"routes?\.(py|ts)$",
        r"auth\.(py|ts|js)$",
        r"middleware\.(py|ts|js)$",
        r"Dockerfile$",
        r"docker-compose\.yml$",
        r"README\.md$",
        r"package\.json$",
        r"requirements\.txt$",
        r"pyproject\.toml$",
    ]
    results: list[str] = []
    for path in file_paths:
        normalized = path.replace("\\", "/")
        for pattern in priority_patterns:
            if re.search(pattern, normalized, re.IGNORECASE):
                results.append(normalized)
                break
    return list(dict.fromkeys(results))[:8]  # deduplicate, cap at 8


# ---------------------------------------------------------------------------
# LLM Persona Generation
# ---------------------------------------------------------------------------

PERSONA_SYSTEM_PROMPT = """You are an expert software architect analyzing a codebase.
Given repository metadata and code samples, generate a concise, precise technical profile.
Respond ONLY with valid JSON matching the exact schema provided.
Do not include markdown code fences or explanation text outside the JSON.
"""


async def generate_persona_with_llm(
    repo_name: str,
    dominant_language: str,
    stack: list[str],
    frameworks: list[str],
    repo_type: str,
    file_tree: str,
    entry_points: list[str],
    content_sample: str,
) -> dict:
    """Call LLM to generate the rich persona fields."""
    client = get_llm_client()

    user_prompt = f"""Analyze this repository and return a JSON object with EXACTLY these keys:

Repository: {repo_name}
Detected language: {dominant_language}
Detected stack: {", ".join(stack)}
Detected frameworks: {", ".join(frameworks)}
Repo type: {repo_type}

File structure:
{file_tree}

Key entry points: {", ".join(entry_points)}

Code sample (first 3000 chars):
{content_sample[:3000]}

Return JSON with exactly these keys — no extra keys, no omissions:
{{
  "architecture_style": "one of: MVC, microservices, layered, event-driven, monolithic, serverless, modular-monolith",
  "expertise_level": "one of: beginner-friendly, intermediate, expert",
  "architecture_overview": "2-3 paragraph plain-English description of how this system works, its key modules, and how they interact",
  "onboarding_guide": "markdown string with ## headers — 5 numbered steps: 1) Setup, 2) Understand the entry point, 3) Key files to read, 4) First change to make, 5) Running tests",
  "conventions": "2-3 sentences describing naming conventions, code style patterns, and any notable project conventions",
  "suggested_questions": [
    {{"label": "Entry point", "question": "What is the main entry point of this application and how does request flow work?", "category": "architecture"}},
    {{"label": "Auth flow", "question": "How is authentication and authorization implemented in this repo?", "category": "implementation"}},
    {{"label": "Data model", "question": "What is the data model and how is the database schema structured?", "category": "implementation"}},
    {{"label": "Error handling", "question": "How are errors handled across the application?", "category": "debugging"}},
    {{"label": "Testing", "question": "How is the test suite organized and what testing patterns are used?", "category": "onboarding"}}
  ]
}}

Make the suggested_questions SPECIFIC to this repository (reference actual file names or modules you can see).
The onboarding_guide must reference ACTUAL file paths visible in the file structure above.
"""

    response = await client.chat.completions.create(
        model=get_model_name(),
        messages=[
            {"role": "system", "content": PERSONA_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=2048,
    )

    raw = response.choices[0].message.content or "{}"

    # Strip markdown code fences if model adds them
    raw = re.sub(r"^```(?:json)?\n?", "", raw.strip())
    raw = re.sub(r"\n?```$", "", raw.strip())

    return json.loads(raw)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/", response_model=PersonaResponse, summary="Generate repo persona")
async def generate_persona(request: PersonaRequest):
    """
    Full persona generation pipeline:
      1. Fetch all chunks from Qdrant for this repo
      2. Detect language, stack, frameworks from chunk metadata
      3. Build ASCII file tree
      4. Identify key entry points
      5. Call LLM to generate identity card, arch overview, onboarding, questions
      6. Return structured PersonaResponse (cached in memory)
    """
    # ── Cache hit ─────────────────────────────────────────────────────────────
    if request.repo_id in _persona_cache:
        return _persona_cache[request.repo_id]

    # ── 1. Fetch chunks ────────────────────────────────────────────────────────
    try:
        chunks = await list_repo_chunks(request.repo_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch repo chunks: {e}")

    if not chunks:
        raise HTTPException(
            status_code=404,
            detail="No indexed chunks found for this repo. Run ingestion first."
        )

    # ── 2. Detect stack ────────────────────────────────────────────────────────
    dominant_language, stack, frameworks, repo_type = detect_language_and_stack(chunks)

    # ── 3. Build file tree ────────────────────────────────────────────────────
    all_paths = list({c.get("file_path", "") for c in chunks if c.get("file_path")})
    file_tree = build_file_tree(all_paths)

    # ── 4. Entry points ────────────────────────────────────────────────────────
    entry_points = extract_key_entry_points(all_paths, frameworks)

    # ── 5. Repo name from URL ──────────────────────────────────────────────────
    repo_name = request.repo_url.rstrip("/").split("/")[-1] or request.repo_id

    # ── 6. Content sample for LLM ─────────────────────────────────────────────
    content_sample = "\n".join(c.get("content", "") for c in chunks[:30])

    # ── 7. LLM generation ─────────────────────────────────────────────────────
    try:
        llm_data = await generate_persona_with_llm(
            repo_name=repo_name,
            dominant_language=dominant_language,
            stack=stack,
            frameworks=frameworks,
            repo_type=repo_type,
            file_tree=file_tree,
            entry_points=entry_points,
            content_sample=content_sample,
        )
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {e}")

    # ── 8. Build response ──────────────────────────────────────────────────────
    raw_questions = llm_data.get("suggested_questions", [])
    suggested_questions = [
        SuggestedQuestion(
            label=q.get("label", f"Question {i+1}"),
            question=q.get("question", ""),
            category=q.get("category", "architecture"),
        )
        for i, q in enumerate(raw_questions[:5])
        if q.get("question")
    ]

    # Ensure we always have 5 questions
    default_questions = [
        SuggestedQuestion(label="Entry point", question="What is the main entry point and how does the application start?", category="architecture"),
        SuggestedQuestion(label="Auth flow", question="How is authentication implemented in this codebase?", category="implementation"),
        SuggestedQuestion(label="Data model", question="What is the data model and how is the database structured?", category="implementation"),
        SuggestedQuestion(label="Error handling", question="How are errors and exceptions handled across this codebase?", category="debugging"),
        SuggestedQuestion(label="Testing", question="What testing patterns and frameworks are used in this repo?", category="onboarding"),
    ]
    while len(suggested_questions) < 5:
        suggested_questions.append(default_questions[len(suggested_questions)])

    persona = PersonaResponse(
        repo_name=repo_name,
        dominant_language=dominant_language,
        stack=stack,
        frameworks=frameworks,
        repo_type=repo_type,
        architecture_style=llm_data.get("architecture_style", "layered"),
        expertise_level=llm_data.get("expertise_level", "intermediate"),
        file_tree=file_tree,
        architecture_overview=llm_data.get("architecture_overview", ""),
        onboarding_guide=llm_data.get("onboarding_guide", ""),
        conventions=llm_data.get("conventions", ""),
        key_entry_points=entry_points,
        suggested_questions=suggested_questions,
        total_files=len(all_paths),
        total_chunks=len(chunks),
    )

    # Cache result
    _persona_cache[request.repo_id] = persona
    return persona


@router.get("/{repo_id}", response_model=PersonaResponse, summary="Get cached repo persona")
async def get_persona(repo_id: str):
    """Return the cached persona for a repo (fast path)."""
    if repo_id in _persona_cache:
        return _persona_cache[repo_id]
    raise HTTPException(
        status_code=404,
        detail="Persona not yet generated for this repo. Call POST /api/v1/persona first."
    )


@router.delete("/{repo_id}/cache", summary="Clear persona cache for a repo")
async def clear_persona_cache(repo_id: str):
    """Invalidate the persona cache (call after re-ingestion)."""
    _persona_cache.pop(repo_id, None)
    return {"cleared": True, "repo_id": repo_id}
