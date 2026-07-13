/** Skeleton loading for the Evaluations page */
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
            <div className="skeleton-block" style={{ width: "210px", height: "28px", borderRadius: "8px" }} />
            <div className="skeleton-block" style={{ width: "350px", height: "14px", borderRadius: "6px" }} />
          </div>
          <div className="skeleton-block" style={{ width: "110px", height: "38px", borderRadius: "10px" }} />
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "28px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}>
              <div className="skeleton-block" style={{ width: "40px", height: "40px", borderRadius: "10px" }} />
              <div className="skeleton-block" style={{ width: "50%", height: "24px", borderRadius: "6px" }} />
              <div className="skeleton-block" style={{ width: "80%", height: "12px", borderRadius: "5px" }} />
            </div>
          ))}
        </div>

        {/* Eval cards list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "20px 22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "9px" }}>
                <div className="skeleton-block" style={{ width: "55%", height: "15px", borderRadius: "5px" }} />
                <div className="skeleton-block" style={{ width: "35%", height: "12px", borderRadius: "5px" }} />
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
                    <div className="skeleton-block" style={{ width: "44px", height: "44px", borderRadius: "50%" }} />
                    <div className="skeleton-block" style={{ width: "56px", height: "11px", borderRadius: "4px" }} />
                  </div>
                ))}
              </div>
              <div className="skeleton-block" style={{ width: "72px", height: "26px", borderRadius: "999px" }} />
            </div>
          ))}
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
