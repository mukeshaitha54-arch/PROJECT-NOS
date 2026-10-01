"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    // Check for existing auth token
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
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-slate-950/90 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/40"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-500/30">
              N
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight">
              NOS
            </span>
            <div className="text-[10px] text-emerald-400 font-semibold tracking-widest uppercase leading-none">
              ALL SYSTEMS NOMINAL
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {["Platform", "Architecture", "Telemetry Engine", "Installer"].map(
            (link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(" ", "-")}`}
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors duration-200 hover:text-blue-400"
              >
                {link}
              </a>
            ),
          )}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          {hasSession && (
            <Link href="/dashboard">
              <motion.span
                className="text-xs text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-emerald-400/20 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                ⚡ Active Session → Dashboard
              </motion.span>
            </Link>
          )}
          <Link href="/auth/login">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="text-slate-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200"
            >
              Sign In
            </motion.button>
          </Link>
          <Link href="/auth/register">
            <motion.button
              whileHover={{
                scale: 1.03,
                boxShadow: "0 0 30px rgba(59,130,246,0.4)",
              }}
              whileTap={{ scale: 0.97 }}
              className="text-white text-sm font-bold px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 transition-all duration-200 shadow-lg shadow-blue-500/25"
            >
              Launch Fleet Control →
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
