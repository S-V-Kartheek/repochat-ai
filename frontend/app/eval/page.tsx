"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  BarChart3,
  TrendingUp,
  Info,
  Download,
  Loader2,
  GitBranch,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EvalMetric {
  label: string;
  value: number;
  trend: "up" | "down" | "stable";
  description: string;
}

interface SessionEval {
  sessionId: string;
  sessionTitle: string;
  repoName: string;
  questionCount: number;
  avgFaithfulness: number;
  avgRelevancy: number;
  avgPrecision: number;
  overallTier: "high" | "medium" | "low";
  date: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_GLOBAL: EvalMetric[] = [
  { label: "Faithfulness",       value: 0.87, trend: "up",     description: "Answers grounded in source code" },
  { label: "Answer Relevancy",   value: 0.83, trend: "stable", description: "Response addresses the question" },
  { label: "Context Precision",  value: 0.79, trend: "up",     description: "Retrieval quality via RAGAS" },
  { label: "Context Recall",     value: 0.81, trend: "up",     description: "Relevant chunks retrieved" },
];

const MOCK_SESSIONS: SessionEval[] = [
  {
    sessionId: "s1", sessionTitle: "Architecture Overview",   repoName: "facebook/react",
    questionCount: 12, avgFaithfulness: 0.91, avgRelevancy: 0.88, avgPrecision: 0.82, overallTier: "high",
    date: "2024-01-15",
  },
  {
    sessionId: "s2", sessionTitle: "Auth Implementation",     repoName: "facebook/react",
    questionCount: 8,  avgFaithfulness: 0.85, avgRelevancy: 0.80, avgPrecision: 0.74, overallTier: "high",
    date: "2024-01-14",
  },
  {
    sessionId: "s3", sessionTitle: "ISR Deep Dive",           repoName: "vercel/next.js",
    questionCount: 15, avgFaithfulness: 0.79, avgRelevancy: 0.81, avgPrecision: 0.77, overallTier: "medium",
    date: "2024-01-13",
  },
  {
    sessionId: "s4", sessionTitle: "DI System Exploration",   repoName: "tiangolo/fastapi",
    questionCount: 6,  avgFaithfulness: 0.92, avgRelevancy: 0.89, avgPrecision: 0.85, overallTier: "high",
    date: "2024-01-12",
  },
  {
    sessionId: "s5", sessionTitle: "Rate Limit Handling",     repoName: "openai/openai-python",
    questionCount: 9,  avgFaithfulness: 0.71, avgRelevancy: 0.74, avgPrecision: 0.68, overallTier: "medium",
    date: "2024-01-11",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#4ade80" : pct >= 65 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div className="progress-bar-track" style={{ flex: 1 }}>
        <div
          className="progress-bar-fill"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: pct >= 80 ? "0 0 8px rgba(74,222,128,0.3)" : undefined,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
          fontWeight: 600,
          color,
          width: "36px",
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function TierBadge({ tier }: { tier: "high" | "medium" | "low" }) {
  const map = {
    high:   "eval-badge--high",
    medium: "eval-badge--medium",
    low:    "eval-badge--low",
  };
  return (
    <span className={`eval-badge ${map[tier]}`}>
      <span className="eval-dot" />
      {tier.toUpperCase()}
    </span>
  );
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up")     return <TrendingUp size={14} style={{ color: "#4ade80" }} />;
  if (trend === "down")   return <TrendingUp size={14} style={{ color: "#f87171", transform: "scaleY(-1)" }} />;
  return <span style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>—</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EvalPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<EvalMetric[]>([]);
  const [sessions, setSessions] = useState<SessionEval[]>([]);

  useEffect(() => {
    if (!isLoaded) return;
    // Simulate loading — real implementation fetches from /api/eval/summary
    setTimeout(() => {
      setMetrics(MOCK_GLOBAL);
      setSessions(MOCK_SESSIONS);
      setLoading(false);
    }, 800);
  }, [isLoaded]);

  if (!isLoaded || loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", textAlign: "center", padding: "24px" }}>
        <BarChart3 size={40} style={{ color: "var(--text-faint)", marginBottom: "16px" }} />
        <h2 style={{ color: "#fff", marginBottom: "8px" }}>Sign in to view evaluations</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "20px" }}>
          RAGAS evaluation scores are tracked per session, per repository.
        </p>
        <Link href="/sign-in" className="btn btn-primary">Sign In</Link>
      </div>
    );
  }

  const totalQuestions = sessions.reduce((s, x) => s + x.questionCount, 0);
  const avgFaithfulness = sessions.reduce((s, x) => s + x.avgFaithfulness, 0) / sessions.length;

