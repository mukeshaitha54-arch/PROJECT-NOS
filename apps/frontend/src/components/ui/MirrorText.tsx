"use client";

import React from "react";

interface MirrorTextProps {
  children: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
}

/**
 * MirrorText: Clean text wrapper without jarring horizontal flipping,
 * smoothly transitioning text color on hover.
 */
export function MirrorText({
  children,
  className = "",
  as = "span",
}: MirrorTextProps) {
  const Component = as;

  return (
    <Component
      className={`transition-colors duration-300 ease-out hover:text-[#f47b36] ${className}`}
    >
      {children}
    </Component>
  );
}
