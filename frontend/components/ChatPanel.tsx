"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Loader2, BookmarkCheck, Bookmark, AlertTriangle } from "lucide-react";
import { createApiClient } from "@/lib/api";
import StreamingText from "./StreamingText";
import CitationChip from "./CitationChip";
import QualityBadge from "./QualityBadge";
import type { Message, Citation, Session, SuggestedQuestion, RagasScore } from "@/lib/types";


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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6 slide-up`}>
      <div className="max-w-[85%] space-y-2" style={{ minWidth: 0 }}>
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
            background: isUser
              ? "linear-gradient(155deg, #6c6cdf 0%, #4d4dc9 100%)"
              : "var(--surface-2)",
            color: isUser ? "#fff" : "var(--text)",
            border: isUser ? "none" : "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words m-0" style={{ color: "#fff" }}>
              {message.content}
            </p>
          ) : (
            <div
              className="prose prose-sm max-w-none break-words"
              style={{ color: "var(--text)", lineHeight: "1.7" }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    return isBlock ? (
                      <pre className="code-block my-2" style={{ fontSize: "0.79rem" }}>
                        <code>{children}</code>
                      </pre>
                    ) : (
                      <code
                        style={{
                          padding: "0.1em 0.38em",
                          borderRadius: "5px",
                          background: "var(--accent-soft)",
                          color: "var(--accent)",
                          fontSize: "0.83em",
                          border: "1px solid var(--accent-soft-border)",
                        }}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.citations.map((c, i) => (
              <CitationChip key={i} citation={c} index={i} />
            ))}
          </div>
        )}

        {!isUser && message.ragasScore && (
          <div className="pt-1">
            <QualityBadge score={message.ragasScore} />
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
  onStreamError,
}: {
  repoId: string;
  sessionId: string;
  question: string;
  getToken: () => Promise<string | null>;
  onDone: (result: { answer: string; citations: Citation[]; messageId?: string; ragasScore?: RagasScore }) => void;
  onStreamError: (error: string) => void;
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
              onError={(msg) => {
                setStreamError(msg);
                onStreamError(msg);
              }}
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
  suggestedQuestions?: SuggestedQuestion[];
  pendingQuestion?: string | null;
  onPendingQuestionConsumed?: () => void;
}

export default function ChatPanel({
  repoId,
  session,
  lowChunkWarning = false,
  onSessionUpdate,
  suggestedQuestions = [],
  pendingQuestion,
  onPendingQuestionConsumed,
}: ChatPanelProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>(session.messages ?? []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingQuestion, setStreamingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const api = createApiClient(getToken);

  // Auto-submit pending question from persona card
  useEffect(() => {
    if (pendingQuestion && !streaming) {
      onPendingQuestionConsumed?.();
      submitQuestion(pendingQuestion);
    }
  }, [pendingQuestion]); // eslint-disable-line

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Sync messages when session changes
  useEffect(() => {
    setMessages(session.messages ?? []);
  }, [session.id, session.messages]);

  const submitQuestion = (rawQuestion: string) => {
    const question = rawQuestion.trim();
    if (!question || streaming || submittingRef.current) return;

    submittingRef.current = true;
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    submitQuestion(input);
  };

  const handleStreamDone = async ({
    answer,
    citations,
    messageId,
    ragasScore,
  }: {
    answer: string;
    citations: Citation[];
    messageId?: string;
    ragasScore?: RagasScore;
  }) => {
    setStreaming(false);
    setStreamingQuestion(null);
    submittingRef.current = false;

    const assistantMsg: Message = {
      id: messageId ?? `local-${Date.now()}`,
      role: "ASSISTANT",
      content: answer,
      citations,
      ragasScore: ragasScore ?? null,
      bookmarked: false,
      sessionId: session.id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    // Refresh parent session state to replace optimistic user message and keep
    // IDs/bookmarks in sync with DB.
    onSessionUpdate?.();
  };

  const handleStreamError = (msg: string) => {
    setStreaming(false);
    setStreamingQuestion(null);
    submittingRef.current = false;
    setError(msg);
  };

  const handleToggleBookmark = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, bookmarked: !m.bookmarked } : m))
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
    <div className="flex flex-col h-full" style={{ background: "var(--surface)" }}>
      {/* Low chunk warning */}
      {lowChunkWarning && (
        <div
          className="flex items-center gap-2 px-4 py-2.5 text-sm flex-shrink-0"
          style={{
            background: "var(--warning-muted)",
            borderBottom: "1px solid rgba(217,119,6,0.18)",
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
          /* Empty state with starter questions */
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: "var(--accent-soft)",
                border: "1px solid var(--accent-soft-border)",
              }}
              aria-hidden="true"
            >
              <Send size={22} style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>
              Start the conversation
            </h3>
            <p className="text-sm max-w-sm mb-6" style={{ color: "var(--text-muted)" }}>
              Ask anything about this codebase — architecture, specific functions, or how features are implemented.
            </p>

            {/* Starter question chips from persona */}
            {suggestedQuestions.length > 0 && (
              <div className="w-full max-w-md space-y-2">
                <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  Suggested starters
                </p>
                {suggestedQuestions.slice(0, 4).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q.question)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-soft-border)";
                      e.currentTarget.style.color = "var(--text)";
                      e.currentTarget.style.background = "var(--accent-soft)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.background = "var(--surface-2)";
                    }}
                  >
                    <span className="font-semibold text-xs block mb-0.5" style={{ color: "var(--accent)" }}>
                      {q.label}
                    </span>
                    {q.question}
                  </button>
                ))}
              </div>
            )}
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
                onStreamError={handleStreamError}
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
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
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
