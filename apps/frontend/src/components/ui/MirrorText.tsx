"use client";

import React from "react";

interface MirrorTextProps {
  children: string;
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
}

/**
 * MirrorText: Wraps words so that hovering over text dynamically flips
 * the word into its mirror / reversal (scaleX(-1)) with smooth transitions,
 * reverting smoothly when the cursor leaves.
 */
export function MirrorText({
  children,
  className = "",
  as = "span",
}: MirrorTextProps) {
  const Component = as;
  const words = children.split(" ");

  return (
    <Component className={className}>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span className="mirror-text inline-block transition-transform duration-300 ease-out hover:scale-x-[-1] hover:text-[#f47b36] select-none cursor-pointer">
            {word}
          </span>
          {i < words.length - 1 && " "}
        </React.Fragment>
      ))}
    </Component>
  );
}
