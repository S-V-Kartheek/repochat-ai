"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Plus,
  Trash2,
  GitBranch,
  Loader2,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  PencilLine,
  X,
  Menu,
  Check,
  ChevronDown,
  Hash,
  Clock,
} from "lucide-react";
import { createApiClient } from "@/lib/api";
import ChatPanel from "@/components/ChatPanel";
import RepoIdentityCard from "@/components/RepoIdentityCard";
import { RepoWorkspaceProvider, useRepoWorkspace } from "@/components/repo/RepoWorkspaceContext";
import CitationSlidePanel from "@/components/CitationSlidePanel";
import type { Repo, Session, RepoPersona } from "@/lib/types";

// ── Inline Rename Input ────────────────────────────────────────────────────────
function RenameInput({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(val);
          if (e.key === "Escape") onCancel();
        }}
        style={{
          flex: 1,
          minWidth: 0,
          background: "var(--surface-3)",
          border: "1px solid var(--primary)",
          borderRadius: "5px",
          padding: "3px 8px",
          fontSize: "0.8rem",
          color: "var(--text)",
          outline: "none",
        }}
        maxLength={80}
        aria-label="Rename session"
      />
      <button onClick={() => onSave(val)} style={{ padding: "3px 6px", borderRadius: "4px", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80", cursor: "pointer", display: "flex", alignItems: "center" }} title="Save">
        <Check size={11} />
      </button>
      <button onClick={onCancel} style={{ padding: "3px 6px", borderRadius: "4px", background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-faint)", cursor: "pointer", display: "flex", alignItems: "center" }} title="Cancel">
        <X size={11} />
      </button>
    </div>
  );
}

// ── Session item ─────────────────────────────────────────────────────────────
function SessionItem({
  session,
  active,
  deletingId,
  onSelect,
  onDelete,
  onRename,
}: {
  session: Session;
  active: boolean;
  deletingId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleSave = (val: string) => {
    setRenaming(false);
    if (val.trim() && val.trim() !== session.title) {
      onRename(session.id, val.trim());
    }
  };

  const timeAgo = useMemo(() => {
    const date = new Date(session.createdAt ?? Date.now());
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, [session.createdAt]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (!renaming) onSelect(session.id); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" && !renaming) onSelect(session.id); }}
      aria-current={active ? "true" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 10px",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.15s",
        background: active ? "rgba(59,130,246,0.12)" : hovered ? "rgba(255,255,255,0.04)" : "transparent",
        border: active ? "1px solid rgba(59,130,246,0.25)" : "1px solid transparent",
        position: "relative",
        userSelect: "none",
        marginBottom: "2px",
      }}
    >
      {/* Active indicator */}
      {active && (
        <div style={{
          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
          width: "3px", height: "60%", borderRadius: "0 2px 2px 0",
          background: "var(--primary)",
        }} />
      )}

      <MessageSquare
        size={13}
        style={{ color: active ? "var(--primary)" : "var(--text-faint)", flexShrink: 0, marginLeft: "3px" }}
      />

      {renaming ? (
        <RenameInput
          initial={session.title ?? "New session"}
          onSave={handleSave}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: "0.82rem",
              fontWeight: active ? 600 : 400,
              color: active ? "#fff" : "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              margin: 0,
              lineHeight: 1.4,
            }}>
              {session.title ?? "New chat"}
            </p>
            <p style={{
              fontSize: "0.68rem",
              color: "var(--text-faint)",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              marginTop: "2px",
            }}>
              <Clock size={9} />
              {timeAgo}
              {session._count && session._count.messages > 0 && (
                <>
                  <span>·</span>
                  <Hash size={9} />
                  {session._count.messages}
                </>
              )}
            </p>
          </div>

          {(hovered || active) && (
            <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
              <button
                onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
                title="Rename"
                aria-label="Rename session"
                style={{
                  padding: "4px",
                  borderRadius: "4px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-faint)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <PencilLine size={11} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                disabled={deletingId === session.id}
                aria-label="Delete session"
                title="Delete session"
                style={{
                  padding: "4px",
                  borderRadius: "4px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-faint)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#f87171"; (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                {deletingId === session.id ? (
                  <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Trash2 size={11} />
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sidebar content ────────────────────────────────────────────────────────────
function SidebarContent({
  repo,
  persona,
  sessions,
  activeSession,
  creatingSession,
  deletingId,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onBack,
}: {
  repo: Repo;
  persona: RepoPersona | null;
  sessions: Session[];
  activeSession: Session | null;
  creatingSession: boolean;
  deletingId: string | null;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, title: string) => void;
  onBack: () => void;
}) {
  const lowChunks = repo.chunkCount < 10;
  const [personaOpen, setPersonaOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* ── Repo header ─────────────────────────── */}
      <div style={{
        padding: "16px 14px 12px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.75rem",
            color: "var(--text-faint)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 0 10px 0",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; }}
        >
          <ArrowLeft size={12} /> All repositories
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0,
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 14px rgba(59,130,246,0.35)",
          }}>
            <GitBranch size={15} color="#fff" />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              fontSize: "0.875rem", fontWeight: 700, color: "#fff",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              margin: 0, lineHeight: 1.3,
            }}>
              {repo.name.split("/")[1] || repo.name}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
              {lowChunks ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "3px",
                  padding: "1px 8px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 600,
                  background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)",
                  color: "#fbbf24",
                }}>
                  <AlertTriangle size={9} /> Sparse
                </span>
              ) : (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "3px",
                  padding: "1px 8px", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 600,
                  background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                  color: "#4ade80",
                }}>
                  <CheckCircle size={9} /> {repo.chunkCount.toLocaleString()} chunks
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── New chat button ─────────────────────── */}
      <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
        <button
          onClick={onNewSession}
          disabled={creatingSession}
          style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
            padding: "9px 16px",
            borderRadius: "9px",
            background: "linear-gradient(135deg, var(--primary), #1e40af)",
            border: "none",
            color: "#fff",
            fontSize: "0.84rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.2s, transform 0.1s",
            boxShadow: "0 2px 12px rgba(59,130,246,0.3)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.9"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.98)"; }}
          onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
        >
          {creatingSession ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={14} />}
          New Chat
        </button>
      </div>

      {/* ── Persona collapsible ─────────────────── */}
      {persona && (
        <div style={{ borderBottom: "1px solid var(--border)", flexShrink: 0, margin: "0 8px" }}>
          <button
            onClick={() => setPersonaOpen(!personaOpen)}
            style={{
              width: "100%", padding: "8px 6px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--text-faint)",
            }}
          >
            Repo Context
            <ChevronDown size={11} style={{ transition: "transform 0.2s", transform: personaOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>
          {personaOpen && (
            <div style={{ padding: "0 0 12px" }}>
              <RepoIdentityCard persona={persona} compact onQuestionSelect={() => {}} />
            </div>
          )}
        </div>
      )}

      {/* ── Session list label ───────────────────── */}
      {sessions.length > 0 && (
        <div style={{ padding: "10px 14px 4px", flexShrink: 0 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-faint)", margin: 0 }}>
            Recent Chats
          </p>
        </div>
      )}

      {/* ── Session list ────────────────────────── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "4px 8px 16px",
        scrollbarWidth: "thin",
      }}>
        {sessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <MessageSquare size={22} style={{ color: "var(--text-faint)", margin: "0 auto 10px" }} />
            <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", lineHeight: 1.6 }}>
              No chats yet.<br />Start a new conversation.
            </p>
          </div>
        ) : (
          sessions.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              active={activeSession?.id === s.id}
              deletingId={deletingId}
              onSelect={onSelectSession}
              onDelete={onDeleteSession}
              onRename={onRenameSession}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ChatPage({ params }: { params: { repoId: string } }) {
  const { repoId } = params;
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [repo, setRepo] = useState<Repo | null>(null);
  const [persona, setPersona] = useState<RepoPersona | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const api = useMemo(() => createApiClient(getToken), [getToken]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
    if (isLoaded && isSignedIn) init();
  }, [isLoaded, isSignedIn]); // eslint-disable-line

  const init = async () => {
    setLoading(true);
    try {
      const [r, s, p] = await Promise.all([
        api.repos.get(repoId),
        api.sessions.list(repoId),
        api.repos.getPersona(repoId).catch(() => null)
      ]);
      setRepo(r);
      setSessions(s);
      setPersona(p);
      if (s.length > 0) {
        const full = await api.sessions.get(s[0].id);
        setActiveSession(full);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load repo");
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = useCallback(async () => {
    const s = await api.sessions.list(repoId);
    setSessions(s);
    if (activeSession) {
      try {
        const full = await api.sessions.get(activeSession.id);
        setActiveSession(full);
      } catch {
        if (s.length > 0) {
          const latest = await api.sessions.get(s[0].id);
          setActiveSession(latest);
        } else {
          setActiveSession(null);
        }
      }
    }
  }, [api, repoId, activeSession]);

  const handleNewSession = async () => {
    setCreatingSession(true);
    try {
      const s = await api.sessions.create(repoId);
      const full = await api.sessions.get(s.id);
      setSessions((prev) => [full, ...prev]);
      setActiveSession(full);
      setDrawerOpen(false);
    } catch { /* ignore */ }
    finally { setCreatingSession(false); }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      const full = await api.sessions.get(sessionId);
      setActiveSession(full);
      setDrawerOpen(false);
    } catch { /* ignore */ }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Delete this chat and all its messages?")) return;
    setDeletingId(sessionId);
    try {
      await api.sessions.delete(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          const full = await api.sessions.get(remaining[0].id);
          setActiveSession(full);
        } else {
          setActiveSession(null);
        }
      }
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  };

  const handleRenameSession = async (sessionId: string, title: string) => {
    try {
      const updated = await api.sessions.rename(sessionId, title);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, title: updated.title } : s)));
      if (activeSession?.id === sessionId) {
        setActiveSession((prev) => prev ? { ...prev, title: updated.title } : prev);
      }
    } catch { /* ignore */ }
  };

  if (!isLoaded || loading) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            border: "2px solid var(--surface-3)", borderTopColor: "var(--primary)",
            animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
          }} />
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "16px",
            background: "var(--error-muted)", display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <AlertTriangle size={24} style={{ color: "var(--error)" }} />
          </div>
          <h2 style={{ color: "#fff", fontSize: "1.1rem", marginBottom: "8px" }}>Could not load repo</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "24px" }}>{error ?? "Repo not found."}</p>
          <button onClick={() => router.push("/ingest")} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back to Repos
          </button>
        </div>
      </div>
    );
  }

  if (repo.status !== "READY") {
    return (
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <div style={{
            width: "56px", height: "56px", borderRadius: "16px",
            background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <Loader2 size={24} style={{ color: "var(--warning)", animation: "spin 1s linear infinite" }} />
          </div>
          <h2 style={{ color: "#fff", fontSize: "1.1rem", marginBottom: "8px" }}>Indexing in Progress</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "24px" }}>
            {repo.name} is still being indexed. Come back in a few minutes.
          </p>
          <button onClick={() => router.push("/ingest")} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Check Status
          </button>
        </div>
      </div>
    );
  }

  const lowChunks = repo.chunkCount < 10;
  const sidebarProps = {
    repo, persona, sessions, activeSession, creatingSession, deletingId,
    onNewSession: handleNewSession,
    onSelectSession: handleSelectSession,
    onDeleteSession: handleDeleteSession,
    onRenameSession: handleRenameSession,
    onBack: () => router.push("/ingest"),
  };

  return (
    <RepoWorkspaceProvider>
      <ChatLayoutInner
        repo={repo}
        sessions={sessions}
        activeSession={activeSession}
        creatingSession={creatingSession}
        deletingId={deletingId}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        sidebarProps={sidebarProps}
        repoId={repoId}
        lowChunks={lowChunks}
        refreshSessions={refreshSessions}
        handleNewSession={handleNewSession}
      />
    </RepoWorkspaceProvider>
  );
}

