"use client";

import { useState, useEffect, useContext } from "react";
import type { Citation } from "@/lib/types";
import { X, FileCode } from "lucide-react";
import { RepoWorkspaceContext } from "./repo/RepoWorkspaceContext";

// ── Snippet Modal ─────────────────────────────────────────────────────────────

export function SnippetModal({
  citation,
  onClose,
}: {
  citation: Citation;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2, 8, 20, 0.75)", backdropFilter: "blur(16px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Code snippet from ${citation.file}`}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl fade-in"
        style={{
          background: "#020814",
          border: "1px solid rgba(6, 182, 212, 0.2)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 40px rgba(6, 182, 212, 0.1), 0 32px 80px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <FileCode size={14} style={{ color: "var(--tertiary)" }} />
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                fontWeight: 500,
                color: "var(--text)",
              }}
            >
              {citation.file}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                padding: "1px 8px",
                borderRadius: "999px",
                background: "rgba(6,182,212,0.1)",
                border: "1px solid rgba(6,182,212,0.2)",
                color: "var(--tertiary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              L{citation.startLine}–{citation.endLine}
            </span>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close snippet"
          >
            <X size={14} />
          </button>
        </div>

        {/* Code */}
        <div className="overflow-auto flex-1 p-5">
          <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem", lineHeight: 1.6, color: "#c4cfe8", margin: 0 }}>
            <code>{citation.snippet}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

// ── Citation Chip ────────────────────────────────────────────────────────────

interface CitationChipProps {
  citation: Citation;
  index: number;
}

export default function CitationChip({ citation, index }: CitationChipProps) {
  // Use workspace context if available (e.g. inside /chat), otherwise fall back
  // to a local modal so CitationChip works on standalone pages like /bookmarks.
  const workspaceCtx = useContext(RepoWorkspaceContext);
  const [localModal, setLocalModal] = useState<Citation | null>(null);

  const fileName = citation.file.split("/").pop() ?? citation.file;

  const handleClick = () => {
    if (workspaceCtx) {
      workspaceCtx.openCitation(citation);
    } else {
      setLocalModal(citation);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="citation-chip"
        title={`${citation.file}:${citation.startLine}-${citation.endLine}`}
        aria-label={`View code snippet from ${citation.file} lines ${citation.startLine} to ${citation.endLine}`}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "0.65rem",
            fontWeight: 700,
            padding: "1px 5px",
            borderRadius: "4px",
            background: "rgba(6,182,212,0.15)",
            color: "var(--tertiary)",
          }}
        >
          {index + 1}
        </span>
        {fileName}
        <span style={{ color: "rgba(6,182,212,0.6)" }}>:{citation.startLine}</span>
      </button>

      {/* Fallback local modal — only used outside RepoWorkspaceProvider */}
      {localModal && (
        <SnippetModal citation={localModal} onClose={() => setLocalModal(null)} />
      )}
    </>
  );
}
