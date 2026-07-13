/** Skeleton loading for the Repos (Ingest) page */
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

      <div style={{ padding: "32px 28px", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px", paddingBottom: "24px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="skeleton-block" style={{ width: "200px", height: "30px", borderRadius: "8px" }} />
            <div className="skeleton-block" style={{ width: "340px", height: "15px", borderRadius: "6px" }} />
          </div>
          <div className="skeleton-block" style={{ width: "140px", height: "40px", borderRadius: "10px" }} />
        </div>

        {/* Search / filter bar */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <div className="skeleton-block" style={{ flex: 1, height: "42px", borderRadius: "10px" }} />
          <div className="skeleton-block" style={{ width: "100px", height: "42px", borderRadius: "10px" }} />
        </div>

        {/* Repo cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "16px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <RepoCardSkeleton key={i} delay={i * 0.07} />
          ))}
        </div>
      </div>

      <SkeletonStyles />
    </>
  );
}

function RepoCardSkeleton({ delay }: { delay: number }) {
  return (
    <div style={{
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      borderRadius: "16px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      animationDelay: `${delay}s`,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div className="skeleton-block" style={{ width: "42px", height: "42px", borderRadius: "10px", flexShrink: 0 }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="skeleton-block" style={{ width: "55%", height: "16px", borderRadius: "6px" }} />
          <div className="skeleton-block" style={{ width: "38%", height: "12px", borderRadius: "5px" }} />
        </div>
        <div className="skeleton-block" style={{ width: "64px", height: "24px", borderRadius: "999px" }} />
      </div>

      {/* Description lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        <div className="skeleton-block" style={{ width: "100%", height: "12px", borderRadius: "5px" }} />
        <div className="skeleton-block" style={{ width: "80%", height: "12px", borderRadius: "5px" }} />
      </div>

      {/* Footer stats */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <div className="skeleton-block" style={{ width: "70px", height: "22px", borderRadius: "999px" }} />
          <div className="skeleton-block" style={{ width: "85px", height: "22px", borderRadius: "999px" }} />
        </div>
        <div className="skeleton-block" style={{ width: "80px", height: "32px", borderRadius: "8px" }} />
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
