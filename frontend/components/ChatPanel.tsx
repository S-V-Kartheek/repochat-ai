"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Send,
  Square,
  Loader2,
  BookmarkCheck,
  Bookmark,
  AlertTriangle,
  Copy,
  Check,
  Bot,
} from "lucide-react";
import { createApiClient } from "@/lib/api";
import StreamingText from "./StreamingText";
import CitationChip from "./CitationChip";
import MarkdownMessage from "./MarkdownMessage";
import type { Message, Citation, Session } from "@/lib/types";

// ── Starter suggested questions ────────────────────────────────────────────────
const STARTER_QUESTIONS = [
  "What is the overall architecture of this project?",
  "What are the main entry points and how does the app start?",
  "What external APIs or services does this codebase depend on?",
  "Where is the authentication logic handled?",
];

// ── Avatar components ─────────────────────────────────────────────────────────
function BotAvatar() {
  return (
    <div
      style={{
        flexShrink: 0,
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#2f6ff1,#7c3aed)",
        boxShadow: "0 2px 10px rgba(37,99,235,0.3)",
      }}
      aria-hidden="true"
    >
      <Bot size={15} color="#fff" strokeWidth={2} />
    </div>
  );
}

function UserAvatar() {
  return (
    <div
      style={{
        flexShrink: 0,
        width: "32px",
        height: "32px",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.72rem",
        fontWeight: 700,
        background: "linear-gradient(135deg, #2c2f3e, #343748)",
        color: "#c8cedf",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
        letterSpacing: "0.03em",
      }}
      aria-hidden="true"
    >
      Y
    </div>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyMessageButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button
      onClick={handleCopy}
      className="msg-action-btn"
      title={copied ? "Copied!" : "Copy message"}
      aria-label={copied ? "Copied!" : "Copy message"}
    >
      {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
    </button>
  );
}

// ── RagasBadge ────────────────────────────────────────────────────────────────
function RagasBadge({ score }: { score: Message["ragasScore"] }) {
  if (!score) {
    return (
      <span className="eval-badge eval-badge--pending">
        <span className="eval-dot" /> Evaluating…
      </span>
    );
  }

  const tier = score.overall ?? "low";
  const cls =
    tier === "high" ? "eval-badge--high" : tier === "medium" ? "eval-badge--medium" : "eval-badge--low";

  return (
    <span
      className={`eval-badge ${cls}`}
      title={[
        `Faithfulness: ${score.faithfulness}`,
        `Relevancy: ${score.answerRelevancy}`,
        `Context precision: ${score.contextPrecision}`,
      ].join("\n")}
    >
      <span className="eval-dot" />
      Eval: {tier.toUpperCase()}
    </span>
  );
}

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
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        flexDirection: isUser ? "row-reverse" : "row",
        padding: "4px 0",
      }}
      className="slide-up"
    >
      {/* Avatar */}
      {isUser ? <UserAvatar /> : <BotAvatar />}

      {/* Bubble + actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          maxWidth: "80%",
          alignItems: isUser ? "flex-end" : "flex-start",
        }}
      >
        {/* Role label */}
        <div style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "var(--text-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          padding: "0 4px",
          textAlign: isUser ? "right" : "left",
        }}>
          {isUser ? "You" : "RepoTalk"}
        </div>

        {/* Content bubble */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            fontSize: "0.9rem",
            lineHeight: 1.7,
            ...(isUser
              ? {
                // Warm neutral charcoal — no blue tint, clearly distinct from background
                background: "linear-gradient(160deg, #2c2f3e 0%, #252836 100%)",
                color: "#dde2f0",
                border: "1px solid rgba(255, 255, 255, 0.09)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
              }
              : {
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }),
          }}
        >
          {isUser ? (
            <p style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {message.content}
            </p>
          ) : (
            <MarkdownMessage content={message.content} />
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", paddingTop: "2px" }}>
            {message.citations.map((c, i) => (
              <CitationChip key={i} citation={c} index={i} />
            ))}
          </div>
        )}

        {/* Action row for assistant messages */}
        {!isUser && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "2px" }}>
            <RagasBadge score={message.ragasScore} />
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <CopyMessageButton text={message.content} />
              <button
                onClick={() => onToggleBookmark(message.id)}
                className="msg-action-btn"
                aria-label={message.bookmarked ? "Remove bookmark" : "Bookmark"}
                title={message.bookmarked ? "Remove bookmark" : "Bookmark"}
              >
                {message.bookmarked ? (
                  <BookmarkCheck size={12} style={{ color: "var(--primary)" }} />
                ) : (
                  <Bookmark size={12} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Streaming bubble ──────────────────────────────────────────────────────────
function StreamingBubble({
  repoId,
  sessionId,
  question,
  getToken,
  onDone,
  onError,
  abortSignal,
}: {
  repoId: string;
  sessionId: string;
  question: string;
  getToken: () => Promise<string | null>;
  onDone: (result: { answer: string; citations: Citation[]; messageId?: string }) => void;
  onError: (err: string) => void;
  abortSignal: AbortSignal;
}) {
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamedText, setStreamedText] = useState("");

  const handleError = (err: string) => {
    setStreamError(err);
    onError(err);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        flexDirection: "row",
        padding: "4px 0",
      }}
      className="slide-up"
    >
      <BotAvatar />
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxWidth: "80%", alignItems: "flex-start" }}>
        <div style={{
          fontSize: "0.7rem",
          fontWeight: 600,
          color: "var(--text-faint)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          padding: "0 4px",
        }}>
          RepoTalk
        </div>
        <div style={{
          padding: "12px 16px",
          borderRadius: "18px 18px 18px 4px",
          fontSize: "0.9rem",
          lineHeight: 1.7,
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          {streamError ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--error)" }}>
              <AlertTriangle size={14} />
              {streamError}
            </div>
          ) : streamedText ? (
            <MarkdownMessage content={streamedText} isStreaming />
          ) : (
            <span className="typing-dots" aria-label="Thinking">
              <span /><span /><span />
            </span>
          )}
        </div>
        {/* Hidden StreamingText feeds text into the bubble */}
        <div style={{ display: "none" }}>
          <StreamingText
            repoId={repoId}
            sessionId={sessionId}
            question={question}
            getToken={getToken}
            onDone={onDone}
            onError={handleError}
            abortSignal={abortSignal}
            onToken={setStreamedText}
          />
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledRef = useRef(false);

  const api = useMemo(() => createApiClient(getToken), [getToken]);
  const isSubmittingRef = useRef(false);
  const streamKeyRef = useRef(0);
  const [streamKey, setStreamKey] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeSessionIdRef = useRef(session.id);
  useEffect(() => { activeSessionIdRef.current = session.id; }, [session.id]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
  }, [input]);

  // ── Smart auto-scroll ──────────────────────────────────────────────────────
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isUserScrolledRef.current = distFromBottom > 80;
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!isUserScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streaming, streamingQuestion]);

  // ── Session switch ─────────────────────────────────────────────────────────
  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isSubmittingRef.current = false;
    setStreaming(false);
    setStreamingQuestion(null);
    setError(null);
    setMessages(session.messages ?? []);
    isUserScrolledRef.current = false;
    // Scroll to bottom on session switch
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }, 50);
  }, [session.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unmount cleanup ────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      isSubmittingRef.current = false;
    };
  }, []);

  // ── RAGAS score polling ────────────────────────────────────────────────────
  useEffect(() => {
    const needsPolling = messages.some(
      (m) => m.role === "ASSISTANT" && !m.ragasScore && !m.id.startsWith("optimistic")
    );
    if (!needsPolling) return;
    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        const updated = await api.sessions.get(session.id);
        if (!active) return;
        const newCount = updated.messages?.filter((m) => m.role === "ASSISTANT" && m.ragasScore).length ?? 0;
        const oldCount = messages.filter((m) => m.role === "ASSISTANT" && m.ragasScore).length;
        if (newCount > oldCount) setMessages(updated.messages ?? []);
      } catch { /* ignore */ }
    };
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [messages, session.id, api]);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e?: React.FormEvent, prefill?: string) => {
      e?.preventDefault();
      const question = (prefill ?? input).trim();
      if (!question) return;
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;

      setInput("");
      setError(null);
      setStreaming(true);
      isUserScrolledRef.current = false;

      streamKeyRef.current += 1;
      setStreamKey(streamKeyRef.current);
      setStreamingQuestion(question);

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const submittedSessionId = session.id;

      const optimisticUser: Message = {
        id: `optimistic-${Date.now()}`,
        role: "USER",
        content: question,
        citations: null,
        ragasScore: null,
        bookmarked: false,
        sessionId: submittedSessionId,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);
    },
    [input, session.id]
  );

  // ── Stop generation ────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    isSubmittingRef.current = false;
    setStreaming(false);
    setStreamingQuestion(null);
  }, []);

  // ── Stream done ────────────────────────────────────────────────────────────
  const handleStreamDone = useCallback(
    ({ answer, citations, messageId }: { answer: string; citations: Citation[]; messageId?: string }) => {
      if (activeSessionIdRef.current !== session.id) return;

      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => !m.id.startsWith("optimistic-"));
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
        return [...withoutOptimistic, assistantMsg];
      });

      isSubmittingRef.current = false;
      setStreaming(false);
      setStreamingQuestion(null);
      abortControllerRef.current = null;
      onSessionUpdate?.();
    },
    [session.id, onSessionUpdate]
  );

  // ── Stream error ───────────────────────────────────────────────────────────
  const handleStreamError = useCallback((err: string) => {
    if (err.includes("aborted") || err.includes("AbortError")) return;
    setError(err);
    isSubmittingRef.current = false;
    setStreaming(false);
    setStreamingQuestion(null);
    abortControllerRef.current = null;
  }, []);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // ── Bookmark toggle ────────────────────────────────────────────────────────
  const handleToggleBookmark = useCallback(
    async (messageId: string) => {
      try {
        const updated = await api.sessions.toggleBookmark(session.id, messageId);
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, bookmarked: updated.bookmarked } : m))
        );
      } catch { /* ignore */ }
    },
    [api, session.id]
  );

  const isEmpty = messages.length === 0 && !streaming;

  return (
    // Critical: flex col, fill available space, min-h-0 so inner overflow works
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        height: "100%",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {/* Low-chunk warning */}
      {lowChunkWarning && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            fontSize: "0.84rem",
            flexShrink: 0,
            background: "var(--warning-muted)",
            borderBottom: "1px solid rgba(245,158,11,0.2)",
            color: "var(--warning)",
          }}
        >
          <AlertTriangle size={14} />
          This repo has a sparse index (&lt;10 chunks). Answers may be incomplete.
        </div>
      )}

      {/* ── Scrollable messages area ─────────────────────────── */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent",
        }}
      >
        {isEmpty ? (
          /* ── Empty state with starter questions ── */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "100%",
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "60px", height: "60px", borderRadius: "18px",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "20px",
                background: "linear-gradient(135deg,#2f6ff1,#7c3aed)",
                boxShadow: "0 4px 24px rgba(37,99,235,0.3)",
              }}
            >
              <Bot size={26} color="#fff" />
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--text)", marginBottom: "8px" }}>
              Ask anything about the codebase
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "28px", maxWidth: "420px", lineHeight: 1.6 }}>
              I have read every file. Try one of these to get started:
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "10px",
              width: "100%",
              maxWidth: "640px",
            }}>
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSubmit(undefined, q)}
                  disabled={streaming}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: "12px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: "0.84rem",
                    lineHeight: 1.5,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "var(--surface-3)";
                    el.style.borderColor = "var(--border-accent)";
                    el.style.color = "var(--text)";
                    el.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = "var(--surface-2)";
                    el.style.borderColor = "var(--border)";
                    el.style.color = "var(--text-muted)";
                    el.style.transform = "translateY(0)";
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Messages ── */
          <div
            style={{
              maxWidth: "820px",
              margin: "0 auto",
              width: "100%",
              padding: "32px 24px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onToggleBookmark={handleToggleBookmark}
              />
            ))}
            {streaming && streamingQuestion && abortControllerRef.current && (
              <StreamingBubble
                key={`streaming-${streamKey}`}
                repoId={repoId}
                sessionId={session.id}
                question={streamingQuestion}
                getToken={getToken}
                onDone={handleStreamDone}
                onError={handleStreamError}
                abortSignal={abortControllerRef.current.signal}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input bar (always at bottom) ─────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          borderTop: "1px solid var(--border)",
          background: "var(--surface-2)",
          padding: "16px 24px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "820px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "0.84rem",
                marginBottom: "10px",
                padding: "10px 14px",
                borderRadius: "10px",
                background: "var(--error-muted)",
                color: "var(--error)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <AlertTriangle size={13} />
              {error}
              <button
                style={{ marginLeft: "auto", fontSize: "0.75rem", textDecoration: "underline", background: "none", border: "none", color: "var(--error)", cursor: "pointer" }}
                onClick={() => setError(null)}
              >
                Dismiss
              </button>
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "10px",
              padding: "12px 14px",
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={() => {}}
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
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                fontFamily: "var(--font-sans)",
                fontSize: "0.9rem",
                color: "var(--text)",
                lineHeight: 1.6,
                minHeight: "24px",
                maxHeight: "160px",
              }}
              aria-label="Chat input"
            />
            {streaming ? (
              <button
                type="button"
                onClick={handleStop}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "none",
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#f87171",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
                aria-label="Stop generation"
                title="Stop generation"
              >
                <Square size={15} strokeWidth={2} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  border: "none",
                  background: input.trim()
                    ? "linear-gradient(135deg, var(--primary), var(--secondary))"
                    : "rgba(255,255,255,0.06)",
                  color: input.trim() ? "#fff" : "var(--text-faint)",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  flexShrink: 0,
                  transition: "all 0.2s",
                  boxShadow: input.trim() ? "0 0 14px rgba(59, 130, 246, 0.3)" : "none",
                }}
                aria-label="Send message"
              >
                <Send size={15} strokeWidth={2} />
              </button>
            )}
          </form>
          <p
            style={{
              fontSize: "0.71rem",
              color: "var(--text-faint)",
              marginTop: "8px",
              textAlign: "center",
            }}
          >
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
