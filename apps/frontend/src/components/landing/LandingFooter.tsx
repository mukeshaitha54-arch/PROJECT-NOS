"use client";

import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="site-footer page-width py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-400 border-t border-white/[0.08]">
      <div className="flex items-center gap-3">
        <a className="brand footer-brand flex items-center gap-2" href="#top">
          <span className="brand-mark footer-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40">
              <path d="M12 28V12h9.5a6.5 6.5 0 0 1 0 13H12m8 0 8 3" />
            </svg>
          </span>
          <span className="font-semibold text-white">
            NOS<span className="brand-period text-cyan-400">.</span>
          </span>
        </a>
        <span className="mirror-text text-xs text-zinc-500 hidden md:inline">
          Built for resilience. Zero-loss telemetry architecture.
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
        <a
          href="mailto:nos.platformm@gmail.com"
          className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium"
        >
          Help: nos.platformm@gmail.com
        </a>
        <span className="text-zinc-600">•</span>
        <Link
          href="/privacy"
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Privacy &amp; Terms
        </Link>
        <span className="text-zinc-600">•</span>
        <span className="text-zinc-400 font-mono">
          © 2026 NOS Platform • License 2026
        </span>
      </div>
    </footer>
  );
}
