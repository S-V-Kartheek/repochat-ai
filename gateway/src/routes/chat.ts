/**
 * Route: /api/chat
 * Proxies queries to the FastAPI AI service.
 * Handles both non-streaming (JSON) and streaming (SSE) responses.
 */

import { Router } from "express";
import { IncomingMessage } from "http";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { rateLimiter } from "../middleware/rateLimit";
import { prisma, ensureUser } from "../services/db";
import { aiClient, normalizeCitations, queryAI } from "../services/aiProxy";
import { enqueueEvalJob } from "../services/evalQueue";

export const chatRoutes = Router();
const HISTORY_LIMIT = 10;

// ── Schemas ────────────────────────────────────────────────────────────────────

const QuerySchema = z.object({
  repoId: z.string().min(1),
  question: z.string().min(1).max(2000),
  sessionId: z.string().min(1),
  topK: z.number().int().min(1).max(20).optional().default(5),
});

function stripFollowUps(answer: string): { cleanAnswer: string; followUps: string[] } {
  const marker = "---FOLLOW_UPS---";
  const idx = answer.indexOf(marker);
  if (idx === -1) return { cleanAnswer: answer.trim(), followUps: [] };

  const cleanAnswer = answer.slice(0, idx).trim();
  const suffix = answer.slice(idx + marker.length);
  const followUps = suffix
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);

  return { cleanAnswer, followUps };
}

function sanitizeFollowUps(followUps: unknown): string[] {
  if (!Array.isArray(followUps)) return [];
  const cleaned = followUps
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 6);

  const unique: string[] = [];
  for (const suggestion of cleaned) {
    if (unique.some((existing) => existing.toLowerCase() === suggestion.toLowerCase())) {
      continue;
    }
    unique.push(suggestion);
    if (unique.length >= 3) break;
  }

  return unique;
}

function defaultFollowUps(): string[] {
  return [
    "Can you walk me through the exact call flow for this behavior?",
    "What edge cases or failure paths should I verify in this part of the code?",
    "Which files and functions should I read next to understand this deeper?",
  ];
}

async function loadRecentHistory(sessionId: string) {
  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      role: true,
      content: true,
    },
  });

  return messages
    .reverse()
    .map((message): { role: "user" | "assistant"; content: string } => ({
      role: message.role === "ASSISTANT" ? "assistant" : "user",
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0);
}

async function touchSession(sessionId: string, question: string) {
  const previousMessageCount = await prisma.message.count({
    where: { sessionId },
  });

  const title =
    question.length > 60 ? question.slice(0, 57) + "..." : question;

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      title: previousMessageCount === 0 ? title : undefined,
      updatedAt: new Date(),
    },
  });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/chat/query
 * Non-streaming: send question, get full answer + citations.
 */
chatRoutes.post("/query", requireAuth, rateLimiter, async (req, res) => {
  const parse = QuerySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { repoId, question, sessionId, topK } = parse.data;
  const userId = await ensureUser(req.userId!, req.userEmail);

  // Verify session belongs to user
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId, repoId },
    select: { id: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const history = await loadRecentHistory(sessionId);

  // Save user message
  await prisma.message.create({
    data: {
      role: "USER",
      content: question,
      sessionId,
    },
  });
  await touchSession(sessionId, question);

  // Forward to AI service
  const aiResponse = await queryAI({
    repo_id: repoId,
    question,
    session_id: sessionId,
    history,
    top_k: topK,
  });

  const parsedAnswer = stripFollowUps(aiResponse.answer);
  const safeAnswer = parsedAnswer.cleanAnswer.trim().length > 0
    ? parsedAnswer.cleanAnswer
    : aiResponse.answer.trim();
  const followUps = sanitizeFollowUps(aiResponse.follow_ups);
  const finalFollowUps = followUps.length > 0
    ? followUps
    : parsedAnswer.followUps.length > 0
      ? parsedAnswer.followUps
      : defaultFollowUps();

  // Save assistant message with citations
  const normalizedCitations = normalizeCitations(aiResponse.citations);
  const savedMsg = await prisma.message.create({
    data: {
      role: "ASSISTANT",
      content: safeAnswer,
      citations: JSON.stringify(normalizedCitations),
      sessionId,
    },
  });

  enqueueEvalJob({
    messageId: savedMsg.id,
    question,
    answer: safeAnswer,
    contexts: normalizedCitations.map((citation) => citation.snippet).filter(Boolean),
    repoId,
  });

  res.json({
    answer: safeAnswer,
    citations: normalizedCitations,
    model_used: aiResponse.model_used,
    session_id: sessionId,
    message_id: savedMsg.id,
    follow_ups: finalFollowUps,
  });
});

