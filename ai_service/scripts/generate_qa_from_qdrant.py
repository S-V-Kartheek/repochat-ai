"""
generate_qa_from_qdrant.py
───────────────────────────────────────────────────────────────────────────────
Pulls every code chunk from your Qdrant collection, sends them to Groq in
batches, and asks Groq to generate realistic developer Q&A pairs.

This creates DOMAIN-SPECIFIC training data — the exact type of questions
RepoTalk users ask, with cited answers grounded in real code.

How it works:
  1. Scroll through ALL chunks in Qdrant (using list_repo_chunks logic)
  2. For each chunk, call Groq to generate 3 Q&A pairs
  3. Save everything as JSONL in the Alpaca format

Run:
    cd ai_service
    python scripts/generate_qa_from_qdrant.py

Output:
    ai_service/training_data/repotalk_domain.jsonl

Cost estimate:
    ~1000 chunks × 3 Q&A × ~500 tokens each ≈ 1.5M tokens
    Groq free tier: 6000 tokens/min → ~4 hours unattended
    Groq paid:      $0.05/1M tokens  → ~$0.075 total (near zero)
"""

import asyncio
import json
import sys
import time
from pathlib import Path

# ── Make ai_service importable ───────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

from openai import AsyncOpenAI
from app.config import settings
from app.core.vector_store import get_qdrant_client
from qdrant_client.http import models as rest

# ── Config ────────────────────────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).parent.parent / "training_data"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "repotalk_domain.jsonl"

QDRANT_COLLECTION = settings.QDRANT_COLLECTION
GROQ_MODEL        = "llama-3.3-70b-versatile"   # fast + free tier friendly
QA_PER_CHUNK      = 3                            # questions generated per chunk
BATCH_SIZE        = 256                          # chunks fetched per scroll page
RATE_LIMIT_SLEEP  = 2.0                          # seconds between Groq calls (free tier safe)
MIN_CHUNK_CHARS   = 80                           # skip tiny chunks

# ── Groq client ───────────────────────────────────────────────────────────────
groq = AsyncOpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=settings.GROQ_API_KEY,
)

# ── Prompt ────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert software engineer creating a training dataset 
for a code Q&A AI assistant. Your job is to generate realistic developer questions 
and high-quality answers based on real code chunks."""

def build_user_prompt(chunk: dict) -> str:
    file_path = chunk.get("file_path", "unknown")
    content   = chunk.get("content", "")
    functions = chunk.get("function_names", [])
    classes   = chunk.get("class_names", [])
    language  = chunk.get("language", "unknown")

    symbols = ""
    if functions:
        symbols += f"Functions: {', '.join(functions[:5])}\n"
    if classes:
        symbols += f"Classes: {', '.join(classes[:3])}\n"

    return f"""Given this code chunk from a repository, generate exactly {QA_PER_CHUNK} realistic developer Q&A pairs.

FILE: {file_path}
LANGUAGE: {language}
{symbols}
CODE:
```
{content[:1500]}
```

Rules:
- Questions must be what a real developer would ask (not trivial)
- Answers must be grounded in the code above, specific and technical
- Include the file path as a citation in each answer
- Vary question types: "how does X work?", "what does Y return?", "why is Z done this way?"
- Each answer should be 2-4 sentences

Respond with ONLY valid JSON array, no other text:
[
  {{
    "question": "...",
    "answer": "... (See {file_path})"
  }},
  ...
]"""


async def scroll_all_chunks() -> list[dict]:
    """Fetch every chunk payload from Qdrant (no filtering — all repos)."""
    client = await get_qdrant_client()
    offset = None
    all_chunks = []

    print("📦  Scrolling Qdrant collection...")
    while True:
        records, offset = await client.scroll(
            collection_name=QDRANT_COLLECTION,
            limit=BATCH_SIZE,
            with_payload=True,
            with_vectors=False,
            offset=offset,
        )
        for record in records:
            if record.payload:
                all_chunks.append(dict(record.payload))

        print(f"    Fetched {len(all_chunks):,} chunks so far...", end="\r")

        if offset is None:
            break

    print(f"\n✅  Total chunks in Qdrant: {len(all_chunks):,}")
    return all_chunks


async def generate_qa_for_chunk(chunk: dict) -> list[dict]:
    """Ask Groq to generate Q&A pairs for one chunk. Returns list of dicts."""
    try:
        response = await groq.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": build_user_prompt(chunk)},
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        raw = response.choices[0].message.content.strip()

        # Parse JSON — be lenient
        # Sometimes the model wraps in ```json ... ```
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        pairs = json.loads(raw)

        # Convert to Alpaca format
        results = []
        for pair in pairs:
            if not isinstance(pair, dict):
                continue
            q = pair.get("question", "").strip()
            a = pair.get("answer", "").strip()
            if len(q) < 10 or len(a) < 20:
                continue
            results.append({
                "instruction": q,
                "input": f"[Context from {chunk.get('file_path', 'unknown')}]\n\n{chunk.get('content', '')[:800]}",
                "output": a,
                "source": "repotalk_qdrant_generated",
                "file_path": chunk.get("file_path"),
                "repo_id": chunk.get("repo_id"),
            })
        return results

    except json.JSONDecodeError:
        # Groq returned bad JSON — skip this chunk
        return []
    except Exception as e:
        print(f"\n  ⚠️  Error on chunk {chunk.get('file_path')}: {e}")
        return []


async def main():
    print("=" * 60)
    print("  RepoTalk — Q&A Dataset Generator")
    print("  Source: Your Qdrant vector store")
    print("=" * 60)

    # 1. Fetch all chunks
    chunks = await scroll_all_chunks()

    # Filter out tiny/useless chunks
    chunks = [c for c in chunks if len(c.get("content", "")) >= MIN_CHUNK_CHARS]
    print(f"📋  Chunks after length filter: {len(chunks):,}")

    if len(chunks) == 0:
        print("\n❌  No chunks found. Have you indexed any repos yet?")
        print("    Go to RepoTalk → Repos → Add a repo first.")
        return

    # 2. Generate Q&A and write incrementally
    total_qa = 0
    errors   = 0

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for i, chunk in enumerate(chunks):
            # Progress
            pct = (i + 1) / len(chunks) * 100
            print(f"  [{i+1:>4}/{len(chunks)}] {pct:5.1f}%  {chunk.get('file_path', '')[:60]}", end="\r")

            # Generate
            qa_pairs = await generate_qa_for_chunk(chunk)

            # Write each pair immediately (crash-safe)
            for pair in qa_pairs:
                f.write(json.dumps(pair, ensure_ascii=False) + "\n")
                total_qa += 1

            if not qa_pairs:
                errors += 1

            # Rate limit — be nice to Groq free tier
            await asyncio.sleep(RATE_LIMIT_SLEEP)

            # Print stats every 50 chunks
            if (i + 1) % 50 == 0:
                print(f"\n  ── Checkpoint: {total_qa} Q&A pairs, {errors} errors ──")

    print(f"\n\n{'='*60}")
    print(f"✅  DONE!")
    print(f"    Q&A pairs generated : {total_qa:,}")
    print(f"    Chunks skipped      : {errors:,}")
    print(f"    Output file         : {OUTPUT_FILE}")
    print(f"    File size           : {OUTPUT_FILE.stat().st_size / 1_048_576:.1f} MB")
    print(f"{'='*60}")
    print(f"\nNext step: Merge with public_base.jsonl and upload to Kaggle/Colab")


if __name__ == "__main__":
    asyncio.run(main())
