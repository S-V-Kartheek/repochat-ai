/**
 * Route: /api/eval
 * Proxies to FastAPI evaluation service.
 * Returns RAGAS scores and dashboard metrics.
 *
 * Phase 2 — Week 6 implementation.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";

export const evalRoutes = Router();

/**
 * GET /api/eval/dashboard/:repoId
 * Get evaluation metrics for the dashboard charts.
 */
evalRoutes.get("/dashboard/:repoId", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 6
  res.status(501).json({ error: "Not implemented — Phase 2 Week 6" });
});

/**
 * POST /api/eval/score
 * Manually trigger RAGAS evaluation on a specific message.
 * Body: { messageId, question, answer, contexts }
 */
evalRoutes.post("/score", requireAuth, async (req, res) => {
  // TODO: Phase 2 Week 6
  res.status(501).json({ error: "Not implemented — Phase 2 Week 6" });
});
