/**
 * Gateway: Persona Routes
 * Proxies persona generation to the AI service and caches results in Prisma DB.
 *
 * Phase 3 — Week 7 implementation.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { aiClient } from "../services/aiProxy";
import { requireAuth } from "../middleware/auth";
import { ensureUser } from "../services/db";

const prisma = new PrismaClient();
export const personaRoutes = Router();

// ── POST /api/persona — Generate persona for a repo ─────────────────────────
personaRoutes.post("/", requireAuth, async (req: Request, res: Response) => {
  const { repoId } = req.body;

  if (!repoId) {
    return res.status(400).json({ error: "repoId is required" });
  }

  const userId = await ensureUser(req.userId!, req.userEmail);

  // Check if repo exists and belongs to current user
  const repo = await prisma.repo.findFirst({ where: { id: repoId, userId } });
  if (!repo) {
    return res.status(404).json({ error: "Repo not found" });
  }

  // Check for cached persona
  const existing = await prisma.repoPersona.findUnique({
    where: { repoId },
  });
  if (existing) {
    return res.json({
      repo_id: repoId,
      dominant_language: existing.dominantLanguage,
      stack: JSON.parse(existing.stack),
      frameworks: JSON.parse(existing.frameworks),
      architecture_style: existing.architectureStyle,
      conventions: existing.conventions,
      key_contributors: JSON.parse(existing.keyContributors),
      onboarding_guide: existing.onboardingGuide,
      architecture_overview: existing.architectureOverview,
      cached: true,
    });
  }

  // Call AI service to generate
  try {
    const aiRes = await aiClient.post("/api/v1/persona/", {
      repo_id: repoId,
      repo_url: repo.githubUrl,
    });

    const persona = aiRes.data;

    // Cache in DB
    await prisma.repoPersona.create({
      data: {
        repoId,
        dominantLanguage: persona.dominant_language || "Unknown",
        stack: JSON.stringify(persona.stack || []),
        frameworks: JSON.stringify(persona.frameworks || []),
        architectureStyle: persona.architecture_style || "unknown",
        conventions: persona.conventions || "",
        keyContributors: JSON.stringify(persona.key_contributors || []),
        onboardingGuide: persona.onboarding_guide || "",
        architectureOverview: persona.architecture_overview || "",
      },
    });

    return res.json({ ...persona, repo_id: repoId, cached: false });
  } catch (err: any) {
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || err.message;
    return res.status(status).json({ error: detail });
  }
});

// ── GET /api/persona/:repoId — Get cached persona ───────────────────────────
personaRoutes.get("/:repoId", requireAuth, async (req: Request, res: Response) => {
  const { repoId } = req.params;

  const userId = await ensureUser(req.userId!, req.userEmail);
  const repo = await prisma.repo.findFirst({ where: { id: repoId, userId } });
  if (!repo) {
    return res.status(404).json({ error: "Repo not found" });
  }

  const cached = await prisma.repoPersona.findUnique({
    where: { repoId },
  });

  if (cached) {
    return res.json({
      repo_id: repoId,
      dominant_language: cached.dominantLanguage,
      stack: JSON.parse(cached.stack),
      frameworks: JSON.parse(cached.frameworks),
      architecture_style: cached.architectureStyle,
      conventions: cached.conventions,
      key_contributors: JSON.parse(cached.keyContributors),
      onboarding_guide: cached.onboardingGuide,
      architecture_overview: cached.architectureOverview,
      cached: true,
    });
  }

  return res.status(404).json({ error: "Persona not generated yet. POST /api/persona to generate." });
});

// ── DELETE /api/persona/:repoId — Regenerate persona ─────────────────────────
personaRoutes.delete("/:repoId", requireAuth, async (req: Request, res: Response) => {
  const { repoId } = req.params;

  const userId = await ensureUser(req.userId!, req.userEmail);
  const repo = await prisma.repo.findFirst({ where: { id: repoId, userId } });
  if (!repo) {
    return res.status(404).json({ error: "Repo not found" });
  }

  await prisma.repoPersona.deleteMany({ where: { repoId } });
  return res.json({ deleted: true, repoId });
});
