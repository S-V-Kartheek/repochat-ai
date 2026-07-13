/** Skeleton loading for the Bookmarks page */
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
            <div className="skeleton-block" style={{ width: "180px", height: "30px", borderRadius: "8px" }} />
            <div className="skeleton-block" style={{ width: "300px", height: "14px", borderRadius: "6px" }} />
          </div>
          <div className="skeleton-block" style={{ width: "90px", height: "36px", borderRadius: "9px" }} />
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: "24px" }}>
          <div className="skeleton-block" style={{ width: "100%", height: "44px", borderRadius: "12px" }} />
        </div>

        {/* Bookmark cards — list layout */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <BookmarkCardSkeleton key={i} delay={i * 0.08} />
          ))}
        </div>
      </div>

      <SkeletonStyles />
    </>
  );
}

function BookmarkCardSkeleton({ delay }: { delay: number }) {
  return (
    <div style={{
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      borderLeft: "3px solid var(--surface-3)",
    }}>
      {/* Top meta row: repo + time */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div className="skeleton-block" style={{ width: "14px", height: "14px", borderRadius: "4px" }} />
          <div className="skeleton-block" style={{ width: "130px", height: "13px", borderRadius: "5px" }} />
        </div>
        <div className="skeleton-block" style={{ width: "70px", height: "13px", borderRadius: "5px" }} />
      </div>

      {/* Message content lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
        <div className="skeleton-block" style={{ width: "100%", height: "13px", borderRadius: "5px" }} />
        <div className="skeleton-block" style={{ width: "90%", height: "13px", borderRadius: "5px" }} />
        <div className="skeleton-block" style={{ width: "70%", height: "13px", borderRadius: "5px" }} />
      </div>

      {/* Citation chips */}
      <div style={{ display: "flex", gap: "8px" }}>
        <div className="skeleton-block" style={{ width: "100px", height: "22px", borderRadius: "6px" }} />
        <div className="skeleton-block" style={{ width: "120px", height: "22px", borderRadius: "6px" }} />
        <div className="skeleton-block" style={{ width: "90px", height: "22px", borderRadius: "6px" }} />
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div className="skeleton-block" style={{ width: "14px", height: "14px", borderRadius: "4px" }} />
          <div className="skeleton-block" style={{ width: "110px", height: "12px", borderRadius: "5px" }} />
        </div>
        <div className="skeleton-block" style={{ width: "80px", height: "28px", borderRadius: "8px" }} />
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
