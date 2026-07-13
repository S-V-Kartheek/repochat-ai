"use client";

import { useState } from "react";
import { useAuth, UserProfile } from "@clerk/nextjs";
import { User, Key, Settings as SettingsIcon, Link as LinkIcon, Save, Zap, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";

export default function SettingsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "api" | "preferences" | "integrations">("profile");
  const { theme, setTheme } = useTheme();

  if (!isLoaded) {
    return (
      <div className="page-shell" style={{ maxWidth: "1000px" }}>
        <div className="skeleton" style={{ height: "40px", width: "200px", marginBottom: "32px" }} />
        <div className="grid-3" style={{ gridTemplateColumns: "240px 1fr" }}>
          <div className="skeleton" style={{ height: "200px" }} />
          <div className="skeleton" style={{ height: "400px" }} />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="page-shell" style={{ maxWidth: "600px", textAlign: "center", paddingTop: "80px" }}>
        <SettingsIcon size={48} style={{ color: "var(--text-faint)", margin: "0 auto 20px" }} />
        <h1 style={{ color: "var(--text)", marginBottom: "12px", fontSize: "1.8rem" }}>Settings &amp; Profile</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Sign in to manage your account settings, API keys, and repository integrations.
        </p>
        <Link href="/sign-in" className="btn btn-primary" style={{ display: "inline-flex" }}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ maxWidth: "1100px" }}>
      <div className="page-header" style={{ marginBottom: "32px" }}>
        <div className="page-header__left">
          <div className="page-header__title">
            <div style={{
              width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "var(--glow-primary)",
            }}>
              <SettingsIcon size={17} color="#fff" />
            </div>
            Settings
          </div>
          <p className="page-header__subtitle">
            Manage your personal profile, API keys, and workspace preferences.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "32px", alignItems: "start" }}>
        {/* Sidebar Tabs */}
        <div className="stack-sm">
          <button
            className={`settings-tab ${activeTab === "profile" ? "settings-tab--active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <User size={16} /> Profile &amp; Account
          </button>
          <button
            className={`settings-tab ${activeTab === "api" ? "settings-tab--active" : ""}`}
            onClick={() => setActiveTab("api")}
          >
            <Key size={16} /> API Keys
          </button>
          <button
            className={`settings-tab ${activeTab === "preferences" ? "settings-tab--active" : ""}`}
            onClick={() => setActiveTab("preferences")}
          >
            <SettingsIcon size={16} /> Preferences
          </button>
          <button
            className={`settings-tab ${activeTab === "integrations" ? "settings-tab--active" : ""}`}
            onClick={() => setActiveTab("integrations")}
          >
            <LinkIcon size={16} /> Integrations
          </button>
        </div>

        {/* Main Content Area */}
        <div className="glass-card" style={{ padding: "0", overflow: "hidden", minHeight: "500px" }}>
          
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="fade-in" style={{ padding: "20px" }}>
              <UserProfile
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none border-none",
                    navbar: "hidden",
                    headerTitle: "text-white text-xl font-bold",
                    headerSubtitle: "text-gray-400",
                    profileSectionTitleText: "text-gray-300 border-b border-white/10 pb-2 mb-4",
                    profileSectionTitle: "mb-2",
                    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white border-none",
                    badge: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                  }
                }}
              />
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === "api" && (
            <div className="fade-in" style={{ padding: "32px" }}>
              <div className="row-between mb-4">
                <div>
                  <h2 style={{ color: "var(--text)", fontSize: "1.1rem", marginBottom: "4px" }}>API Keys</h2>
                  <p className="text-muted text-sm">Manage API keys for accessing RepoTalk programmatically.</p>
                </div>
                <button className="btn btn-primary btn-sm">
                  <Key size={14} /> Generate New Key
                </button>
              </div>
              <div className="divider-h" />
              
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <Key size={32} style={{ color: "var(--text-faint)", margin: "0 auto 12px" }} />
                <p className="text-muted text-sm mb-4">No API keys have been generated yet.</p>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="fade-in" style={{ padding: "32px" }}>
              <h2 style={{ color: "var(--text)", fontSize: "1.1rem", marginBottom: "4px" }}>Preferences</h2>
              <p className="text-muted text-sm mb-6">Customize your RepoTalk workspace experience.</p>
              
              <div className="stack-lg">

                {/* ── Appearance ───────────────────────────────────────── */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    {theme === "dark" ? (
                      <Moon size={16} style={{ color: "var(--primary)" }} />
                    ) : (
                      <Sun size={16} style={{ color: "var(--warning)" }} />
                    )}
                    <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text)" }}>
                      Appearance
                    </span>
                  </div>

                  {/* Mode Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", maxWidth: "440px" }}>
                    {/* Dark Mode Card */}
                    <button
                      onClick={() => setTheme("dark")}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        borderRadius: "12px",
                        border: `2px solid ${theme === "dark" ? "var(--primary)" : "var(--border)"}`,
                        background: theme === "dark"
                          ? "rgba(37, 99, 235, 0.07)"
                          : "var(--surface-2)",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        transition: "all 0.2s ease",
                        boxShadow: theme === "dark" ? "var(--glow-primary)" : "none",
                      }}
                    >
                      {/* Dark preview */}
                      <div style={{
                        borderRadius: "8px",
                        background: "#0a0f1e",
                        border: "1px solid rgba(255,255,255,0.08)",
                        padding: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}>
                        <div style={{ height: "6px", width: "60%", borderRadius: "4px", background: "rgba(59,130,246,0.6)" }} />
                        <div style={{ height: "4px", width: "90%", borderRadius: "4px", background: "rgba(255,255,255,0.1)" }} />
                        <div style={{ height: "4px", width: "75%", borderRadius: "4px", background: "rgba(255,255,255,0.07)" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Moon size={13} style={{ color: theme === "dark" ? "var(--primary)" : "var(--text-faint)" }} />
                          <span style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: theme === "dark" ? "var(--primary)" : "var(--text-muted)",
                          }}>
                            Dark
                          </span>
                        </div>
                        {theme === "dark" && (
                          <div style={{
                            width: "8px", height: "8px", borderRadius: "50%",
                            background: "var(--primary)",
                            boxShadow: "0 0 6px var(--primary)",
                          }} />
                        )}
                      </div>
                    </button>

                    {/* Light Mode Card */}
                    <button
                      onClick={() => setTheme("light")}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        borderRadius: "12px",
                        border: `2px solid ${theme === "light" ? "var(--primary)" : "var(--border)"}`,
                        background: theme === "light"
                          ? "rgba(37, 99, 235, 0.07)"
                          : "var(--surface-2)",
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        transition: "all 0.2s ease",
                        boxShadow: theme === "light" ? "var(--glow-primary)" : "none",
                      }}
                    >
                      {/* Light preview */}
                      <div style={{
                        borderRadius: "8px",
                        background: "#f4f6fb",
                        border: "1px solid rgba(0,0,0,0.08)",
                        padding: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}>
                        <div style={{ height: "6px", width: "60%", borderRadius: "4px", background: "rgba(37,99,235,0.5)" }} />
                        <div style={{ height: "4px", width: "90%", borderRadius: "4px", background: "rgba(0,0,0,0.10)" }} />
                        <div style={{ height: "4px", width: "75%", borderRadius: "4px", background: "rgba(0,0,0,0.06)" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Sun size={13} style={{ color: theme === "light" ? "var(--warning)" : "var(--text-faint)" }} />
                          <span style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: theme === "light" ? "var(--primary)" : "var(--text-muted)",
                          }}>
                            Light
                          </span>
                        </div>
                        {theme === "light" && (
                          <div style={{
                            width: "8px", height: "8px", borderRadius: "50%",
                            background: "var(--primary)",
                            boxShadow: "0 0 6px var(--primary)",
                          }} />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Toggle Switch */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginTop: "16px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    maxWidth: "440px",
                  }}>
                    <Sun size={15} style={{ color: theme === "light" ? "var(--warning)" : "var(--text-faint)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.84rem", color: "var(--text-muted)", flex: 1 }}>
                      Switch between light and dark mode
                    </span>
                    {/* Toggle pill */}
                    <button
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      aria-label="Toggle theme"
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        width: "44px",
                        height: "24px",
                        borderRadius: "999px",
                        background: theme === "light"
                          ? "var(--primary)"
                          : "var(--surface-4)",
                        border: `1px solid ${theme === "light" ? "var(--primary)" : "var(--border-strong)"}`,
                        position: "relative",
                        transition: "background 0.25s ease, border-color 0.25s ease",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: "absolute",
                        top: "2px",
                        left: theme === "light" ? "22px" : "2px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: "#fff",
                        transition: "left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      }}>
                        {theme === "light"
                          ? <Sun size={10} style={{ color: "#d97706" }} />
                          : <Moon size={10} style={{ color: "#6b7280" }} />
                        }
                      </span>
                    </button>
                    <Moon size={15} style={{ color: theme === "dark" ? "var(--primary)" : "var(--text-faint)", flexShrink: 0 }} />
                  </div>
                </div>

                <div className="divider-h" />

                {/* Default LLM Model */}
                <div className="form-group">
                  <label className="label">Default LLM Model</label>
                  <select className="input" style={{ maxWidth: "300px" }} defaultValue="groq">
                    <option value="groq">Llama 3.3 70B (Groq - Fast)</option>
                    <option value="ollama">Local Model (Ollama)</option>
                  </select>
                  <p className="text-faint text-xs mt-1">This model will be used for chat and summaries.</p>
                </div>
                
                <div className="form-group">
                  <label className="label">Email Notifications</label>
                  <div className="row">
                    <input type="checkbox" id="email-digest" defaultChecked style={{ accentColor: "var(--primary)" }} />
                    <label htmlFor="email-digest" style={{ fontSize: "0.85rem", color: "var(--text)", cursor: "pointer" }}>
                      Weekly Activity Digest
                    </label>
                  </div>
                </div>
                
                <div>
                  <button className="btn btn-primary">
                    <Save size={15} /> Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === "integrations" && (
            <div className="fade-in" style={{ padding: "32px" }}>
              <h2 style={{ color: "var(--text)", fontSize: "1.1rem", marginBottom: "4px" }}>Integrations</h2>
              <p className="text-muted text-sm mb-6">Connect external services to RepoTalk.</p>
              
              <div className="grid-2">
                <div className="card" style={{ padding: "20px" }}>
                  <div className="row mb-3">
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#333", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                    </div>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>GitHub</span>
                  </div>
                  <p className="text-sm text-muted mb-4">Connect GitHub to index private repositories and enable PR comments.</p>
                  <button className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                    Connect GitHub
                  </button>
                </div>
                
                <div className="card" style={{ padding: "20px" }}>
                  <div className="row mb-3">
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#4A154B", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.523-2.522v-2.522h2.523zM15.165 17.688a2.527 2.527 0 0 1-2.523-2.523 2.526 2.526 0 0 1 2.523-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.52H15.165z"/></svg>
                    </div>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>Slack</span>
                  </div>
                  <p className="text-sm text-muted mb-4">Query your repositories directly from Slack channels.</p>
                  <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
                    <Zap size={14} /> Upgrade to Team
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
