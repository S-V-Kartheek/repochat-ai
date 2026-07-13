"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bookmark,
  Search,
  Clock,
  MessageSquare,
  Loader2,
  GitBranch,
  RefreshCw,
  AlertTriangle,
  ServerOff,
  X,
} from "lucide-react";
import { createApiClient } from "@/lib/api";
import type { BookmarkedMessage } from "@/lib/types";
import CitationChip from "@/components/CitationChip";

// ── Backend offline detector ──────────────────────────────────────────────────

function isOfflineError(msg: string) {
  return (
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("network") ||
    msg.toLowerCase().includes("econnrefused") ||
    msg.toLowerCase().includes("load failed")
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BookmarksPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = createApiClient(getToken);
      const data = await api.sessions.getBookmarks();
      setBookmarks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLoading(false); return; }
    fetchBookmarks();
  }, [isLoaded, isSignedIn, fetchBookmarks]);

  const filtered = bookmarks.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.content.toLowerCase().includes(q) ||
      b.session.repo.name.toLowerCase().includes(q) ||
      (b.session.title && b.session.title.toLowerCase().includes(q))
    );
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!isLoaded || loading) {
    return (
      <div className="page-shell">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
          <Loader2 size={24} className="animate-spin" style={{ color: "var(--primary)" }} />
        </div>
      </div>
    );
  }

  // ── Not signed in ─────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="page-shell">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "55vh", textAlign: "center", padding: "24px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <Bookmark size={24} style={{ color: "var(--text-faint)" }} />
          </div>
          <h2 style={{ color: "#fff", marginBottom: "8px" }}>Sign in to view bookmarks</h2>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "24px", maxWidth: "340px" }}>
            Your saved answers and code snippets will appear here.
          </p>
          <Link href="/sign-in" className="btn btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header__left">
          <div className="page-header__title">
            <div style={{
              width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--glow-primary)",
            }}>
              <Bookmark size={16} color="#fff" />
            </div>
            Bookmarks
          </div>
          <p className="page-header__subtitle">
            Your personal knowledge base — <strong style={{ color: "var(--text)" }}>{bookmarks.length}</strong>{" "}
            saved {bookmarks.length === 1 ? "answer" : "answers"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {bookmarks.length > 0 && (
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Search bookmarks…"
                className="input"
                style={{ paddingLeft: "36px", width: "220px" }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search bookmarks"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", display: "flex" }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
          <button onClick={fetchBookmarks} className="btn btn-secondary btn-sm">
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Backend Offline Error ──────────────────────────────────── */}
      {error && isOfflineError(error) && (
        <div style={{
          padding: "24px 28px", borderRadius: "14px", marginBottom: "24px",
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
          display: "flex", alignItems: "flex-start", gap: "16px",
        }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ServerOff size={20} style={{ color: "var(--warning)" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: "#fff", margin: "0 0 4px", fontSize: "0.95rem" }}>
              Backend not reachable
            </p>
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
              The RepoTalk API server isn&apos;t running. Start the gateway with{" "}
              <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em", background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "4px", color: "#fff" }}>
                npm run dev
              </code>{" "}
              in the <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8em", background: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "4px", color: "#fff" }}>gateway/</code> folder,
              then refresh this page.
            </p>
            <button onClick={fetchBookmarks} className="btn btn-secondary btn-sm">
              <RefreshCw size={13} />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Generic Error ─────────────────────────────────────────── */}
      {error && !isOfflineError(error) && (
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "14px 18px", borderRadius: "12px", marginBottom: "20px",
          background: "var(--error-muted)", border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--error)", fontSize: "0.875rem",
        }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={fetchBookmarks} style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--error)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Retry
          </button>
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────── */}
      {!error && bookmarks.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center", borderRadius: "16px", border: "1px dashed var(--border)" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--surface-2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
            <Bookmark size={22} style={{ color: "var(--text-faint)" }} />
          </div>
          <h3 style={{ marginBottom: "8px", color: "var(--text-muted)" }}>No bookmarks yet</h3>
          <p style={{ fontSize: "0.875rem", color: "var(--text-faint)", maxWidth: "340px", margin: "0 0 24px" }}>
            When you get an answer in chat, click the bookmark icon to save it here for future reference.
          </p>
          <Link href="/ingest" className="btn btn-secondary">
            Browse Repositories
          </Link>
        </div>
      )}

      {/* ── No Search Results ────────────────────────────────────── */}
      {!error && bookmarks.length > 0 && filtered.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          No bookmarks match &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      {/* ── Bookmark Cards ───────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filtered.map((bookmark) => (
            <article
              key={bookmark.id}
              style={{
                borderRadius: "14px", overflow: "hidden",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border)")}
            >
              {/* Card header */}
              <div style={{
                display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
                gap: "10px", padding: "12px 18px",
                background: "var(--surface-2)", borderBottom: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    fontSize: "0.75rem", fontWeight: 600, fontFamily: "var(--font-mono)",
                    padding: "3px 10px", borderRadius: "6px",
                    background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                    color: "var(--primary-dim)",
                  }}>
                    <GitBranch size={11} />
                    {bookmark.session.repo.name}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {bookmark.session.title || "Untitled Session"}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "0.75rem", color: "var(--text-faint)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={11} />
                    {new Date(bookmark.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    {" · "}
                    {new Date(bookmark.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Link
                    href={`/chat/${bookmark.session.repo.id}?session=${bookmark.session.id}`}
                    style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--primary)", fontWeight: 600, fontSize: "0.78rem" }}
                  >
                    <MessageSquare size={11} />
                    Open in Chat
                  </Link>
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "18px 20px" }}>
                <div className="prose-dark" style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "var(--text)" }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: ({ children, className }) => {
                        const isBlock = className?.includes("language-");
                        return isBlock ? (
                          <pre style={{
                            margin: "10px 0", padding: "12px 14px",
                            borderRadius: "8px",
                            background: "var(--code-bg)", border: "1px solid var(--code-border)",
                            overflowX: "auto", fontSize: "0.79rem",
                            fontFamily: "var(--font-mono)", lineHeight: 1.6,
                          }}>
                            <code style={{ color: "var(--code-text)" }}>{children}</code>
                          </pre>
                        ) : (
                          <code style={{
                            padding: "0.1em 0.4em", borderRadius: "5px",
                            background: "rgba(59,130,246,0.1)", color: "var(--primary-dim)",
                            fontSize: "0.83em", fontFamily: "var(--font-mono)",
                            border: "1px solid rgba(59,130,246,0.15)",
                          }}>
                            {children}
                          </code>
                        );
                      },
                    }}
                  >
                    {bookmark.content}
                  </ReactMarkdown>
                </div>

                {bookmark.citations && bookmark.citations.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "14px", paddingTop: "12px", borderTop: "1px dashed var(--border)" }}>
                    {bookmark.citations.map((c, i) => (
                      <CitationChip key={i} citation={c} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
