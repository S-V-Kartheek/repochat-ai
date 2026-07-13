/** Skeleton loading for the Chat page — sidebar + message list layout */
export default function Loading() {
  return (
    <>
      {/* Top progress bar */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, height: "2px", zIndex: 9999,
        background: "linear-gradient(90deg, var(--primary), var(--secondary), var(--tertiary))",
        backgroundSize: "200% 100%",
        animation: "progress-slide 1.4s ease-in-out infinite",
      }} />

      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* ── Left Sidebar skeleton ───────── */}
        <aside style={{
          width: "260px",
          flexShrink: 0,
          height: "100%",
          background: "var(--surface-2)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 14px",
          gap: "12px",
          overflow: "hidden",
        }}>
          {/* Back link */}
          <div className="skeleton-block" style={{ width: "120px", height: "13px", borderRadius: "5px" }} />

          {/* Repo header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0 12px", borderBottom: "1px solid var(--border)" }}>
            <div className="skeleton-block" style={{ width: "34px", height: "34px", borderRadius: "9px", flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "7px" }}>
              <div className="skeleton-block" style={{ width: "70%", height: "15px", borderRadius: "5px" }} />
              <div className="skeleton-block" style={{ width: "50%", height: "11px", borderRadius: "4px" }} />
            </div>
          </div>

          {/* New chat button */}
          <div className="skeleton-block" style={{ width: "100%", height: "38px", borderRadius: "9px" }} />

          {/* Session label */}
          <div className="skeleton-block" style={{ width: "80px", height: "11px", borderRadius: "4px", marginTop: "4px" }} />

          {/* Session items */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 8px", borderRadius: "8px" }}>
              <div className="skeleton-block" style={{ width: "13px", height: "13px", borderRadius: "3px", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="skeleton-block" style={{ width: `${50 + i * 8}%`, height: "13px", borderRadius: "5px" }} />
                <div className="skeleton-block" style={{ width: "40%", height: "10px", borderRadius: "4px" }} />
              </div>
            </div>
          ))}
        </aside>

        {/* ── Main chat area skeleton ──────── */}
        <main style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          background: "var(--surface)",
        }}>
          {/* Messages area */}
          <div style={{ flex: 1, overflowY: "hidden", padding: "32px 24px 16px" }}>
            <div style={{ maxWidth: "820px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Assistant message skeleton */}
              <MessageSkeleton role="assistant" delay={0} lines={4} />
              {/* User message skeleton */}
              <MessageSkeleton role="user" delay={0.1} lines={1} />
              {/* Assistant message skeleton */}
              <MessageSkeleton role="assistant" delay={0.2} lines={3} />
            </div>
          </div>

          {/* Input bar skeleton */}
          <div style={{
            flexShrink: 0,
            borderTop: "1px solid var(--border)",
            background: "var(--surface-2)",
            padding: "16px 24px 20px",
          }}>
            <div style={{ maxWidth: "820px", margin: "0 auto" }}>
              <div className="skeleton-block" style={{ width: "100%", height: "52px", borderRadius: "16px" }} />
              <div style={{ display: "flex", justifyContent: "center", marginTop: "8px" }}>
                <div className="skeleton-block" style={{ width: "200px", height: "11px", borderRadius: "4px" }} />
              </div>
            </div>
          </div>
        </main>
      </div>

      <SkeletonStyles />
    </>
  );
}

function MessageSkeleton({ role, delay, lines }: { role: "user" | "assistant"; delay: number; lines: number }) {
  const isUser = role === "user";
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      flexDirection: isUser ? "row-reverse" : "row",
      animationDelay: `${delay}s`,
    }}>
      {/* Avatar */}
      <div className="skeleton-block" style={{ width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0 }} />

      {/* Bubble */}
      <div style={{
        maxWidth: "70%",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: isUser ? "flex-end" : "flex-start",
      }}>
        <div className="skeleton-block" style={{ width: "40px", height: "10px", borderRadius: "4px" }} />
        <div style={{
          padding: "14px 18px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minWidth: isUser ? "180px" : "280px",
        }}>
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className="skeleton-block"
              style={{
                width: i === lines - 1 ? "65%" : "100%",
                height: "13px",
                borderRadius: "5px",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SkeletonStyles() {
  return (
    <style>{`
      @keyframes progress-slide {
        0%   { background-position: 100% 0; }
        100% { background-position: -100% 0; }
      }
      @keyframes skeleton-shimmer {
        0%   { background-position: -600px 0; }
        100% { background-position: 600px 0; }
      }
      .skeleton-block {
        background: linear-gradient(
          90deg,
          var(--surface-2) 25%,
          var(--surface-3) 50%,
          var(--surface-2) 75%
        );
        background-size: 600px 100%;
        animation: skeleton-shimmer 1.6s ease-in-out infinite;
      }
    `}</style>
  );
}
