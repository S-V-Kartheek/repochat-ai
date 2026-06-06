"use client";

import { useState } from "react";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { AlertTriangle, FileText, GitPullRequest, Loader2, ShieldCheck } from "lucide-react";

import { createApiClient } from "@/lib/api";
import type { PRSummary } from "@/lib/types";

export default function PRPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const api = createApiClient(getToken);

  const [prUrl, setPrUrl] = useState("");
  const [repoId, setRepoId] = useState("");
  const [summary, setSummary] = useState<PRSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSignedIn) {
      setError("Sign in to summarize PRs.");
      return;
    }
    setError(null);
    setSummary(null);
    setLoading(true);
    try {
      const result = await api.pr.summarize(prUrl.trim(), repoId.trim() || undefined);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not summarize this PR");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <section
        className="rounded-2xl p-6 md:p-8"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
      >
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--accent-muted)" }}>
            <GitPullRequest size={22} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              PR Summarizer
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              Paste a public GitHub pull request URL to get a concise summary, changed functions, and risk warnings.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold" htmlFor="pr-url" style={{ color: "var(--text)" }}>
              GitHub PR URL
            </label>
            <input
              id="pr-url"
              className="input w-full"
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(event) => setPrUrl(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold" htmlFor="repo-id" style={{ color: "var(--text)" }}>
              Indexed repo ID, optional
            </label>
            <input
              id="repo-id"
              className="input w-full"
              placeholder="Leave blank for standalone PR summary"
              value={repoId}
              onChange={(event) => setRepoId(event.target.value)}
            />
          </div>
          {isLoaded && isSignedIn ? (
            <button className="btn btn-primary" disabled={loading || !prUrl.trim()} type="submit">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Summarize PR
            </button>
          ) : (
            <SignInButton mode="modal">
              <button className="btn btn-primary" type="button">
                Sign in to summarize PRs
              </button>
            </SignInButton>
          )}
        </form>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "var(--error-muted)", color: "var(--error)" }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}
      </section>

      {summary && (
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl p-5 md:col-span-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="mb-2 text-lg font-semibold">Plain-English Summary</h2>
            <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>{summary.summary}</p>
            <div className="divider my-4" />
            <h3 className="mb-2 text-sm font-semibold">Diff Overview</h3>
            <p className="text-sm leading-6" style={{ color: "var(--text-muted)" }}>{summary.diffOverview}</p>
          </div>

          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck size={17} style={{ color: "var(--accent)" }} />
              Impact Warnings
            </h2>
            <ul className="space-y-2">
              {summary.impactWarnings.map((warning, index) => (
                <li key={index} className="text-sm leading-5" style={{ color: "var(--text-muted)" }}>
                  {warning}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl p-5 md:col-span-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="mb-3 text-lg font-semibold">Changed Functions</h2>
            {summary.changedFunctions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summary.changedFunctions.map((fn) => (
                  <span key={fn} className="badge badge-blue">{fn}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                No function declarations were detected in the added diff lines.
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
