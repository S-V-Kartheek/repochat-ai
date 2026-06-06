"use client";

import type { RagasScore } from "@/lib/types";

interface QualityBadgeProps {
  score: RagasScore;
}

const COLORS = {
  high: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" },
  medium: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
  low: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
};

export default function QualityBadge({ score }: QualityBadgeProps) {
  const grade = score.grade ?? (score.overall >= 0.8 ? "high" : score.overall >= 0.6 ? "medium" : "low");
  const colors = COLORS[grade];

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      title={`Faithfulness ${Math.round(score.faithfulness * 100)}% · Relevancy ${Math.round(score.answerRelevancy * 100)}% · Context ${Math.round(score.contextPrecision * 100)}%`}
    >
      RAG score {Math.round(score.overall * 100)}% · {grade}
    </div>
  );
}
