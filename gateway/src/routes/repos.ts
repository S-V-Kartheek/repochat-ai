/**
 * Route: /api/repos
 * Repo management — connect, status, list, delete.
 * Triggers AI service ingestion as a background job.
 *
 * Phase 2 — Week 4 implementation.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";

export const repoRoutes = Router();

/**
 * POST /api/repos
 * Connect a new GitHub repo for the current user.
 * Triggers ingestion in the FastAPI AI service (background).
 * Body: { githubUrl: string, languages?: string[] }
 */
repoRoutes.post("/", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 4
  // 1. Validate GitHub URL (must be public)
  // 2. Create Repo record in DB (status: "pending")
  // 3. POST to AI service /api/v1/ingest (fire & forget)
  // 4. Return { repoId, status: "ingesting" }
  res.status(501).json({ error: "Not implemented — Phase 2 Week 4" });
});

/**
 * GET /api/repos
 * List all repos connected by the current user.
 */
repoRoutes.get("/", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 4
  res.status(501).json({ error: "Not implemented — Phase 2 Week 4" });
});

/**
 * GET /api/repos/:repoId
 * Get repo details + ingestion status.
 */
repoRoutes.get("/:repoId", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 4
  res.status(501).json({ error: "Not implemented — Phase 2 Week 4" });
});

/**
 * GET /api/repos/:repoId/status
 * Poll ingestion progress (proxied from AI service).
 * Frontend polls this endpoint every 2s during ingestion.
 */
repoRoutes.get("/:repoId/status", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 4
  res.status(501).json({ error: "Not implemented — Phase 2 Week 4" });
});

/**
 * DELETE /api/repos/:repoId
 * Remove repo from DB + delete all Qdrant vectors.
 */
repoRoutes.delete("/:repoId", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 4
  res.status(501).json({ error: "Not implemented — Phase 2 Week 4" });
});
