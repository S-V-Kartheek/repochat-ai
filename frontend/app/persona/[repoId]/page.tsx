"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { createApiClient } from "@/lib/api";
import type { PersonaResponse } from "@/lib/types";
import {
  Cpu,
  Code2,
  FolderTree,
  Users,
  BookOpen,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Layers,
} from "lucide-react";

export default function PersonaPage() {
  const { repoId } = useParams<{ repoId: string }>();
  const { getToken } = useAuth();
  const api = createApiClient(getToken);

  const [persona, setPersona] = useState<PersonaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPersona = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.persona.get(repoId);
      setPersona(data);
    } catch {
      // Not cached yet — will show generate button
      setPersona(null);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    fetchPersona();
  }, [fetchPersona]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const data = await api.persona.generate(repoId);
      setPersona(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      const data = await api.persona.regenerate(repoId);
      setPersona(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "calc(100vh - var(--navbar-h))", paddingTop: "var(--navbar-h)" }}
      >
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={18} className="animate-spin" />
          Loading persona...
        </div>
      </div>
    );
  }

  // No persona yet — show generate prompt
  if (!persona) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "calc(100vh - var(--navbar-h))", paddingTop: "var(--navbar-h)" }}
      >
        <div className="text-center max-w-md px-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "var(--accent-muted)", border: "1px solid var(--border)" }}
          >
            <Cpu size={28} style={{ color: "var(--accent)" }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>
            Generate Repo Persona
          </h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Analyze this repository to generate an identity card, architecture overview, and onboarding guide.
          </p>
          {error && (
            <div
              className="flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg"
              style={{ background: "var(--error-muted)", color: "var(--error)" }}
            >
              <AlertTriangle size={13} /> {error}
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn btn-primary btn-lg"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Cpu size={16} /> Generate Persona
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Persona loaded — show dashboard
  return (
    <div
      style={{ paddingTop: "calc(var(--navbar-h) + 24px)", minHeight: "100vh" }}
      className="max-w-5xl mx-auto px-4 md:px-6 pb-12"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
            Repo Persona
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            AI-generated identity card and onboarding guide
          </p>
        </div>
        <button onClick={handleRegenerate} disabled={generating} className="btn btn-secondary btn-sm">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Regenerate
        </button>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 text-sm mb-6 px-4 py-3 rounded-xl"
          style={{ background: "var(--error-muted)", color: "var(--error)" }}
        >
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Identity Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Dominant Language */}
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Code2 size={16} style={{ color: "var(--accent)" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Dominant Language
            </span>
          </div>
          <p className="text-lg font-bold" style={{ color: "var(--text)" }}>
            {persona.dominant_language}
          </p>
        </div>

        {/* Tech Stack */}
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={16} style={{ color: "#6d28d9" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Stack
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {persona.stack.map((lang) => (
              <span key={lang} className="badge badge-blue">{lang}</span>
            ))}
          </div>
        </div>

        {/* Frameworks */}
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <FolderTree size={16} style={{ color: "#059669" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Frameworks
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {persona.frameworks.length > 0 ? (
              persona.frameworks.map((fw) => (
                <span key={fw} className="badge badge-green">{fw}</span>
              ))
            ) : (
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>None detected</span>
            )}
          </div>
        </div>

        {/* Architecture Style */}
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={16} style={{ color: "#b45309" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Architecture
            </span>
          </div>
          <p className="text-base font-semibold capitalize" style={{ color: "var(--text)" }}>
            {persona.architecture_style}
          </p>
        </div>

        {/* Conventions */}
        <div className="card px-5 py-4 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} style={{ color: "#4f46e5" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Conventions
            </span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {persona.conventions}
          </p>
        </div>

        {/* Key Contributors */}
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} style={{ color: "#dc2626" }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              Key Roles
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {persona.key_contributors.map((c, i) => (
              <span key={i} className="badge badge-gray">{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture Overview */}
      <div className="card px-6 py-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FolderTree size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
            Architecture Overview
          </h3>
        </div>
        <pre
          className="text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap"
          style={{
            color: "var(--text)",
            background: "var(--surface-2)",
            padding: "1rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {persona.architecture_overview}
        </pre>
      </div>

      {/* Onboarding Guide */}
      <div className="card px-6 py-5">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} style={{ color: "#059669" }} />
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
            Onboarding Guide
          </h3>
        </div>
        <div
          className="prose prose-sm max-w-none text-sm leading-relaxed"
          style={{ color: "var(--text-muted)" }}
        >
          {/* Render markdown as pre-formatted text for now */}
          <pre
            className="whitespace-pre-wrap"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "0.9rem",
              lineHeight: "1.7",
              margin: 0,
              background: "transparent",
              border: "none",
              padding: 0,
              color: "var(--text)",
            }}
          >
            {persona.onboarding_guide}
          </pre>
        </div>
      </div>
    </div>
  );
}
