"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Send, Loader2, BookmarkCheck, Bookmark, AlertTriangle, Sparkles, MessageSquare } from "lucide-react";
import { createApiClient } from "@/lib/api";
import StreamingText from "./StreamingText";
import CitationChip from "./CitationChip";
import { QualityBadge } from "./QualityBadge";
import type { Message, Citation, Session } from "@/lib/types";

type AssistantTone = "summary" | "details" | "important" | "metadata" | "steps" | "default";

interface AssistantSection {
  heading: string | null;
  body: string;
  tone: AssistantTone;
}

function normalizeHeading(heading: string): string {
  return heading
    .replace(/^#+\s*/, "")
    .replace(/\*+/g, "")
    .replace(/:+$/, "")
    .trim();
}

function splitHeadingAndBody(block: string): { heading: string | null; body: string } {
  const trimmed = block.trim();
  const lines = trimmed.split("\n");
  const firstLine = lines[0]?.trim() ?? "";

  // "## Details"
  if (/^#{1,6}\s+/.test(firstLine)) {
    const heading = normalizeHeading(firstLine);
    const body = lines.slice(1).join("\n").trim();
    return { heading: heading || null, body: body || trimmed };
  }

  // "Details:"
  if (firstLine.endsWith(":") && firstLine.length <= 46) {
    const heading = normalizeHeading(firstLine);
    const body = lines.slice(1).join("\n").trim();
    return { heading: heading || null, body: body || trimmed };
  }

  // "Details: text..."
  const inlineHeading = firstLine.match(/^([A-Za-z][A-Za-z0-9\s/&()_-]{2,44}):\s+(.+)$/);
  if (inlineHeading) {
    const heading = normalizeHeading(inlineHeading[1]);
    const body = [inlineHeading[2], ...lines.slice(1)].join("\n").trim();
    return { heading: heading || null, body: body || trimmed };
  }

  return { heading: null, body: trimmed };
}

function classifyTone(heading: string | null, body: string, index: number): AssistantTone {
  const signal = `${heading ?? ""}\n${body}`.toLowerCase();

  if (/\b(important|warning|risk|note|caution)\b/.test(signal)) return "important";
  if (/\b(metadata|sources?|citations?|references?|context)\b/.test(signal)) return "metadata";
  if (/\b(step|steps|how to|process|workflow)\b/.test(signal)) return "steps";
  if (/\b(details?|breakdown|analysis|deep dive)\b/.test(signal)) return "details";
  if (index === 0) return "summary";
  return "default";
}

function parseAssistantSections(content: string): AssistantSection[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // Keep code responses untouched.
  if (trimmed.includes("```")) {
    return [{ heading: null, body: trimmed, tone: "default" }];
  }

  const blocks = trimmed
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return [{ heading: null, body: trimmed, tone: "default" }];
  }

  return blocks.map((block, index) => {
    const { heading, body } = splitHeadingAndBody(block);
    return {
      heading,
      body,
      tone: classifyTone(heading, body, index),
    };
  });
}

function renderSectionBody(body: string) {
  const nonEmptyLines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletLines = nonEmptyLines.filter((line) => /^[-*]\s+/.test(line));
  const isBulletOnly = bulletLines.length >= 2 && bulletLines.length === nonEmptyLines.length;

  if (isBulletOnly) {
    return (
      <ul className="assistant-block__list">
        {bulletLines.map((line, idx) => (
          <li key={`${line}-${idx}`}>{line.replace(/^[-*]\s+/, "")}</li>
        ))}
      </ul>
    );
  }

  return <p className="assistant-block__text">{body}</p>;
}

