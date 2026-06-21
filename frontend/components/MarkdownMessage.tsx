"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";
import type { Components } from "react-markdown";

// Lazy-load syntax highlighter to keep initial bundle small
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownMessageProps {
  content: string;
  /** When true, content is streaming in; disables copy button until done */
  isStreaming?: boolean;
}

// ── Copy button for code blocks ───────────────────────────────────────────────
function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button
      onClick={handleCopy}
      className="copy-code-btn"
      aria-label={copied ? "Copied!" : "Copy code"}
      title={copied ? "Copied!" : "Copy"}
    >
      {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} />}
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ── Markdown component overrides ───────────────────────────────────────────────
const createComponents = (): Components => ({
  // Fenced code blocks with syntax highlighting
  code({ node, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const isBlock = !!match;
    const codeText = String(children).replace(/\n$/, "");

    if (isBlock) {
      const lang = match![1];
      return (
        <div className="code-block-wrapper" style={{ position: "relative", margin: "0.75em 0" }}>
          <div className="code-block-header">
            <span className="code-lang">{lang}</span>
            <CopyCodeButton code={codeText} />
          </div>
          <SyntaxHighlighter
            style={vscDarkPlus as Record<string, React.CSSProperties>}
            language={lang}
            PreTag="div"
            customStyle={{
              margin: 0,
              padding: "1rem 1.2rem",
              borderRadius: "0 0 10px 10px",
              fontSize: "0.82rem",
              lineHeight: "1.65",
              background: "#0b1220",
            }}
            codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
          >
            {codeText}
          </SyntaxHighlighter>
        </div>
      );
    }

    // Inline code
    return (
      <code
        style={{
          padding: "0.12em 0.42em",
          borderRadius: "5px",
          fontSize: "0.87em",
          fontFamily: "var(--font-mono)",
          background: "rgba(37,99,235,0.08)",
          color: "#1d4ed8",
          border: "1px solid rgba(37,99,235,0.12)",
        }}
        {...props}
      >
        {children}
      </code>
    );
  },

  // Paragraphs — tight spacing in chat context
  p({ children }) {
    return (
      <p style={{ margin: "0 0 0.65em 0", lineHeight: "1.72", color: "var(--text)" }}>
        {children}
      </p>
    );
  },

  // Headings — scaled down for chat bubbles
  h1({ children }) {
    return <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "1em 0 0.4em", color: "var(--text)" }}>{children}</h3>;
  },
  h2({ children }) {
    return <h4 style={{ fontSize: "0.97rem", fontWeight: 650, margin: "0.9em 0 0.35em", color: "var(--text)" }}>{children}</h4>;
  },
  h3({ children }) {
    return <h5 style={{ fontSize: "0.92rem", fontWeight: 600, margin: "0.8em 0 0.3em", color: "var(--text)" }}>{children}</h5>;
  },

  // Lists
  ul({ children }) {
    return <ul style={{ margin: "0.4em 0 0.65em 1.4em", listStyleType: "disc", color: "var(--text)" }}>{children}</ul>;
  },
  ol({ children }) {
    return <ol style={{ margin: "0.4em 0 0.65em 1.4em", listStyleType: "decimal", color: "var(--text)" }}>{children}</ol>;
  },
  li({ children }) {
    return <li style={{ margin: "0.15em 0", lineHeight: "1.65", color: "var(--text)" }}>{children}</li>;
  },

  // Blockquote
  blockquote({ children }) {
    return (
      <blockquote
        style={{
          margin: "0.65em 0",
          padding: "0.5em 1em",
          borderLeft: "3px solid var(--accent)",
          background: "rgba(37,99,235,0.05)",
          borderRadius: "0 6px 6px 0",
          color: "var(--text-muted)",
          fontStyle: "italic",
        }}
      >
        {children}
      </blockquote>
    );
  },

  // Table
  table({ children }) {
    return (
      <div style={{ overflowX: "auto", margin: "0.75em 0" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.87rem" }}>
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th
        style={{
          padding: "0.45em 0.85em",
          textAlign: "left",
          fontWeight: 600,
          background: "var(--surface-3)",
          borderBottom: "2px solid var(--border)",
          color: "var(--text)",
        }}
      >
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td
        style={{
          padding: "0.4em 0.85em",
          borderBottom: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        {children}
      </td>
    );
  },

  // Horizontal rule
  hr() {
    return <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.75em 0" }} />;
  },

  // Links
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: "2px" }}
      >
        {children}
      </a>
    );
  },

  // Strong & em
  strong({ children }) {
    return <strong style={{ fontWeight: 650, color: "var(--text)" }}>{children}</strong>;
  },
  em({ children }) {
    return <em style={{ fontStyle: "italic", color: "var(--text-muted)" }}>{children}</em>;
  },
});

const MARKDOWN_COMPONENTS = createComponents();

// ── Main export ────────────────────────────────────────────────────────────────
export default function MarkdownMessage({ content, isStreaming }: MarkdownMessageProps) {
  return (
    <div className="markdown-body" style={{ fontSize: "0.9rem", lineHeight: "1.72", color: "var(--text)" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS}
      >
        {content}
      </ReactMarkdown>
      {/* Streaming cursor appended at the end when live */}
      {isStreaming && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom blink-cursor"
          style={{ background: "var(--accent)", verticalAlign: "text-bottom" }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
