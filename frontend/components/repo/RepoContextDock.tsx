"use client";

import { FolderGit2 } from "lucide-react";
import RepoExplorerPanelBody from "./RepoExplorerPanelBody";

/** Fixed right column for wide desktop (`xl` and up). */
export default function RepoContextDock({ repoName }: { repoName: string }) {
  return (
    <aside
      className="hidden xl:flex flex-col flex-shrink-0 w-[min(360px,32vw)] max-w-[400px] min-w-[300px]"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        className="px-4 py-3.5 flex-shrink-0 flex items-center gap-2.5 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--accent-muted)" }}
        >
          <FolderGit2 size={16} style={{ color: "var(--accent)" }} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
            Workspace
          </p>
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
            {repoName}
          </p>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col">
        <RepoExplorerPanelBody className="flex-1" />
      </div>
    </aside>
  );
}
