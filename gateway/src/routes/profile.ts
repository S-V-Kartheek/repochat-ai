/**
 * Route: /api/profile
 * User profile and settings management.
 *
 * Phase 4 — Week 10 implementation.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma, ensureUser } from "../services/db";
import { getRateLimitStatusForRequest } from "../middleware/rateLimit";

export const profileRoutes = Router();

function toIsoOrNull(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

/**
 * GET /api/profile
 * Get current user profile + Clerk data + usage stats.
 */
profileRoutes.get("/", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);

  const [user, reposCount, sessionsCount, messagesCount, bookmarkedCount] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.repo.count({ where: { userId } }),
      prisma.session.count({ where: { userId } }),
      prisma.message.count({
        where: {
          session: { userId },
        },
      }),
      prisma.message.count({
        where: {
          bookmarked: true,
          session: { userId },
        },
      }),
    ]);

  const [lastMessage, lastSession, lastRepo] = await Promise.all([
    prisma.message.findFirst({
      where: { session: { userId } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.session.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.repo.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  res.json({
    user: {
      id: userId,
      email: user?.email ?? req.userEmail ?? null,
      created_at: toIsoOrNull(user?.createdAt),
      updated_at: toIsoOrNull(user?.updatedAt),
    },
    repos_count: reposCount,
    sessions_count: sessionsCount,
    messages_count: messagesCount,
    bookmarked_count: bookmarkedCount,
    recent_activity: {
      last_message_at: toIsoOrNull(lastMessage?.createdAt),
      last_session_at: toIsoOrNull(lastSession?.updatedAt),
      last_repo_update_at: toIsoOrNull(lastRepo?.updatedAt),
    },
  });
});

/**
 * GET /api/profile/usage
 * Return rate limit status, query count, repos connected.
 */
profileRoutes.get("/usage", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);

  const [rateLimit, reposCount, queryCount, messagesCount, bookmarkedCount] =
    await Promise.all([
      getRateLimitStatusForRequest(req),
      prisma.repo.count({ where: { userId } }),
      // "Query count" = number of user-authored turns.
      prisma.message.count({
        where: {
          role: "USER",
          session: { userId },
        },
      }),
      prisma.message.count({
        where: {
          session: { userId },
        },
      }),
      prisma.message.count({
        where: {
          bookmarked: true,
          session: { userId },
        },
      }),
    ]);

  const now = Date.now();
  const resetMs = Math.max(0, rateLimit.reset - now);
  const resetSeconds = Math.ceil(resetMs / 1000);

  res.json({
    query_count: queryCount,
    repos_connected: reposCount,
    messages_count: messagesCount,
    bookmarked_count: bookmarkedCount,
    rate_limit: {
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      reset_at: new Date(rateLimit.reset).toISOString(),
      reset_seconds: resetSeconds,
    },
  });
});
