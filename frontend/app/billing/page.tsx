"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  CreditCard, CheckCircle, Calendar, Zap,
  ExternalLink, Loader2, AlertTriangle, ArrowRight,
  TrendingUp, ServerOff,
} from "lucide-react";
import Link from "next/link";
import { createApiClient } from "@/lib/api";
import type { BillingStatus } from "@/lib/types";

// ── Plan config ───────────────────────────────────────────────────────────────

const PLAN_META: Record<string, { label: string; color: string; badge: string }> = {
  free:  { label: "Free",  color: "var(--text-faint)",  badge: "badge-gray" },
  pro:   { label: "Pro",   color: "var(--primary)",     badge: "badge-blue" },
  team:  { label: "Team",  color: "var(--secondary)",   badge: "badge-purple" },
};

const PRO_FEATURES = [
  "Unlimited repositories & queries",
  "Repo Persona Intelligence (identity card + starter questions)",
  "PR Review Assistant with risk assessment",
  "Priority model routing (lower latency)",
  "90-day session history & bookmarks",
];

// ── Skeleton ──────────────────────────────────────────────────────────────────

function BillingPageSkeleton() {
  return (
    <div className="page-shell" style={{ maxWidth: "700px" }}>
      <div className="skeleton" style={{ height: "28px", width: "180px", borderRadius: "8px", marginBottom: "8px" }} />
      <div className="skeleton" style={{ height: "16px", width: "300px", borderRadius: "6px", marginBottom: "32px" }} />
      <div className="skeleton" style={{ height: "180px", borderRadius: "14px", marginBottom: "16px" }} />
      <div className="skeleton" style={{ height: "140px", borderRadius: "14px" }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = createApiClient(getToken);

  const isOffline = (msg: string) =>
    msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network");

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
    if (isLoaded && isSignedIn) fetchBilling();
  }, [isLoaded, isSignedIn]); // eslint-disable-line

  const fetchBilling = async () => {
    setLoading(true);
    setError(null);
    try {
      const b = await api.billing.status();
      setBilling(b);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load billing info");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPortal = async () => {
    setLoadingPortal(true);
    try {
      const { url } = await api.billing.portal();
      if (url) window.location.href = url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setLoadingPortal(false);
    }
  };

  if (!isLoaded || loading) return <BillingPageSkeleton />;

  const planMeta = PLAN_META[billing?.plan ?? "free"] ?? PLAN_META.free;
  const hasPaidPlan = billing?.plan && billing.plan !== "free";

  return (
    <div className="page-shell" style={{ maxWidth: "700px" }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-header__left">
          <div className="page-header__title">
            <div style={{
              width: "36px", height: "36px", borderRadius: "9px",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--glow-primary)", flexShrink: 0,
            }}>
              <CreditCard size={17} color="#fff" />
            </div>
            Billing &amp; Plan
          </div>
          <p className="page-header__subtitle">
            Manage your subscription, view usage, and update payment details.
          </p>
        </div>
      </div>

      {/* ── Backend offline error ─────────────────────────────────── */}
      {error && isOffline(error) && (
        <div style={{
          padding: "20px 24px", borderRadius: "14px", marginBottom: "20px",
          background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)",
          display: "flex", alignItems: "flex-start", gap: "14px",
        }}>
          <ServerOff size={20} style={{ color: "var(--warning)", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p style={{ fontWeight: 600, color: "#fff", marginBottom: "4px" }}>API server not running</p>
            <p style={{ fontSize: "0.84rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
              Start the gateway server first, then reload.
            </p>
            <button onClick={fetchBilling} className="btn btn-secondary btn-sm">
              <Loader2 size={13} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Generic error ─────────────────────────────────────────── */}
      {error && !isOffline(error) && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "13px 16px", borderRadius: "10px", marginBottom: "20px",
          background: "var(--error-muted)", border: "1px solid rgba(239,68,68,0.2)",
          color: "var(--error)", fontSize: "0.875rem",
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={fetchBilling} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", fontWeight: 700, fontSize: "0.8rem", textDecoration: "underline" }}>Retry</button>
        </div>
      )}

      {/* ── Current plan card ─────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: "28px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-faint)", marginBottom: "8px" }}>
              Current Plan
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span className={`badge ${planMeta.badge}`} style={{ fontSize: "0.82rem", padding: "4px 14px" }}>
                {planMeta.label}
              </span>
              {billing?.subscription?.status === "active" && (
                <span className="badge badge-green"><CheckCircle size={10} /> Active</span>
              )}
              {billing?.subscription?.cancelAtPeriodEnd && (
                <span className="badge badge-amber">Cancels at period end</span>
              )}
            </div>
          </div>
          <div style={{
            width: "44px", height: "44px", borderRadius: "11px", flexShrink: 0,
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <CreditCard size={19} style={{ color: "var(--primary)" }} />
          </div>
        </div>

        {/* Subscription details grid */}
        {billing?.subscription && (
          <div className="grid-2" style={{ marginBottom: "20px" }}>
            <div style={{ padding: "14px", borderRadius: "10px", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <Calendar size={12} style={{ color: "var(--text-faint)" }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {billing.subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"}
                </span>
              </div>
              <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff", margin: 0 }}>
                {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
              </p>
            </div>
            <div style={{ padding: "14px", borderRadius: "10px", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                <Zap size={12} style={{ color: "var(--text-faint)" }} />
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Status</span>
              </div>
              <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff", margin: 0, textTransform: "capitalize" }}>
                {billing.subscription.status}
              </p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {hasPaidPlan ? (
            <button onClick={handleOpenPortal} disabled={loadingPortal} className="btn btn-primary">
              {loadingPortal ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
              Manage Billing
            </button>
          ) : (
            <button onClick={() => router.push("/pricing")} className="btn btn-primary">
              <Zap size={15} />
              Upgrade to Pro
              <ArrowRight size={15} />
            </button>
          )}
          <button onClick={fetchBilling} className="btn btn-secondary">
            <Loader2 size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Free plan upsell ─────────────────────────────────────── */}
      {!hasPaidPlan && (
        <div style={{
          padding: "24px 28px", borderRadius: "14px",
          background: "linear-gradient(135deg, rgba(59,130,246,0.07) 0%, rgba(139,92,246,0.07) 100%)",
          border: "1px solid rgba(59,130,246,0.25)",
          boxShadow: "0 0 40px rgba(59,130,246,0.06)",
          position: "relative", overflow: "hidden",
        }}>
          {/* Gradient accent bar */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: "linear-gradient(90deg, var(--primary), var(--secondary))",
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <TrendingUp size={18} style={{ color: "var(--primary)" }} />
            <h3 style={{ color: "#fff", margin: 0 }}>Unlock Pro features</h3>
            <span className="badge badge-blue" style={{ marginLeft: "auto" }}>$9 / month</span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {PRO_FEATURES.map((f) => (
              <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.875rem" }}>
                <CheckCircle size={15} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "1px" }} />
                <span style={{ color: "var(--text-muted)" }}>{f}</span>
              </li>
            ))}
          </ul>
          <Link href="/pricing" className="btn btn-primary">
            View Plans <ArrowRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
