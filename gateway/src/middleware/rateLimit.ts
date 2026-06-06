/**
 * Middleware: Rate Limiter
 * Limits chat requests per user with Upstash Redis in production and an
 * in-memory fallback for local development.
 */

import { Request, Response, NextFunction } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

type LocalEntry = {
  count: number;
  resetAt: number;
};

const localStore = new Map<string, LocalEntry>();

let upstashLimiter: Ratelimit | null | undefined;

function getClientIp(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getRateLimitKey(req: Request): string {
  return req.userId ? `user:${req.userId}` : `ip:${getClientIp(req)}`;
}

function getUpstashLimiter(): Ratelimit | null {
  if (upstashLimiter !== undefined) return upstashLimiter;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    upstashLimiter = null;
    return upstashLimiter;
  }

  upstashLimiter = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "1 m"),
    analytics: true,
  });

  return upstashLimiter;
}

function pruneLocalStore(now: number): void {
  for (const [key, entry] of localStore.entries()) {
    if (entry.resetAt <= now) localStore.delete(key);
  }
}

function checkLocalLimit(key: string): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  pruneLocalStore(now);

  const existing = localStore.get(key);
  const entry =
    existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + WINDOW_MS };

  entry.count += 1;
  localStore.set(key, entry);

  return {
    success: entry.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    reset: entry.resetAt,
  };
}

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const key = getRateLimitKey(req);
  const limiter = getUpstashLimiter();

  try {
    const result = limiter ? await limiter.limit(key) : checkLocalLimit(key);

    res.setHeader("X-RateLimit-Limit", MAX_REQUESTS.toString());
    res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(result.reset / 1000).toString());

    if (!result.success) {
      res.status(429).json({ error: "Too many requests. Please try again shortly." });
      return;
    }

    next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[rate-limit] Falling back open after limiter error", error);
    }
    next();
  }
};
