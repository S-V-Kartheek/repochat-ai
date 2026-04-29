/**
 * Eval Queue
 * In-memory FIFO queue for asynchronous RAGAS scoring jobs.
 *
 * Phase 2 (Week 6):
 * - Queue score jobs after each assistant answer
 * - Process jobs in the background so chat latency stays low
 */

import axios from "axios";
import { prisma } from "./db";

export interface EvalJob {
  messageId: string;
  question: string;
  answer: string;
  contexts: string[];
  repoId: string;
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const queue: EvalJob[] = [];
let processing = false;

async function runEvalJob(job: EvalJob): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: job.messageId },
    select: { id: true, ragasScore: true },
  });
  if (!message || message.ragasScore) return;
  if (job.contexts.length === 0 || job.answer.trim().length === 0) return;

  const response = await axios.post(`${AI_SERVICE_URL}/api/v1/eval/score`, {
    question: job.question,
    answer: job.answer,
    contexts: job.contexts,
    repo_id: job.repoId,
    message_id: job.messageId,
  });

  await prisma.message.update({
    where: { id: job.messageId },
    data: { ragasScore: JSON.stringify(response.data) },
  });
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) continue;
    try {
      await runEvalJob(job);
    } catch (error) {
      console.error("[evalQueue] Failed job:", job.messageId, error);
      // Persist a fallback score so UI does not wait indefinitely.
      await prisma.message.update({
        where: { id: job.messageId },
        data: {
          ragasScore: JSON.stringify({
            faithfulness: 0.0,
            answer_relevancy: 0.0,
            context_precision: 0.0,
            overall: "unknown",
            message_id: job.messageId,
          }),
        },
      }).catch((persistError) => {
        console.error("[evalQueue] Failed to persist fallback score:", persistError);
      });
    }
  }

  processing = false;
}

export function enqueueEvalJob(job: EvalJob): void {
  queue.push(job);
  void processQueue();
}

export function getEvalQueueStats() {
  return {
    queued: queue.length,
    processing,
  };
}
