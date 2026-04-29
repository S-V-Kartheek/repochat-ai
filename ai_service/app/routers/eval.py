"""
Router: /api/v1/eval
RAGAS evaluation — score each answer for faithfulness, relevancy, and context precision.
Configured to use Groq/Ollama as evaluator LLM (no OpenAI dependency).

Phase 2 — Week 6 implementation.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.models.schemas import EvalRequest, EvalResponse

router = APIRouter()


@router.post("/score", response_model=EvalResponse, summary="Evaluate a single QA pair")
async def score_answer(request: EvalRequest, background_tasks: BackgroundTasks):
    """
    Run RAGAS evaluation asynchronously after an answer is generated.

    Metrics computed:
      - faithfulness:        Is the answer grounded in the retrieved context?
      - answer_relevancy:    Does the answer address the question?
      - context_precision:  Are the retrieved chunks actually relevant?

    Uses Groq (Llama 3.3 70B) or Ollama as the evaluator LLM.
    Stores scores in PostgreSQL via Node gateway callback.
    """
    from app.eval.ragas_runner import run_ragas_evaluation
    # Since it's a slow process, we could run it in background, 
    # but the node gateway currently expects a direct response or we could return immediately.
    # For simplicity, we just await it here as a blocking endpoint (which matches the EvalResponse return type).
    try:
        result = await run_ragas_evaluation(request)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Deterministic fallback instead of 500
        return EvalResponse(
            faithfulness=0.0,
            answer_relevancy=0.0,
            context_precision=0.0,
            overall="unknown",
            message_id=request.message_id
        )

@router.get("/dashboard/{repo_id}", summary="Get evaluation stats for a repo")
async def get_eval_dashboard(repo_id: str):
    """
    Return aggregated RAGAS metrics over time for the evaluation dashboard.
    Response: { avg_faithfulness, avg_relevancy, avg_precision, timeline: [...] }
    Note: Currently gateway handles DB directly, so this returns empty/mock from AI service.
    """
    return {
        "avg_faithfulness": 0.0,
        "avg_relevancy": 0.0,
        "avg_precision": 0.0,
        "timeline": []
    }

@router.post("/batch", summary="Run offline batch evaluation")
async def batch_evaluate(repo_id: str, dataset: list[dict]):
    """
    Run RAGAS evaluation on a pre-built Q&A dataset (20+ questions).
    """
    from app.eval.ragas_runner import run_ragas_evaluation
    from app.models.schemas import EvalRequest
    results = []
    for item in dataset:
        try:
            req = EvalRequest(
                question=item.get("question", ""),
                answer=item.get("answer", ""),
                contexts=item.get("contexts", []),
                message_id=item.get("message_id", "batch"),
                repo_id=repo_id
            )
            res = await run_ragas_evaluation(req)
            results.append(res.dict())
        except Exception:
            results.append({"error": "Failed evaluation for item"})
    
    return {"status": "completed", "total": len(dataset), "results": results}