function ChatLayoutInner({
  repo,
  sessions,
  activeSession,
  creatingSession,
  drawerOpen,
  setDrawerOpen,
  sidebarProps,
  repoId,
  lowChunks,
  refreshSessions,
  handleNewSession,
}: any) {
  const { explorer, clearCodeView } = useRepoWorkspace();
  const codePanelOpen = explorer.codeDisplayMode !== "none";

  return (
    // This outer div fills the remaining flex space from layout.tsx
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* ── Mobile overlay backdrop ─────────────── */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          }}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Left Sidebar ─────────────────────────────── */}
      <aside
        className="chat-sidebar"
        style={{
          width: "260px",
          flexShrink: 0,
          height: "100%",
          background: "var(--surface-2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          zIndex: 30,
          overflow: "hidden",
        }}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Mobile drawer sidebar ───────────────────── */}
      <aside
        style={{
          position: "fixed",
          top: "var(--navbar-h)",
          left: drawerOpen ? "0" : "-280px",
          width: "260px",
          height: "calc(100vh - var(--navbar-h))",
          background: "var(--surface-2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          transition: "left 0.25s ease",
        }}
        className="chat-sidebar-mobile"
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ── Center: Chat area ────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          overflow: "hidden",
          minWidth: 0,
          background: "var(--surface)",
        }}
      >
        {/* Mobile topbar */}
        <div
          className="chat-mobile-topbar"
          style={{
            padding: "10px 16px",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface-2)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              padding: "8px",
              borderRadius: "8px",
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
            }}
          >
            <Menu size={18} />
          </button>
          <span style={{
            fontSize: "0.875rem", fontWeight: 600, color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1, textAlign: "center",
          }}>
            {activeSession?.title ?? repo.name.split("/")[1] ?? repo.name}
          </span>
          <button onClick={handleNewSession} disabled={creatingSession} className="btn btn-primary btn-sm">
            {creatingSession ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
          </button>
        </div>

        {/* Chat panel or empty state */}
        {activeSession ? (
          <ChatPanel
            repoId={repoId}
            session={activeSession}
            lowChunkWarning={lowChunks}
            onSessionUpdate={refreshSessions}
          />
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px",
          }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "18px",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "20px",
              boxShadow: "0 0 40px rgba(59,130,246,0.25)",
            }}>
              <MessageSquare size={28} color="#fff" />
            </div>
            <h2 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, marginBottom: "10px" }}>
              {sessions.length === 0 ? "Start your first conversation" : "Select a chat"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "28px", maxWidth: "320px", lineHeight: 1.65 }}>
              {sessions.length === 0
                ? `${repo.name} is ready to explore. Create a new chat to start asking questions about the codebase.`
                : "Pick a previous conversation from the sidebar, or start a new one."}
            </p>
            <button onClick={handleNewSession} className="btn btn-primary" disabled={creatingSession}>
              {creatingSession ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={15} />}
              New Chat
            </button>
          </div>
        )}
      </main>

      {/* ── Right: Citation/Code Slide Panel ─────── */}
      <CitationSlidePanel
        explorer={explorer}
        onClose={clearCodeView}
      />
    </div>
  );
}
