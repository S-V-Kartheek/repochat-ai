"""
Eval: lightweight answer quality scoring.

The public API keeps the RAGAS-shaped fields, but this implementation avoids
blocking user chat on an extra evaluator LLM call. It computes deterministic
retrieval-quality proxies from the question, answer, and retrieved contexts.
"""

import re

from app.models.schemas import EvalRequest, EvalResponse


STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
    "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was",
    "what", "where", "when", "why", "how", "with", "you", "your", "about",
}


def _tokens(text: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-zA-Z_][a-zA-Z0-9_]{2,}", text.lower())
        if token not in STOPWORDS
    }


def _safe_ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def _round_score(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 2)


async def run_ragas_evaluation(request: EvalRequest) -> EvalResponse:
    answer_tokens = _tokens(request.answer)
    question_tokens = _tokens(request.question)
    context_text = "\n".join(request.contexts)
    context_tokens = _tokens(context_text)

    if not request.answer.strip():
        faithfulness = relevancy = precision = 0.0
    else:
        faithfulness = _safe_ratio(len(answer_tokens & context_tokens), len(answer_tokens))
        relevancy = _safe_ratio(len(question_tokens & answer_tokens), len(question_tokens))

        context_scores = []
        for context in request.contexts:
            tokens = _tokens(context)
            if tokens:
                context_scores.append(_safe_ratio(len(question_tokens & tokens), len(question_tokens)))
        precision = max(context_scores) if context_scores else 0.0

        if request.contexts:
            faithfulness = min(1.0, faithfulness + 0.15)
            precision = min(1.0, precision + 0.1)

    faithfulness = _round_score(faithfulness)
    relevancy = _round_score(relevancy)
    precision = _round_score(precision)

    return EvalResponse(
        faithfulness=faithfulness,
        answer_relevancy=relevancy,
        context_precision=precision,
        overall=get_overall_grade(faithfulness, relevancy, precision),
        message_id=request.message_id,
    )


def get_overall_grade(faithfulness: float, relevancy: float, precision: float) -> str:
    avg = (faithfulness + relevancy + precision) / 3
    if avg >= 0.8:
        return "high"
    if avg >= 0.6:
        return "medium"
    return "low"
