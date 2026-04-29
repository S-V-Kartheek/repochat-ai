/**
 * Route: /api/eval
 * Proxies to FastAPI evaluation service.
 * Returns RAGAS scores and dashboard metrics.
 *
 * Phase 2 — Week 6 implementation.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma, ensureUser } from "../services/db";
import axios from "axios";
import { enqueueEvalJob, getEvalQueueStats } from "../services/evalQueue";

export const evalRoutes = Router();

// Ensure the fastAPI URL is properly constructed
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * GET /api/eval/dashboard/:repoId
 * Get evaluation metrics for the dashboard charts.
 */
evalRoutes.get("/dashboard/:repoId", requireAuth, async (req, res) => {
  try {
    const { repoId } = req.params;

    const userId = await ensureUser(req.userId!, req.userEmail);

    // Fetch all sessions for this repo and user
    const sessions = await prisma.session.findMany({
      where: {
        repoId,
        userId,
      },
      select: {
        id: true,
      }
    });

    const sessionIds = sessions.map(s => s.id);

    // Fetch messages with ragas scores
    const messages = await prisma.message.findMany({
      where: {
        sessionId: { in: sessionIds },
        role: "ASSISTANT",
        ragasScore: { not: null }
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    const timeline = messages.map(m => {
      let score: any = {};
      try {
        score = JSON.parse(m.ragasScore!);
      } catch (e) {
        // Handle invalid JSON gracefully
      }
      return {
        id: m.id,
        createdAt: m.createdAt,
        faithfulness: score.faithfulness || 0,
        relevancy: score.answer_relevancy || 0,
        precision: score.context_precision || 0,
        overall: score.overall || "unknown"
      };
    });

    const total = timeline.length;
    const avg_faithfulness = total ? timeline.reduce((acc, curr) => acc + curr.faithfulness, 0) / total : 0;
    const avg_relevancy = total ? timeline.reduce((acc, curr) => acc + curr.relevancy, 0) / total : 0;
    const avg_precision = total ? timeline.reduce((acc, curr) => acc + curr.precision, 0) / total : 0;

    res.json({
      avg_faithfulness,
      avg_relevancy,
      avg_precision,
      timeline
    });

  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

/**
 * POST /api/eval/queue
 * Queue an async RAGAS evaluation job.
 * Body: { messageId, question, answer, contexts, repoId }
 */
evalRoutes.post("/queue", requireAuth, async (req, res) => {
  const { messageId, question, answer, contexts, repoId } = req.body;
  if (!messageId || !question || !answer || !contexts || !repoId) {
    return res.status(400).json({ error: "Missing required fields in payload" });
  }

  enqueueEvalJob({
    messageId,
    question,
    answer,
    contexts: Array.isArray(contexts) ? contexts.filter((c) => typeof c === "string") : [],
    repoId,
  });

  res.status(202).json({
    queued: true,
    messageId,
    queue: getEvalQueueStats(),
  });
});

/**
 * GET /api/eval/queue
 * Return in-memory queue status.
 */
evalRoutes.get("/queue", requireAuth, async (_req, res) => {
  res.json(getEvalQueueStats());
});

/**
 * POST /api/eval/score
 * Manually trigger RAGAS evaluation on a specific message.
 * Body: { messageId, question, answer, contexts, repoId }
 */
evalRoutes.post("/score", requireAuth, async (req, res) => {
  try {
    const { messageId, question, answer, contexts, repoId } = req.body;

    if (!messageId || !question || !answer || !contexts || !repoId) {
      return res.status(400).json({ error: "Missing required fields in payload" });
    }

    // Call the AI service to run the evaluation
    const response = await axios.post(`${AI_SERVICE_URL}/api/v1/eval/score`, {
      question,
      answer,
      contexts,
      repo_id: repoId,
      message_id: messageId,
    });

    const evalData = response.data;

    // Update the message in the database with the score
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        ragasScore: JSON.stringify(evalData)
      }
    });

    res.json(updatedMessage);

  } catch (error: any) {
    console.error("Error evaluating message:", error.response?.data || error.message);
    res.status(500).json({ error: "Evaluation failed" });
  }
});
