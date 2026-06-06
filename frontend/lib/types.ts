/**
 * RepoTalk — Shared TypeScript Types
 * Single source of truth for all data shapes flowing between frontend and gateway.
 */

// ── Repo ──────────────────────────────────────────────────────────────────────

export type RepoStatus = "PENDING" | "INGESTING" | "READY" | "ERROR";

export interface Repo {
  id: string;
  githubUrl: string;
  name: string;
  languages: string[];
  framework: string | null;
  status: RepoStatus;
  chunkCount: number;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { sessions: number };
}

// ── Ingestion Status (from AI service, proxied through gateway) ───────────────

export interface IngestStatus {
  repo_id: string;
  status: "pending" | "cloning" | "parsing" | "embedding" | "done" | "error";
  current_stage: string;
  total_chunks: number;
  embedded_chunks: number;
  progress_pct: number;
  error?: string;
}

// ── Session ───────────────────────────────────────────────────────────────────

export interface Session {
  id: string;
  title: string | null;
  repoId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
  _count?: { messages: number };
}

// ── Message ───────────────────────────────────────────────────────────────────

export type MessageRole = "USER" | "ASSISTANT";

export interface Citation {
  file: string;
  startLine: number;
  endLine: number;
  snippet: string;
}

export interface RagasScore {
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  overall: number;
  grade?: "high" | "medium" | "low";
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  citations: Citation[] | null;
  ragasScore: RagasScore | null;
  bookmarked: boolean;
  sessionId: string;
  createdAt: string;
}

export interface BookmarkedMessage extends Message {
  session: {
    id: string;
    title: string | null;
    repo: {
      id: string;
      name: string;
    };
  };
}

// ── API Response shapes ────────────────────────────────────────────────────────

export interface ChatQueryResponse {
  answer: string;
  citations: Citation[];
  model_used: string;
  session_id?: string;
  message_id?: string;
  ragas_score?: RagasScore;
}

export interface CreateSessionResponse {
  id: string;
  repoId: string;
  title: string | null;
  createdAt: string;
}

export interface CreateRepoResponse {
  repoId: string;
  status: string;
  message: string;
}

// ── Persona ──────────────────────────────────────────────────────────────────────────────

export interface SuggestedQuestion {
  label: string;
  question: string;
  category: "architecture" | "implementation" | "debugging" | "onboarding" | string;
}

export interface RepoPersona {
  repo_name: string;
  dominant_language: string;
  stack: string[];
  frameworks: string[];
  repo_type: string;
  architecture_style: string;
  expertise_level: string;
  file_tree: string;
  architecture_overview: string;
  onboarding_guide: string;
  conventions: string;
  key_entry_points: string[];
  suggested_questions: SuggestedQuestion[];
  total_files: number;
  total_chunks: number;
}

// ── Billing ─────────────────────────────────────────────────────────────────────────────

export type PlanTier = "free" | "pro" | "team";

export interface BillingStatus {
  plan: PlanTier;
  planExpiresAt: string | null;
  subscription: {
    status: string;
    plan: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export interface CheckoutResponse {
  url: string;
}

export interface PRSummary {
  summary: string;
  impactWarnings: string[];
  changedFunctions: string[];
  diffOverview: string;
}
