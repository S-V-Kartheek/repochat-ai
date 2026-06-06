/**
 * RepoTalk — Node.js Gateway
 * Express application entry point.
 *
 * Mounts:
 *   /health          → health check
 *   /api/sessions    → session + message CRUD
 *   /api/repos       → repo management (triggers AI service ingestion)
 *   /api/chat        → proxies to FastAPI, streams SSE to frontend
 *   /api/eval        → proxies to FastAPI eval service
 *   /api/profile     → Clerk user profile operations
 */

import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import { getAllowedOrigins, validateProductionEnv } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { sessionRoutes } from "./routes/sessions";
import { repoRoutes } from "./routes/repos";
import { chatRoutes } from "./routes/chat";
import { evalRoutes } from "./routes/eval";
import { profileRoutes } from "./routes/profile";
import { personaRoutes } from "./routes/persona";
import { stripeRoutes } from "./routes/stripe";
import { prRoutes } from "./routes/pr";


dotenv.config();
dotenv.config({ path: "../.env" });

validateProductionEnv();

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === "true";
    const isAllowed =
      !origin ||
      origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      allowedOrigins.includes(origin) ||
      (allowVercelPreviews && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(morgan("dev"));

// Raw body for Stripe webhook (must come before express.json)
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));


// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "repotalk-gateway", version: "0.1.0" });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/sessions", sessionRoutes);
app.use("/api/repos",    repoRoutes);
app.use("/api/chat",     chatRoutes);
app.use("/api/eval",     evalRoutes);
app.use("/api/profile",  profileRoutes);
app.use("/api/persona",  personaRoutes);
app.use("/api/stripe",   stripeRoutes);
app.use("/api/pr",       prRoutes);


// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ RepoTalk Gateway running at http://localhost:${PORT}`);
});

export default app;
