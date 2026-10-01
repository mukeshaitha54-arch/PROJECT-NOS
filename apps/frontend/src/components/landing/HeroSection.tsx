"use client";

import { motion, useAnimation, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Animated grid background with pulse rings
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep space radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,transparent_70%)]" />
      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
      {/* Diagonal accent line (top-right) */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-violet-600/10 via-transparent to-transparent rounded-full blur-3xl" />
      {/* Bottom left accent */}
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-blue-600/8 via-transparent to-transparent rounded-full blur-3xl" />

      {/* Pulse rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/10"
          style={{ width: 300 + i * 200, height: 300 + i * 200 }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{
            duration: 4 + i * 1.5,
            repeat: Infinity,
            delay: i * 0.8,
          }}
        />
      ))}

      {/* Floating particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.div
          key={`p-${i}`}
          className="absolute w-1 h-1 rounded-full bg-blue-400/40"
          style={{
            left: `${8 + ((i * 5.5) % 90)}%`,
            top: `${5 + ((i * 7.3) % 85)}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + (i % 4),
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
    </div>
  );
}

// Live metric badge with fluctuating value
function LiveMetricBadge({
  label,
  value,
  unit,
  color,
  delay,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  delay: number;
}) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplay((prev) => {
        const delta = (Math.random() - 0.5) * (value * 0.3);
        return Math.max(0, Math.min(100, Math.round((prev + delta) * 10) / 10));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-2 bg-slate-900/80 border border-white/10 backdrop-blur-sm rounded-xl px-4 py-2.5"
    >
      <div className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
      <span className="text-slate-400 text-xs font-medium">{label}</span>
      <span
        className={`text-sm font-black tabular-nums ${color.replace("bg-", "text-")}`}
      >
        {display.toFixed(1)}
        <span className="text-[10px] font-normal text-slate-500 ml-0.5">
          {unit}
        </span>
      </span>
    </motion.div>
  );
}

export function HeroSection() {
  const words = [
    "FLEET.",
    "TELEMETRY.",
    "RESILIENCE.",
    "INTELLIGENCE.",
    "HURDLE.",
  ];
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setWordIdx((i) => (i + 1) % words.length),
      2800,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-slate-950"
      id="platform"
    >
      <GridBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-20 flex flex-col items-center text-center">
        {/* Status pill */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-blue-300 tracking-widest uppercase">
            Network Operations Sentinel — v1.0
          </span>
        </motion.div>

        {/* Main headline */}
        <div className="mb-6 space-y-2">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl md:text-8xl font-black text-white leading-[0.95] tracking-tight"
          >
            BUILT FOR
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl md:text-8xl font-black leading-[0.95] tracking-tight"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400">
              THE{" "}
            </span>
            <motion.span
              key={wordIdx}
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 inline-block"
            >
              {words[wordIdx]}
            </motion.span>
          </motion.h1>
        </div>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-slate-400 text-lg md:text-xl max-w-2xl leading-relaxed mb-10"
        >
          The next-generation Windows monitoring sentinel. Engineered in native
          C# with{" "}
          <span className="text-blue-400 font-semibold">
            offline SQLite outbox queuing
          </span>
          ,{" "}
          <span className="text-violet-400 font-semibold">
            sub-second WebSocket telemetry
          </span>
          , and{" "}
          <span className="text-cyan-400 font-semibold">
            predictive hardware failure detection
          </span>
          .
          <br />
          <span className="text-white font-semibold">
            Zero blindspots. Zero downtime. Absolute control.
          </span>
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <Link href="/auth/register">
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 50px rgba(59,130,246,0.5)",
              }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black text-base transition-all duration-300 shadow-xl shadow-blue-500/30"
            >
              🚀 Deploy First Agent
            </motion.button>
          </Link>
          <a href="#telemetry-engine">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm text-white font-bold text-base hover:bg-white/10 hover:border-white/25 transition-all duration-300"
            >
              ⚡ Live Telemetry Sandbox
            </motion.button>
          </a>
        </motion.div>

        {/* Live Metric Badges Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75 }}
          className="flex flex-wrap justify-center gap-3 mb-14"
        >
          <LiveMetricBadge
            label="CPU Usage"
            value={18.5}
            unit="%"
            color="bg-blue-400"
            delay={0.8}
          />
          <LiveMetricBadge
            label="Temperature"
            value={48.2}
            unit="°C"
            color="bg-emerald-400"
            delay={0.9}
          />
          <LiveMetricBadge
            label="RAM Used"
            value={61.3}
            unit="%"
            color="bg-violet-400"
            delay={1.0}
          />
          <LiveMetricBadge
            label="Disk Read"
            value={124.7}
            unit="MB/s"
            color="bg-cyan-400"
            delay={1.1}
          />
          <LiveMetricBadge
            label="Processes"
            value={247}
            unit=""
            color="bg-amber-400"
            delay={1.2}
          />
        </motion.div>

        {/* Arrow down hint */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          className="text-slate-600 text-2xl"
        >
          ↓
        </motion.div>
      </div>
    </section>
  );
}
