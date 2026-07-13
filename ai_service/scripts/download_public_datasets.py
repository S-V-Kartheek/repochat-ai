"""
download_public_datasets.py
────────────────────────────
Downloads CodeAlpaca-20k and Magicoder-110K from HuggingFace,
merges them, deduplicates, and saves as a single JSONL file
in the Alpaca format ready for fine-tuning.

Run:
    python scripts/download_public_datasets.py

Output:
    ai_service/training_data/public_base.jsonl   (~130K samples)
"""

import json
import hashlib
from pathlib import Path
from datasets import load_dataset

OUTPUT_DIR = Path(__file__).parent.parent / "training_data"
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "public_base.jsonl"

# ── Datasets to download ────────────────────────────────────────────────────
DATASETS = [
    {
        "name": "sahil2801/CodeAlpaca-20k",
        "split": "train",
        # Already in Alpaca format: instruction / input / output
        "map": lambda row: {
            "instruction": row["instruction"],
            "input":       row.get("input", ""),
            "output":      row["output"],
            "source":      "CodeAlpaca-20k",
        },
    },
    {
        "name": "ise-uiuc/Magicoder-Evol-Instruct-110K",
        "split": "train",
        # Magicoder uses: problem / solution
        "map": lambda row: {
            "instruction": row["problem"],
            "input":       "",
            "output":      row["solution"],
            "source":      "Magicoder-110K",
        },
    },
]


def fingerprint(row: dict) -> str:
    """Deduplicate by hashing instruction + first 200 chars of output."""
    key = row["instruction"][:300] + row["output"][:200]
    return hashlib.md5(key.encode()).hexdigest()


def main():
    all_rows = []
    seen = set()

    for ds_config in DATASETS:
        print(f"\n📥  Downloading {ds_config['name']} ...")
        ds = load_dataset(ds_config["name"], split=ds_config["split"])
        print(f"    Raw rows: {len(ds):,}")

        mapped = [ds_config["map"](row) for row in ds]

        kept = 0
        for row in mapped:
            # Basic quality filters
            if len(row["instruction"]) < 10:
                continue
            if len(row["output"]) < 20:
                continue
            # Deduplicate
            fp = fingerprint(row)
            if fp in seen:
                continue
            seen.add(fp)
            all_rows.append(row)
            kept += 1

        print(f"    Kept after dedup + filter: {kept:,}")

    print(f"\n✅  Total combined samples: {len(all_rows):,}")

    # Save as JSONL
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for row in all_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"💾  Saved → {OUTPUT_FILE}")
    print(f"    File size: {OUTPUT_FILE.stat().st_size / 1_048_576:.1f} MB")

    # Print sample
    print("\n── Sample row ─────────────────────────────────────────────")
    sample = all_rows[0]
    print(f"  instruction: {sample['instruction'][:120]}...")
    print(f"  output:      {sample['output'][:120]}...")
    print(f"  source:      {sample['source']}")


if __name__ == "__main__":
    main()
