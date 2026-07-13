"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  GitBranch,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  LayoutDashboard,
  Link2,
  Code2,
} from "lucide-react";
import { createApiClient } from "@/lib/api";
import type { Repo, IngestStatus, RepoPersona } from "@/lib/types";
import RepoIdentityCard, { RepoIdentityCardSkeleton } from "@/components/RepoIdentityCard";

// ── Language toggles ─────────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { value: "py",   label: "Python" },
  { value: "js",   label: "JavaScript" },
  { value: "ts",   label: "TypeScript" },
  { value: "jsx",  label: "JSX" },
  { value: "tsx",  label: "TSX" },
  { value: "java", label: "Java" },
  { value: "go",   label: "Go" },
  { value: "sql",  label: "SQL" },
  { value: "html", label: "HTML" },
  { value: "css",  label: "CSS" },
];

// ── Status Badge ──────────────────────────────────────────────────────────────

function RepoStatusBadge({ status, chunkCount }: { status: Repo["status"]; chunkCount: number }) {
  if (status === "INGESTING")
    return <span className="badge badge-blue"><Loader2 size={10} className="animate-spin" /> Indexing</span>;
  if (status === "READY" && chunkCount < 10)
    return <span className="badge badge-amber"><AlertTriangle size={10} /> Sparse ({chunkCount})</span>;
  if (status === "READY")
    return <span className="badge badge-green"><CheckCircle size={10} /> Ready · {chunkCount} chunks</span>;
  if (status === "ERROR")
    return <span className="badge badge-red">Error</span>;
  return <span className="badge badge-gray">Pending</span>;
}

// ── Ingestion Progress ────────────────────────────────────────────────────────

