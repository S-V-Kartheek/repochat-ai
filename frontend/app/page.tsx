"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  Brain,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  GitBranch,
  FileCode2,
  Layers3,
  Workflow,
  Zap,
  GitPullRequest,
  MessageSquare,
  Search,
  Play,
  Star,
  ChevronRight,
} from "lucide-react";

// ── Three.js Network Animation ────────────────────────────────────────────
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = 0, height = 0;

    function resize() {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    }

    const NODES = 80;
    type Node = { x: number; y: number; vx: number; vy: number; r: number };
    let nodes: Node[] = [];

    function init() {
      resize();
      nodes = Array.from({ length: NODES }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
      }));
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.25;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            // Alternate blue/purple lines
            const useBlue = (i + j) % 2 === 0;
            ctx.strokeStyle = useBlue
              ? `rgba(59, 130, 246, ${alpha})`
              : `rgba(139, 92, 246, ${alpha * 0.7})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59, 130, 246, 0.7)";
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    init();
    draw();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero-canvas"
      style={{ width: "100%", height: "100%" }}
      aria-hidden="true"
    />
  );
}

// ── Data ───────────────────────────────────────────────────────────────────

const STATS = [
  { label: "Repos Indexed", value: "500+" },
  { label: "Questions Answered", value: "10K+" },
  { label: "Avg Response", value: "<3s" },
  { label: "Faithfulness Score", value: "87%" },
];

const FEATURES = [
  {
    icon: Brain,
    color: "#3B82F6",
    title: "RAG-Powered Chat",
    description: "Ask engineering questions and get code-aware responses grounded in actual repository context — not hallucinations.",
  },
  {
    icon: FileCode2,
    color: "#8B5CF6",
    title: "File:Line Citations",
    description: "Every key claim includes a source file and line range so you can verify answers immediately in your editor.",
  },
  {
    icon: Layers3,
    color: "#06B6D4",
    title: "AST-Aware Chunking",
    description: "Tree-sitter parses code so chunks never cut mid-function. Repository-scale retrieval focused on implementation details.",
  },
  {
    icon: Search,
    color: "#3B82F6",
    title: "Hybrid Search",
    description: "Vector similarity + BM25 keyword matching for precise retrieval. Best of both worlds for code understanding.",
  },
  {
    icon: Sparkles,
    color: "#8B5CF6",
    title: "Repo Persona",
    description: "Auto-generated onboarding guide, architecture overview, and tech stack detection the moment you index a repo.",
  },
  {
    icon: GitPullRequest,
    color: "#06B6D4",
    title: "PR Summarizer",
    description: "Paste a PR URL, get a plain-English impact summary. Understand what changed without reading every diff.",
  },
];

const STEPS = [
  {
    number: "01",
    icon: GitBranch,
    title: "Paste GitHub URL",
    description: "Any public GitHub repository. RepoTalk indexes it with AST-aware chunking in under 60 seconds.",
  },
  {
    number: "02",
    icon: MessageSquare,
    title: "Ask in Plain English",
    description: "Type questions like you would to a senior engineer who knows the entire codebase deeply.",
  },
  {
    number: "03",
    icon: FileCode2,
    title: "Get Cited Answers",
    description: "Every response links to exact files and lines. Verify instantly, keep context persistent.",
  },
];

const EVAL_METRICS = [
  { label: "Faithfulness", value: "0.87", desc: "Answers are grounded in source code" },
  { label: "Answer Relevancy", value: "0.83", desc: "Responses address what you asked" },
  { label: "Context Precision", value: "0.79", desc: "Retrieval quality measured by RAGAS" },
  { label: "Avg Latency", value: "<3s", desc: "Time to first token from query" },
];

// ── Landing Page ──────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main style={{ background: "var(--bg)" }}>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="hero-section" style={{ minHeight: "100vh" }}>
        <div className="hero-bg" />
        <NetworkCanvas />

        <div className="hero-content w-full">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "64px",
              alignItems: "center",
            }}
            className="lg-grid"
          >
            {/* Left */}
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* Badge */}
              <div>
                <span className="pill-badge">
                  <Sparkles size={12} />
                  AI-Powered Code Intelligence
                </span>
              </div>

              {/* Headline */}
              <h1
                style={{
                  fontSize: "clamp(2.8rem, 5vw, 4.5rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.04em",
                  color: "#fff",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                }}
              >
                Understand{" "}
                <span className="text-gradient">any repo</span>{" "}
                like the engineer who wrote it.
              </h1>

              {/* Sub */}
              <p
                style={{
                  fontSize: "1.125rem",
                  lineHeight: 1.7,
                  color: "var(--text-muted)",
                  maxWidth: "520px",
                }}
              >
                RepoTalk indexes any GitHub repository and lets you ask engineering questions
                with perfectly cited, mathematically faithful answers. Less than 60 seconds
                to your first insight.
              </p>

              {/* CTAs */}
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <Link
                  href="/ingest"
                  className="btn btn-primary btn-lg"
                  style={{
                    boxShadow: "0 0 24px rgba(59, 130, 246, 0.35), 0 0 60px rgba(139, 92, 246, 0.2)",
                  }}
                >
                  Start with a Repository
                  <ArrowRight size={18} />
                </Link>
                <Link href="/pricing" className="btn btn-secondary btn-lg">
                  <Play size={16} />
                  View Pricing
                </Link>
              </div>

              {/* Trust line */}
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill="#F59E0B"
                      style={{ color: "#F59E0B" }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: "0.82rem", color: "var(--text-faint)", margin: 0 }}>
                  Trusted by engineers at top tech companies
                </p>
              </div>
            </div>

            {/* Right — Terminal Preview */}
            <div className="terminal-card">
              {/* Header */}
              <div className="terminal-header">
                <span className="terminal-dot" style={{ background: "#ef4444" }} />
                <span className="terminal-dot" style={{ background: "#f59e0b" }} />
                <span className="terminal-dot" style={{ background: "#22c55e" }} />
                <span
                  style={{
                    marginLeft: "12px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    color: "var(--text-faint)",
                  }}
                >
                  repotalk session — facebook/react
                </span>
              </div>

              {/* Body */}
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* User message */}
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: "12px 12px 4px 12px",
                    background: "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(99,102,241,0.85))",
                    fontSize: "0.875rem",
                    color: "#fff",
                    alignSelf: "flex-end",
                    maxWidth: "80%",
                  }}
                >
                  Where is authentication validated in this project?
                </div>

                {/* AI response */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "4px 12px 12px 12px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    fontSize: "0.875rem",
                    color: "var(--text-muted)",
                    lineHeight: 1.65,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--primary-dim)",
                      fontWeight: 600,
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    RepoTalk AI
                  </div>
                  <p style={{ margin: "0 0 12px", color: "var(--text-muted)" }}>
                    Authentication is enforced in{" "}
                    <code
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8em",
                        background: "rgba(59,130,246,0.1)",
                        color: "var(--primary-dim)",
                        padding: "1px 5px",
                        borderRadius: "4px",
                      }}
                    >
                      middleware/auth.ts
                    </code>{" "}
                    via Clerk JWT verification and user context injection into every request.
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <span className="citation-chip">
                      <FileCode2 size={11} />
                      middleware/auth.ts:32–61
                    </span>
                    <span className="citation-chip">
                      <FileCode2 size={11} />
                      lib/jwt.ts:12–28
                    </span>
                  </div>

                  <div style={{ marginTop: "10px" }}>
                    <span className="eval-badge eval-badge--high">
                      <span className="eval-dot" />
                      Eval: HIGH
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ─────────────────────────────────────────────────── */}
      <section className="stats-bar" style={{ padding: "40px 24px" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "32px",
            textAlign: "center",
          }}
        >
          {STATS.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "16px 8px",
                borderRight: i < STATS.length - 1 ? "1px solid var(--border)" : undefined,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "2rem",
                  color: i === STATS.length - 1 ? "var(--primary)" : "#fff",
                  letterSpacing: "-0.03em",
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-faint)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  marginTop: "4px",
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ─────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div className="section-label" style={{ marginBottom: "12px" }}>Features</div>
            <h2 style={{ color: "#fff", marginBottom: "16px" }}>
              Everything engineers actually need
            </h2>
            <p style={{ maxWidth: "500px", margin: "0 auto", fontSize: "1.05rem" }}>
              Built on a production RAG pipeline with AST-aware chunking, hybrid search, and real evaluation metrics.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "20px",
            }}
          >
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="feature-card">
                  <div
                    className="feature-icon"
                    style={{
                      background: `${f.color}18`,
                      border: `1px solid ${f.color}25`,
                    }}
                  >
                    <Icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3 style={{ fontSize: "1rem", marginBottom: "8px", color: "#fff" }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: "var(--text-faint)" }}>
                    {f.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section
        style={{
          padding: "80px 24px",
          background: "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.03) 50%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <div className="section-label" style={{ marginBottom: "12px" }}>How It Works</div>
            <h2 style={{ color: "#fff", marginBottom: "16px" }}>
              From URL to answer in seconds
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr auto 1fr",
              gap: "16px",
              alignItems: "start",
            }}
          >
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <React.Fragment key={step.number}>
                  <div
                    className="glass-card"
                    style={{ padding: "28px", textAlign: "center" }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                        boxShadow: "0 0 20px rgba(59,130,246,0.3)",
                      }}
                    >
                      <Icon size={22} color="#fff" />
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "var(--primary)",
                        letterSpacing: "0.1em",
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-label)",
                      }}
                    >
                      STEP {step.number}
                    </div>
                    <h3 style={{ fontSize: "1rem", marginBottom: "8px", color: "#fff" }}>
                      {step.title}
                    </h3>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-faint)", lineHeight: 1.6 }}>
                      {step.description}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        paddingTop: "40px",
                        color: "var(--primary)",
                        opacity: 0.5,
                      }}
                    >
                      <ChevronRight size={28} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Eval Results ──────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <div className="section-label" style={{ marginBottom: "12px" }}>Evaluation</div>
            <h2 style={{ color: "#fff", marginBottom: "16px" }}>
              Measured, not promised
            </h2>
            <p style={{ maxWidth: "480px", margin: "0 auto" }}>
              Every answer is automatically scored using RAGAS — an open evaluation framework.
              Run on facebook/react with 500+ Q&A pairs.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
            }}
          >
            {EVAL_METRICS.map((m) => (
              <div
                key={m.label}
                className="glass-card"
                style={{ padding: "24px", textAlign: "center" }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "2.2rem",
                    fontWeight: 700,
                    color: "var(--primary)",
                    letterSpacing: "-0.03em",
                    marginBottom: "8px",
                  }}
                >
                  {m.value}
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    color: "#fff",
                    marginBottom: "6px",
                  }}
                >
                  {m.label}
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", margin: 0 }}>
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px 120px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <div
            style={{
              padding: "60px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))",
              border: "1px solid rgba(59,130,246,0.2)",
              textAlign: "center",
              boxShadow: "0 0 60px rgba(59,130,246,0.08)",
            }}
          >
            <div style={{ marginBottom: "12px" }}>
              <span
                className="pill-badge"
                style={{
                  background: "rgba(34,197,94,0.1)",
                  borderColor: "rgba(34,197,94,0.3)",
                  color: "#4ade80",
                }}
              >
                <ShieldCheck size={12} />
                Free to start · No credit card needed
              </span>
            </div>
            <h2
              style={{
                color: "#fff",
                marginBottom: "16px",
                fontSize: "2.2rem",
              }}
            >
              Ready to ship faster?
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "1.05rem",
                maxWidth: "440px",
                margin: "0 auto 32px",
              }}
            >
              Connect a repository, ask focused engineering questions, and get verifiable
              answers with session continuity.
            </p>
            <Link href="/ingest" className="btn btn-primary btn-lg">
              Connect your first repo
              <GitBranch size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "40px 24px",
          background: "var(--surface-2)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "var(--glow-primary)",
              }}
            >
              <MessageSquare size={16} color="#fff" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  color: "#fff",
                  fontSize: "0.95rem",
                }}
              >
                RepoTalk
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-faint)" }}>
                AI Code Intelligence
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {["Features", "Pricing", "Docs", "GitHub", "Terms", "Privacy"].map((l) => (
              <Link
                key={l}
                href={l === "GitHub" ? "https://github.com" : `/${l.toLowerCase()}`}
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-faint)",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color = "var(--primary)")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color = "var(--text-faint)")
                }
              >
                {l}
              </Link>
            ))}
          </div>

          <p style={{ fontSize: "0.78rem", color: "var(--text-faint)", margin: 0 }}>
            © 2024 RepoTalk AI · MIT License
          </p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 1024px) {
          .lg-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .stats-bar > div {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .feature-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </main>
  );
}
