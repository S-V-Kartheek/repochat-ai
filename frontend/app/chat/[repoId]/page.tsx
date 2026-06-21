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
} from "lucide-react";
import { createApiClient } from "@/lib/api";
import ChatPanel from "@/components/ChatPanel";
import type { Repo, Session } from "@/lib/types";

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
    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(val);
          if (e.key === "Escape") onCancel();
        }}
        className="rename-input"
        maxLength={80}
        aria-label="Rename session"
      />
      <button onClick={() => onSave(val)} className="icon-btn icon-btn--green" title="Save">
        <Check size={11} />
      </button>
      <button onClick={onCancel} className="icon-btn" title="Cancel">
        <X size={11} />
      </button>
    </div>
  );
}

// ── Session item ───────────────────────────────────────────────────────────────
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

  const handleSave = (val: string) => {
    setRenaming(false);
    if (val.trim() && val.trim() !== session.title) {
      onRename(session.id, val.trim());
    }
  };

  return (
    <div
      className={`session-item ${active ? "session-item--active" : ""}`}
      onClick={() => { if (!renaming) onSelect(session.id); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" && !renaming) onSelect(session.id); }}
      aria-selected={active}
    >
      <MessageSquare
        size={12}
        style={{ color: active ? "var(--accent)" : "var(--text-faint)", flexShrink: 0 }}
      />

      {renaming ? (
        <RenameInput
          initial={session.title ?? "New session"}
          onSave={handleSave}
          onCancel={() => setRenaming(false)}
        />
      ) : (
        <>
          <p className="session-title">
            {session.title ?? "New session"}
          </p>
          {/* Message count badge */}
          {session._count && session._count.messages > 0 && (
            <span className="msg-count-badge">{session._count.messages}</span>
          )}
          {/* Actions: rename + delete */}
          <div className="session-actions">
            <button
              onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
              className="icon-btn"
              title="Rename"
              aria-label="Rename session"
            >
              <PencilLine size={10} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="icon-btn icon-btn--red"
              disabled={deletingId === session.id}
              aria-label="Delete session"
              title="Delete session"
            >
              {deletingId === session.id ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Trash2 size={10} />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sidebar content ────────────────────────────────────────────────────────────
function SidebarContent({
  repo,
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
  return (
    <>
      {/* Repo header */}
      <div className="sidebar-header">
        <button onClick={onBack} className="back-link">
          <ArrowLeft size={11} /> All repos
        </button>
        <div className="flex items-center gap-2.5">
          <div className="repo-icon">
            <GitBranch size={13} style={{ color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <p className="repo-name">
              {repo.name.split("/")[1] || repo.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {lowChunks ? (
                <span className="badge badge-amber">
                  <AlertTriangle size={9} /> Sparse
                </span>
              ) : (
                <span className="badge badge-green">
                  <CheckCircle size={9} /> {repo.chunkCount} chunks
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New chat button */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={onNewSession}
          disabled={creatingSession}
          className="btn btn-secondary btn-sm w-full justify-center"
        >
          {creatingSession ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          New Chat
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {sessions.length === 0 ? (
          <div className="py-10 text-center px-4">
            <MessageSquare size={22} className="mx-auto mb-2" style={{ color: "var(--text-faint)" }} />
            <p className="text-xs" style={{ color: "var(--text-faint)" }}>
              No sessions yet.<br />Start a new chat.
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
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ChatPage({ params }: { params: { repoId: string } }) {
  const { repoId } = params;
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [repo, setRepo] = useState<Repo | null>(null);
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
      const [r, s] = await Promise.all([api.repos.get(repoId), api.sessions.list(repoId)]);
      setRepo(r);
      setSessions(s);
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
    if (!confirm("Delete this session and all its messages?")) return;
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

  // ── Render states ──────────────────────────────────────────────────────────

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[calc(100vh-var(--navbar-h))] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="spinner mx-auto" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="flex h-[calc(100vh-var(--navbar-h))] items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--error-muted)" }}>
            <AlertTriangle size={24} style={{ color: "var(--error)" }} />
          </div>
          <h2 className="text-lg font-semibold">Could not load repo</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error ?? "Repo not found."}</p>
          <button onClick={() => router.push("/ingest")} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back to Repos
          </button>
        </div>
      </div>
    );
  }

  if (repo.status !== "READY") {
    return (
      <div className="flex h-[calc(100vh-var(--navbar-h))] items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--warning-muted)" }}>
            <Loader2 size={24} style={{ color: "var(--warning)" }} className="animate-spin" />
          </div>
          <h2 className="text-lg font-semibold">Indexing in Progress</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {repo.name} is still being indexed. Come back when it&apos;s ready.
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
    repo, sessions, activeSession, creatingSession, deletingId,
    onNewSession: handleNewSession,
    onSelectSession: handleSelectSession,
    onDeleteSession: handleDeleteSession,
    onRenameSession: handleRenameSession,
    onBack: () => router.push("/ingest"),
  };

  return (
    <div
      className="chat-layout"
      style={{ height: "calc(100vh - var(--navbar-h))" }}
    >
      {/* ── Mobile overlay backdrop ── */}
      {drawerOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Desktop sidebar / Mobile drawer ── */}
      <aside className={`chat-sidebar ${drawerOpen ? "chat-sidebar--open" : ""}`}>
        <div className="flex flex-col h-full">
          {/* Mobile close */}
          <div className="flex justify-end px-3 pt-3 lg:hidden">
            <button onClick={() => setDrawerOpen(false)} className="icon-btn" aria-label="Close sidebar">
              <X size={16} />
            </button>
          </div>
          <SidebarContent {...sidebarProps} />
        </div>
      </aside>

      {/* ── Main chat area ── */}
      <main className="chat-main">
        {/* Mobile top bar */}
        <div className="mobile-topbar">
          <button onClick={() => setDrawerOpen(true)} className="icon-btn" aria-label="Open sidebar">
            <Menu size={18} />
          </button>
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {activeSession?.title ?? repo.name.split("/")[1] ?? repo.name}
          </span>
          <button onClick={handleNewSession} disabled={creatingSession} className="btn btn-primary btn-sm">
            {creatingSession ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          </button>
        </div>

        {activeSession ? (
          <ChatPanel
            repoId={repoId}
            session={activeSession}
            lowChunkWarning={lowChunks}
            onSessionUpdate={refreshSessions}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: "var(--surface-3)" }}>
              <MessageSquare size={28} style={{ color: "var(--text-faint)" }} />
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {sessions.length === 0 ? "Start your first conversation" : "Select a session"}
            </h2>
            <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-muted)" }}>
              {sessions.length === 0
                ? `${repo.name} is ready. Create a new chat to get started.`
                : "Choose a past session from the sidebar or start a new one."}
            </p>
            <button onClick={handleNewSession} className="btn btn-primary" disabled={creatingSession}>
              {creatingSession ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              New Chat
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
