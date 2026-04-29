"use client";

import { useEffect, useRef } from "react";
import { FileCode, Loader2, AlertTriangle } from "lucide-react";
import type { RepoExplorerState } from "@/lib/repoExplorer";

interface CodeViewerPaneProps {
  explorer: RepoExplorerState;
  fileLabel?: string | null;
}

export default function CodeViewerPane({
  explorer,
  fileLabel,
}: CodeViewerPaneProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const path = fileLabel ?? explorer.selectedFilePath;

  useEffect(() => {
    if (!scrollRef.current || !explorer.highlightedRange) return;
    const lineNo = explorer.highlightedRange.startLine;
    const target = scrollRef.current.querySelector<HTMLElement>(`[data-line="${lineNo}"]`);
    target?.scrollIntoView({ block: "center" });
  }, [explorer.fileContent?.path, explorer.highlightedRange]);

  if (explorer.codeDisplayMode === "none") {
    return (
      <div
        className="flex flex-col items-center justify-center text-center px-6 py-12"
        style={{ minHeight: "200px" }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
          style={{
            background: "var(--surface-3)",
            border: "1px solid var(--border)",
          }}
        >
          <FileCode size={20} style={{ color: "var(--accent)" }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text)" }}>
          No file in view
        </p>
        <p className="text-xs max-w-[220px]" style={{ color: "var(--text-muted)" }}>
          Open a citation chip, pick a path from the file tree, or choose a symbol to preview code
          here.
        </p>
      </div>
    );
  }

  if (explorer.fileLoadState === "loading") {
    return (
      <div className="flex flex-col h-full min-h-0">
        <HeaderBar path={path} />
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={18} className="animate-spin mr-2" />
          Loading file contents...
        </div>
      </div>
    );
  }

  if (explorer.fileLoadState === "error") {
    return (
      <div className="flex flex-col h-full min-h-0">
        <HeaderBar path={path} />
        <div className="flex-1 overflow-auto p-4 space-y-3">
          <div
            className="flex items-start gap-2 rounded-lg px-3 py-3"
            style={{
              background: "var(--error-muted)",
              border: "1px solid rgba(220,38,38,0.2)",
              color: "var(--error)",
            }}
          >
            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Could not load file contents</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {explorer.fileError ?? "Unknown error"}
              </p>
            </div>
          </div>
          {explorer.citationSnippet && (
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-faint)" }}>
                Falling back to the cited snippet:
              </p>
              <SnippetBlock snippet={explorer.citationSnippet} highlightedRange={explorer.highlightedRange} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const content = explorer.fileContent?.content ?? "";
  const lines = content.split("\n");
  const highlighted = explorer.highlightedRange;

  return (
    <div className="flex flex-col h-full min-h-0">
      <HeaderBar path={path} />
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto font-mono text-[13px] leading-relaxed"
        style={{
          background: "var(--code-bg)",
          color: "#c4cfe8",
        }}
      >
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, index) => {
              const lineNo = index + 1;
              const inRange =
                highlighted &&
                lineNo >= highlighted.startLine &&
                lineNo <= highlighted.endLine;

              return (
                <tr
                  key={`${lineNo}-${index}`}
                  data-line={lineNo}
                  style={{
                    background: inRange ? "rgba(37, 99, 235, 0.22)" : "transparent",
                  }}
                >
                  <td
                    className="select-none text-right pr-3 pl-2 py-0.5 align-top whitespace-nowrap"
                    style={{
                      width: "1%",
                      color: "rgba(148, 163, 184, 0.85)",
                      borderRight: "1px solid var(--code-border)",
                      background: inRange
                        ? "rgba(37, 99, 235, 0.12)"
                        : "rgba(15, 23, 42, 0.35)",
                    }}
                  >
                    {lineNo}
                  </td>
                  <td
                    className="pl-3 pr-4 py-0.5 align-top whitespace-pre-wrap break-all"
                    style={{ color: "#e2e8f0" }}
                  >
                    {line || " "}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HeaderBar({ path }: { path: string | null | undefined }) {
  return (
    <div
      className="flex-shrink-0 px-3 py-2 flex items-center gap-2 border-b"
      style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
    >
      <FileCode size={13} style={{ color: "var(--accent)" }} />
      <span
        className="text-xs font-mono truncate"
        style={{ color: "var(--text)" }}
        title={path ?? undefined}
      >
        {path ?? "Unknown path"}
      </span>
    </div>
  );
}

function SnippetBlock({
  snippet,
  highlightedRange,
}: {
  snippet: string;
  highlightedRange: { startLine: number; endLine: number } | null;
}) {
  const lines = snippet.split("\n");
  const anchor = highlightedRange?.startLine ?? 1;

  return (
    <div
      className="overflow-auto font-mono text-[13px] leading-relaxed rounded-lg"
      style={{
        background: "var(--code-bg)",
        color: "#c4cfe8",
        border: "1px solid var(--code-border)",
      }}
    >
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, index) => {
            const lineNo = anchor + index;
            return (
              <tr key={`${lineNo}-${index}`}>
                <td
                  className="select-none text-right pr-3 pl-2 py-0.5 align-top whitespace-nowrap"
                  style={{
                    width: "1%",
                    color: "rgba(148, 163, 184, 0.85)",
                    borderRight: "1px solid var(--code-border)",
                    background: "rgba(15, 23, 42, 0.35)",
                  }}
                >
                  {lineNo}
                </td>
                <td
                  className="pl-3 pr-4 py-0.5 align-top whitespace-pre-wrap break-all"
                  style={{ color: "#e2e8f0" }}
                >
                  {line || " "}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
