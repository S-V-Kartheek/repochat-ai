/**
 * RepoTalk Frontend — Typed API Client
 * All calls go to the Node.js Gateway. Never calls ai_service directly.
 * Clerk token is attached per request via the provided getToken function.
 */

import type {
  Repo,
  Session,
  Message,
  ChatQueryResponse,
  CreateRepoResponse,
  CreateSessionResponse,
  IngestStatus,
  RepoFileTreeResponse,
  RepoFileContent,
  RepoSymbol,
  PersonaResponse,
  PRResponse,
  ProfileResponse,
  ProfileUsageResponse,
} from "./types";

const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4000";

// ── Core fetch helper ─────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  getToken: () => Promise<string | null>,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${GATEWAY}${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = body.error || body.message || msg;
    } catch { /* non-json error body */ }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ── Repo APIs ─────────────────────────────────────────────────────────────────

export function createApiClient(getToken: () => Promise<string | null>) {
  return {
    // ── Repos ────────────────────────────────────────────────────────────────

    repos: {
      list: () =>
        apiFetch<Repo[]>("/api/repos", getToken),

      get: (repoId: string) =>
        apiFetch<Repo>(`/api/repos/${repoId}`, getToken),

      create: (githubUrl: string, languages: string[]) =>
        apiFetch<CreateRepoResponse>("/api/repos", getToken, {
          method: "POST",
          body: JSON.stringify({ githubUrl, languages }),
        }),

      getStatus: (repoId: string) =>
        apiFetch<IngestStatus>(`/api/repos/${repoId}/status`, getToken),

      getTree: (repoId: string) =>
        apiFetch<RepoFileTreeResponse>(`/api/repos/${repoId}/tree`, getToken),

      getFile: (repoId: string, path: string) =>
        apiFetch<RepoFileContent>(
          `/api/repos/${repoId}/file?path=${encodeURIComponent(path)}`,
          getToken
        ),

      getSymbols: async (repoId: string) => {
        const raw = await apiFetch<
          Array<{
            name: string;
            kind: string;
            file: string;
            start_line: number;
            end_line: number;
          }>
        >(`/api/repos/${repoId}/symbols`, getToken);

        return raw.map(
          (symbol): RepoSymbol => ({
            name: symbol.name,
            kind: symbol.kind,
            filePath: symbol.file,
            line: symbol.start_line,
            endLine: symbol.end_line,
          })
        );
      },

      delete: (repoId: string) =>
        apiFetch<{ deleted: boolean }>(`/api/repos/${repoId}`, getToken, {
          method: "DELETE",
        }),
    },

    // ── Sessions ─────────────────────────────────────────────────────────────

    sessions: {
      list: (repoId: string) =>
        apiFetch<Session[]>(`/api/sessions?repoId=${repoId}`, getToken),

      search: (repoId: string, query: string) =>
        apiFetch<Session[]>(
          `/api/sessions/search?repoId=${encodeURIComponent(repoId)}&q=${encodeURIComponent(query)}`,
          getToken
        ),

      get: (sessionId: string) =>
        apiFetch<Session>(`/api/sessions/${sessionId}`, getToken),

      create: (repoId: string, title?: string) =>
        apiFetch<CreateSessionResponse>("/api/sessions", getToken, {
          method: "POST",
          body: JSON.stringify({ repoId, title }),
        }),

      delete: (sessionId: string) =>
        apiFetch<{ deleted: boolean }>(`/api/sessions/${sessionId}`, getToken, {
          method: "DELETE",
        }),

      saveMessage: (
        sessionId: string,
        role: "USER" | "ASSISTANT",
        content: string,
        citations?: unknown[]
      ) =>
        apiFetch<Message>(`/api/sessions/${sessionId}/messages`, getToken, {
          method: "POST",
          body: JSON.stringify({ role, content, citations }),
        }),

      toggleBookmark: (sessionId: string, messageId: string) =>
        apiFetch<Message>(
          `/api/sessions/${sessionId}/messages/${messageId}/bookmark`,
          getToken,
          { method: "PATCH" }
        ),
    },

    // ── Chat ─────────────────────────────────────────────────────────────────

    chat: {
      query: (
        repoId: string,
        question: string,
        sessionId: string,
        topK = 5
      ) =>
        apiFetch<ChatQueryResponse>("/api/chat/query", getToken, {
          method: "POST",
          body: JSON.stringify({ repoId, question, sessionId, topK }),
        }),

      /**
       * streamQuery — returns a ReadableStream of the raw fetch body.
       * The caller is responsible for reading SSE events line-by-line.
       */
      streamQuery: async (
        repoId: string,
        question: string,
        sessionId: string,
        topK = 5
      ): Promise<ReadableStream<Uint8Array>> => {
        const token = await getToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${GATEWAY}/api/chat/stream`, {
          method: "POST",
          headers,
          body: JSON.stringify({ repoId, question, sessionId, topK }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Stream failed: HTTP ${res.status}`);
        }

        return res.body;
      },
    },

    // ── Eval ─────────────────────────────────────────────────────────────────

    eval: {
      getDashboard: (repoId: string) =>
        apiFetch<any>(`/api/eval/dashboard/${repoId}`, getToken),

      score: (
        messageId: string,
        question: string,
        answer: string,
        contexts: string[],
        repoId: string
      ) =>
        apiFetch<any>("/api/eval/score", getToken, {
          method: "POST",
          body: JSON.stringify({ messageId, question, answer, contexts, repoId }),
        }),

      queueScore: (
        messageId: string,
        question: string,
        answer: string,
        contexts: string[],
        repoId: string
      ) =>
        apiFetch<any>("/api/eval/queue", getToken, {
          method: "POST",
          body: JSON.stringify({ messageId, question, answer, contexts, repoId }),
        }),
    },

    // ── Persona ───────────────────────────────────────────────────────────────

    persona: {
      get: (repoId: string) =>
        apiFetch<PersonaResponse>(`/api/persona/${repoId}`, getToken),

      generate: (repoId: string) =>
        apiFetch<PersonaResponse>("/api/persona", getToken, {
          method: "POST",
          body: JSON.stringify({ repoId }),
        }),

      regenerate: async (repoId: string) => {
        await apiFetch<{ deleted: boolean }>(`/api/persona/${repoId}`, getToken, {
          method: "DELETE",
        });
        return apiFetch<PersonaResponse>("/api/persona", getToken, {
          method: "POST",
          body: JSON.stringify({ repoId }),
        });
      },
    },

    // ── PR Summarizer ─────────────────────────────────────────────────────────

    pr: {
      summarize: (prUrl: string, repoId?: string) =>
        apiFetch<PRResponse>("/api/pr/summarize", getToken, {
          method: "POST",
          body: JSON.stringify({ prUrl, repoId: repoId || "" }),
        }),
    },

    // ── Profile / Settings ──────────────────────────────────────────────────

    profile: {
      get: () => apiFetch<ProfileResponse>("/api/profile", getToken),
      usage: () =>
        apiFetch<ProfileUsageResponse>("/api/profile/usage", getToken),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
