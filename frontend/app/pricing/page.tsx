"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Check, Zap, Shield, Brain, GitBranch,
  MessageSquare, Loader2, Star, HelpCircle,
} from "lucide-react";
import { createApiClient } from "@/lib/api";

// ── Plans ─────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for exploring RepoTalk with personal projects.",
    cta: "Get Started Free",
    highlight: false,
    features: [
      "2 repositories",
      "50 queries / month",
      "Chat with file:line citations",
      "Session history (7 days)",
      "Community support",
    ],
    locked: [
      "Repo Persona Intelligence",
      "PR Review Assistant",
      "Priority model routing",
      "Team workspaces",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$9",
    period: "/ month",
    description: "For individual engineers who need unlimited codebase intelligence.",
    cta: "Start Pro",
    highlight: true,
    badge: "Most Popular",
    features: [
      "Unlimited repositories",
      "Unlimited queries",
      "Repo Persona Intelligence",
      "Suggested starter questions",
      "PR Review Assistant",
      "Session history (90 days)",
      "Bookmark & share answers",
      "Priority model routing",
      "Email support",
    ],
    locked: ["Team workspaces", "Shared repo library"],
  },
  {
    id: "team" as const,
    name: "Team",
    price: "$29",
    period: "/ month",
    description: "For engineering teams that need shared context and collaboration.",
    cta: "Start Team Trial",
    highlight: false,
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Shared repository library",
      "Team session sharing",
      "Role-based access (Owner / Viewer)",
      "Shared bookmarks",
      "Usage analytics dashboard",
      "Priority support",
      "SSO / SAML (coming soon)",
    ],
    locked: [],
  },
];

const FEATURES = [
  { icon: Brain, title: "Repo Persona Engine", description: "Auto-generates an identity card, architecture overview, and 5 contextual starter questions for every repo you index." },
  { icon: MessageSquare, title: "Cited Answers", description: "Every response links to the exact file and line range. No hallucinations — only code-grounded answers." },
  { icon: GitBranch, title: "PR Review Assistant", description: "Paste a GitHub PR URL and get risk assessment, changed function context, and suggested test cases." },
  { icon: Shield, title: "Built for Privacy", description: "Your code never trains our models. Repos are indexed ephemerally — only vector embeddings are stored." },
];

