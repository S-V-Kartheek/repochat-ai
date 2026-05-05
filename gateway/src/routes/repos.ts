/**
 * Route: /api/repos
 * Repo management — connect, list, get, status poll, delete.
 * Triggers AI service ingestion as a background job.
 */

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma, ensureUser } from "../services/db";
import {
  triggerIngestion,
  getIngestStatus,
  deleteRepoVectors,
  getRepoTree,
  getRepoFile,
  getRepoSymbols,
} from "../services/aiProxy";

export const repoRoutes = Router();

// ── Validation schemas ─────────────────────────────────────────────────────────

const CreateRepoSchema = z.object({
  githubUrl: z
    .string()
    .url("Must be a valid URL")
    .regex(/github\.com/, "Must be a GitHub URL"),
  languages: z.array(z.string()).optional().default(["py", "js", "ts"]),
});

const FileQuerySchema = z.object({
  path: z.string().min(1, "File path is required"),
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function repoNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    // pathname = "/owner/repo" → "owner/repo"
    return u.pathname.replace(/^\//, "").replace(/\.git$/, "") || url;
  } catch {
    return url;
  }
}

function normalizeRepoLanguages(languages: string): string[] {
  return languages.split(",").map((lang) => lang.trim()).filter(Boolean);
}

function getTriggerErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: unknown } }).response?.data
  ) {
    const data = (error as { response: { data?: { detail?: string; error?: string; message?: string } } }).response.data;
    if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Failed to start ingestion";
}

function getProxyErrorStatus(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object"
  ) {
    const status = (error as { response?: { status?: unknown } }).response?.status;
    if (typeof status === "number" && status >= 400) return status;
  }

  return 503;
}

function getProxyErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: { data?: unknown } }).response?.data
  ) {
    const data = (error as { response: { data?: { detail?: string; error?: string; message?: string } } }).response.data;
    if (typeof data?.detail === "string" && data.detail.trim()) return data.detail;
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/repos
 * Connect a new GitHub repo. Fires ingestion in background.
 */
repoRoutes.post("/", requireAuth, async (req, res) => {
  const parse = CreateRepoSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { githubUrl, languages } = parse.data;
  const userId = await ensureUser(req.userId!, req.userEmail);

  // Create repo record
  const repo = await prisma.repo.create({
    data: {
      githubUrl,
      name: repoNameFromUrl(githubUrl),
      languages: languages.join(","),  // Store as comma-separated for SQLite
      status: "INGESTING",
      userId,
    },
  });

  // Trigger ingestion (fire and forget — pipeline runs in background)
  try {
    await triggerIngestion({
      repo_url: githubUrl,
      repo_id: repo.id,
      user_id: userId,
      languages,
    });
  } catch (err) {
    const triggerError = getTriggerErrorMessage(err);
    // If trigger fails, mark as error but still return the repo
    await prisma.repo.update({
      where: { id: repo.id },
      data: { status: "ERROR", errorMsg: triggerError },
    });
    res.status(202).json({
      repoId: repo.id,
      status: "error",
      message: triggerError,
    });
    return;
  }

  res.status(202).json({
    repoId: repo.id,
    status: "ingesting",
    message: "Ingestion started in background",
  });
});

/**
 * GET /api/repos
 * List all repos for the current user.
 */
repoRoutes.get("/", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);

  const repos = await prisma.repo.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true } } },
  });

  // Deserialize languages back to array
  const reposList = repos.map((r) => ({
    ...r,
    languages: normalizeRepoLanguages(r.languages),
  }));

  res.json(reposList);
});

/**
 * GET /api/repos/:repoId
 * Get a single repo with session count.
 */
repoRoutes.get("/:repoId", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);

  const repo = await prisma.repo.findFirst({
    where: { id: req.params.repoId, userId },
    include: { _count: { select: { sessions: true } } },
  });

  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  res.json({
    ...repo,
    languages: normalizeRepoLanguages(repo.languages),
  });
});

