"""
Eval: RAGAS Runner
Executes RAGAS evaluation using Groq/Ollama as the evaluator LLM.
NO OpenAI dependency — fully free.

Phase 2 — Week 6 implementation.
"""

from app.models.schemas import EvalRequest, EvalResponse


async def run_ragas_evaluation(request: EvalRequest) -> EvalResponse:
    """
    Run RAGAS metrics on a single question-answer-context triplet.

    Setup (done once at startup):
      - Configure RAGAS LLM wrapper pointing to Groq or Ollama
      - Configure RAGAS embeddings wrapper using local sentence-transformers model
      → This ensures ZERO external API costs for evaluation

    Metrics computed:
      - faithfulness:      Uses LLM-as-judge to check if answer is grounded in context
      - answer_relevancy:  Uses embeddings + LLM to check if answer addresses the question
      - context_precision: Checks if retrieved chunks are actually relevant

    Phase 6 note: Evaluation runs asynchronously — results are stored in DB
    and shown on the evaluation dashboard. Does NOT block the chat response.
    """
    # TODO: Implement in Phase 2 - Week 6
    raise NotImplementedError("Phase 2 Week 6")


def get_overall_grade(faithfulness: float, relevancy: float, precision: float) -> str:
    """
    Compute an overall quality grade from individual RAGAS metrics.
    Returns: "high" (avg > 0.8), "medium" (0.6–0.8), "low" (< 0.6)
    """
    # TODO: Implement in Phase 2 - Week 6
    raise NotImplementedError("Phase 2 Week 6")
