"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { createApiClient } from "@/lib/api";
import ChatRepoPageLayout from "@/components/repo/ChatRepoPageLayout";
import { RepoWorkspaceProvider } from "@/components/repo/RepoWorkspaceContext";
import type { Repo, Session } from "@/lib/types";

// ── Page ─────────────────────────────────────────────────────────────────────

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
  const [sessionSearch, setSessionSearch] = useState("");
  const [searchingSessions, setSearchingSessions] = useState(false);
  const [searchedSessions, setSearchedSessions] = useState<Session[] | null>(null);

  const api = createApiClient(getToken);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
    if (isLoaded && isSignedIn) init();
  }, [isLoaded, isSignedIn]); // eslint-disable-line

  const init = async () => {
    setLoading(true);
    try {
      const r = await api.repos.get(repoId);
      const s = await api.sessions.list(repoId);
      setRepo(r);
      setSessions(s);

      // Load most recent session if any, with messages
      if (s.length > 0) {
        const full = await api.sessions.get(s[0].id);
        setActiveSession(full);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load repo";
      const normalized = message.toLowerCase();

      if (normalized.includes("http 401") || normalized.includes("unauthorized")) {
        router.replace("/sign-in");
        return;
      }

      if (normalized.includes("http 404") || normalized.includes("repo not found")) {
        router.replace("/ingest");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshSessions = async () => {
    const s = await api.sessions.list(repoId);
    setSessions(s);
    if (activeSession) {
      try {
        const full = await api.sessions.get(activeSession.id);
        setActiveSession(full);
      } catch {
        // If active session no longer exists, fall back to newest.
        if (s.length > 0) {
          const latest = await api.sessions.get(s[0].id);
          setActiveSession(latest);
        } else {
          setActiveSession(null);
        }
      }
    }
  };

  useEffect(() => {
    const q = sessionSearch.trim();
    if (!q) {
      setSearchedSessions(null);
      setSearchingSessions(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingSessions(true);
      try {
        const result = await api.sessions.search(repoId, q);
        if (!cancelled) setSearchedSessions(result);
      } catch {
        if (!cancelled) setSearchedSessions([]);
      } finally {
        if (!cancelled) setSearchingSessions(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repoId, sessionSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewSession = async () => {
    setCreatingSession(true);
    try {
      const s = await api.sessions.create(repoId);
      // Get the full session object
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

  // ── Render states ───────────────────────────────────────────────────────────

  if (!isLoaded || loading) {
    return (
      <div className="flex h-[calc(100vh-var(--navbar-h))] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="spinner mx-auto" />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading repo...</p>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => router.push("/ingest")}
            className="btn btn-secondary btn-sm"
          >
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
            {repo.name} is still being indexed. Come back when it&apos;s ready to
            start chatting.
          </p>
          <button
            onClick={() => router.push("/ingest")}
            className="btn btn-secondary btn-sm"
          >
            <ArrowLeft size={14} /> Check Status
          </button>
        </div>
      </div>
    );
  }

  const lowChunks = repo.chunkCount < 10;
  const visibleSessions = sessionSearch.trim() ? (searchedSessions ?? []) : sessions;

  return (
    <RepoWorkspaceProvider repoId={repoId}>
      <ChatRepoPageLayout
        repoId={repoId}
        repo={repo}
        sessions={visibleSessions}
        activeSession={activeSession}
        lowChunks={lowChunks}
        creatingSession={creatingSession}
        deletingId={deletingId}
        sessionSearch={sessionSearch}
        searchingSessions={searchingSessions}
        onSessionSearchChange={setSessionSearch}
        onNewSession={handleNewSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onSessionUpdate={refreshSessions}
      />
    </RepoWorkspaceProvider>
  );
}
