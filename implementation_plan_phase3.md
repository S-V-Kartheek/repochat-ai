# Phase 3 Implementation Plan (Weeks 7–9)

This plan outlines the end-to-end implementation of Phase 3, completing the Repo Persona, PR Summarizer, and Multi-turn Memory features.

## User Review Required

> [!IMPORTANT]
> - **Prisma Schema Update**: We will add a `RepoPersona` model to cache the generated persona for a repository. This requires running `npx prisma db push` during execution.
> - **GitHub Token**: The PR summarizer will use the `GITHUB_TOKEN` from the `.env` file to fetch PR diffs via the GitHub API. Please ensure this is set if you want to test the PR feature with private repos or avoid rate limits.
> - **Follow-up Suggestions**: We will attach follow-up suggestions as part of the final SSE `done` event payload during the chat stream to display them immediately.

## Proposed Changes

### Database Layer
#### [MODIFY] `gateway/prisma/schema.prisma`
- Add a new `RepoPersona` model linked to the `Repo` model (1:1 relation) to cache the persona results (stack, frameworks, onboarding guide, etc.).

---

### AI Service (Backend)
#### [MODIFY] `ai_service/app/routers/persona.py`
- Implement `generate_persona`:
  - Fetch repo file tree and README content via `repo_cloner`.
  - Use the LLM to generate a comprehensive `PersonaResponse` based on the file paths and README.
- Implement `get_persona`:
  - This logic will mostly move to the Gateway which queries Prisma, or AI service will just calculate it on the fly if not cached. We will adjust the endpoint to act as the raw generation endpoint.

#### [MODIFY] `ai_service/app/routers/pr.py`
- Implement `summarize_pr`:
  - Use `httpx` and `GITHUB_TOKEN` to fetch the PR diff (`{pr_url}.diff`).
  - Extract changed filenames and diff content.
  - Call the LLM to generate a plain-English summary, impact warnings, and list of changed functions.

#### [MODIFY] `ai_service/app/routers/query.py`
- Enhance `query_repo_stream` (and `query_repo`):
  - Prepend recent conversation history summaries to the embedding search query to improve **context-aware retrieval weighting**.
  - Update the prompt to ask the LLM to generate 3 relevant follow-up questions at the very end of its response.
  - Parse these follow-up questions from the LLM output and append them to the final `done` SSE event.

---

### Node Gateway
#### [NEW] `gateway/src/routes/persona.ts`
- Implement GET/POST endpoints that check the Prisma DB first, and if empty, proxy to `ai_service` `/api/v1/persona/`, save the result to DB, and return it.

#### [NEW] `gateway/src/routes/pr.ts`
- Implement endpoint to proxy `/api/v1/pr/summarize` directly to `ai_service` (no DB caching required for PR summaries).

#### [MODIFY] `gateway/src/index.ts`
- Mount `/api/persona` and `/api/pr`.

---

### Frontend
#### [MODIFY] `frontend/lib/types.ts`
- Add `PersonaResponse` and `PRResponse` interfaces.
- Add `follow_ups?: string[]` to the `ChatQueryResponse` and SSE `done` payload.

#### [MODIFY] `frontend/lib/api.ts`
- Add `api.persona` and `api.pr` objects with corresponding fetch methods.

#### [MODIFY] `frontend/app/persona/[repoId]/page.tsx`
- Build a responsive dashboard using Tailwind/shadcn components to display the Identity Card, Architecture Overview, and markdown Onboarding Guide.

#### [MODIFY] `frontend/app/pr/page.tsx`
- Build a page with an input for a PR URL, a repo selector, and a results panel showing the summary, impact warnings, and diff overview.

#### [MODIFY] `frontend/components/ChatPanel.tsx`
- Add a "Summarize this session" quick-action button that sends a predefined prompt.
- Update the chat interface to render clickable follow-up suggestion chips at the bottom of the active response.

## Verification Plan

### Automated Tests
- Build gateway (`npm run build`).
- Build frontend (`npm run build`).
- Ensure no Type errors.

### Manual Verification
- **Persona**: Navigate to `/persona/[repoId]` in the browser and verify the generation and display.
- **PR Summarizer**: Enter a valid PR URL in `/pr` and verify the summary and impact warnings.
- **Memory**: Ask follow-up questions in chat and verify the retrieval uses previous context. Check that 3 follow-up suggestions appear after the answer.
