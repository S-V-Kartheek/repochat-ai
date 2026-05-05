"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "@/lib/api";
import type { PRResponse } from "@/lib/types";
import {
  GitPullRequest,
  AlertTriangle,
  Loader2,
  FileCode2,
  ShieldAlert,
  BookOpen,
  Send,
} from "lucide-react";

export default function PRPage() {
  const { getToken } = useAuth();
  const api = createApiClient(getToken);

  const [prUrl, setPrUrl] = useState("");
  const [result, setResult] = useState<PRResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prUrl.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.pr.summarize(prUrl.trim());
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Summarization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ paddingTop: "calc(var(--navbar-h) + 24px)", minHeight: "100vh" }}
      className="max-w-4xl mx-auto px-4 md:px-6 pb-12"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--accent-muted)", border: "1px solid var(--border)" }}
          >
            <GitPullRequest size={20} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
              PR Summarizer
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Get a plain-English summary of any GitHub Pull Request
            </p>
          </div>
        </div>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <label className="label" htmlFor="pr-url-input">
          GitHub PR URL
        </label>
        <div className="flex gap-3">
          <input
            id="pr-url-input"
            type="url"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/pull/42"
            className="input flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !prUrl.trim()}
            className="btn btn-primary flex-shrink-0"
            style={{ height: "44px", padding: "0 20px" }}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Summarize
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 text-sm mb-6 px-4 py-3 rounded-xl"
          style={{ background: "var(--error-muted)", color: "var(--error)" }}
        >
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card px-6 py-10 text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Fetching PR diff and generating summary...
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5 slide-up">
          {/* Diff Overview */}
          <div className="card px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <FileCode2 size={16} style={{ color: "var(--accent)" }} />
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-faint)" }}
              >
                Diff Overview
              </h3>
            </div>
            <pre
              className="text-sm whitespace-pre-wrap leading-relaxed"
              style={{
                color: "var(--text)",
                fontFamily: "var(--font-sans)",
                margin: 0,
              }}
            >
              {result.diff_overview}
            </pre>
          </div>

          {/* Summary */}
          <div className="card px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} style={{ color: "#059669" }} />
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--text-faint)" }}
              >
                Summary
              </h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
              {result.summary}
            </p>
          </div>

          {/* Impact Warnings */}
          {result.impact_warnings.length > 0 && (
            <div
              className="card px-6 py-5"
              style={{ borderColor: "rgba(245,158,11,0.3)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={16} style={{ color: "#b45309" }} />
                <h3
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "#b45309" }}
                >
                  Impact Warnings
                </h3>
              </div>
              <ul className="space-y-2">
                {result.impact_warnings.map((w, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm"
                    style={{ color: "var(--text)" }}
                  >
                    <AlertTriangle
                      size={13}
                      className="flex-shrink-0 mt-0.5"
                      style={{ color: "#d97706" }}
                    />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Changed Functions */}
          {result.changed_functions.length > 0 && (
            <div className="card px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <FileCode2 size={16} style={{ color: "#6d28d9" }} />
                <h3
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-faint)" }}
                >
                  Changed Functions / Files
                </h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.changed_functions.map((fn, i) => (
                  <span key={i} className="badge badge-indigo">
                    {fn}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="text-center py-16">
          <GitPullRequest size={40} className="mx-auto mb-4" style={{ color: "var(--border)" }} />
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>
            Paste a GitHub PR URL above to get started
          </p>
        </div>
      )}
    </div>
  );
}
