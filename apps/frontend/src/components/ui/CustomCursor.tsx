"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [cursorState, setCursorState] = useState<
    "default" | "text" | "interactive"
  >("default");
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // High-precision spring physics for buttery smooth motion without lag
  const springConfig = { damping: 28, stiffness: 350, mass: 0.5 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Slightly softer spring for outer lens
  const lensConfig = { damping: 22, stiffness: 220, mass: 0.8 };
  const lensX = useSpring(mouseX, lensConfig);
  const lensY = useSpring(mouseY, lensConfig);

  useEffect(() => {
    // Disable on touch devices
    if (
      typeof window === "undefined" ||
      window.matchMedia("(pointer: coarse)").matches
    ) {
      return;
    }

    setMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      // Detect element under cursor
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const isInteractive = target.closest(
        "a, button, input, select, textarea, [role='button'], .button, .text-link, .header-cta",
      );
      const isText = target.closest(
        "h1, h2, h3, h4, h5, h6, p, blockquote, .hero-intro, em, strong, .micro-label, .flow-summary strong",
      );

      if (isInteractive) {
        setCursorState("interactive");
      } else if (isText) {
        setCursorState("text");
      } else {
        setCursorState("default");
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [mouseX, mouseY, isVisible]);

  if (!mounted) return null;

  const isMirror = cursorState === "text";
  const isInteractive = cursorState === "interactive";

  return (
    <>
      {/* Dynamic Inverted Mirror Lens */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full"
        style={{
          x: lensX,
          y: lensY,
          translateX: "-50%",
          translateY: "-50%",
          mixBlendMode: isMirror ? "difference" : "normal",
          backgroundColor: isMirror
            ? "#ffffff"
            : isInteractive
              ? "rgba(244, 123, 54, 0.15)"
              : "transparent",
          border: isMirror
            ? "none"
            : isInteractive
              ? "1.5px solid #f47b36"
              : "1px solid rgba(244, 123, 54, 0.35)",
          boxShadow: isInteractive
            ? "0 0 16px rgba(244, 123, 54, 0.35)"
            : "none",
        }}
        animate={{
          width: isMirror ? 72 : isInteractive ? 48 : 28,
          height: isMirror ? 72 : isInteractive ? 48 : 28,
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? 1 : 0.4,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
      />

      {/* Core Precision Dot */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full bg-[#f47b36]"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isMirror ? 0 : isInteractive ? 6 : 5,
          height: isMirror ? 0 : isInteractive ? 6 : 5,
          opacity: isVisible && !isMirror ? 1 : 0,
          scale: isInteractive ? 1.4 : 1,
        }}
        transition={{ duration: 0.15 }}
      />
    </>
  );
}
