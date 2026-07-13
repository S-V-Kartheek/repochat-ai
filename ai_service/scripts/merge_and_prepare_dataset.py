"""
merge_and_prepare_dataset.py
─────────────────────────────────────────────────────────────────────────────
Merges public_base.jsonl + repotalk_domain.jsonl into a single
final training file, shuffles it, splits into train/val,
and prints statistics.

Run AFTER both other scripts have finished:
    python scripts/merge_and_prepare_dataset.py

Output:
    training_data/final_train.jsonl   (95%)
    training_data/final_val.jsonl     (5%)
"""

import json
import random
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "training_data"

SOURCES = [
    DATA_DIR / "public_base.jsonl",
    DATA_DIR / "repotalk_domain.jsonl",
]

TRAIN_FILE = DATA_DIR / "final_train.jsonl"
VAL_FILE   = DATA_DIR / "final_val.jsonl"
VAL_SPLIT  = 0.05   # 5% validation

SEED = 42


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    if not path.exists():
        print(f"  ⚠️  Not found (skipping): {path.name}")
        return rows
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                try:
                    rows.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
    return rows


def quality_filter(row: dict) -> bool:
    """Keep only rows that meet minimum quality bars."""
    instr  = row.get("instruction", "")
    output = row.get("output", "")
    # Must have real content
    if len(instr) < 15 or len(output) < 30:
        return False
    # Skip if answer is just "I don't know" style
    bad_phrases = ["i don't know", "i cannot", "i'm sorry", "as an ai"]
    if any(p in output.lower()[:100] for p in bad_phrases):
        return False
    return True


def main():
    print("=" * 60)
    print("  RepoTalk — Dataset Merge & Prepare")
    print("=" * 60)

    all_rows = []

    for src in SOURCES:
        rows = load_jsonl(src)
        print(f"\n📂  {src.name}")
        print(f"    Loaded  : {len(rows):,} rows")
        before = len(rows)
        rows = [r for r in rows if quality_filter(r)]
        print(f"    Kept    : {len(rows):,} rows (filtered {before - len(rows):,})")
        all_rows.extend(rows)

    print(f"\n📊  Total before shuffle: {len(all_rows):,}")

    # Shuffle
    random.seed(SEED)
    random.shuffle(all_rows)

    # Split
    val_count   = max(1, int(len(all_rows) * VAL_SPLIT))
    train_count = len(all_rows) - val_count

    train_rows = all_rows[:train_count]
    val_rows   = all_rows[train_count:]

    # Source breakdown
    sources = {}
    for r in all_rows:
        src = r.get("source", "unknown")
        sources[src] = sources.get(src, 0) + 1

    print(f"\n📈  Source breakdown:")
    for src, count in sorted(sources.items(), key=lambda x: -x[1]):
        pct = count / len(all_rows) * 100
        print(f"    {src:<35} {count:>6,}  ({pct:.1f}%)")

    # Write
    def write_jsonl(rows, path):
        with open(path, "w", encoding="utf-8") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")

    write_jsonl(train_rows, TRAIN_FILE)
    write_jsonl(val_rows,   VAL_FILE)

    print(f"\n✅  Done!")
    print(f"    Train  : {train_count:,} samples → {TRAIN_FILE.name}")
    print(f"    Val    : {val_count:,}  samples → {VAL_FILE.name}")
    print(f"\nNext: Upload final_train.jsonl to Kaggle and run fine-tuning.")


if __name__ == "__main__":
    main()