/**
 * GET /api/repos/:repoId/tree
 * Return the live repo file tree from the AI service cache.
 */
repoRoutes.get("/:repoId/tree", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);

  const repo = await prisma.repo.findFirst({
    where: { id: req.params.repoId, userId },
    select: { id: true },
  });

  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  try {
    const tree = await getRepoTree(repo.id);
    res.json(tree);
  } catch (error) {
    res.status(getProxyErrorStatus(error)).json({
      error: getProxyErrorMessage(error, "Failed to load repository tree"),
    });
  }
});

/**
 * GET /api/repos/:repoId/file?path=...
 * Return full file contents for the repo explorer code pane.
 */
repoRoutes.get("/:repoId/file", requireAuth, async (req, res) => {
  const parse = FileQuerySchema.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const userId = await ensureUser(req.userId!, req.userEmail);
  const repo = await prisma.repo.findFirst({
    where: { id: req.params.repoId, userId },
    select: { id: true },
  });

  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  try {
    const file = await getRepoFile(repo.id, parse.data.path);
    res.json(file);
  } catch (error) {
    res.status(getProxyErrorStatus(error)).json({
      error: getProxyErrorMessage(error, "Failed to load file contents"),
    });
  }
});

/**
 * GET /api/repos/:repoId/symbols
 * Return all symbols extracted for a repo.
 */
repoRoutes.get("/:repoId/symbols", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);
  const repo = await prisma.repo.findFirst({
    where: { id: req.params.repoId, userId },
    select: { id: true },
  });

  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  try {
    const symbols = await getRepoSymbols(repo.id);
    res.json(symbols);
  } catch (error) {
    res.status(getProxyErrorStatus(error)).json({
      error: getProxyErrorMessage(error, "Failed to load repository symbols"),
    });
  }
});

/**
 * GET /api/repos/:repoId/status
 * Poll ingestion status. Proxied from AI service. Also syncs DB.
 */
repoRoutes.get("/:repoId/status", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);

  const repo = await prisma.repo.findFirst({
    where: { id: req.params.repoId, userId },
    select: { id: true, status: true },
  });

  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  try {
    const aiStatus = await getIngestStatus(req.params.repoId);

    // Sync DB status from AI service
    if (aiStatus.status === "done") {
      await prisma.repo.update({
        where: { id: repo.id },
        data: {
          status: "READY",
          chunkCount: aiStatus.total_chunks,
          errorMsg: null,
        },
      });
    } else if (aiStatus.status === "error") {
      await prisma.repo.update({
        where: { id: repo.id },
        data: {
          status: "ERROR",
          errorMsg: aiStatus.error ?? "Ingestion failed",
        },
      });
    } else if (aiStatus.status !== "pending") {
      // Still in progress
      await prisma.repo.update({
        where: { id: repo.id },
        data: { status: "INGESTING" },
      });
    }

    res.json(aiStatus);
  } catch {
    // AI service unreachable — return DB status
    res.json({
      repo_id: req.params.repoId,
      status: repo.status.toLowerCase(),
      current_stage: "Checking status...",
      total_chunks: 0,
      embedded_chunks: 0,
      progress_pct: 0,
    });
  }
});

/**
 * DELETE /api/repos/:repoId
 * Delete repo from DB + remove Qdrant vectors.
 */
repoRoutes.delete("/:repoId", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);

  const repo = await prisma.repo.findFirst({
    where: { id: req.params.repoId, userId },
    select: { id: true },
  });

  if (!repo) {
    res.status(404).json({ error: "Repo not found" });
    return;
  }

  // Delete from DB (cascades to sessions + messages)
  await prisma.repo.delete({ where: { id: repo.id } });

  // Delete Qdrant vectors (best-effort — don't fail if AI service is down)
  try {
    await deleteRepoVectors(repo.id, userId);
  } catch { /* ignore */ }

  res.json({ deleted: true, repoId: repo.id });
});
