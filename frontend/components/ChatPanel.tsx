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

// ── Starter suggested questions (static — Phase 3 will personalize per repo) ──
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
      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
      style={{ background: "linear-gradient(135deg,#2f6ff1,#7c3aed)", boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
      aria-hidden="true"
    >
      <Bot size={15} color="#fff" strokeWidth={2} />
    </div>
  );
}

function UserAvatar() {
  return (
    <div
      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
      style={{ background: "linear-gradient(135deg,#2f6ff1,#2457ca)", color: "#fff" }}
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
      className={`chat-msg ${isUser ? "chat-msg--user" : "chat-msg--assistant"} slide-up`}
    >
      {/* Avatar */}
      {!isUser && <BotAvatar />}

      {/* Bubble + actions */}
      <div className={`chat-msg-body ${isUser ? "items-end" : "items-start"}`}>
        {/* Role label */}
        <div className="chat-msg-label">
          {isUser ? "You" : "RepoTalk"}
        </div>

        {/* Content bubble */}
        <div className={`chat-bubble ${isUser ? "chat-bubble--user" : "chat-bubble--assistant"}`}>
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
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.citations.map((c, i) => (
              <CitationChip key={i} citation={c} index={i} />
            ))}
          </div>
        )}

        {/* Action row for assistant messages */}
        {!isUser && (
          <div className="chat-msg-actions">
            <RagasBadge score={message.ragasScore} />
            <div className="flex items-center gap-1">
              <CopyMessageButton text={message.content} />
              <button
                onClick={() => onToggleBookmark(message.id)}
                className="msg-action-btn"
                aria-label={message.bookmarked ? "Remove bookmark" : "Bookmark"}
                title={message.bookmarked ? "Remove bookmark" : "Bookmark"}
              >
                {message.bookmarked ? (
                  <BookmarkCheck size={12} style={{ color: "var(--accent)" }} />
                ) : (
                  <Bookmark size={12} />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {isUser && <UserAvatar />}
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
    <div className="chat-msg chat-msg--assistant slide-up">
      <BotAvatar />
      <div className="chat-msg-body items-start">
        <div className="chat-msg-label">RepoTalk</div>
        <div className="chat-bubble chat-bubble--assistant">
          {streamError ? (
            <div className="flex items-center gap-2" style={{ color: "var(--error)" }}>
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
  const bottomRef = useRef<HTMLDivElement>(null);
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
    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 144) + "px";
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
    <div className="flex flex-col h-full" style={{ background: "var(--surface)" }}>
      {/* Low-chunk warning */}
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

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-1"
        style={{ scrollbarGutter: "stable" }}
      >
        {isEmpty ? (
          /* ── Empty state with starter questions ── */
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
              style={{ background: "linear-gradient(135deg,#2f6ff1,#7c3aed)", boxShadow: "0 4px 20px rgba(37,99,235,0.25)" }}
            >
              <Bot size={26} color="#fff" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
              Ask anything about the codebase
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              I have read every file. Try one of these to get started:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mt-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSubmit(undefined, q)}
                  className="starter-chip"
                  disabled={streaming}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
        <div ref={messagesEndRef} />
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="chat-input-bar">
        {error && (
          <div
            className="flex items-center gap-2 text-sm mb-2 px-3 py-2 rounded-lg"
            style={{ background: "var(--error-muted)", color: "var(--error)" }}
          >
            <AlertTriangle size={13} />
            {error}
            <button
              className="ml-auto text-xs underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="chat-input-form">
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the codebase…"
            disabled={streaming}
            rows={1}
            className="chat-textarea"
            aria-label="Chat input"
          />
          {streaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="chat-send-btn chat-stop-btn"
              aria-label="Stop generation"
              title="Stop generation"
            >
              <Square size={15} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="chat-send-btn"
              aria-label="Send message"
            >
              <Send size={15} strokeWidth={2} />
            </button>
          )}
        </form>
        <p className="chat-input-hint">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
