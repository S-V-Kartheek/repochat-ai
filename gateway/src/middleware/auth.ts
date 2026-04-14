/**
 * Middleware: Clerk JWT Authentication
 * Verifies the Clerk session token from the Authorization header.
 * Attaches userId to req for downstream handlers.
 *
 * Phase 2 — Week 4 implementation.
 */

import { Request, Response, NextFunction } from "express";

// Extend Express Request to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      sessionClaims?: Record<string, unknown>;
    }
  }
}

/**
 * requireAuth middleware
 * Attach to any route that requires a logged-in user.
 *
 * Usage:
 *   router.get("/protected", requireAuth, handler)
 *
 * Implementation:
 *   1. Extract Bearer token from Authorization header
 *   2. Verify with @clerk/backend verifyToken()
 *   3. Attach userId to req.userId
 *   4. Call next() on success, return 401 on failure
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // TODO: Implement in Phase 2 - Week 4
  res.status(501).json({ error: "Not implemented yet — Phase 2 Week 4" });
};