  return (
    <main style={{ minHeight: "100vh", padding: "40px 24px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "40px", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <div
              style={{
                width: "40px", height: "40px", borderRadius: "10px",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "var(--glow-primary)",
              }}
            >
              <BarChart3 size={18} color="#fff" />
            </div>
            <h1 style={{ fontSize: "1.6rem", color: "#fff" }}>Evaluation Dashboard</h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            RAGAS-based quality metrics across all your chat sessions
          </p>
        </div>

        <button className="btn btn-secondary btn-sm">
          <Download size={14} />
          Export Report
        </button>
      </div>

      {/* ── About RAGAS ───────────────────────────────────────────── */}
      <div
        style={{
          padding: "14px 18px",
          borderRadius: "12px",
          background: "rgba(59,130,246,0.06)",
          border: "1px solid rgba(59,130,246,0.15)",
          display: "flex", alignItems: "flex-start", gap: "10px",
          marginBottom: "32px",
          fontSize: "0.84rem", color: "var(--text-muted)",
        }}
      >
        <Info size={15} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "1px" }} />
        <span>
          Scores are computed using{" "}
          <a href="https://docs.ragas.io" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
            RAGAS
          </a>{" "}
          — an open framework for RAG evaluation. Faithfulness measures hallucination,
          Relevancy measures response focus, and Context Precision measures retrieval quality.
          Scores range from 0 to 1 (higher is better).
        </span>
      </div>

      {/* ── Summary Numbers ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "32px" }}>
        {[
          { label: "Total Sessions Evaluated", value: sessions.length, icon: MessageSquare, color: "var(--primary)" },
          { label: "Total Questions Answered", value: totalQuestions,  icon: CheckCircle,   color: "#4ade80" },
          { label: "Avg Faithfulness Score",   value: avgFaithfulness.toFixed(2), icon: TrendingUp, color: "var(--tertiary)" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <Icon size={18} style={{ color: s.color }} />
                <span style={{ fontSize: "0.78rem", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  {s.label}
                </span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 700, color: "#fff", letterSpacing: "-0.03em" }}>
                {s.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Global Metrics ────────────────────────────────────────── */}
      <div style={{ marginBottom: "32px" }}>
        <h2 style={{ fontSize: "1.1rem", color: "#fff", marginBottom: "16px" }}>Global Averages</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }}>
          {metrics.map((m) => (
            <div key={m.label} className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#fff", marginBottom: "3px" }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                    {m.description}
                  </div>
                </div>
                <TrendIcon trend={m.trend} />
              </div>
              <ScoreBar value={m.value} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-Session Breakdown ─────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: "1.1rem", color: "#fff", marginBottom: "16px" }}>Session Breakdown</h2>
        <div
          className="glass-card"
          style={{ overflow: "hidden" }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr 80px",
              padding: "12px 20px",
              borderBottom: "1px solid var(--border)",
              background: "rgba(255,255,255,0.02)",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--text-faint)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              gap: "12px",
            }}
          >
            <span>Session</span>
            <span>Repository</span>
            <span>Faithfulness</span>
            <span>Relevancy</span>
            <span>Precision</span>
            <span>Overall</span>
            <span>Qs</span>
          </div>

          {/* Table rows */}
          {sessions.map((s, i) => (
            <div
              key={s.sessionId}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr 1fr 80px",
                padding: "14px 20px",
                borderBottom: i < sessions.length - 1 ? "1px solid var(--border)" : undefined,
                fontSize: "0.84rem",
                gap: "12px",
                alignItems: "center",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <div>
                <div style={{ fontWeight: 600, color: "#fff", marginBottom: "2px" }}>
                  {s.sessionTitle}
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>{s.date}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <GitBranch size={12} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
                <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
                  {s.repoName}
                </span>
              </div>

              {[s.avgFaithfulness, s.avgRelevancy, s.avgPrecision].map((v, j) => {
                const pct = Math.round(v * 100);
                const color = pct >= 80 ? "#4ade80" : pct >= 65 ? "#fbbf24" : "#f87171";
                return (
                  <span
                    key={j}
                    style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color }}
                  >
                    {v.toFixed(2)}
                  </span>
                );
              })}

              <TierBadge tier={s.overallTier} />

              <div
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.15)",
                  fontFamily: "var(--font-mono)", fontSize: "0.8rem",
                  fontWeight: 700, color: "var(--primary)",
                }}
              >
                {s.questionCount}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend ────────────────────────────────────────────────── */}
      <div style={{ marginTop: "24px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--text-faint)" }}>
        <span style={{ fontWeight: 600 }}>Score guide:</span>
        {[{ color: "#4ade80", label: "≥ 0.80 High" }, { color: "#fbbf24", label: "0.65–0.79 Medium" }, { color: "#f87171", label: "< 0.65 Low" }].map((x) => (
          <span key={x.label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: x.color }} />
            {x.label}
          </span>
        ))}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}>
          <AlertTriangle size={12} />
          Scores computed using the RAGAS framework on each assistant response
        </span>
      </div>
    </main>
  );
}
