"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";

export function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isOverText, setIsOverText] = useState(false);
  const [isDwelling, setIsDwelling] = useState(false);
  const pathname = usePathname();

  // STRICTLY active on the landing page only (never in the dashboard, fleet, or internal pages)
  const isLandingPage = pathname === "/" || pathname === "";

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Silky-smooth, un-rushed spring physics following Emil Kowalski's guidelines
  // Lens spring has gentle momentum to float naturally without snapping or rushing
  const lensSpringConfig = { damping: 30, stiffness: 130, mass: 0.95 };
  const lensX = useSpring(mouseX, lensSpringConfig);
  const lensY = useSpring(mouseY, lensSpringConfig);

  // Core center dot tracks with refined precision
  const coreSpringConfig = { damping: 26, stiffness: 190, mass: 0.6 };
  const coreX = useSpring(mouseX, coreSpringConfig);
  const coreY = useSpring(mouseY, coreSpringConfig);

  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);

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

      const target = e.target as HTMLElement | null;
      currentTargetRef.current = target;
      if (!target) return;

      const overTextElement = !!target.closest(
        "h1, h2, h3, h4, h5, h6, p, blockquote, span, strong, em, a, button, li, code, [role='button'], .mirror-text, .hero-intro, .flow-step",
      );

      if (overTextElement) {
        setIsOverText(true);
        // Start dwell timer if not already running
        if (!dwellTimerRef.current) {
          dwellTimerRef.current = setTimeout(() => {
            setIsDwelling(true);
          }, 180);
        }
      } else {
        setIsOverText(false);
        setIsDwelling(false);
        if (dwellTimerRef.current) {
          clearTimeout(dwellTimerRef.current);
          dwellTimerRef.current = null;
        }
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      setIsOverText(false);
      setIsDwelling(false);
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
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
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
        dwellTimerRef.current = null;
      }
    };
  }, [mouseX, mouseY, isVisible]);

  // If on dashboard or internal pages, or not mounted, don't show any custom cursor
  if (!mounted || !isLandingPage) return null;

  const isMagnified = isOverText || isDwelling;
  const targetSize = isDwelling ? 92 : isOverText ? 66 : 26;

  return (
    <>
      {/* Smooth Frosted Glass Optical Magnifying Loupe */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full"
        style={{
          x: lensX,
          y: lensY,
          translateX: "-50%",
          translateY: "-50%",
          backdropFilter: isDwelling
            ? "blur(2px) contrast(1.22) brightness(1.12)"
            : isOverText
              ? "blur(1.5px) contrast(1.16) brightness(1.08)"
              : "blur(0.5px)",
          WebkitBackdropFilter: isDwelling
            ? "blur(2px) contrast(1.22) brightness(1.12)"
            : isOverText
              ? "blur(1.5px) contrast(1.16) brightness(1.08)"
              : "blur(0.5px)",
          backgroundColor: isDwelling
            ? "rgba(244, 123, 54, 0.08)"
            : isOverText
              ? "rgba(244, 123, 54, 0.04)"
              : "rgba(244, 123, 54, 0.015)",
          border: isDwelling
            ? "2px solid rgba(244, 123, 54, 0.85)"
            : isOverText
              ? "1.5px solid rgba(244, 123, 54, 0.6)"
              : "1px solid rgba(244, 123, 54, 0.3)",
          boxShadow: isDwelling
            ? "0 0 35px rgba(244, 123, 54, 0.4), inset 0 0 20px rgba(244, 123, 54, 0.22)"
            : isOverText
              ? "0 0 22px rgba(244, 123, 54, 0.28), inset 0 0 12px rgba(244, 123, 54, 0.14)"
              : "0 0 10px rgba(244, 123, 54, 0.12)",
        }}
        animate={{
          width: targetSize,
          height: targetSize,
          scale: isVisible ? 1 : 0.3,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 130,
          damping: 26,
          mass: 0.9,
        }}
      />

      {/* Center Precision Optical Focus Dot */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[9999] rounded-full bg-[#f47b36] shadow-[0_0_8px_rgba(244,123,54,0.85)]"
        style={{
          x: coreX,
          y: coreY,
          translateX: "-50%",
          translateY: "-50%",
        }}
        animate={{
          width: isDwelling ? 7 : isOverText ? 6 : 5,
          height: isDwelling ? 7 : isOverText ? 6 : 5,
          opacity: isVisible ? 1 : 0,
          scale: isDwelling ? 1.3 : isOverText ? 1.15 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 24,
        }}
      />
    </>
  );
}
