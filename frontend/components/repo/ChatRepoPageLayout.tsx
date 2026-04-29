"use client";

import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  GitBranch,
  Loader2,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  ArrowLeft,
  FolderTree,
  Search,
} from "lucide-react";
import ChatPanel from "@/components/ChatPanel";
import RepoContextDock from "./RepoContextDock";
import RepoContextMobile from "./RepoContextMobile";
import { useRepoWorkspace } from "./RepoWorkspaceContext";
import type { Repo, Session } from "@/lib/types";

export interface ChatRepoPageLayoutProps {
  repoId: string;
  repo: Repo;
  sessions: Session[];
  activeSession: Session | null;
  lowChunks: boolean;
  creatingSession: boolean;
  deletingId: string | null;
  sessionSearch: string;
  searchingSessions: boolean;
  onSessionSearchChange: (value: string) => void;
  onNewSession: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onSessionUpdate: () => void;
}

export default function ChatRepoPageLayout({
  repoId,
  repo,
  sessions,
  activeSession,
  lowChunks,
  creatingSession,
  deletingId,
  sessionSearch,
  searchingSessions,
  onSessionSearchChange,
  onNewSession,
  onSelectSession,
  onDeleteSession,
  onSessionUpdate,
}: ChatRepoPageLayoutProps) {
  const router = useRouter();
  const { openCitation } = useRepoWorkspace();
  const repoShort = repo.name.split("/")[1] || repo.name;

  return (
    <div
      className="relative flex p-4 md:p-6 gap-4 md:gap-5 w-full mx-auto"
      style={{
        height: "calc(100vh - var(--navbar-h))",
        maxWidth: "min(1720px, 100%)",
      }}
    >
      <RepoContextMobile />

      {/* ── Session rail ───────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0"
        style={{
          width: "var(--sidebar-w)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="px-4 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <button
            onClick={() => router.push("/ingest")}
            className="flex items-center gap-1.5 mb-3 text-xs font-semibold"
            style={{
              color: "var(--text-faint)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
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
                {repoShort}
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

        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <button
            onClick={onNewSession}
            disabled={creatingSession}
            className="btn btn-secondary btn-sm w-full justify-center"
          >
            {creatingSession ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            New Chat
          </button>
        </div>

        <div className="px-3 pb-2 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-2.5 h-9 rounded-lg"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
            }}
          >
            <Search size={13} style={{ color: "var(--text-faint)" }} />
            <input
              value={sessionSearch}
              onChange={(e) => onSessionSearchChange(e.target.value)}
              placeholder="Search chats"
              aria-label="Search chat history"
              className="w-full bg-transparent border-0 outline-none text-xs"
              style={{ color: "var(--text)" }}
            />
            {searchingSessions && <Loader2 size={12} className="animate-spin" style={{ color: "var(--text-faint)" }} />}
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 list-none m-0 p-0">
          {sessions.length === 0 ? (
            <div className="py-8 text-center px-4">
              <MessageSquare
                size={22}
                className="mx-auto mb-2"
                style={{ color: "var(--text-faint)" }}
              />
              <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                {sessionSearch.trim()
                  ? "No matching chats."
                  : "No sessions yet."}
                <br />
                {sessionSearch.trim() ? "Try a different keyword." : "Start a new chat."}
              </p>
            </div>
          ) : (
            sessions.map((s) => {
              const active = activeSession?.id === s.id;
              return (
                <li key={s.id} className="list-none">
                <div
                  className="group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{
                    background: active ? "#eff5ff" : "transparent",
                    border: active ? "1px solid #cdddfb" : "1px solid transparent",
                  }}
                  onClick={() => onSelectSession(s.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectSession(s.id);
                    }
                  }}
                  aria-current={active ? "true" : undefined}
                >
                  <MessageSquare
                    size={12}
                    style={{
                      color: active ? "var(--accent)" : "var(--text-faint)",
                      flexShrink: 0,
                    }}
                  />
                  <p
                    className="text-xs flex-1 min-w-0 truncate"
                    style={{ color: active ? "var(--text)" : "var(--text-muted)" }}
                  >
                    {s.title ?? "New session"}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={deletingId === s.id}
                    aria-label="Delete session"
                    style={{ padding: "2px 4px" }}
                  >
                    {deletingId === s.id ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Trash2 size={11} />
                    )}
                  </button>
                </div>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      {/* ── Chat column ───────────────────────────── */}
      <main
        className="flex-1 flex flex-col min-w-0 overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          className="lg:hidden px-4 py-3 border-b flex items-center gap-2 overflow-x-auto"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <span className="badge badge-gray whitespace-nowrap">
            <GitBranch size={10} />
            {repoShort}
          </span>
          <select
            value={activeSession?.id ?? (sessions[0]?.id ?? "")}
            onChange={(e) => {
              if (e.target.value) onSelectSession(e.target.value);
            }}
            className="input"
            style={{
              minWidth: "180px",
              maxWidth: "260px",
              height: "34px",
              paddingTop: "0",
              paddingBottom: "0",
            }}
            aria-label="Select chat session"
          >
            {sessions.length === 0 && <option value="">No sessions</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title ?? "New session"}
              </option>
            ))}
          </select>
          <button
            onClick={onNewSession}
            className="btn btn-primary btn-sm whitespace-nowrap"
            disabled={creatingSession}
          >
            {creatingSession ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Plus size={13} />
            )}
            New Chat
          </button>
        </div>

        {activeSession ? (
          <ChatPanel
            repoId={repoId}
            session={activeSession}
            lowChunkWarning={lowChunks}
            onSessionUpdate={onSessionUpdate}
            onOpenCitation={openCitation}
            repoShortName={repoShort}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: "var(--surface-3)",
                border: "1px solid var(--border)",
              }}
            >
              <FolderTree size={28} style={{ color: "var(--accent)" }} />
            </div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-faint)" }}
            >
              Repository workspace
            </p>
            <h2 className="text-lg font-semibold mb-2">
              {sessions.length === 0
                ? "Set up your first chat"
                : "Pick a session to continue"}
            </h2>
            <p className="text-sm mb-2 max-w-md" style={{ color: "var(--text-muted)" }}>
              {sessions.length === 0
                ? `${repoShort} is indexed and ready. Sessions keep questions and answers together.`
                : "Resume a thread from the list, or spin up a fresh line of inquiry."}
            </p>
            <p className="text-xs max-w-sm mb-6" style={{ color: "var(--text-faint)" }}>
              On smaller screens, open{" "}
              <span className="font-medium" style={{ color: "var(--text-muted)" }}>
                Context
              </span>{" "}
              to browse files, symbols, and the code viewer before you ask anything.
            </p>
            <button
              onClick={onNewSession}
              className="btn btn-primary"
              disabled={creatingSession}
            >
              {creatingSession ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}
              New Chat
            </button>
          </div>
        )}
      </main>

      <RepoContextDock repoName={repoShort} />
    </div>
  );
}