function IngestionProgress({
  repoId,
  getToken,
  onDone,
}: {
  repoId: string;
  getToken: () => Promise<string | null>;
  onDone: (status: IngestStatus) => void | Promise<void>;
}) {
  const [status, setStatus] = useState<IngestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const api = createApiClient(getToken);

  useEffect(() => {
    const poll = async () => {
      try {
        const s = await api.repos.getStatus(repoId);
        setStatus(s);
        if (s.status === "done" || s.status === "error") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          void onDone(s);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Status check failed");
      }
    };
    poll();
    intervalRef.current = setInterval(poll, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [repoId]); // eslint-disable-line

  if (error) return <p style={{ fontSize: "0.84rem", color: "var(--error)" }}>{error}</p>;
  if (!status) return <p style={{ fontSize: "0.84rem", color: "var(--text-faint)" }}>Starting…</p>;

  const pct = status.progress_pct ?? 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        <span>{status.current_stage || "Processing…"}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${Math.max(5, pct)}%` }} />
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
        {status.embedded_chunks}/{status.total_chunks} chunks embedded
      </p>
    </div>
  );
}

// ── Repo Card ─────────────────────────────────────────────────────────────────

function RepoCard({
  repo,
  deletingId,
  onOpen,
  onDelete,
}: {
  repo: Repo;
  deletingId: string | null;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const isReady = repo.status === "READY";
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" && isReady) onOpen(); }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        background: "var(--surface-3)",
        cursor: isReady ? "pointer" : "default",
        transition: "all 0.18s",
        position: "relative",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (isReady) {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-accent)";
          (e.currentTarget as HTMLElement).style.background = "var(--surface-4)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.background = "var(--surface-3)";
      }}
    >
      <div style={{
        width: "36px", height: "36px", flexShrink: 0,
        borderRadius: "8px",
        background: isReady ? "rgba(59,130,246,0.1)" : "var(--surface-4)",
        border: isReady ? "1px solid rgba(59,130,246,0.2)" : "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <GitBranch size={15} style={{ color: isReady ? "var(--primary)" : "var(--text-faint)" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: "0.84rem", fontWeight: 600, color: "#fff",
          margin: 0, marginBottom: "3px",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {repo.name.split("/")[1] || repo.name}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <RepoStatusBadge status={repo.status} chunkCount={repo.chunkCount} />
        </div>
        {repo.status === "ERROR" && repo.errorMsg && (
          <p style={{ fontSize: "0.72rem", color: "var(--error)", margin: "3px 0 0", lineHeight: 1.4 }}>
            {repo.errorMsg.slice(0, 60)}
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
        {isReady && <ChevronRight size={15} style={{ color: "var(--text-faint)" }} />}
        <button
          onClick={onDelete}
          disabled={deletingId === repo.id}
          style={{
            width: "26px", height: "26px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-faint)",
            transition: "all 0.15s",
            opacity: 0,
          }}
          className="repo-delete-btn"
          aria-label={`Delete ${repo.name}`}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.2)";
            (e.currentTarget as HTMLElement).style.color = "var(--error)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-faint)";
          }}
        >
          {deletingId === repo.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IngestPage() {
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [url, setUrl] = useState("");
  const [languages, setLanguages] = useState<string[]>(["py", "js", "ts"]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [ingestingRepoId, setIngestingRepoId] = useState<string | null>(null);
  const [readyRepoId, setReadyRepoId] = useState<string | null>(null);
  const [readyPersona, setReadyPersona] = useState<RepoPersona | null>(null);
  const [loadingPersona, setLoadingPersona] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const api = createApiClient(getToken);

  const fetchRepos = async () => {
    try {
      const list = await api.repos.list();
      setRepos(list);
    } catch { /* ignore on background refresh */ }
    finally { setLoadingRepos(false); }
  };

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
    if (isLoaded && isSignedIn) fetchRepos();
  }, [isLoaded, isSignedIn]); // eslint-disable-line

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await api.repos.create(url.trim(), languages);
      setUrl("");
      setIngestingRepoId(res.repoId);
      setReadyRepoId(null);
      setReadyPersona(null);
      await fetchRepos();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to connect repo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, repoId: string) => {
    e.stopPropagation();
    if (!confirm("Delete this repo and all its chat sessions?")) return;
    setDeletingId(repoId);
    try {
      await api.repos.delete(repoId);
      setRepos((r) => r.filter((x) => x.id !== repoId));
      if (ingestingRepoId === repoId) setIngestingRepoId(null);
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  };

  if (!isLoaded) return null;

  return (
    <div className="page-shell page-shell--wide">
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
              <LayoutDashboard size={17} color="#fff" />
            </div>
            Repository Workspace
          </div>
          <p className="page-header__subtitle">
            Connect repositories, track indexing, and launch into production-grade chat sessions.
          </p>
        </div>
        <button onClick={fetchRepos} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
        {/* ── LEFT SIDEBAR: Repo List ─────────────────────────────── */}
        <aside style={{
          width: "300px",
          flexShrink: 0,
          borderRadius: "14px",
          border: "1px solid var(--border)",
          background: "var(--surface-2)",
          overflow: "hidden",
          position: "sticky",
          top: "calc(var(--navbar-h) + 16px)",
          maxHeight: "calc(100vh - var(--navbar-h) - 80px)",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(255,255,255,0.02)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{
                fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.07em", color: "var(--text-faint)",
              }}>
                Connected Repos
              </span>
              <span style={{
                fontSize: "0.72rem", fontWeight: 700,
                padding: "2px 8px", borderRadius: "999px",
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.15)",
                color: "var(--primary)",
              }}>
                {repos.length}
              </span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", margin: "4px 0 0" }}>
              Click a ready repo to open chat
            </p>
          </div>

          {/* Repo list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            {loadingRepos ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: "64px", borderRadius: "10px" }} />
                ))}
              </div>
            ) : repos.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <GitBranch size={24} style={{ color: "var(--text-faint)", margin: "0 auto 8px" }} />
                <p style={{ fontSize: "0.82rem", color: "var(--text-faint)", margin: 0 }}>
                  No repos connected yet
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {repos.map((repo) => (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    deletingId={deletingId}
                    onOpen={() => { if (repo.status === "READY") router.push(`/chat/${repo.id}`); }}
                    onDelete={(e) => handleDelete(e, repo.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── RIGHT MAIN: Connect + Progress ─────────────────────── */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Connect Card */}
          <div className="glass-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <Link2 size={18} style={{ color: "var(--primary)" }} />
              <h2 style={{ color: "#fff", margin: 0 }}>Connect New Repository</h2>
            </div>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "0 0 24px" }}>
              Paste a public GitHub URL and select languages to optimize indexing quality.
            </p>

            <form onSubmit={handleSubmit} suppressHydrationWarning style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* URL input */}
              <div>
                <label htmlFor="repo-url" className="label">GitHub Repository URL</label>
                <div style={{ position: "relative" }}>
                  <GitBranch
                    size={15}
                    style={{
                      position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)",
                      color: "var(--text-faint)", pointerEvents: "none",
                    }}
                  />
                  <input
                    id="repo-url"
                    type="url"
                    className="input"
                    placeholder="https://github.com/owner/repo"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    disabled={submitting}
                    style={{ paddingLeft: "40px" }}
                  />
                </div>
              </div>

              {/* Language filter */}
              <div>
                <label className="label">
                  <Code2 size={13} style={{ display: "inline", marginRight: "5px", verticalAlign: "middle" }} />
                  Language Filter
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const active = languages.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleLanguage(opt.value)}
                        aria-pressed={active}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          background: active ? "rgba(59,130,246,0.15)" : "var(--surface-3)",
                          color: active ? "var(--primary)" : "var(--text-muted)",
                          border: active ? "1px solid rgba(59,130,246,0.35)" : "1px solid var(--border)",
                          boxShadow: active ? "0 0 8px rgba(59,130,246,0.12)" : "none",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p style={{ fontSize: "0.73rem", color: "var(--text-faint)", margin: "8px 0 0" }}>
                  {languages.length === 0 ? "⚠ Select at least one language" : `${languages.length} language${languages.length !== 1 ? "s" : ""} selected`}
                </p>
              </div>

              {/* Error */}
              {submitError && (
                <div style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "12px 16px", borderRadius: "10px",
                  background: "var(--error-muted)", border: "1px solid rgba(239,68,68,0.2)",
                  color: "var(--error)", fontSize: "0.875rem",
                }}>
                  <AlertTriangle size={15} />
                  {submitError}
                </div>
              )}

              {/* Submit */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  type="submit"
                  suppressHydrationWarning
                  className="btn btn-primary"
                  disabled={submitting || !url.trim() || languages.length === 0}
                >
                  {submitting ? (
                    <><Loader2 size={15} className="animate-spin" /> Starting Ingestion…</>
                  ) : (
                    <><Plus size={15} /> Connect Repository</>
                  )}
                </button>
                {submitting && (
                  <span style={{ fontSize: "0.8rem", color: "var(--text-faint)" }}>
                    This may take up to 60 seconds…
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Active Ingestion Progress */}
          {ingestingRepoId && !readyRepoId && (
            <div className="glass-card" style={{ padding: "22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
                    Ingestion in Progress
                  </span>
                </div>
                <span className="badge badge-blue">
                  <Loader2 size={10} className="animate-spin" /> Running
                </span>
              </div>
              <IngestionProgress
                repoId={ingestingRepoId}
                getToken={getToken}
                onDone={async (status) => {
                  await fetchRepos();
                  if (status.status === "done") {
                    setReadyRepoId(ingestingRepoId);
                    setLoadingPersona(true);
                    let attempts = 0;
                    const pollPersona = async () => {
                      try {
                        const persona = await api.repos.getPersona(ingestingRepoId);
                        if (persona && persona.repo_name) {
                          setReadyPersona(persona);
                          setLoadingPersona(false);
                          return;
                        }
                      } catch { /* retry */ }
                      attempts++;
                      if (attempts < 15) setTimeout(pollPersona, 2000);
                      else setLoadingPersona(false);
                    };
                    setTimeout(pollPersona, 1000);
                  } else {
                    setIngestingRepoId(null);
                  }
                }}
              />
            </div>
          )}

          {/* Repo Ready */}
          {readyRepoId && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {loadingPersona ? (
                <RepoIdentityCardSkeleton />
              ) : readyPersona ? (
                <>
                  <RepoIdentityCard
                    persona={readyPersona}
                    onRegenerate={async () => {
                      setLoadingPersona(true);
                      try {
                        const fresh = await api.repos.refreshPersona(readyRepoId);
                        setReadyPersona(fresh);
                      } finally {
                        setLoadingPersona(false);
                      }
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => router.push(`/chat/${readyRepoId}`)} className="btn btn-primary">
                      Start Chatting <ChevronRight size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="glass-card" style={{ padding: "24px", textAlign: "center" }}>
                  <CheckCircle size={28} style={{ color: "var(--success)", margin: "0 auto 12px" }} />
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "0 0 16px" }}>
                    Repository is ready! Persona generation timed out.
                  </p>
                  <button onClick={() => router.push(`/chat/${readyRepoId}`)} className="btn btn-primary">
                    Start Chatting <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty state hint */}
          {!ingestingRepoId && !readyRepoId && repos.length === 0 && !loadingRepos && (
            <div style={{
              padding: "40px 24px", textAlign: "center",
              borderRadius: "14px", border: "1px dashed var(--border)",
            }}>
              <GitBranch size={32} style={{ color: "var(--text-faint)", margin: "0 auto 12px" }} />
              <h3 style={{ color: "var(--text-muted)", marginBottom: "6px" }}>No repositories yet</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-faint)", maxWidth: "380px", margin: "0 auto" }}>
                Paste a GitHub URL above to index your first codebase. Indexing typically takes under 60 seconds.
              </p>
            </div>
          )}
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .repo-delete-btn { opacity: 0; }
        div:hover > .repo-delete-btn,
        .repo-delete-btn:focus { opacity: 1; }
      `}} />
    </div>
  );
}
