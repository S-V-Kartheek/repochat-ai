"""
Offline RAGAS evaluation runner for Phase 2 Week 6.

Usage (from ai_service/):
  python scripts/run_offline_ragas.py --dataset eval_datasets/react_20_questions.json
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
  sys.path.insert(0, str(ROOT))

from app.eval.ragas_runner import run_ragas_evaluation
from app.models.schemas import EvalRequest


def load_dataset(path: Path) -> list[dict]:
  with path.open("r", encoding="utf-8") as f:
    data = json.load(f)
  if not isinstance(data, list):
    raise ValueError("Dataset must be a JSON array")
  return data


async def evaluate_dataset(
  dataset: list[dict],
  repo_id: str,
  per_item_timeout: float,
  limit: int,
) -> list[dict]:
  results: list[dict] = []
  capped = dataset if limit <= 0 else dataset[:limit]
  total = len(capped)

  for idx, row in enumerate(capped, start=1):
    question = str(row.get("question", "")).strip()
    answer = str(row.get("answer", "")).strip()
    contexts_raw = row.get("contexts", [])
    contexts = [str(c) for c in contexts_raw] if isinstance(contexts_raw, list) else []
    message_id = str(row.get("message_id", f"offline-{idx:03d}"))

    request = EvalRequest(
      question=question,
      answer=answer,
      contexts=contexts,
      repo_id=repo_id,
      message_id=message_id,
    )

    print(f"[{idx}/{total}] Evaluating {message_id} ...", flush=True)

    try:
      response = await asyncio.wait_for(run_ragas_evaluation(request), timeout=per_item_timeout)
      result_row = response.model_dump()
    except asyncio.TimeoutError:
      result_row = {
        "faithfulness": 0.0,
        "answer_relevancy": 0.0,
        "context_precision": 0.0,
        "overall": "unknown",
        "message_id": message_id,
        "error": f"Timed out after {per_item_timeout}s",
      }
    result_row["question"] = question
    results.append(result_row)
    print(
      f"[{idx}/{total}] Done: overall={result_row.get('overall', 'unknown')}, "
      f"faithfulness={result_row.get('faithfulness', 0.0)}",
      flush=True,
    )
  return results


def summarize(results: list[dict]) -> dict:
  faithfulness = [float(r.get("faithfulness", 0.0) or 0.0) for r in results]
  relevancy = [float(r.get("answer_relevancy", 0.0) or 0.0) for r in results]
  precision = [float(r.get("context_precision", 0.0) or 0.0) for r in results]

  grade_counts: dict[str, int] = {"high": 0, "medium": 0, "low": 0, "unknown": 0}
  for row in results:
    overall = str(row.get("overall", "unknown")).lower()
    if overall not in grade_counts:
      overall = "unknown"
    grade_counts[overall] += 1

  return {
    "count": len(results),
    "avg_faithfulness": mean(faithfulness) if faithfulness else 0.0,
    "avg_answer_relevancy": mean(relevancy) if relevancy else 0.0,
    "avg_context_precision": mean(precision) if precision else 0.0,
    "grade_counts": grade_counts,
  }


def main() -> None:
  parser = argparse.ArgumentParser(description="Run offline RAGAS over a JSON dataset.")
  parser.add_argument(
    "--dataset",
    default="eval_datasets/react_20_questions.json",
    help="Path to JSON dataset file",
  )
  parser.add_argument(
    "--repo-id",
    default="offline-react-benchmark",
    help="Repo id label stored in eval requests",
  )
  parser.add_argument(
    "--out",
    default="eval_reports/latest_offline_eval.json",
    help="Output report path",
  )
  parser.add_argument(
    "--per-item-timeout",
    type=float,
    default=45.0,
    help="Timeout (seconds) per dataset item",
  )
  parser.add_argument(
    "--limit",
    type=int,
    default=0,
    help="Optional number of rows to run from the dataset (0 = all)",
  )
  args = parser.parse_args()

  dataset_path = Path(args.dataset)
  out_path = Path(args.out)
  out_path.parent.mkdir(parents=True, exist_ok=True)

  dataset = load_dataset(dataset_path)
  results = asyncio.run(
    evaluate_dataset(
      dataset=dataset,
      repo_id=args.repo_id,
      per_item_timeout=args.per_item_timeout,
      limit=args.limit,
    )
  )
  summary = summarize(results)

  report = {
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "dataset_path": str(dataset_path),
    "repo_id": args.repo_id,
    "summary": summary,
    "results": results,
  }

  with out_path.open("w", encoding="utf-8") as f:
    json.dump(report, f, indent=2)

  print("Offline RAGAS evaluation complete")
  print(f"- samples: {summary['count']}")
  print(f"- avg faithfulness: {summary['avg_faithfulness']:.3f}")
  print(f"- avg answer_relevancy: {summary['avg_answer_relevancy']:.3f}")
  print(f"- avg context_precision: {summary['avg_context_precision']:.3f}")
  print(f"- grades: {summary['grade_counts']}")
  print(f"- report: {out_path}")


if __name__ == "__main__":
  main()