/** Render assistant answers as professional structured blocks. */
function FormattedAssistantText({
  content,
}: {
  content: string;
}) {
  const safeContent = content.trim()
    ? content
    : "I could not generate a complete answer for this message. Please ask again.";
  const sections = parseAssistantSections(safeContent);

  if (sections.length === 1 && safeContent.includes("```")) {
    return (
      <p className="whitespace-pre-wrap break-words m-0 leading-relaxed assistant-block__text">
        {safeContent}
      </p>
    );
  }

  if (sections.length === 0) {
    return <p className="assistant-block__text">{safeContent}</p>;
  }

  return (
    <div className="assistant-answer-shell">
      {sections.map((section, i) => (
        <section
          key={`${section.heading ?? "section"}-${i}`}
          className={`assistant-block assistant-block--${section.tone}`}
        >
          <div className="assistant-block__strip" aria-hidden="true" />
          <div className="assistant-block__inner">
            {section.heading && (
              <p className="assistant-block__heading">{section.heading}</p>
            )}
            {renderSectionBody(section.body)}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────────────────────

function MessageBubble({
  message,
  onToggleBookmark,
  onOpenCitation,
}: {
  message: Message;
  onToggleBookmark: (id: string) => void;
  onOpenCitation?: (citation: Citation) => void;
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
            background: isUser ? "linear-gradient(180deg,#2f6ff1 0%,#2457ca 100%)" : "transparent",
            color: isUser ? "#fff" : "var(--text)",
            border: "none",
            boxShadow: isUser ? "var(--shadow-sm)" : "none",
            padding: isUser ? undefined : 0,
          }}
        >
          {isUser ? (
            <p
              className="whitespace-pre-wrap break-words m-0 leading-relaxed"
              style={{ color: "#fff" }}
            >
              {message.content}
            </p>
          ) : (
            <>
              <div className="assistant-meta-row">
                <span className="assistant-pill assistant-pill--primary">Structured Answer</span>
                {message.citations && message.citations.length > 0 && (
                  <span className="assistant-pill assistant-pill--muted">
                    {message.citations.length} citations
                  </span>
                )}
              </div>
              <FormattedAssistantText content={message.content} />
            </>
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {message.citations.map((c, i) => (
              <CitationChip
                key={i}
                citation={c}
                index={i}
                onOpenCitation={onOpenCitation}
              />
            ))}
          </div>
        )}

        {/* Quality Badge */}
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
  onError,
}: {
  repoId: string;
  sessionId: string;
  question: string;
  getToken: () => Promise<string | null>;
  onDone: (result: { answer: string; citations: Citation[]; messageId?: string; followUps?: string[] }) => void;
  onError: (message: string) => void;
}) {
  const [streamError, setStreamError] = useState<string | null>(null);

  return (
    <div className="flex justify-start mb-6 slide-up">
      <div className="max-w-[85%] space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
          RepoTalk
        </div>
        <div
          className="px-4 py-3 rounded-xl text-sm leading-relaxed"
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
            <div className="text-[var(--text)]">
              <StreamingText
                repoId={repoId}
                sessionId={sessionId}
                question={question}
                getToken={getToken}
                onDone={onDone}
                onError={(message) => {
                  setStreamError(message);
                  onError(message);
                }}
              />
            </div>
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
  onOpenCitation?: (citation: Citation) => void;
  /** Short label for empty state (e.g. repo name without org). */
  repoShortName?: string;
}

export default function ChatPanel({
  repoId,
  session,
  lowChunkWarning = false,
  onSessionUpdate,
  onOpenCitation,
  repoShortName,
}: ChatPanelProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>(session.messages ?? []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingQuestion, setStreamingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const submitLockRef = useRef(false);

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
    if (!question || streaming || submitLockRef.current) return;
    submitLockRef.current = true;

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
    followUps: newFollowUps,
  }: {
    answer: string;
    citations: Citation[];
    messageId?: string;
    followUps?: string[];
  }) => {
    const currentQuestion = streamingQuestion;
    const safeAnswer = answer.trim()
      ? answer
      : "I could not generate a complete answer for this question. Please try again.";
    submitLockRef.current = false;
    setStreaming(false);
    setStreamingQuestion(null);

    const assistantMsg: Message = {
      id: messageId ?? `local-${Date.now()}`,
      role: "ASSISTANT",
      content: safeAnswer,
      citations,
      ragasScore: null,
      bookmarked: false,
      sessionId: session.id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    // Set follow-ups from the LLM response
    setFollowUps(newFollowUps || []);

    // Refresh parent session state to replace optimistic user message and keep
    // IDs/bookmarks in sync with DB.
    onSessionUpdate?.();

    // RAGAS evaluation is now queued automatically in gateway /api/chat.
    // We keep the UI reactive by polling session updates while scores are pending.
    if (messageId && citations.length > 0 && currentQuestion) {
      onSessionUpdate?.();
    }
  };

  const handleStreamError = (message: string) => {
    submitLockRef.current = false;
    setStreaming(false);
    setStreamingQuestion(null);
    setError(message);
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

  const handleFollowUpClick = (question: string) => {
    setInput(question);
    setFollowUps([]);
    // Auto-submit after a small delay
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }, 50);
  };

  const handleSummarize = () => {
    setInput("Summarize this entire conversation session. Include the main topics discussed and key findings.");
    setTimeout(() => {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }, 50);
  };

  const isEmpty = messages.length === 0 && !streaming;

  useEffect(() => {
    if (!onSessionUpdate) return;

    const hasPendingEvaluation = messages.some(
      (message) =>
        message.role === "ASSISTANT" &&
        !message.ragasScore &&
        (message.citations?.length ?? 0) > 0
    );
    if (!hasPendingEvaluation) return;

    const interval = setInterval(() => {
      onSessionUpdate();
    }, 4000);

    return () => clearInterval(interval);
  }, [messages, onSessionUpdate]);

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
          /* Empty state — workspace-oriented */
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}
              aria-hidden="true"
            >
              <Send size={22} style={{ color: "var(--accent)" }} />
            </div>
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-faint)" }}
            >
              Repository workspace
            </p>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text)" }}>
              {repoShortName
                ? `Ask ${repoShortName} anything`
                : "Ask this repository anything"}
            </h3>
            <p className="text-sm max-w-md mb-6" style={{ color: "var(--text-muted)" }}>
              Explore architecture, trace behavior, or zoom to an implementation.
              Answers stay grounded in your indexed code.
            </p>
            <ul
              className="text-left text-sm max-w-md space-y-3 rounded-xl px-5 py-4 w-full"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              <li className="flex gap-2">
                <span className="flex-shrink-0 font-semibold" style={{ color: "var(--accent)" }}>
                  →
                </span>
                <span>
                  Citations open in the <strong style={{ color: "var(--text)" }}>Code</strong> tab
                  (use the <strong style={{ color: "var(--text)" }}>Context</strong> button on smaller
                  screens).
                </span>
              </li>
              <li className="flex gap-2">
                <span className="flex-shrink-0 font-semibold" style={{ color: "var(--accent)" }}>
                  →
                </span>
                <span>
                  Use <strong style={{ color: "var(--text)" }}>Files</strong> and{" "}
                  <strong style={{ color: "var(--text)" }}>Symbols</strong> to orient before you type.
                </span>
              </li>
            </ul>
          </div>
        ) : (
          <div>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onToggleBookmark={handleToggleBookmark}
                onOpenCitation={onOpenCitation}
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
                onError={handleStreamError}
              />
            )}
          </div>
        )}
        <div ref={bottomRef} />

        {/* Follow-up suggestions */}
        {followUps.length > 0 && !streaming && (
          <div className="px-2 pb-2 slide-up">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: "var(--text-faint)" }}
            >
              Suggested follow-ups
            </p>
            <div className="flex flex-wrap gap-2">
              {followUps.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleFollowUpClick(q)}
                  className="text-left text-sm px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.color = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                >
                  <Sparkles size={11} className="inline mr-1.5" style={{ opacity: 0.6 }} />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
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
        <p className="text-[11px] mt-2 flex items-center justify-between" style={{ color: "var(--text-faint)" }}>
          <span>Enter to send · Shift+Enter for new line</span>
          {messages.length > 2 && (
            <button
              onClick={handleSummarize}
              disabled={streaming}
              className="flex items-center gap-1 hover:underline"
              style={{ color: "var(--accent)", cursor: "pointer", background: "none", border: "none", padding: 0, font: "inherit", fontSize: "inherit" }}
            >
              <MessageSquare size={11} />
              Summarize session
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
