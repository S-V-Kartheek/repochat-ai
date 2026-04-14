/**
 * Route: /api/chat
 * Proxies queries to the FastAPI AI service.
 * Streams SSE (Server-Sent Events) responses back to the frontend.
 *
 * Phase 2 — Week 4 implementation.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimit";

export const chatRoutes = Router();

/**
 * POST /api/chat/query
 * Non-streaming: send question, get full answer in one response.
 * Body: { question, repoId, sessionId, history? }
 */
chatRoutes.post("/query", requireAuth, rateLimiter, async (req, res) => {
  // TODO: Phase 2 Week 4
  // 1. Validate body with Zod
  // 2. Forward to FastAPI /api/v1/query/
  // 3. Return { answer, citations, ragasScore }
  res.status(501).json({ error: "Not implemented — Phase 2 Week 4" });
});

/**
 * POST /api/chat/stream
 * Streaming: establishes SSE connection, streams tokens word-by-word.
 *
 * SSE format:
 *   data: {"token": "The"}\n\n
 *   data: {"token": " authenticate"}\n\n
 *   data: {"done": true, "citations": [...], "sessionId": "..."}\n\n
 *
 * Implementation:
 *   1. Set SSE headers (Content-Type: text/event-stream)
 *   2. Forward request to FastAPI /api/v1/query/stream
 *   3. Pipe the stream back to client
 *   4. On stream end: save message + citations to DB
 */
chatRoutes.post("/stream", requireAuth, rateLimiter, async (req, res) => {
  // TODO: Phase 2 Week 4
  res.status(501).json({ error: "Not implemented — Phase 2 Week 4" });
});

/**
 * POST /api/chat/summarize-session
 * Generate a bullet-point summary of a full chat session.
 * Body: { sessionId }
 */
chatRoutes.post("/summarize-session", requireAuth, async (req, res) => {
  // TODO: Phase 3 Week 9
  res.status(501).json({ error: "Not implemented — Phase 3 Week 9" });
});
