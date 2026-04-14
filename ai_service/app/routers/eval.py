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
    # TODO: Implement in Phase 2 - Week 6
    raise HTTPException(status_code=501, detail="Not implemented yet — Phase 2 Week 6")


@router.get("/dashboard/{repo_id}", summary="Get evaluation stats for a repo")
async def get_eval_dashboard(repo_id: str):
    """
    Return aggregated RAGAS metrics over time for the evaluation dashboard.
    Response: { avg_faithfulness, avg_relevancy, avg_precision, timeline: [...] }
    """
    # TODO: Implement in Phase 2 - Week 6
    raise HTTPException(status_code=501, detail="Not implemented yet — Phase 2 Week 6")


@router.post("/batch", summary="Run offline batch evaluation")
async def batch_evaluate(repo_id: str, dataset: list[dict]):
    """
    Run RAGAS evaluation on a pre-built Q&A dataset (20+ questions).
    Used to generate the offline evaluation report included in README.
    Input: [{ question, answer, contexts }]
    Output: CSV report with per-question scores + aggregate stats.
    """
    # TODO: Implement in Phase 2 - Week 6
    raise HTTPException(status_code=501, detail="Not implemented yet — Phase 2 Week 6")
