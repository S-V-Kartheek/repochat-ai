/**
 * Gateway: PR Summarizer Routes
 * Proxies PR summarization requests to the AI service.
 *
 * Phase 3 — Week 8 implementation.
 */

import { Router, Request, Response } from "express";
import { aiClient } from "../services/aiProxy";
import { requireAuth } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimit";

export const prRoutes = Router();

// ── POST /api/pr/summarize — Summarize a GitHub PR ──────────────────────────
prRoutes.post("/summarize", requireAuth, rateLimiter, async (req: Request, res: Response) => {
  const { prUrl, repoId } = req.body;

  if (!prUrl) {
    return res.status(400).json({ error: "prUrl is required" });
  }

  try {
    const aiRes = await aiClient.post("/api/v1/pr/summarize", {
      pr_url: prUrl,
      repo_id: repoId || "",
    });

    return res.json(aiRes.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || err.message;
    return res.status(status).json({ error: detail });
  }
});

// ── POST /api/pr/webhook — Forward GitHub webhooks ──────────────────────────
prRoutes.post("/webhook", async (req: Request, res: Response) => {
  try {
    const aiRes = await aiClient.post("/api/v1/pr/webhook", req.body);
    return res.json(aiRes.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || err.message;
    return res.status(status).json({ error: detail });
  }
});
