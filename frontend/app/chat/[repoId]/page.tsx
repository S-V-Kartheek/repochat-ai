"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Plus, Trash2, GitBranch, Loader2, AlertTriangle,
  MessageSquare, CheckCircle, ArrowLeft, Brain, ChevronDown, ChevronUp,
} from "lucide-react";
import { createApiClient } from "@/lib/api";
import ChatPanel from "@/components/ChatPanel";
import PersonaCard, { PersonaCardSkeleton } from "@/components/PersonaCard";
import type { Repo, Session, RepoPersona } from "@/lib/types";

// ── Chat page skeleton ────────────────────────────────────────────────────────

function ChatPageSkeleton() {
  return (
    <div
      className="flex p-4 md:p-6 gap-4 md:gap-5"
      style={{ height: "calc(100vh - var(--navbar-h))", maxWidth: "1320px", margin: "0 auto" }}
    >
      {/* Sidebar skeleton */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{
          width: "var(--sidebar-w)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface)",
        }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="skeleton h-4 rounded w-16 mb-3" />
          <div className="flex items-center gap-2">
            <div className="skeleton w-7 h-7 rounded-md" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-4 rounded w-3/4" />
              <div className="skeleton h-3 rounded w-1/2" />
            </div>
          </div>
        </div>
        <div className="p-3">
          <div className="skeleton h-9 rounded-lg w-full" />
        </div>
        <div className="flex-1 px-2 space-y-1.5 pt-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-9 rounded-lg" />)}
        </div>
      </aside>

      {/* Chat area skeleton */}
      <main
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div className="flex-1 p-6 space-y-6">
          <div className="flex justify-end">
            <div className="skeleton h-16 rounded-xl w-2/3" />
          </div>
          <div className="skeleton h-28 rounded-xl w-3/4" />
          <div className="flex justify-end">
            <div className="skeleton h-12 rounded-xl w-1/2" />
          </div>
        </div>
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="skeleton h-11 rounded-xl w-full" />
        </div>
      </main>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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

  // Persona state
  const [persona, setPersona] = useState<RepoPersona | null>(null);
  const [personaLoading, setPersonaLoading] = useState(false);
  const [showPersona, setShowPersona] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Chat panel ref for injecting questions
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

  const api = createApiClient(getToken);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
    if (isLoaded && isSignedIn) init();
  }, [isLoaded, isSignedIn]); // eslint-disable-line

  const init = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        api.repos.get(repoId),
        api.sessions.list(repoId),
      ]);
      setRepo(r);
      setSessions(s);

      if (s.length > 0) {
        const full = await api.sessions.get(s[0].id);
        setActiveSession(full);
      }

      // Load persona in background (non-blocking)
      if (r.status === "READY") {
        loadPersona();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load repo");
    } finally {
      setLoading(false);
    }
  };

  const loadPersona = async () => {
    setPersonaLoading(true);
    try {
      const p = await api.persona.get(repoId);
      setPersona(p);
    } catch {
      // Persona generation failure is non-critical — chat still works
    } finally {
      setPersonaLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const p = await api.persona.regenerate(repoId);
      setPersona(p);
    } catch { /* ignore */ }
    finally { setIsRegenerating(false); }
  };

  const refreshSessions = async () => {
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
  };

  const handleNewSession = async () => {
    setCreatingSession(true);
    try {
      const s = await api.sessions.create(repoId);
      const full = await api.sessions.get(s.id);
      setSessions((prev) => [full, ...prev]);
      setActiveSession(full);
    } catch { /* ignore */ }
    finally { setCreatingSession(false); }
  };

  const handleSelectSession = async (sessionId: string) => {
    try {
      const full = await api.sessions.get(sessionId);
      setActiveSession(full);
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

  // When user clicks a suggested question → auto-create session + inject question
  const handleQuestionSelect = async (question: string) => {
    // If no active session, create one first
    if (!activeSession) {
      setCreatingSession(true);
      try {
        const s = await api.sessions.create(repoId);
        const full = await api.sessions.get(s.id);
        setSessions((prev) => [full, ...prev]);
        setActiveSession(full);
        setPendingQuestion(question);
      } catch { /* ignore */ }
      finally { setCreatingSession(false); }
    } else {
      setPendingQuestion(question);
    }
  };

  // ── Render states ───────────────────────────────────────────────────────────

  if (!isLoaded || loading) return <ChatPageSkeleton />;

  if (error || !repo) {
    return (
      <div className="flex h-[calc(100vh-var(--navbar-h))] items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "var(--error-muted)" }}
          >
            <AlertTriangle size={24} style={{ color: "var(--error)" }} />
          </div>
          <h2 className="text-lg font-semibold">Could not load repo</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {error ?? "Repo not found. It may have been deleted."}
          </p>
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
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "var(--warning-muted)" }}
          >
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

  return (
    <div
      className="flex p-4 md:p-6 gap-4 md:gap-5"
      style={{ height: "calc(100vh - var(--navbar-h))", maxWidth: "1320px", margin: "0 auto" }}
    >
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: "var(--sidebar-w)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Repo header */}
        <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={() => router.push("/ingest")}
            className="flex items-center gap-1.5 mb-3 text-xs font-semibold"
            style={{ color: "var(--text-faint)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <ArrowLeft size={11} /> All repos
          </button>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--accent-muted)" }}
            >
              <GitBranch size={13} style={{ color: "var(--accent)" }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
                {repo.name.split("/")[1] || repo.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {lowChunks ? (
                  <span className="badge badge-amber"><AlertTriangle size={9} /> Sparse</span>
                ) : (
                  <span className="badge badge-green"><CheckCircle size={9} /> {repo.chunkCount} chunks</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* New session button */}
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <button
            onClick={handleNewSession}
            disabled={creatingSession}
            className="btn btn-secondary btn-sm w-full justify-center"
          >
            {creatingSession ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            New Chat
          </button>
        </div>

        {/* Session list */}
        <div className="flex-shrink-0 px-2 pb-2 space-y-0.5" style={{ maxHeight: "200px", overflowY: "auto" }}>
          {sessions.length === 0 ? (
            <div className="py-4 text-center px-4">
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>No sessions yet. Start a new chat.</p>
            </div>
          ) : (
            sessions.map((s) => {
              const active = activeSession?.id === s.id;
              return (
                <div
                  key={s.id}
                  className="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: active ? "1px solid var(--accent-soft-border)" : "1px solid transparent",
                  }}
                  onClick={() => handleSelectSession(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSelectSession(s.id); }}
                  aria-pressed={active}
                >
                  <MessageSquare size={12} style={{ color: active ? "var(--accent)" : "var(--text-faint)", flexShrink: 0 }} />
                  <p className="text-xs flex-1 min-w-0 truncate" style={{ color: active ? "var(--text)" : "var(--text-muted)" }}>
                    {s.title ?? "New session"}
                  </p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                    className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={deletingId === s.id}
                    aria-label="Delete session"
                    style={{ padding: "2px 4px" }}
                  >
                    {deletingId === s.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Divider */}
        <div className="divider mx-3 flex-shrink-0" />

        {/* Persona section (scrollable) */}
        <div className="flex-1 overflow-y-auto">
          {/* Persona toggle header */}
          <button
            onClick={() => setShowPersona((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold flex-shrink-0 transition-colors"
            style={{
              color: "var(--text-faint)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div className="flex items-center gap-2">
              <Brain size={12} style={{ color: "var(--accent)" }} />
              Repo Intelligence
            </div>
            {showPersona ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showPersona && (
            <div className="px-3 pb-4">
              {personaLoading ? (
                <PersonaCardSkeleton />
              ) : persona ? (
                <PersonaCard
                  persona={persona}
                  repoName={repo.name.split("/")[1] || repo.name}
                  onQuestionSelect={handleQuestionSelect}
                  onRegenerate={handleRegenerate}
                  isRegenerating={isRegenerating}
                  compact
                />
              ) : (
                <div className="text-center py-6 px-2">
                  <Brain size={22} className="mx-auto mb-2" style={{ color: "var(--text-faint)" }} />
                  <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                    Persona not available yet
                  </p>
                  <button
                    onClick={loadPersona}
                    className="btn btn-secondary btn-sm mt-3 mx-auto"
                    disabled={personaLoading}
                  >
                    Generate Insights
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Chat Area ──────────────────────────────────── */}
      <main
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Mobile header */}
        <div
          className="lg:hidden px-4 py-3 border-b flex items-center gap-2 overflow-x-auto flex-shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <span className="badge badge-gray whitespace-nowrap">
            <GitBranch size={10} />
            {repo.name.split("/")[1] || repo.name}
          </span>
          <select
            value={activeSession?.id ?? (sessions[0]?.id ?? "")}
            onChange={(e) => { if (e.target.value) handleSelectSession(e.target.value); }}
            className="input"
            style={{ minWidth: "180px", maxWidth: "260px", height: "34px", paddingTop: "0", paddingBottom: "0" }}
            aria-label="Select chat session"
          >
            {sessions.length === 0 && <option value="">No sessions</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.title ?? "New session"}</option>
            ))}
          </select>
          <button
            onClick={handleNewSession}
            className="btn btn-primary btn-sm whitespace-nowrap"
            disabled={creatingSession}
          >
            {creatingSession ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            New Chat
          </button>
        </div>

        {activeSession ? (
          <ChatPanel
            repoId={repoId}
            session={activeSession}
            lowChunkWarning={lowChunks}
            onSessionUpdate={refreshSessions}
            suggestedQuestions={persona?.suggested_questions ?? []}
            pendingQuestion={pendingQuestion}
            onPendingQuestionConsumed={() => setPendingQuestion(null)}
          />
        ) : (
          /* No session — show persona + create session prompt */
          <div className="flex-1 overflow-y-auto">
            {persona && !personaLoading ? (
              <div className="max-w-xl mx-auto px-6 py-8">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text)" }}>
                    {repo.name.split("/")[1] || repo.name} is ready
                  </h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Here&apos;s what we know about this codebase. Click any question below to start chatting.
                  </p>
                </div>
                <PersonaCard
                  persona={persona}
                  repoName={repo.name.split("/")[1] || repo.name}
                  onQuestionSelect={handleQuestionSelect}
                />
                <div className="mt-6 text-center">
                  <button
                    onClick={handleNewSession}
                    className="btn btn-primary"
                    disabled={creatingSession}
                  >
                    {creatingSession ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                    Start New Chat
                  </button>
                </div>
              </div>
            ) : personaLoading ? (
              <div className="max-w-xl mx-auto px-6 py-8">
                <div className="skeleton h-5 rounded w-48 mb-2" />
                <div className="skeleton h-4 rounded w-64 mb-6" />
                <PersonaCardSkeleton />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 h-full">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: "var(--surface-2)" }}
                >
                  <MessageSquare size={28} style={{ color: "var(--text-faint)" }} />
                </div>
                <h2 className="text-lg font-semibold mb-2">
                  {sessions.length === 0 ? "Start your first conversation" : "Select a session"}
                </h2>
                <p className="text-sm mb-6 max-w-xs" style={{ color: "var(--text-muted)" }}>
                  {sessions.length === 0
                    ? `${repo.name} is ready. Create a new chat to start asking questions.`
                    : "Choose a past session from the sidebar or start a new one."}
                </p>
                <button onClick={handleNewSession} className="btn btn-primary" disabled={creatingSession}>
                  {creatingSession ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                  New Chat
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
