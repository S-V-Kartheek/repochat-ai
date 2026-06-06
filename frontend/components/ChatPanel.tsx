"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Send, Loader2, BookmarkCheck, Bookmark, AlertTriangle } from "lucide-react";
import { createApiClient } from "@/lib/api";
import StreamingText from "./StreamingText";
import CitationChip from "./CitationChip";
import type { Message, Citation, Session } from "@/lib/types";

// ── Single message bubble ─────────────────────────────────────────────────────

function MessageBubble({
  message,
  onToggleBookmark,
}: {
  message: Message;
  onToggleBookmark: (id: string) => void;
}) {
  const isUser = message.role === "USER";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6 slide-up`}
    >
      <div
        className="max-w-[85%] space-y-2"
        style={{ minWidth: 0 }}
      >
        {/* Role label */}
        <div
          className={`text-[11px] font-medium uppercase tracking-wider ${isUser ? "text-right" : "text-left"}`}
          style={{ color: "var(--text-faint)" }}
        >
          {isUser ? "You" : "RepoTalk"}
        </div>

        {/* Content bubble */}
        <div
          className="px-4 py-3 rounded-xl text-sm leading-relaxed"
          style={{
            background: isUser ? "linear-gradient(180deg,#2f6ff1 0%,#2457ca 100%)" : "var(--surface-2)",
            color: isUser ? "#fff" : "var(--text)",
            border: isUser ? "none" : "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <p className="whitespace-pre-wrap break-words m-0" style={{ color: isUser ? "#fff" : "var(--text)" }}>
            {message.content}
          </p>
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.citations.map((c, i) => (
              <CitationChip key={i} citation={c} index={i} />
            ))}
          </div>
        )}

        {/* Bookmark */}
        {!isUser && (
          <div className="flex justify-end">
            <button
              onClick={() => onToggleBookmark(message.id)}
              className="btn btn-ghost btn-sm"
              aria-label={message.bookmarked ? "Remove bookmark" : "Bookmark this answer"}
              title={message.bookmarked ? "Remove bookmark" : "Bookmark"}
            >
              {message.bookmarked ? (
                <BookmarkCheck size={13} style={{ color: "var(--accent)" }} />
              ) : (
                <Bookmark size={13} />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Streaming message bubble ──────────────────────────────────────────────────

function StreamingBubble({
  repoId,
  sessionId,
  question,
  getToken,
  onDone,
}: {
  repoId: string;
  sessionId: string;
  question: string;
  getToken: () => Promise<string | null>;
  onDone: (result: { answer: string; citations: Citation[]; messageId?: string }) => void;
}) {
  const [streamError, setStreamError] = useState<string | null>(null);

  return (
    <div className="flex justify-start mb-6 slide-up">
      <div className="max-w-[85%] space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
          RepoTalk
        </div>
        <div
          className="px-4 py-3 rounded-xl text-sm"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {streamError ? (
            <div className="flex items-center gap-2" style={{ color: "var(--error)" }}>
              <AlertTriangle size={14} />
              {streamError}
            </div>
          ) : (
            <StreamingText
              repoId={repoId}
              sessionId={sessionId}
              question={question}
              getToken={getToken}
              onDone={onDone}
              onError={setStreamError}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── ChatPanel ─────────────────────────────────────────────────────────────────

export interface ChatPanelProps {
  repoId: string;
  session: Session;
  lowChunkWarning?: boolean;
  onSessionUpdate?: () => void;
}

export default function ChatPanel({
  repoId,
  session,
  lowChunkWarning = false,
  onSessionUpdate,
}: ChatPanelProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>(session.messages ?? []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingQuestion, setStreamingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const api = createApiClient(getToken);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Sync messages when session changes
  useEffect(() => {
    setMessages(session.messages ?? []);
  }, [session.id, session.messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const question = input.trim();
    if (!question || streaming) return;

    setInput("");
    setError(null);
    setStreaming(true);
    setStreamingQuestion(question);

    // Optimistic user message
    const optimisticUser: Message = {
      id: `optimistic-${Date.now()}`,
      role: "USER",
      content: question,
      citations: null,
      ragasScore: null,
      bookmarked: false,
      sessionId: session.id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);
  };

  const handleStreamDone = async ({
    answer,
    citations,
    messageId,
  }: {
    answer: string;
    citations: Citation[];
    messageId?: string;
  }) => {
    setStreaming(false);
    setStreamingQuestion(null);

    const assistantMsg: Message = {
      id: messageId ?? `local-${Date.now()}`,
      role: "ASSISTANT",
      content: answer,
      citations,
      ragasScore: null,
      bookmarked: false,
      sessionId: session.id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    // The gateway persists both user and assistant messages for streaming.
    // Refresh parent session state to replace optimistic user message and keep
    // IDs/bookmarks in sync with DB.
    onSessionUpdate?.();
  };

  const handleToggleBookmark = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m
      )
    );
    try {
      await api.sessions.toggleBookmark(session.id, messageId);
    } catch { /* revert on fail is acceptable for Phase 2 */ }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0 && !streaming;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Low chunk warning */}
      {lowChunkWarning && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 text-sm flex-shrink-0"
          style={{
            background: "var(--warning-muted)",
            borderBottom: "1px solid rgba(245,158,11,0.2)",
            color: "var(--warning)",
          }}
        >
          <AlertTriangle size={14} />
          This repo has a sparse index (&lt;10 chunks). Answers may be incomplete.
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}
              aria-hidden="true"
            >
              <Send size={22} style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>
              Start the conversation
            </h3>
            <p className="text-sm max-w-sm" style={{ color: "var(--text-muted)" }}>
              Ask anything about the codebase. Questions about architecture,
              specific functions, or how features are implemented all work well.
            </p>
          </div>
        ) : (
          <div>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
            {/* Streaming in progress */}
            {streaming && streamingQuestion && (
              <StreamingBubble
                key={`streaming-${streamingQuestion}`}
                repoId={repoId}
                sessionId={session.id}
                question={streamingQuestion}
                getToken={getToken}
                onDone={handleStreamDone}
              />
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 px-4 py-4"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}
      >
        {error && (
          <div
            className="flex items-center gap-2 text-sm mb-3 px-3 py-2 rounded-lg"
            style={{ background: "var(--error-muted)", color: "var(--error)" }}
          >
            <AlertTriangle size={13} /> {error}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-3"
        >
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the codebase…"
            disabled={streaming}
            rows={1}
            className="input flex-1 resize-none"
            style={{
              minHeight: "44px",
              maxHeight: "140px",
              lineHeight: "1.5",
              paddingTop: "10px",
              paddingBottom: "10px",
            }}
            aria-label="Chat input"
          />
          <button
            type="submit"
            className="btn btn-primary flex-shrink-0"
            disabled={streaming || !input.trim()}
            aria-label="Send message"
            style={{ height: "44px", padding: "0 16px" }}
          >
            {streaming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
        <p className="text-[11px] mt-2" style={{ color: "var(--text-faint)" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
