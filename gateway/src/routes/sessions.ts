/**
 * Route: /api/sessions
 * Session + Message CRUD — persistent chat history.
 *
 * Phase 2 — Week 5 implementation.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";

export const sessionRoutes = Router();

/**
 * POST /api/sessions
 * Create a new chat session for a repo.
 * Body: { repoId: string }
 * Returns: { id, repoId, userId, title, createdAt }
 */
sessionRoutes.post("/", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 5 — Create session in Supabase via Prisma
  res.status(501).json({ error: "Not implemented — Phase 2 Week 5" });
});

/**
 * GET /api/sessions?repoId=xxx
 * List all sessions for the current user + repo.
 */
sessionRoutes.get("/", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 5
  res.status(501).json({ error: "Not implemented — Phase 2 Week 5" });
});

/**
 * GET /api/sessions/:sessionId
 * Get a single session with all its messages.
 */
sessionRoutes.get("/:sessionId", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 5
  res.status(501).json({ error: "Not implemented — Phase 2 Week 5" });
});

/**
 * DELETE /api/sessions/:sessionId
 * Delete a session and all its messages.
 */
sessionRoutes.delete("/:sessionId", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 5
  res.status(501).json({ error: "Not implemented — Phase 2 Week 5" });
});

/**
 * POST /api/sessions/:sessionId/messages
 * Save a message (user or assistant) to a session.
 * Body: { role, content, citations?, ragasScore? }
 */
sessionRoutes.post("/:sessionId/messages", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 5
  res.status(501).json({ error: "Not implemented — Phase 2 Week 5" });
});

/**
 * PATCH /api/sessions/:sessionId/messages/:messageId/bookmark
 * Toggle the bookmarked flag on a message.
 */
sessionRoutes.patch("/:sessionId/messages/:messageId/bookmark", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 5
  res.status(501).json({ error: "Not implemented — Phase 2 Week 5" });
});

/**
 * GET /api/sessions/search?q=xxx&repoId=xxx
 * Full-text search across all past messages for a user + repo.
 */
sessionRoutes.get("/search", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 5
  res.status(501).json({ error: "Not implemented — Phase 2 Week 5" });
});
