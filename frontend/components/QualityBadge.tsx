import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from "lucide-react";

interface QualityBadgeProps {
  score?: {
    faithfulness?: number;
    answer_relevancy?: number;
    overall?: string;
  } | null;
  isLoading?: boolean;
}

export function QualityBadge({ score, isLoading }: QualityBadgeProps) {
  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
        <Loader2 className="w-3 h-3 animate-spin" />
        Evaluating...
      </span>
    );
  }

  if (!score) return null;

  let colorClass = "bg-green-100 text-green-800 hover:bg-green-200 border-green-200";
  let Icon = CheckCircle2;
  let label = "High Quality";

  if (score.overall === "medium") {
    colorClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200";
    Icon = AlertTriangle;
    label = "Medium Quality";
  } else if (score.overall === "low") {
    colorClass = "bg-red-100 text-red-800 hover:bg-red-200 border-red-200";
    Icon = AlertCircle;
    label = "Low Quality";
  } else if (score.overall === "unknown") {
    colorClass = "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200";
    Icon = AlertCircle;
    label = "Evaluation Unavailable";
  }

  const fScore = score.faithfulness !== undefined ? (score.faithfulness * 100).toFixed(0) : "N/A";
  const rScore = score.answer_relevancy !== undefined ? (score.answer_relevancy * 100).toFixed(0) : "N/A";

  return (
    <div className="group relative inline-flex">
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass} cursor-help border`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-white border border-gray-200 shadow-md rounded-md p-2 text-xs w-36">
        <p className="font-semibold mb-1 text-gray-800">RAGAS Evaluation</p>
        <p className="text-gray-600">Faithfulness: {fScore}%</p>
        <p className="text-gray-600">Relevancy: {rScore}%</p>
      </div>
    </div>
  );
}