/**
 * POST /api/chat/stream
 * Streaming SSE: pipes AI token stream to the client.
 * On completion, saves message pair to DB.
 *
 * Persists the assistant response after the final done event and forwards a
 * gateway-owned done payload that includes the persisted message ID.
 */
chatRoutes.post("/stream", requireAuth, rateLimiter, async (req, res) => {
  const parse = QuerySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const { repoId, question, sessionId, topK } = parse.data;
  const userId = await ensureUser(req.userId!, req.userEmail);

  // Verify session
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId, repoId },
    select: { id: true },
  });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const history = await loadRecentHistory(sessionId);

  // Save user message before streaming starts
  await prisma.message.create({
    data: { role: "USER", content: question, sessionId },
  });
  await touchSession(sessionId, question);

  // Stream setup
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    const aiResponse = await aiClient.post("/api/v1/query/stream", {
      repo_id: repoId,
      question,
      session_id: sessionId,
      history,
      top_k: topK,
    }, {
      responseType: "stream",
      timeout: 180_000,
    });

    const stream = aiResponse.data as IncomingMessage;
    let buffer = "";
    let fullAnswer = "";
    let savedDone = false;
    let streamHadError = false;
    let streamErrorMessage = "";
    let cleanAnswerFromDoneEvent = "";
    let followUpsFromDoneEvent: string[] = [];

    const finishStream = async (rawCitations: unknown) => {
      if (savedDone) return;
      savedDone = true;

      const citations = normalizeCitations(rawCitations);
      const parsed = stripFollowUps(fullAnswer);
      const normalizedAnswerFromDoneEvent = cleanAnswerFromDoneEvent.trim();
      const cleanedFullAnswer = parsed.cleanAnswer;
      const safeAnswer = normalizedAnswerFromDoneEvent.length > 0
        ? normalizedAnswerFromDoneEvent
        : cleanedFullAnswer.length > 0
          ? cleanedFullAnswer
          : (streamHadError
            ? "I ran into an issue while generating the response. Please try again."
            : "I could not generate a complete answer for this request. Please try again.");
      const followUps = sanitizeFollowUps(followUpsFromDoneEvent);
      const finalFollowUps = followUps.length > 0
        ? followUps
        : parsed.followUps.length > 0
          ? parsed.followUps
          : defaultFollowUps();

      const savedAssistant = await prisma.message.create({
        data: {
          role: "ASSISTANT",
          content: safeAnswer,
          citations: JSON.stringify(citations),
          sessionId,
        },
      });

      enqueueEvalJob({
        messageId: savedAssistant.id,
        question,
        answer: safeAnswer,
        contexts: citations.map((citation) => citation.snippet).filter(Boolean),
        repoId,
      });

      res.write(`data: ${JSON.stringify({
        done: true,
        answer: safeAnswer,
        citations,
        session_id: sessionId,
        message_id: savedAssistant.id,
        follow_ups: finalFollowUps,
      })}\n\n`);
    };

    stream.on("data", async (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;

        try {
          const event = JSON.parse(payload) as {
            token?: string;
            done?: boolean;
            citations?: unknown;
            answer?: string;
            follow_ups?: string[];
            error?: string;
          };

          if (event.token) {
            fullAnswer += event.token;
            res.write(`data: ${JSON.stringify({ token: event.token })}\n\n`);
            continue;
          }

          if (event.error) {
            streamHadError = true;
            streamErrorMessage = typeof event.error === "string" ? event.error : "Stream failed";
            res.write(`data: ${JSON.stringify({ error: streamErrorMessage })}\n\n`);
            continue;
          }

          if (event.done) {
            cleanAnswerFromDoneEvent = typeof event.answer === "string" ? event.answer : "";
            followUpsFromDoneEvent = Array.isArray(event.follow_ups)
              ? event.follow_ups.filter((q): q is string => typeof q === "string").slice(0, 3)
              : [];
            await finishStream(event.citations);
          }
        } catch {
          // Ignore non-JSON keepalive lines
        }
      }
    });

    await new Promise<void>((resolve, reject) => {
      stream.on("end", async () => {
        if (!savedDone) {
          try {
            await finishStream([]);
          } catch (err) {
            reject(err);
            return;
          }
        }
        resolve();
      });
      stream.on("error", reject);
      res.on("close", () => stream.destroy());
    });
  } catch {
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
  }

  res.end();
});
