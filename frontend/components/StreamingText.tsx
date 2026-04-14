/**
 * Component: StreamingText
 * Renders tokens streamed via SSE one-by-one with a blinking cursor.
 *
 * Props:
 *   sessionId: string  — active session ID
 *   repoId:    string  — repo context
 *   question:  string  — the question being asked
 *   onDone:    handler — called with { answer, citations } when stream ends
 *
 * Implementation:
 *   1. Opens EventSource to /api/chat/stream
 *   2. Appends each token to displayed text
 *   3. On final SSE event: calls onDone with citations
 *   4. Shows blinking cursor while streaming
 *
 * Phase 2 — Week 4 implementation.
 */

interface StreamingTextProps {
  sessionId: string;
  repoId: string;
  question: string;
  onDone?: (result: { answer: string; citations: unknown[] }) => void;
}

// TODO: Phase 2 Week 4 — SSE implementation with cursor animation
export default function StreamingText({ question }: StreamingTextProps) {
  return <div>Streaming answer for: {question}...</div>;
}
