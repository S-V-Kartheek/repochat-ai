"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  GitPullRequest,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  FileCode2,
  GitMerge,
  Shield,
  Zap,
  ExternalLink,
  Info,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PRSummary {
  title: string;
  description: string;
  changedFiles: string[];
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  riskReasons: string[];
  keyChanges: string[];
  suggestedReviewers: string[];
  testingNotes: string;
  breakingChanges: boolean;
}

// ── Helper ─────────────────────────────────────────────────────────────────────

const RISK_STYLES = {
  LOW:    { badge: "badge-green",  label: "Low Risk",    icon: CheckCircle,    color: "#4ade80" },
  MEDIUM: { badge: "badge-amber",  label: "Medium Risk", icon: AlertTriangle,  color: "#fbbf24" },
  HIGH:   { badge: "badge-red",    label: "High Risk",   icon: Shield,         color: "#f87171" },
};

const EXAMPLE_PRS = [
  "https://github.com/vercel/next.js/pull/12345",
  "https://github.com/facebook/react/pull/27374",
  "https://github.com/tiangolo/fastapi/pull/10980",
];

// ── Mock summarize (replace with real API call when endpoint exists) ──────────

async function mockSummarizePR(prUrl: string): Promise<PRSummary> {
  await new Promise((r) => setTimeout(r, 2200));

  const owner = prUrl.split("/")[3] || "owner";
  const repo  = prUrl.split("/")[4] || "repo";
  const prNum = prUrl.split("/").pop() || "0";

  return {
    title: `[${owner}/${repo}] PR #${prNum}: Refactor authentication middleware`,
    description:
      `This PR refactors the authentication middleware to use Clerk JWT verification instead ` +
      `of the legacy session cookie approach. The change improves security posture by enforcing ` +
      `strict token expiry and rotating signing keys on every deployment.`,
    changedFiles: [
      "middleware/auth.ts",
      "lib/jwt.ts",
      "api/routes/protected.ts",
      "tests/auth.test.ts",
      "__mocks__/clerk.ts",
    ],
    riskLevel: "MEDIUM",
    riskReasons: [
      "Modifies core authentication path — all authenticated routes are affected",
      "JWT signing key rotation may invalidate existing sessions on deploy",
      "No migration path documented for users with active sessions",
    ],
    keyChanges: [
      "Replaced cookie-based session validation with Clerk JWT verification",
      "Added `middleware/auth.ts:validateToken()` as the new central auth guard",
      "Legacy `lib/session.ts` removed — callers updated to use `lib/jwt.ts`",
      "Test coverage added for token expiry and malformed token edge cases",
    ],
    suggestedReviewers: ["@security-team", "@backend-lead"],
    testingNotes:
      "Run `npm test -- --coverage auth` to verify. Ensure staging env has `CLERK_SECRET_KEY` set " +
      "before deploying. Manually test logout → re-login flow.",
    breakingChanges: true,
  };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PRPage() {
  const { isSignedIn } = useAuth();
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PRSummary | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prUrl.trim()) return;

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const result = await mockSummarizePR(prUrl.trim());
      setSummary(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to summarize PR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header__left">
          <div className="page-header__title">
            <div style={{
              width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--glow-primary)",
            }}>
              <GitPullRequest size={17} color="#fff" />
            </div>
            PR Summarizer
          </div>
          <p className="page-header__subtitle">
            Paste a GitHub PR URL — get a plain-English impact summary with risk assessment.
          </p>
        </div>
      </div>

      {/* ── URL Form ─────────────────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{ padding: "28px", marginBottom: "32px" }}
      >
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
            <GitPullRequest
              size={16}
              style={{
                position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                color: "var(--text-faint)", pointerEvents: "none",
              }}
            />
            <input
              id="pr-url"
              type="url"
              className="input"
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              disabled={loading}
              required
              style={{ paddingLeft: "44px" }}
              aria-label="GitHub PR URL"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !prUrl.trim()}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Analyzing…</>
            ) : (
              <>Summarize PR <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        {/* Examples */}
        <div style={{ marginTop: "16px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-faint)", flexShrink: 0 }}>Try:</span>
          {EXAMPLE_PRS.map((ex) => (
            <button
              key={ex}
              onClick={() => setPrUrl(ex)}
              style={{
                fontSize: "0.72rem",
                fontFamily: "var(--font-mono)",
                padding: "3px 10px",
                borderRadius: "6px",
                background: "var(--surface-3)",
                border: "1px solid var(--border)",
                color: "var(--text-faint)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = "var(--primary)";
                el.style.borderColor = "var(--border-accent)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = "var(--text-faint)";
                el.style.borderColor = "var(--border)";
              }}
            >
              {ex.replace("https://github.com/", "")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ────────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "14px 16px", borderRadius: "12px", marginBottom: "24px",
            background: "var(--error-muted)", border: "1px solid rgba(239,68,68,0.2)",
            color: "var(--error)",
          }}
        >
          <AlertTriangle size={16} />
          <span style={{ fontSize: "0.875rem" }}>{error}</span>
        </div>
      )}

      {/* ── Loading State ─────────────────────────────────────────────── */}
      {loading && (
        <div
          className="glass-card"
          style={{ padding: "40px", textAlign: "center" }}
        >
          <div style={{ marginBottom: "16px" }}>
            <div
              style={{
                width: "52px", height: "52px", borderRadius: "50%",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto", boxShadow: "var(--glow-primary)",
                animation: "spin 2s linear infinite",
              }}
            >
              <Loader2 size={24} color="#fff" />
            </div>
          </div>
          <p style={{ fontWeight: 600, color: "#fff", marginBottom: "6px" }}>
            Analyzing PR…
          </p>
          <p style={{ fontSize: "0.84rem", color: "var(--text-faint)" }}>
            Fetching diff, understanding context, assessing risk…
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Summary Result ─────────────────────────────────────────────── */}
      {summary && !loading && (
        <div className="slide-up" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Title + Risk */}
          <div
            className="glass-card"
            style={{ padding: "24px" }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "1.05rem", color: "#fff", lineHeight: 1.4, fontFamily: "var(--font-sans)" }}>
                {summary.title}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: 0 }}>
                <span className={`badge ${RISK_STYLES[summary.riskLevel].badge}`} style={{ whiteSpace: "nowrap" }}>
                  {summary.riskLevel} RISK
                </span>
                {summary.breakingChanges && (
                  <span className="badge badge-red" style={{ whiteSpace: "nowrap" }}>
                    ⚠ Breaking Change
                  </span>
                )}
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", lineHeight: 1.7, color: "var(--text-muted)" }}>
              {summary.description}
            </p>

            {/* PR Link */}
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                marginTop: "12px", fontSize: "0.8rem",
                color: "var(--primary)", textDecoration: "none",
              }}
            >
              <ExternalLink size={13} />
              View on GitHub
            </a>
          </div>

          {/* Three-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Key Changes */}
            <div className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <Zap size={16} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                  Key Changes
                </span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {summary.keyChanges.map((c, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.84rem" }}>
                    <span
                      style={{
                        width: "20px", height: "20px", borderRadius: "50%",
                        background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                        color: "var(--primary)", fontSize: "0.65rem", fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: "1px",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Assessment */}
            <div className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <AlertTriangle size={16} style={{ color: RISK_STYLES[summary.riskLevel].color }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                  Risk Factors
                </span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                {summary.riskReasons.map((r, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "0.84rem" }}>
                    <span style={{ color: RISK_STYLES[summary.riskLevel].color, flexShrink: 0, marginTop: "2px" }}>•</span>
                    <span style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Changed Files + Testing */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Files */}
            <div className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <FileCode2 size={16} style={{ color: "var(--tertiary)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                  Changed Files ({summary.changedFiles.length})
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {summary.changedFiles.map((f) => (
                  <div
                    key={f}
                    style={{
                      fontFamily: "var(--font-mono)", fontSize: "0.78rem",
                      padding: "6px 10px", borderRadius: "6px",
                      background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.12)",
                      color: "var(--tertiary)",
                    }}
                  >
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Testing Notes */}
            <div className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
                <Info size={16} style={{ color: "var(--secondary-dim)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff" }}>
                  Testing Notes
                </span>
              </div>
              <p style={{ fontSize: "0.84rem", lineHeight: 1.65, color: "var(--text-muted)" }}>
                {summary.testingNotes}
              </p>

              {summary.suggestedReviewers.length > 0 && (
                <div style={{ marginTop: "14px" }}>
                  <div style={{ fontSize: "0.73rem", fontWeight: 600, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
                    Suggested Reviewers
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {summary.suggestedReviewers.map((r) => (
                      <span key={r} className="badge badge-purple">{r}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTA to analyze more */}
          <div style={{ textAlign: "center", padding: "16px" }}>
            <button
              onClick={() => { setSummary(null); setPrUrl(""); }}
              className="btn btn-secondary"
            >
              <GitMerge size={15} />
              Analyze Another PR
            </button>
          </div>
        </div>
      )}

      {/* ── Sign-in prompt ─────────────────────────────────────────────── */}
      {!isSignedIn && !loading && !summary && (
        <div
          className="glass-card"
          style={{ padding: "28px", textAlign: "center", marginTop: "24px" }}
        >
          <GitPullRequest size={32} style={{ color: "var(--text-faint)", margin: "0 auto 12px" }} />
          <h3 style={{ color: "#fff", marginBottom: "8px" }}>Sign in to analyze PRs</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "16px" }}>
            PR Summarizer uses your repositories to provide context-aware analysis.
          </p>
          <Link href="/sign-in" className="btn btn-primary">
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
}
