/**
 * Chat Page — /chat/[repoId]
 * 3-panel: Sidebar (file tree + history) + Chat + Monaco code viewer.
 * Streaming SSE responses, citation chips, RAGAS badge, follow-up suggestions.
 * Phase 2 — Week 4-5 implementation.
 */
export default function ChatPage({ params }: { params: { repoId: string } }) {
  // TODO: Phase 2 Week 4-5
  return <div>Chat page for repo {params.repoId} — Phase 2 Week 4-5</div>;
}
