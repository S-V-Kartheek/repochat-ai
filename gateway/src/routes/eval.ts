import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth";
import { prisma, ensureUser } from "../services/db";
import { scoreAnswer } from "../services/evaluation";

export const evalRoutes = Router();

type DashboardScore = {
  id: string;
  createdAt: Date;
  faithfulness?: number;
  answerRelevancy?: number;
  contextPrecision?: number;
  overall?: number;
  grade?: string;
};

evalRoutes.get("/dashboard/:repoId", requireAuth, async (req, res) => {
  const userId = await ensureUser(req.userId!, req.userEmail);
  const messages = await prisma.message.findMany({
    where: {
      role: "ASSISTANT",
      ragasScore: { not: null },
      session: { repoId: req.params.repoId, userId },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, createdAt: true, ragasScore: true },
  });

  const scores: DashboardScore[] = messages
    .map((message): DashboardScore | null => {
      try {
        return {
          id: message.id,
          createdAt: message.createdAt,
          ...(JSON.parse(message.ragasScore as string) as Omit<DashboardScore, "id" | "createdAt">),
        };
      } catch {
        return null;
      }
    })
    .filter((score): score is DashboardScore => score !== null);

  const avg = (key: "faithfulness" | "answerRelevancy" | "contextPrecision" | "overall") => {
    const values = scores
      .map((score) => Number(score[key] ?? 0))
      .filter((value) => Number.isFinite(value));
    if (values.length === 0) return 0;
    return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
  };

  res.json({
    repoId: req.params.repoId,
    count: scores.length,
    avgFaithfulness: avg("faithfulness"),
    avgAnswerRelevancy: avg("answerRelevancy"),
    avgContextPrecision: avg("contextPrecision"),
    avgOverall: avg("overall"),
    timeline: scores,
  });
});

evalRoutes.post("/score", requireAuth, async (req, res) => {
  const schema = z.object({
    repoId: z.string().min(1),
    messageId: z.string().min(1),
    question: z.string().min(1),
    answer: z.string().min(1),
    contexts: z.array(z.string()).default([]),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.errors[0].message });
    return;
  }

  const userId = await ensureUser(req.userId!, req.userEmail);
  const message = await prisma.message.findFirst({
    where: {
      id: parse.data.messageId,
      role: "ASSISTANT",
      session: { repoId: parse.data.repoId, userId },
    },
    select: { id: true },
  });
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const ragasScore = await scoreAnswer(parse.data);
  await prisma.message.update({
    where: { id: message.id },
    data: { ragasScore: JSON.stringify(ragasScore) },
  });
  res.json(ragasScore);
});
