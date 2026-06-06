"""
Router: /api/v1/eval
Scores each answer for faithfulness, answer relevancy, and context precision.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.eval.ragas_runner import run_ragas_evaluation
from app.models.schemas import EvalRequest, EvalResponse

router = APIRouter()


@router.post("/score", response_model=EvalResponse, summary="Evaluate a single QA pair")
async def score_answer(request: EvalRequest, background_tasks: BackgroundTasks):
    try:
        return await run_ragas_evaluation(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {exc}") from exc


@router.get("/dashboard/{repo_id}", summary="Get evaluation stats for a repo")
async def get_eval_dashboard(repo_id: str):
    return {
        "repo_id": repo_id,
        "message": "Dashboard aggregation is served by the gateway from persisted message scores.",
    }


@router.post("/batch", summary="Run offline batch evaluation")
async def batch_evaluate(repo_id: str, dataset: list[dict]):
    results = []
    for index, item in enumerate(dataset):
        request = EvalRequest(
            repo_id=repo_id,
            message_id=str(item.get("message_id", f"batch-{index}")),
            question=str(item.get("question", "")),
            answer=str(item.get("answer", "")),
            contexts=[str(context) for context in item.get("contexts", [])],
        )
        results.append((await run_ragas_evaluation(request)).model_dump())
    return {"repo_id": repo_id, "count": len(results), "results": results}