const FAQ = [
  { q: "Can I switch plans?", a: "Yes. Upgrade or downgrade at any time. Prorated credits apply automatically." },
  { q: "Is my code stored anywhere?", a: "We clone repos temporarily for indexing, then delete the local copy. Only vector embeddings of code chunks are stored — never raw source code." },
  { q: "What LLMs power RepoTalk?", a: "Llama 3.3 70B via Groq for ultra-low latency. GPT-4o and Claude model selection coming for Pro users." },
  { q: "Do you support private repositories?", a: "Public repos work today. Private repo support via GitHub OAuth is on our Q3 roadmap." },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const api = createApiClient(getToken);

  const handlePlanSelect = async (planId: "free" | "pro" | "team") => {
    if (planId === "free") { router.push(isSignedIn ? "/ingest" : "/sign-up"); return; }
    if (!isSignedIn) { router.push("/sign-in"); return; }
    setLoadingPlan(planId);
    setError(null);
    try {
      const { url } = await api.billing.checkout(planId);
      if (url) window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div style={{ paddingBottom: "80px" }}>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section style={{ textAlign: "center", padding: "72px 24px 48px", maxWidth: "860px", margin: "0 auto" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "7px",
          padding: "5px 14px", borderRadius: "999px", marginBottom: "24px",
          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
          fontSize: "0.78rem", fontWeight: 600, color: "var(--primary)",
        }}>
          <Star size={12} fill="currentColor" /> Simple, transparent pricing
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", color: "#fff", lineHeight: 1.15, letterSpacing: "-0.04em", marginBottom: "16px" }}>
          Choose the plan that fits<br />your workflow
        </h1>
        <p style={{ fontSize: "1.05rem", color: "var(--text-muted)", maxWidth: "520px", margin: "0 auto" }}>
          Start free and upgrade when you need more power. No hidden fees, no vendor lock-in. Cancel anytime.
        </p>
      </section>

      {/* Error */}
      {error && (
        <div style={{
          maxWidth: "480px", margin: "0 auto 24px",
          padding: "13px 18px", borderRadius: "10px",
          background: "var(--error-muted)", border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--error)", fontSize: "0.875rem", textAlign: "center",
        }}>
          {error}
        </div>
      )}

      {/* ── Plan Cards ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: "1120px", margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          alignItems: "stretch",
        }}>
          {PLANS.map((plan) => {
            const hl = plan.highlight;
            return (
              <div
                key={plan.id}
                style={{
                  padding: "28px",
                  borderRadius: "16px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  background: hl
                    ? "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(139,92,246,0.06) 100%)"
                    : "var(--surface-2)",
                  border: hl ? "1px solid rgba(59,130,246,0.35)" : "1px solid var(--border)",
                  boxShadow: hl
                    ? "0 0 40px rgba(59,130,246,0.12), 0 20px 60px rgba(0,0,0,0.4)"
                    : "var(--shadow-sm)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                {/* Popular badge */}
                {plan.badge && (
                  <div style={{
                    position: "absolute", top: "-13px", left: "50%", transform: "translateX(-50%)",
                    padding: "4px 16px", borderRadius: "999px",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                    fontSize: "0.72rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap",
                    boxShadow: "0 0 20px rgba(59,130,246,0.4)",
                  }}>
                    {plan.badge}
                  </div>
                )}

                {/* Top accent line */}
                {hl && (
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                    borderRadius: "16px 16px 0 0",
                    background: "linear-gradient(90deg, var(--primary), var(--secondary))",
                  }} />
                )}

                {/* Plan name */}
                <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: hl ? "var(--primary)" : "var(--text-faint)", marginBottom: "10px" }}>
                  {plan.name}
                </p>

                {/* Price */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "2.8rem", fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-faint)", paddingBottom: "6px" }}>
                    {plan.period}
                  </span>
                </div>

                <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", marginBottom: "22px", lineHeight: 1.6 }}>
                  {plan.description}
                </p>

                {/* CTA */}
                <button
                  onClick={() => handlePlanSelect(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className="btn"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginBottom: "22px",
                    ...(hl ? {
                      background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                      color: "#fff",
                      border: "none",
                      boxShadow: "0 0 20px rgba(59,130,246,0.3)",
                    } : {
                      background: "var(--surface-3)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                    }),
                  }}
                >
                  {loadingPlan === plan.id ? <Loader2 size={16} className="animate-spin" /> : plan.cta}
                </button>

                {/* Divider */}
                <div style={{ height: "1px", background: "var(--border)", marginBottom: "18px" }} />

                {/* Features */}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.84rem" }}>
                      <Check size={14} style={{ color: hl ? "var(--primary)" : "var(--success)", flexShrink: 0, marginTop: "2px" }} />
                      <span style={{ color: "var(--text-muted)" }}>{f}</span>
                    </li>
                  ))}
                  {plan.locked.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.84rem", opacity: 0.35 }}>
                      <span style={{ width: "14px", textAlign: "center", flexShrink: 0, marginTop: "2px", color: "var(--text-faint)" }}>—</span>
                      <span style={{ color: "var(--text-faint)" }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Mobile stacking */}
        <style>{`
          @media (max-width: 860px) {
            .pricing-grid { grid-template-columns: 1fr !important; max-width: 460px; margin: 0 auto; }
          }
        `}</style>
      </section>

      {/* ── Feature Highlights ─────────────────────────────────────── */}
      <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div className="section-label" style={{ marginBottom: "10px" }}>Why RepoTalk</div>
          <h2 style={{ color: "#fff", marginBottom: "12px" }}>
            Everything you need to understand any codebase
          </h2>
          <p style={{ maxWidth: "500px", margin: "0 auto", fontSize: "1rem" }}>
            RAG retrieval + AST-aware chunking + LLM reasoning = answers that are grounded, cited, and trustworthy.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="glass-card" style={{ padding: "24px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "10px", marginBottom: "16px",
                  background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={18} style={{ color: "var(--primary)" }} />
                </div>
                <h3 style={{ fontSize: "0.95rem", color: "#fff", marginBottom: "8px" }}>{f.title}</h3>
                <p style={{ fontSize: "0.84rem", color: "var(--text-faint)", lineHeight: 1.65 }}>{f.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: "740px", margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px" }}>
          <HelpCircle size={20} style={{ color: "var(--primary)" }} />
          <h2 style={{ color: "#fff", margin: 0 }}>Common questions</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {FAQ.map((item) => (
            <div
              key={item.q}
              style={{
                borderRadius: "12px", overflow: "hidden",
                border: openFaq === item.q ? "1px solid rgba(59,130,246,0.25)" : "1px solid var(--border)",
                background: "var(--surface-2)",
                transition: "border-color 0.2s",
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === item.q ? null : item.q)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "16px 20px",
                  background: "none", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
                  fontSize: "0.9rem", fontWeight: 600, color: "#fff",
                }}
              >
                <span>{item.q}</span>
                <span style={{
                  fontSize: "1.2rem", color: "var(--primary)", flexShrink: 0, lineHeight: 1,
                  transform: openFaq === item.q ? "rotate(45deg)" : "rotate(0)",
                  transition: "transform 0.2s",
                }}>+</span>
              </button>
              {openFaq === item.q && (
                <div style={{ padding: "0 20px 16px", fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
