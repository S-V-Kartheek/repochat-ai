"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Citation } from "@/lib/types";

interface StreamingTextProps {
  repoId: string;
  sessionId: string;
  question: string;
  getToken: () => Promise<string | null>;
  onDone: (result: { answer: string; citations: Citation[]; messageId?: string }) => void;
  onError?: (err: string) => void;
}

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

function normalizeCitation(citation: unknown): Citation {
  const raw = (citation ?? {}) as {
    file?: string;
    startLine?: number;
    endLine?: number;
    start_line?: number;
    end_line?: number;
    snippet?: string;
  };

  const start = raw.startLine ?? raw.start_line ?? 1;
  const end = raw.endLine ?? raw.end_line ?? start;

  return {
    file: raw.file ?? "unknown",
    startLine: Number.isFinite(start) ? Number(start) : 1,
    endLine: Number.isFinite(end) ? Number(end) : Number.isFinite(start) ? Number(start) : 1,
    snippet: raw.snippet ?? "",
  };
}

/**
 * StreamingText — opens a POST fetch SSE stream to the gateway.
 * Renders tokens word-by-word with an animated cursor.
 * Calls onDone when the final "done" event arrives.
 */
export default function StreamingText({
  repoId,
  sessionId,
  question,
  getToken,
  onDone,
  onError,
}: StreamingTextProps) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(async () => {
    const token = await getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${GATEWAY}/api/chat/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ repoId, sessionId, question, topK: 5 }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`Stream error: HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullAnswer = "";
      let finalCitations: Citation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const raw = trimmed.slice(5).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);

            if ("token" in event) {
              fullAnswer += event.token;
              setText((prev) => prev + event.token);
            } else if (event.done) {
              finalCitations = Array.isArray(event.citations)
                ? event.citations.map(normalizeCitation)
                : [];
              setStreaming(false);
              onDone({
                answer: fullAnswer,
                citations: finalCitations,
                messageId: typeof event.message_id === "string" ? event.message_id : undefined,
              });
            } else if (event.error) {
              throw new Error(event.error);
            }
          } catch (parseErr) {
            // Ignore non-JSON lines (keep-alive comments etc.)
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setStreaming(false);
      const msg = err instanceof Error ? err.message : "Stream failed";
      if (onError) onError(msg);
    }
  }, [repoId, sessionId, question, getToken, onDone, onError]);

  useEffect(() => {
    stream();
    return () => { abortRef.current?.abort(); };
  }, [stream]);

  return (
    <span className="whitespace-pre-wrap break-words leading-relaxed" style={{ color: "var(--text)" }}>
      {text || <span style={{ color: "var(--text-faint)" }}>Thinking through your repository context...</span>}
      {streaming && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom blink-cursor"
          style={{ background: "var(--accent)" }}
          aria-hidden="true"
        />
      )}
    </span>
  );
}
