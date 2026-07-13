"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Loader2, MessageSquare, AlertTriangle } from "lucide-react";
import { createApiClient } from "@/lib/api";
import type { Repo, RepoPersona } from "@/lib/types";
import RepoIdentityCard, { RepoIdentityCardSkeleton } from "@/components/RepoIdentityCard";

export default function PersonaPage({ params }: { params: { repoId: string } }) {
  const { repoId } = params;
  const { getToken, isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const [repo, setRepo] = useState<Repo | null>(null);
  const [persona, setPersona] = useState<RepoPersona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const api = useMemo(() => createApiClient(getToken), [getToken]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
    if (isLoaded && isSignedIn) init();
  }, [isLoaded, isSignedIn]); // eslint-disable-line

  const init = async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, p] = await Promise.all([
        api.repos.get(repoId),
        api.repos.getPersona(repoId).catch(() => null)
      ]);
      setRepo(r);
      setPersona(p);
      if (!p) {
        // Might still be generating. Try to fetch again after a delay.
        setTimeout(async () => {
          try {
            const p2 = await api.repos.getPersona(repoId);
            setPersona(p2);
          } catch { /* ignore */ }
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load repo data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const p = await api.repos.refreshPersona(repoId);
      setPersona(p);
    } catch (err: any) {
      alert(err.message || "Failed to refresh persona");
    } finally {
      setRefreshing(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="mx-auto animate-spin" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading Identity Card...</p>
        </div>
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--error-muted)" }}>
            <AlertTriangle size={24} style={{ color: "var(--error)" }} />
          </div>
          <h2 className="text-lg font-semibold">Could not load repository</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error ?? "Repo not found."}</p>
          <button onClick={() => router.push("/ingest")} className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back to Repos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 md:py-8 pb-20 max-w-4xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => router.push("/ingest")} 
          className="btn btn-ghost btn-sm -ml-2"
        >
          <ArrowLeft size={16} className="mr-1" /> Back
        </button>
        <button 
          onClick={() => router.push(`/chat/${repoId}`)} 
          className="btn btn-primary"
        >
          <MessageSquare size={16} className="mr-2" /> Start Chatting
        </button>
      </div>

      {/* ── Main Content ── */}
      {persona ? (
        <RepoIdentityCard 
          persona={persona} 
          onRegenerate={handleRefresh} 
          isRegenerating={refreshing}
          onQuestionSelect={(q) => {
            // Future enhancement: pass question to chat via URL params
            router.push(`/chat/${repoId}?q=${encodeURIComponent(q)}`);
          }}
        />
      ) : (
        <div className="mt-8">
          <RepoIdentityCardSkeleton />
          <div className="mt-4 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Identity card is still being generated...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
