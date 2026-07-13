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

// Fallback in-memory store for local dev
const fallbackStore = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 20;

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "60 s"),
    analytics: true,
  });
}

/**
 * rateLimiter middleware
 * Uses sliding window algorithm via Upstash Redis.
 * Returns 429 Too Many Requests when limit exceeded.
 */
export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const identifier = (req as any).userId || req.ip || "anonymous";

  try {
    if (ratelimit) {
      const { success, limit, remaining, reset } = await ratelimit.limit(identifier);
      res.setHeader("X-RateLimit-Limit", limit.toString());
      res.setHeader("X-RateLimit-Remaining", remaining.toString());
      res.setHeader("X-RateLimit-Reset", reset.toString());

      if (!success) {
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }
    } else {
      // In-memory fallback
      const now = Date.now();
      let timestamps = fallbackStore.get(identifier) || [];
      timestamps = timestamps.filter((t) => now - t < WINDOW_MS);
      
      if (timestamps.length >= MAX_REQUESTS) {
        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS.toString());
        res.setHeader("X-RateLimit-Remaining", "0");
        res.setHeader("X-RateLimit-Reset", (now + WINDOW_MS).toString());
        res.status(429).json({ error: "Too many requests. Please try again later." });
        return;
      }
      
      timestamps.push(now);
      fallbackStore.set(identifier, timestamps);
      
      res.setHeader("X-RateLimit-Limit", MAX_REQUESTS.toString());
      res.setHeader("X-RateLimit-Remaining", (MAX_REQUESTS - timestamps.length).toString());
    }
    
    next();
  } catch (error) {
    console.error("Rate limit error:", error);
    next(); // Fail open if Redis fails
  }
};
