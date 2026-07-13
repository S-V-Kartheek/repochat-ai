/** Skeleton loading for the Settings page — 2-column sidebar + content panel */
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

      <div style={{ padding: "32px 28px", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "32px", paddingBottom: "24px", borderBottom: "1px solid var(--border)" }}>
          <div className="skeleton-block" style={{ width: "44px", height: "44px", borderRadius: "12px", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="skeleton-block" style={{ width: "140px", height: "24px", borderRadius: "7px" }} />
            <div className="skeleton-block" style={{ width: "280px", height: "13px", borderRadius: "5px" }} />
          </div>
        </div>

        {/* 2-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "24px" }}>
          {/* Left sidebar — tab nav skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {["Profile", "API Keys", "Preferences", "Integrations"].map((_, i) => (
              <div
                key={i}
                className="skeleton-block"
                style={{
                  height: "40px",
                  borderRadius: "9px",
                  opacity: i === 0 ? 1 : 0.6,
                }}
              />
            ))}
          </div>

          {/* Right content panel */}
          <div style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}>
            {/* Section title */}
            <div className="skeleton-block" style={{ width: "160px", height: "22px", borderRadius: "7px" }} />

            {/* Form fields */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="skeleton-block" style={{ width: `${80 + i * 15}px`, height: "13px", borderRadius: "5px" }} />
                <div className="skeleton-block" style={{ width: "100%", height: "42px", borderRadius: "10px" }} />
              </div>
            ))}

            {/* Action button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <div className="skeleton-block" style={{ width: "120px", height: "40px", borderRadius: "10px" }} />
            </div>
          </div>
        </div>
      </div>

      <SkeletonStyles />
    </>
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
