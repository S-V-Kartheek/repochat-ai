"use client";

import { useEffect, useRef, useCallback } from "react";
import { X, FileCode, Copy, Check, ChevronLeft } from "lucide-react";
import { useState } from "react";
import type { RepoExplorerState } from "@/lib/repoExplorer";

interface CitationSlidePanelProps {
  explorer: RepoExplorerState;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy snippet"}
      style={{
        display: "flex", alignItems: "center", gap: "5px",
        padding: "5px 10px", borderRadius: "6px",
        background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)",
        color: copied ? "#4ade80" : "var(--text-muted)",
        fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function CitationSlidePanel({ explorer, onClose }: CitationSlidePanelProps) {
  const isOpen = explorer.codeDisplayMode !== "none";
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const path = explorer.selectedFilePath;
  const snippet = explorer.citationSnippet ?? "";
  const lines = snippet.length > 0 ? snippet.split("\n") : [""];
  const anchor = explorer.citationAnchorLine ?? 1;
  const hl = explorer.highlightedRange;

  const filename = path ? path.split("/").pop() ?? path : "code snippet";
  const dir = path ? path.split("/").slice(0, -1).join("/") : "";

  return (
    <>
      {/* Overlay backdrop for small screens */}
      {isOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 45,
            background: "rgba(0,0,0,0.5)",
            display: "none",
          }}
          className="citation-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide panel */}
      <aside
        ref={panelRef}
        style={{
          width: isOpen ? "420px" : "0",
          minWidth: isOpen ? "420px" : "0",
          flexShrink: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#0a0f1e",
          borderLeft: isOpen ? "1px solid var(--border)" : "none",
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)",
          zIndex: 20,
        }}
      >
        {isOpen && (
          <>
            {/* ── Header ──────────────────────────── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
              flexShrink: 0,
              gap: "10px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                {/* File icon */}
                <div style={{
                  width: "28px", height: "28px", borderRadius: "7px", flexShrink: 0,
                  background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FileCode size={14} style={{ color: "var(--tertiary)" }} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{
                    margin: 0, lineHeight: 1.3,
                    fontSize: "0.83rem", fontWeight: 600,
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {filename}
                  </p>
                  {(dir || hl) && (
                    <p style={{
                      margin: 0, fontSize: "0.7rem",
                      color: "var(--text-faint)",
                      fontFamily: "var(--font-mono)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {dir && <span>{dir}</span>}
                      {dir && hl && <span style={{ margin: "0 4px" }}>·</span>}
                      {hl && (
                        <span style={{
                          padding: "0px 6px", borderRadius: "4px",
                          background: "rgba(59,130,246,0.12)",
                          color: "var(--primary-dim)",
                          border: "1px solid rgba(59,130,246,0.2)",
                        }}>
                          L{hl.startLine}–{hl.endLine}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                {snippet && <CopyButton text={snippet} />}
                <button
                  onClick={onClose}
                  title="Close panel (Esc)"
                  style={{
                    padding: "6px",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-faint)",
                    cursor: "pointer",
                    display: "flex", alignItems: "center",
                    transition: "color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-faint)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  aria-label="Close code panel"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Hint ──────────────────────────────── */}
            <div style={{
              padding: "6px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: "rgba(59,130,246,0.04)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--text-faint)" }}>
                Double-click anywhere in the chat to close
              </p>
              <button
                onClick={onClose}
                style={{
                  display: "flex", alignItems: "center", gap: "4px",
                  fontSize: "0.7rem", color: "var(--text-faint)",
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0,
                }}
              >
                <ChevronLeft size={10} /> Close
              </button>
            </div>

            {/* ── Code body ─────────────────────────── */}
            <div style={{
              flex: 1, overflowY: "auto",
              background: "#070d1a",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              lineHeight: "1.7",
            }}>
              {explorer.codeDisplayMode === "file" ? (
                <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  <p>Full file contents will appear here once the repository file API is connected.</p>
                  {hl && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", fontFamily: "var(--font-mono)", marginTop: "8px" }}>
                      Requested focus: L{hl.startLine}–{hl.endLine}
                    </p>
                  )}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {lines.map((line, i) => {
                      const lineNo = anchor + i;
                      const inRange = hl && lineNo >= hl.startLine && lineNo <= hl.endLine;
                      return (
                        <tr
                          key={`${lineNo}-${i}`}
                          style={{
                            background: inRange
                              ? "rgba(37,99,235,0.18)"
                              : "transparent",
                          }}
                        >
                          <td style={{
                            width: "1%",
                            textAlign: "right",
                            padding: "1px 12px 1px 8px",
                            verticalAlign: "top",
                            whiteSpace: "nowrap",
                            userSelect: "none",
                            color: inRange ? "rgba(147,197,253,0.7)" : "rgba(100,116,139,0.6)",
                            borderRight: `1px solid ${inRange ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.05)"}`,
                            background: inRange ? "rgba(37,99,235,0.1)" : "rgba(7,13,26,0.6)",
                            fontSize: "0.75rem",
                            minWidth: "36px",
                          }}>
                            {lineNo}
                          </td>
                          <td style={{
                            padding: "1px 16px 1px 12px",
                            verticalAlign: "top",
                            whiteSpace: "pre",
                            overflowX: "hidden",
                            color: inRange ? "#e2e8f0" : "#94a3b8",
                          }}>
                            {line || " "}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
