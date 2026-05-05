# RepoTalk Project Report

## 1. Project Information
- Project Name: RepoTalk
- Project Type: AI-powered codebase assistant (RAG)
- Submission Date: 2026-04-26
- Report Snapshot Time (IST): 2026-04-26 09:47:15 +05:30
- Repository Path: `C:\dev\RepoTalk`

## 2. Executive Summary
RepoTalk is a full-stack developer tool that allows users to connect a GitHub repository and ask natural language questions grounded in actual source code. The system uses a hybrid backend architecture: a Node.js gateway for authentication, session management, and streaming, and a FastAPI AI service for repository ingestion, embeddings, retrieval, and answer generation.

The project has progressed through core RAG implementation and major user-facing features. It includes persistent chat history, citation-based answers, evaluation scoring (RAGAS), repo persona generation, PR summarization, and multi-turn context support. Remaining work is mainly in final production hardening (rate limiting, profile/settings completion, and a few Phase 4 concerns).

## 3. Problem Statement
Developers waste significant time onboarding to unfamiliar repositories and locating reliable implementation details. Generic AI chat often hallucinates or answers without code grounding. RepoTalk addresses this by:
- indexing repository code,
- retrieving relevant code chunks,
- generating grounded answers with citations,
- preserving conversation history,
- and exposing quality/evaluation signals.

## 4. Objectives
- Build a free-tier compatible AI code assistant.
- Support end-to-end repository ingestion and question answering.
- Provide source-grounded answers with file/line citations.
- Add persistent chat sessions and bookmarks.
- Add quality evaluation (faithfulness, relevancy, context precision).
- Add differentiating features: repo persona, PR summarizer, multi-turn memory.
- Keep architecture production-oriented and modular.

## 5. Architecture
The system follows a 3-service local stack:
- Frontend: Next.js App Router (`frontend/`)
- Gateway API: Express + Prisma + Clerk (`gateway/`)
- AI Service: FastAPI + embeddings + retrieval + LLM (`ai_service/`)

Supporting services:
- Qdrant for vectors
- Redis for caching/rate-limit infrastructure (planned full use in Phase 4)
- SQLite local DB in development via Prisma

Flow summary:
1. User signs in and connects a GitHub repo.
2. Gateway triggers AI ingestion pipeline.
3. AI service clones repo, parses/chunks code, embeds chunks, upserts to Qdrant.
4. User asks question in chat.
5. Gateway loads recent session history, proxies query to AI service.
6. AI service retrieves relevant chunks and generates grounded answer.
7. Gateway streams or returns answer, persists messages, and enqueues RAGAS scoring.
8. Frontend shows answer, citations, score badge, and follow-up prompts.

## 6. Technology Stack
- Frontend: Next.js 14, TypeScript, Clerk, custom UI components
- Gateway: Node.js, Express, TypeScript, Prisma ORM, Zod
- AI Service: FastAPI, Python, OpenAI-compatible client, sentence-transformers, Tree-sitter utilities
- Vector Database: Qdrant
- Database: SQLite (local development), Prisma schema designed for relational extension
- DevOps: Docker Compose, GitHub Actions CI

## 7. Database Design (Prisma)
Core entities implemented:
- `User`: Clerk-linked application user
- `Repo`: connected repository metadata and ingestion status
- `Session`: per-repo chat sessions
- `Message`: chat turns, citations, bookmarks, RAGAS score
- `RepoPersona`: cached generated persona artifacts

Design characteristics:
- One user can own many repos.
- One repo can have many sessions.
- One session can have many messages.
- Persona is cached one-to-one with repo via `repoId` unique mapping.

## 8. Modules Implemented

### 8.1 AI Service (FastAPI)
Implemented routers:
- `ingest.py`: clone -> parse -> chunk -> embed -> upsert pipeline
- `query.py`: non-stream and stream query endpoints, citation extraction, follow-up extraction, Groq rate-limit fallback behavior
- `symbols.py`: symbol extraction endpoints
- `repo_files.py`: repository file tree/content endpoints
- `eval.py`: RAGAS scoring endpoints
- `persona.py`: repository profiling + LLM persona generation
- `pr.py`: GitHub PR diff summarization + webhook handling

Core components implemented:
- `chunker.py`, `ast_parser.py`, `embedder.py`, `llm_provider.py`, `prompt_builder.py`, `vector_store.py`

Important note:
- `vector_store.hybrid_search` is currently dense search with filtering; full sparse/dense BM25 hybrid setup is still pending.

