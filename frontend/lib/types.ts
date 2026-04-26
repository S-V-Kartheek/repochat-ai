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
  faithfulness?: number;
  answer_relevancy?: number;
  context_precision?: number;
  overall?: string;
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

export interface RepoFileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children: RepoFileNode[];
}

export interface RepoFileTreeResponse {
  repo_id: string;
  tree: RepoFileNode[];
}

export interface RepoFileContent {
  repo_id: string;
  path: string;
  language: string | null;
  content: string;
}

export interface RepoSymbol {
  name: string;
  kind: string;
  filePath: string;
  line: number;
  endLine: number;
}

// ── API Response shapes ────────────────────────────────────────────────────────

export interface ChatQueryResponse {
  answer: string;
  citations: Citation[];
  model_used: string;
  session_id?: string;
  message_id?: string;
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
