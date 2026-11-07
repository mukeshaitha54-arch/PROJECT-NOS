"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("nos_access_token") ||
          localStorage.getItem("token") ||
          document.cookie.includes("nos-token")
        : false;
    setHasSession(!!token);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`site-header sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#fffdfa]/90 backdrop-blur-md shadow-sm border-b border-[#eadfd5]"
          : "bg-transparent"
      }`}
    >
      <a className="brand" href="#top" aria-label="NOS Fleet Operations Home">
        <span className="brand-mark" aria-hidden="true">
          <svg className="brand-ring" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" />
          </svg>
          <svg className="brand-glyph" viewBox="0 0 40 40">
            <path d="M12 28V12h9.5a6.5 6.5 0 0 1 0 13H12m8 0 8 3" />
          </svg>
        </span>
        <span>
          NOS<span className="brand-period">.</span>
        </span>
      </a>

      <nav className="main-nav" aria-label="Main navigation">
        <a href="#top" className="mirror-text">
          Platform
        </a>
        <a href="#telemetry-engine" className="mirror-text">
          Live Cockpit
        </a>
        <a href="#architecture" className="mirror-text">
          Architecture
        </a>
        <a href="#installer" className="mirror-text">
          Deploy Agent
        </a>
      </nav>

      <div className="flex items-center gap-3">
        {hasSession ? (
          <Link href="/dashboard" className="header-cta">
            <span>⚡</span> <span className="mirror-text">Open Dashboard</span>{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="text-xs font-semibold text-[#66564d] hover:text-[#ca5724] px-3 py-2 transition-colors mirror-text"
            >
              Sign In
            </Link>
            <Link href="/auth/register" className="header-cta">
              <span className="mirror-text">Deploy Agent</span>{" "}
              <span aria-hidden="true">↗</span>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