### 8.2 Gateway (Express)
Implemented routes:
- `repos.ts`: connect/list/get/status/delete, file tree/file/symbol proxying
- `sessions.ts`: create/list/get/search messages, bookmark toggle
- `chat.ts`: query + SSE stream, message persistence, session touch/title, eval queue integration
- `eval.ts`: dashboard metrics and queue stats
- `persona.ts`: generate/get/delete persona cache
- `pr.ts`: PR summarize/webhook proxy

Partially pending routes:
- `profile.ts`: placeholders returning 501 (Phase 4 pending)

Middleware status:
- `auth.ts` functional
- `rateLimit.ts` currently no-op TODO (Phase 4 pending)

### 8.3 Frontend (Next.js)
Implemented pages:
- landing, ingest, chat workspace, eval dashboard
- persona page (`/persona/[repoId]`)
- PR summarizer page (`/pr`)
- auth pages (`/sign-in`, `/sign-up`)

Partially pending page:
- settings page (`/settings`) placeholder

Implemented UX capabilities:
- streaming assistant responses
- citation chips and code navigation hooks
- session history + search + bookmarking
- RAGAS quality badges
- follow-up suggestions UI
- "Summarize session" quick action

## 9. Key Features Delivered
- Repository ingestion and indexing
- Grounded Q&A with citations
- Persistent chat history
- Multi-turn context in retrieval and prompts
- Follow-up suggestion generation
- PR summarization workflow
- Repo persona generation workflow
- RAGAS scoring integration and dashboard visualization
- Dockerized local stack with health checks

## 10. Quality, Testing, and CI
Automated tests present in AI service:
- `test_prompt_builder.py`
- `test_repo_cloner.py`
- `test_logic.py`
- `test_symbols.py`

CI pipeline exists at `.github/workflows/ci.yml` with:
- FastAPI tests and coverage step
- Gateway TypeScript/Jest checks
- Frontend typecheck and lint
- deploy-ready notification stage

## 11. Live Validation Snapshot (Current Environment)
At report time, local Docker services were running healthy:
- `repotalk_gateway`
- `repotalk_ai_service`
- `repotalk_frontend`
- `repotalk_qdrant`
- `repotalk_redis`

Live gateway DB snapshot captured from running container:
- users: 2
- repos: 3
- sessions: 3
- messages: 21

This confirms real persistence of connected repos and chat history in the active runtime.

## 12. Completion Status vs Plan

### Phase 1: Core Backend (Weeks 1-3)
Status: Completed
- Ingestion, chunking, embedding, retrieval, query, symbols implemented.

### Phase 2: Frontend + Gateway (Weeks 4-6)
Status: Completed (with practical production behavior)
- Session persistence, SSE chat, sidebar/search/bookmarks, evaluation pipeline and dashboard implemented.

### Phase 3: Differentiating Features (Weeks 7-9)
Status: Mostly implemented
- Week 7 (Repo Persona): Implemented (AI route + gateway cache + frontend page)
- Week 8 (PR Summarizer): Implemented (AI route + gateway route + frontend page)
- Week 9 (Multi-turn memory): Implemented in practical form (history injection, context-aware query expansion, follow-ups, summarize-session action)

### Phase 4: Polish + Ship (Weeks 10-12)
Status: Partially pending
- `rateLimit.ts` not implemented yet (no-op)
- `profile.ts` not implemented (501)
- `settings` page placeholder
- full security/observability polish still pending

## 13. Known Gaps and Risks
- Retrieval method labeled hybrid but currently dense-only in code path.
- Rate limiting middleware is pending.
- Profile/settings backend functionality pending.
- Sign-in redirect behavior should be re-validated for edge cases in middleware/redirect config.
- Repo deduplication policy is not strict yet (same repo can be added multiple times across records).

## 14. Improvements Completed During Recent Debugging
- Streaming/chat stability improvements in frontend components to reduce duplicate submit/response behavior.
- Better fallback handling for LLM rate-limit scenarios in AI query path.
- Container/runtime validation of data persistence and health.

## 15. Future Work (Next Priority Order)
1. Complete Phase 4 rate limiting with Redis-backed policy.
2. Implement profile usage APIs and settings page backend integration.
3. Upgrade retrieval to true dense+sparse hybrid search.
4. Add strict repo deduplication constraints and UX handling.
5. Expand integration and E2E test coverage.
6. Final production hardening, monitoring, and release documentation.

## 16. Conclusion
RepoTalk has successfully delivered a working, full-stack, citation-grounded repository chat platform with persistent history, quality scoring, and advanced helper features (persona and PR summarization). The project is beyond MVP and in late-stage build maturity. Remaining work is primarily production hardening and final polish rather than foundational capability development.
