"use client";

import { useEffect, useRef } from "react";

export function GlobalNosWatermark() {
  const shineRef = useRef<HTMLSpanElement>(null);
  const glassRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number | null = null;
    let targetX = -9999;
    let targetY = -9999;
    let currentX = -9999;
    let currentY = -9999;
    let isActive = false;

    const onPointerMove = (e: PointerEvent) => {
      if (
        e.pointerType &&
        e.pointerType !== "mouse" &&
        e.pointerType !== "touch"
      )
        return;

      const shineEl = shineRef.current;
      const glassEl = glassRef.current;
      if (!shineEl || !glassEl) return;

      const bounds = shineEl.getBoundingClientRect();
      const pointerX = e.clientX - bounds.left;
      const pointerY = e.clientY - bounds.top;

      // Check distance from the watermark bounding box
      const dx = Math.max(0 - pointerX, 0, pointerX - bounds.width);
      const dy = Math.max(0 - pointerY, 0, pointerY - bounds.height);
      const distance = Math.hypot(dx, dy);

      // Light up whenever cursor is near or inside the watermark region (generous 350px aura)
      if (distance < 350) {
        targetX = pointerX;
        targetY = pointerY;
        if (!isActive) {
          isActive = true;
          shineEl.setAttribute("data-active", "");
        }
      } else if (isActive) {
        isActive = false;
        shineEl.removeAttribute("data-active");
      }

      if (currentX === -9999) {
        currentX = targetX;
        currentY = targetY;
      }

      if (rafId === null) {
        rafId = requestAnimationFrame(update);
      }
    };

    const update = () => {
      const shineEl = shineRef.current;
      if (!shineEl) {
        rafId = null;
        return;
      }

      // Buttery-smooth lerp interpolation for glossy specular glide
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      currentX += dx * 0.16;
      currentY += dy * 0.16;

      shineEl.style.setProperty("--nos-x", `${Math.round(currentX)}px`);
      shineEl.style.setProperty("--nos-y", `${Math.round(currentY)}px`);

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        rafId = requestAnimationFrame(update);
      } else {
        rafId = null;
      }
    };

    const onPointerLeave = () => {
      const shineEl = shineRef.current;
      if (shineEl) {
        shineEl.removeAttribute("data-active");
        isActive = false;
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        onPointerLeave,
      );
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="nos-watermark" data-sr-skip aria-hidden="true">
      <span ref={glassRef} className="nos-glass">
        NOS
      </span>
      <span ref={shineRef} className="nos-shine">
        NOS
      </span>
    </div>
  );
}
