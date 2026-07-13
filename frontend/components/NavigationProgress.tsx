"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * NavigationProgress — a sleek top progress bar that fires on every
 * client-side route change (works with Next.js App Router useRouter).
 *
 * How it works:
 *  - Listens to pathname + searchParams changes
 *  - On change: animates bar from 0 → 85% quickly, then holds
 *  - After a short delay: completes to 100% and fades out
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const clear = () => {
    [timerRef, completeRef, fadeRef].forEach((r) => {
      if (r.current) clearTimeout(r.current);
    });
  };

  const start = () => {
    clear();
    setOpacity(1);
    setWidth(0);
    setVisible(true);

    // Quickly grow to 30%
    requestAnimationFrame(() => {
      setWidth(30);
      // Then jump to 70% after 200ms
      timerRef.current = setTimeout(() => setWidth(70), 200);
      // Slow down at 85%
      completeRef.current = setTimeout(() => setWidth(85), 500);
    });
  };

  const complete = () => {
    clear();
    setWidth(100);
    // Fade out after completing
    fadeRef.current = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => {
        setVisible(false);
        setWidth(0);
        setOpacity(1);
      }, 300);
    }, 200);
  };

  useEffect(() => {
    // Skip the very first render (initial page load)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    start();
    // Complete shortly after route change registers
    const done = setTimeout(complete, 400);
    return () => clearTimeout(done);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <>
      {/* Progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "2.5px",
          width: `${width}%`,
          zIndex: 99999,
          opacity,
          background:
            "linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)",
          transition:
            width === 100
              ? "width 0.2s ease-out, opacity 0.3s ease"
              : width === 0
              ? "none"
              : "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 0 8px rgba(99, 102, 241, 0.7), 0 0 16px rgba(59, 130, 246, 0.4)",
          borderRadius: "0 2px 2px 0",
        }}
      />
      {/* Glow dot at the tip */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: `${width}%`,
          width: "80px",
          height: "2.5px",
          zIndex: 99999,
          opacity,
          background:
            "linear-gradient(90deg, rgba(139,92,246,0.8), transparent)",
          transition:
            width === 0
              ? "none"
              : "left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          pointerEvents: "none",
        }}
      />
    </>
  );
}
