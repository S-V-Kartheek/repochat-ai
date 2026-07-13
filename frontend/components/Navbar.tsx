"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/nextjs";
import {
  Sparkles,
  LayoutDashboard,
  Bookmark,
  CreditCard,
  GitPullRequest,
  BarChart3,
  Settings,
} from "lucide-react";

// ── RepoTalk Custom Logo SVG ──────────────────────────────────────────────────
// A speech bubble with git branch nodes + AI circuit dots fused inside.
// Fully self-contained SVG — scales crisply at any size.
function RepoTalkLogo() {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <defs>
        {/* Main gradient — blue to purple */}
        <linearGradient id="rt-grad" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        {/* Subtle inner glow filter */}
        <filter id="rt-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Dot gradient — lighter */}
        <linearGradient id="rt-dot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>

      {/* ── Background rounded square ── */}
      <rect
        x="1" y="1" width="36" height="36"
        rx="10" ry="10"
        fill="url(#rt-grad)"
        filter="url(#rt-glow)"
      />
      {/* Subtle inner border */}
      <rect
        x="1" y="1" width="36" height="36"
        rx="10" ry="10"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />

      {/* ── Speech bubble body ── */}
      {/* Main rounded rect for bubble */}
      <rect x="6" y="5" width="22" height="17" rx="5" ry="5" fill="rgba(255,255,255,0.18)" />
      {/* Bubble tail (bottom-left triangle) */}
      <path d="M10 22 L7 28 L15 23" fill="rgba(255,255,255,0.18)" />

      {/* ── Git branch nodes inside bubble ── */}
      {/* Left node (root) */}
      <circle cx="11" cy="13.5" r="2.2" fill="url(#rt-dot)" />
      {/* Top-right node */}
      <circle cx="19" cy="9.5" r="1.8" fill="rgba(255,255,255,0.9)" />
      {/* Bottom-right node */}
      <circle cx="19" cy="17.5" r="1.8" fill="rgba(255,255,255,0.9)" />
      {/* Far-right merge node */}
      <circle cx="26" cy="13.5" r="2" fill="url(#rt-dot)" />

      {/* ── Branch lines ── */}
      {/* Root → top-right */}
      <line x1="13.2" y1="12.2" x2="17.3" y2="10.2" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" />
      {/* Root → bottom-right */}
      <line x1="13.2" y1="14.8" x2="17.3" y2="16.8" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" />
      {/* Top-right → merge */}
      <line x1="20.8" y1="10.5" x2="24.1" y2="12.3" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" />
      {/* Bottom-right → merge */}
      <line x1="20.8" y1="16.5" x2="24.1" y2="14.7" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" />

      {/* ── AI spark dots (bottom-right corner of card) ── */}
      <circle cx="28" cy="28" r="3" fill="rgba(255,255,255,0.22)" />
      <circle cx="28" cy="28" r="1.5" fill="rgba(255,255,255,0.85)" />
      <circle cx="33" cy="25" r="1.5" fill="rgba(255,255,255,0.5)" />
      <circle cx="33" cy="31" r="1.5" fill="rgba(255,255,255,0.5)" />
      {/* Spark lines */}
      <line x1="29.5" y1="26.5" x2="31.8" y2="25.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
      <line x1="29.5" y1="29.5" x2="31.8" y2="30.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/ingest",    label: "Repos",       icon: LayoutDashboard },
  { href: "/bookmarks", label: "Bookmarks",   icon: Bookmark },
  { href: "/pr",        label: "PR Review",   icon: GitPullRequest },
  { href: "/eval",      label: "Evaluations", icon: BarChart3 },
  { href: "/pricing",   label: "Pricing",     icon: CreditCard },
  { href: "/settings",  label: "Settings",    icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="navbar"
      style={{
        height: "var(--navbar-h)",
      }}
      aria-label="Main navigation"
    >
      <div
        style={{
          maxWidth: "1300px",
          margin: "0 auto",
          height: "100%",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* ── Brand ─────────────────────────────────────────────────── */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
            textDecoration: "none",
          }}
          aria-label="RepoTalk home"
        >
          {/* ── Custom SVG Logo ───────────────────────────────── */}
          <RepoTalkLogo />

          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: "1rem",
                color: "#fff",
                letterSpacing: "-0.03em",
                background: "linear-gradient(90deg, #fff 0%, #94b4ff 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              RepoTalk
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                color: "var(--text-faint)",
                fontWeight: 500,
                letterSpacing: "0.04em",
                marginTop: "1px",
              }}
            >
              AI Code Intelligence
            </span>
          </div>
        </Link>

        {/* ── Center Nav (signed in only) ─────────────────────────── */}
        <SignedIn>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border)",
            }}
            className="hidden-mobile"
          >
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 0.2s",
                    color: active ? "var(--primary)" : "var(--text-faint)",
                    background: active ? "rgba(59,130,246,0.1)" : "transparent",
                    border: active
                      ? "1px solid rgba(59,130,246,0.2)"
                      : "1px solid transparent",
                    boxShadow: active ? "0 0 12px rgba(59,130,246,0.12)" : "none",
                  }}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </div>
        </SignedIn>

        {/* ── Right: Auth ────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* AI badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "0.72rem",
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: "999px",
              background: "rgba(59,130,246,0.08)",
              border: "1px solid rgba(59,130,246,0.2)",
              color: "var(--primary-dim)",
              letterSpacing: "0.03em",
              whiteSpace: "nowrap",
            }}
            className="hidden-sm"
          >
            <Sparkles size={11} style={{ color: "var(--primary)" }} />
            Llama 3.3 70B
          </div>

          <SignedOut>
            <SignInButton mode="modal">
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Sign In
              </button>
            </SignInButton>
            <Link href="/sign-up" className="btn btn-primary btn-sm">
              Start Free
            </Link>
          </SignedOut>

          <SignedIn>
            <Link href="/ingest" className="btn btn-primary btn-sm hidden-md">
              <LayoutDashboard size={14} />
              Repos
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .hidden-sm { display: none !important; }
        }
        @media (max-width: 640px) {
          .hidden-md { display: none !important; }
        }
      `}</style>
    </nav>
  );
}
