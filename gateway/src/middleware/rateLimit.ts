/**
 * Middleware: Rate Limiter
 * Limits each user to 20 requests/minute using Upstash Redis.
 * In local dev, uses an in-memory fallback (no Redis needed).
 *
 * Phase 4 — Week 10 implementation.
 */

import { Request, Response, NextFunction } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitInfo = {
  limit: number;
  remaining: number;
  reset: number; // unix ms
};

const REQUESTS_PER_MINUTE = 20;
const WINDOW_MS = 60_000;
const WINDOW_DURATION = "1 m";
const KEY_PREFIX = "repotalk:rate_limit";

const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function isPlaceholderValue(v: string | undefined): boolean {
  if (!v) return true;
  const lower = v.toLowerCase();
  return (
    lower.includes("your_upstash_token_here") ||
    lower.includes("your-redis.upstash.io") ||
    lower.includes("your_upstash_redis_token") ||
    lower.includes("your_upstash_token")
  );
}

const hasUpstash =
  !isPlaceholderValue(upstashRedisUrl) && !isPlaceholderValue(upstashRedisToken);

// Reuse a single instance for all requests.
const upstashRatelimit =
  hasUpstash
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(REQUESTS_PER_MINUTE, WINDOW_DURATION),
      prefix: KEY_PREFIX,
    })
  : null;

// Local dev fallback (no Redis): keep per-identifier timestamps.
const inMemoryBuckets = new Map<string, number[]>();

function getClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim().length > 0) {
    // x-forwarded-for can be a comma-separated list; take the first hop.
    return xff.split(",")[0]?.trim() || "unknown";
  }
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

export function getRateLimitIdentifier(req: Request): string {
  // Clerk auth middleware sets req.userId.
  if (req.userId) return `user:${req.userId}`;
  return `ip:${getClientIp(req)}`;
}

function pruneOldTimestamps(timestamps: number[], now: number) {
  const cutoff = now - WINDOW_MS;
  // Keep only the timestamps still inside the sliding window.
  return timestamps.filter((ts) => ts > cutoff);
}

function getRemainingInMemory(identifier: string, now = Date.now()): RateLimitInfo {
  const existing = inMemoryBuckets.get(identifier) ?? [];
  const pruned = pruneOldTimestamps(existing, now);
  if (pruned.length !== existing.length) inMemoryBuckets.set(identifier, pruned);

  const remaining = Math.max(0, REQUESTS_PER_MINUTE - pruned.length);
  const reset = pruned.length > 0 ? pruned[0] + WINDOW_MS : now + WINDOW_MS;

  return {
    limit: REQUESTS_PER_MINUTE,
    remaining,
    reset,
  };
}

function consumeInMemory(
  identifier: string,
  now = Date.now()
): RateLimitInfo & { success: boolean } {
  const existing = inMemoryBuckets.get(identifier) ?? [];
  const pruned = pruneOldTimestamps(existing, now);

  if (pruned.length >= REQUESTS_PER_MINUTE) {
    // Still prune to keep memory bounded.
    inMemoryBuckets.set(identifier, pruned);
    const reset = pruned.length > 0 ? pruned[0] + WINDOW_MS : now + WINDOW_MS;
    return {
      success: false,
      limit: REQUESTS_PER_MINUTE,
      remaining: 0,
      reset,
    };
  }

  pruned.push(now);
  inMemoryBuckets.set(identifier, pruned);

  const remaining = Math.max(0, REQUESTS_PER_MINUTE - pruned.length);
  const reset = pruned[0] + WINDOW_MS;

  return {
    success: true,
    limit: REQUESTS_PER_MINUTE,
    remaining,
    reset,
  };
}

export async function getRateLimitStatusForRequest(
  req: Request
): Promise<RateLimitInfo> {
  const identifier = getRateLimitIdentifier(req);
  if (upstashRatelimit) {
    try {
      const { remaining, reset, limit } = await upstashRatelimit.getRemaining(identifier);
      return { remaining, reset, limit };
    } catch {
      return getRemainingInMemory(identifier);
    }
  }
  return getRemainingInMemory(identifier);
}

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const identifier = getRateLimitIdentifier(req);

  try {
    // Upstash-backed limiter (production + when env vars exist).
    if (upstashRatelimit) {
      const result = await upstashRatelimit.limit(identifier);
      if (result.success) return next();

      const now = Date.now();
      const retryAfterMs = Math.max(0, result.reset - now);
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      res.status(429).json({
        error: `Too many requests. Please try again in ${retryAfterSeconds}s.`,
        message: `You are limited to ${REQUESTS_PER_MINUTE} requests/min per user.`,
        hint: "This limit resets automatically. If you’re streaming, retry after the reset time.",
        retry_after_seconds: retryAfterSeconds,
        retry_after_ms: retryAfterMs,
        limit: result.limit,
        remaining: result.remaining,
        reset_at: new Date(result.reset).toISOString(),
      });
      return;
    }

    // Local dev in-memory fallback.
    const result = consumeInMemory(identifier);
    if (result.success) return next();

    const now = Date.now();
    const retryAfterMs = Math.max(0, result.reset - now);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    res.status(429).json({
      error: `Too many requests. Please try again in ${retryAfterSeconds}s.`,
      message: `You are limited to ${REQUESTS_PER_MINUTE} requests/min per user.`,
      hint: "This limit resets automatically.",
      retry_after_seconds: retryAfterSeconds,
      retry_after_ms: retryAfterMs,
      limit: result.limit,
      remaining: result.remaining,
      reset_at: new Date(result.reset).toISOString(),
    });
  } catch {
    // If Upstash fails at runtime, fall back to in-memory to keep rate limiting effective.
    const result = consumeInMemory(identifier);
    if (result.success) return next();

    const now = Date.now();
    const retryAfterMs = Math.max(0, result.reset - now);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    res.status(429).json({
      error: `Too many requests. Please try again in ${retryAfterSeconds}s.`,
      message: `You are limited to ${REQUESTS_PER_MINUTE} requests/min per user.`,
      hint: "This limit resets automatically.",
      retry_after_seconds: retryAfterSeconds,
      retry_after_ms: retryAfterMs,
      limit: result.limit,
      remaining: result.remaining,
      reset_at: new Date(result.reset).toISOString(),
    });
  }
};

