/**
 * Global loading.tsx — shown by Next.js Suspense boundary on
 * initial server-render or hard navigation. The NavigationProgress
 * bar handles client-side route transitions instead.
 */
export default function Loading() {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface)",
        flexDirection: "column",
        gap: "20px",
        minHeight: 0,
      }}
    >
      {/* Animated logo mark */}
      <div style={{ position: "relative" }}>
        {/* Outer pulsing ring */}
        <div
          style={{
            position: "absolute",
            inset: "-8px",
            borderRadius: "20px",
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))",
            animation: "pulse-ring 2s ease-in-out infinite",
          }}
        />
        {/* Logo box */}
        <div
          style={{
            position: "relative",
            width: "52px",
            height: "52px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #3b82f6, #7c3aed)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 32px rgba(59,130,246,0.4)",
          }}
        >
          {/* Animated bars inside logo */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "20px" }}>
            {[0, 0.15, 0.3, 0.45].map((delay, i) => (
              <div
                key={i}
                style={{
                  width: "4px",
                  borderRadius: "2px",
                  background: "#fff",
                  animation: `bar-bounce 1.2s ease-in-out ${delay}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Text */}
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "0.9rem",
            fontWeight: 600,
            color: "var(--text-muted)",
            marginBottom: "4px",
          }}
        >
          Loading RepoTalk
        </p>
        <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
          Just a moment…
        </p>
      </div>

      {/* Animated dots */}
      <div style={{ display: "flex", gap: "6px" }}>
        {[0, 0.2, 0.4].map((delay, i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--primary)",
              animation: `dot-bounce 1.4s ease-in-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes bar-bounce {
          0%, 100% { height: 6px; opacity: 0.6; }
          50%       { height: 18px; opacity: 1; }
        }
        @keyframes dot-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
