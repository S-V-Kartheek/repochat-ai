"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, AlertTriangle, User, Database, Activity, MessageSquare, Bookmark, Clock } from "lucide-react";
import { createApiClient } from "@/lib/api";
import type { ProfileResponse, ProfileUsageResponse } from "@/lib/types";

export default function SettingsPage() {
  const { getToken } = useAuth();
  const api = createApiClient(getToken);

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [usage, setUsage] = useState<ProfileUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([api.profile.get(), api.profile.usage()])
      .then(([p, u]) => {
        if (cancelled) return;
        setProfile(p);
        setUsage(u);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load profile.";
        setError(message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = () => {
    // Simple full reload keeps the UX consistent and avoids partial re-fetch edge cases.
    window.location.reload();
  };

  return (
    <div style={{ paddingTop: "calc(var(--navbar-h) + 24px)", minHeight: "100vh" }} className="max-w-5xl mx-auto px-4 md:px-6 pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Profile and usage stats
        </p>
      </div>

      {loading ? (
        <div className="card px-6 py-10 text-center" style={{ background: "var(--surface-2)" }}>
          <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Loading your profile...
          </p>
        </div>
      ) : error ? (
        <div className="card px-6 py-6" style={{ background: "var(--error-muted)", color: "var(--error)", borderColor: "rgba(220,38,38,0.25)" }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">Could not load settings</span>
          </div>
          <p className="text-sm" style={{ color: "var(--text)" }}>
            {error}
          </p>
          <div className="mt-4">
            <button className="btn btn-secondary btn-sm" onClick={reload}>
              Retry
            </button>
          </div>
        </div>
      ) : profile && usage ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Account summary */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} style={{ color: "var(--accent)" }} />
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  Account Summary
                </h2>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Email</p>
                  <p className="text-sm" style={{ color: "var(--text)" }}>{profile.user.email ?? "Unknown"}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>User ID</p>
                  <p className="text-sm" style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>{profile.user.id}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>Joined</p>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text)" }}>
                    {profile.user.created_at ? new Date(profile.user.created_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Usage stats */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} style={{ color: "var(--accent)" }} />
                <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  Usage Stats
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Repos connected</p>
                  <div className="flex items-center gap-2">
                    <Database size={14} style={{ color: "var(--accent)" }} />
                    <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{usage.repos_connected}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Queries (user turns)</p>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} style={{ color: "var(--accent)" }} />
                    <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{usage.query_count}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Sessions</p>
                  <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{profile.sessions_count}</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Bookmarked</p>
                  <div className="flex items-center gap-2">
                    <Bookmark size={14} style={{ color: "var(--accent)" }} />
                    <p className="text-lg font-bold" style={{ color: "var(--text)" }}>{usage.bookmarked_count}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Rate limit (20 req/min)</p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm" style={{ color: "var(--text)" }}>
                      Remaining: <span style={{ fontFamily: "var(--font-mono)" }}>{usage.rate_limit.remaining}</span>
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Resets in ~{usage.rate_limit.reset_seconds}s
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Reset at</p>
                    <p className="text-sm" style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>
                      {new Date(usage.rate_limit.reset_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={16} style={{ color: "var(--accent)" }} />
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                Recent Activity
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Last message</p>
                <p className="text-sm" style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>
                  {profile.recent_activity.last_message_at
                    ? new Date(profile.recent_activity.last_message_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Last session update</p>
                <p className="text-sm" style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>
                  {profile.recent_activity.last_session_at
                    ? new Date(profile.recent_activity.last_session_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Last repo update</p>
                <p className="text-sm" style={{ color: "var(--text)", fontFamily: "var(--font-mono)" }}>
                  {profile.recent_activity.last_repo_update_at
                    ? new Date(profile.recent_activity.last_repo_update_at).toLocaleString()
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card px-6 py-6" style={{ background: "var(--surface-2)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No profile data available yet.
          </p>
        </div>
      )}
    </div>
  );
}
