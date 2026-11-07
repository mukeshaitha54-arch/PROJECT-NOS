"use client";

import { useEffect, useState } from "react";

export function ScrollStream() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          const current =
            maxScroll > 0
              ? Math.min(Math.max(window.scrollY / maxScroll, 0), 1)
              : 0;
          setProgress(current);
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="scroll-stream" aria-hidden="true">
      <span className="stream-track" />
      <span
        className="stream-fill"
        style={{
          transform: `scaleY(${progress})`,
        }}
      />
      <span
        className="stream-orbit"
        style={{
          top: `calc(${progress} * (100vh - 13px))`,
        }}
      >
        <i />
      </span>
    </div>
  );
}
