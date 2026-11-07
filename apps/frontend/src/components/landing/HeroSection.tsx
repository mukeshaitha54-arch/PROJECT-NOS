"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Cpu,
  HardDrive,
  Radio,
  Server,
  Shield,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";

// Cybernetic Warm Ember Background with Fluid Particles & Solar Beams
function CyberneticEmberBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Deep Obsidian Radial Base */}
      <div className="absolute inset-0 bg-[#090a0d]" />

      {/* Solar Orange and Crimson Flame Auroras */}
      <div className="absolute -top-32 left-1/4 w-[750px] h-[650px] bg-gradient-to-br from-orange-500/12 via-rose-600/8 to-transparent rounded-full blur-[140px] animate-pulse duration-[8000ms]" />
      <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] bg-gradient-to-bl from-rose-500/10 via-amber-500/5 to-transparent rounded-full blur-[130px]" />
      <div className="absolute -bottom-32 left-10 w-[550px] h-[550px] bg-gradient-to-tr from-amber-600/8 via-orange-500/5 to-transparent rounded-full blur-[120px]" />

      {/* Cybernetic Isometric Vector Grid */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 107, 0, 0.7) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 107, 0, 0.7) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Radiant Glowing Center Halo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(255,85,0,0.06)_0%,transparent_75%)]" />

      {/* Floating 3D Depth Embers */}
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={`ember-${i}`}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: (i % 3) + 2,
            height: (i % 3) + 2,
            left: `${4 + ((i * 4.3) % 92)}%`,
            top: `${8 + ((i * 6.7) % 84)}%`,
            background:
              i % 2 === 0
                ? "rgba(255, 107, 0, 0.75)"
                : "rgba(244, 63, 94, 0.75)",
            boxShadow:
              i % 2 === 0
                ? "0 0 10px rgba(255, 107, 0, 0.8)"
                : "0 0 10px rgba(244, 63, 94, 0.8)",
          }}
          animate={{
            y: [0, -35, 0],
            x: [0, i % 2 === 0 ? 15 : -15, 0],
            opacity: [0.2, 0.9, 0.2],
            scale: [1, 1.25, 1],
          }}
          transition={{
            duration: 4.5 + (i % 4),
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// 3D Fashion Interactive Hardware Telemetry Cockpit Deck
function HardwareTelemetry3DDeck() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth mouse-driven 3D rotation physics using Framer Motion springs
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springRotateX = useSpring(
    useTransform(mouseY, [-0.5, 0.5], [14, -14]),
    {
      stiffness: 120,
      damping: 18,
    },
  );
  const springRotateY = useSpring(
    useTransform(mouseX, [-0.5, 0.5], [-18, 18]),
    {
      stiffness: 120,
      damping: 18,
    },
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-5xl my-14 perspective-1400 flex items-center justify-center cursor-default select-none"
    >
      <motion.div
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full rounded-3xl p-6 sm:p-8 bg-[#111217]/90 border border-white/[0.12] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_32px_80px_-16px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,85,0,0.15)] backdrop-blur-2xl"
      >
        {/* Specular Ambient Edge Sheen */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.06] via-transparent to-transparent pointer-events-none" />

        {/* Top Deck HUD Header */}
        <div
          style={{ transform: "translateZ(30px)" }}
          className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/[0.08]"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
            <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]" />
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
            <div className="h-4 w-px bg-white/[0.1] mx-1" />
            <span className="text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
              NODE // PRIMARY_SENTINEL_01 (SHIVA-X)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AES-256 HSM LINK ACTIVE
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/25">
              <Zap className="w-3 h-3" />
              0.2% CPU FOOTPRINT
            </span>
          </div>
        </div>

        {/* 3D Floating Interior Layer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
          {/* Card 1: Live Hardware Frequency & Thermals (Floating at Z: 45px) */}
          <motion.div
            style={{ transform: "translateZ(45px)" }}
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_32px_-8px_rgba(0,0,0,0.5)] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                CPU Load & Thermals
              </span>
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <Cpu className="w-4 h-4" />
              </div>
            </div>

            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono tabular-nums text-white">
                  18.4
                </span>
                <span className="text-sm font-semibold text-orange-400 font-mono">
                  %
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-1">
                Die Temp:{" "}
                <span className="text-white font-semibold">41.8°C</span> •
                Clock:{" "}
                <span className="text-white font-semibold">4.82 GHz</span>
              </p>
            </div>

            {/* Glowing Orange Progress Bar */}
            <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full shadow-[0_0_12px_rgba(255,107,0,0.8)]"
                style={{ width: "18.4%" }}
              />
            </div>
          </motion.div>

          {/* Card 2: Offline SQLite Outbox Queue (Floating at Z: 65px - Peak Layer) */}
          <motion.div
            style={{ transform: "translateZ(65px)" }}
            className="p-5 rounded-2xl bg-gradient-to-b from-orange-500/[0.08] via-rose-500/[0.03] to-transparent border border-orange-500/30 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_16px_40px_-10px_rgba(255,85,0,0.2)] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
                Encrypted Outbox Buffer
              </span>
              <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-300 shadow-[0_0_12px_rgba(255,107,0,0.4)]">
                <Lock className="w-4 h-4" />
              </div>
            </div>

            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono tabular-nums text-white">
                  0
                </span>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Pending (Clean)
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 font-mono mt-1">
                Zero-drop SQLite failover active
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/[0.08]">
              <span>Drain Latency: &lt;1.2ms</span>
              <span className="text-emerald-400 font-semibold">
                100% Ingested
              </span>
            </div>
          </motion.div>

          {/* Card 3: S.M.A.R.T. Predictive Hardware Life (Floating at Z: 45px) */}
          <motion.div
            style={{ transform: "translateZ(45px)" }}
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_12px_32px_-8px_rgba(0,0,0,0.5)] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                S.M.A.R.T. SSD Health
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <HardDrive className="w-4 h-4" />
              </div>
            </div>

            <div className="my-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold font-mono tabular-nums text-white">
                  99.8
                </span>
                <span className="text-sm font-semibold text-rose-400 font-mono">
                  %
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-1">
                Wear Remaining:{" "}
                <span className="text-white font-semibold">9.4 Years</span> •
                Bad Sectors:{" "}
                <span className="text-emerald-400 font-semibold">0</span>
              </p>
            </div>

            {/* Glowing Crimson/Rose Progress Bar */}
            <div className="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-rose-500 to-amber-500 h-full rounded-full shadow-[0_0_12px_rgba(244,63,94,0.8)]"
                style={{ width: "99.8%" }}
              />
            </div>
          </motion.div>
        </div>

        {/* Bottom Interactive Telemetry Wave Rail */}
        <div
          style={{ transform: "translateZ(35px)" }}
          className="mt-6 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between text-xs font-mono text-zinc-400"
        >
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-orange-400 animate-pulse" />
            <span>SUB-SECOND TELEMETRY PULSE: SYNCHRONIZED</span>
          </div>
          <div className="text-zinc-500">
            C# Native Runtime • Zero GC Pressure • Multi-Tenant Isolated
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Continuous Sliding Telemetry Capsule Rail (Sliding Motions of Objects)
const SLIDING_ITEMS = [
  { icon: "⚡", title: "Sub-Second WebSocket Pipeline", tag: "30ms Latency" },
  {
    icon: "🛡️",
    title: "Encrypted SQLite Outbox Buffer",
    tag: "Zero Data Drop",
  },
  {
    icon: "🔥",
    title: "Ultra-Lightweight C# AOT Binary",
    tag: "<40MB RAM / 0.2% CPU",
  },
  {
    icon: "💎",
    title: "Kernel Watchdog ID 41 & 1001",
    tag: "Instant BSOD Trap",
  },
  { icon: "🛰️", title: "Non-Destructive Pause & Resume", tag: "Hot Control" },
  {
    icon: "🧬",
    title: "S.M.A.R.T. Predictive Hardware AI",
    tag: "Wear & Failure Math",
  },
  {
    icon: "🔐",
    title: "Cryptographic SHA-256 Node Tokens",
    tag: "Zero-Trust Mesh",
  },
];

function SlidingTelemetryRail() {
  return (
    <div className="w-full overflow-hidden py-8 border-y border-white/[0.08] bg-[#0c0d11]/80 backdrop-blur-xl relative">
      {/* Edge gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#090a0d] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#090a0d] to-transparent z-10 pointer-events-none" />

      <motion.div
        className="flex gap-4 w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {[...SLIDING_ITEMS, ...SLIDING_ITEMS].map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:border-orange-500/40 hover:bg-orange-500/[0.04] transition-[border-color,background-color] duration-150 cursor-default"
          >
            <span className="text-lg">{item.icon}</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white tracking-tight">
                {item.title}
              </span>
              <span className="text-[10px] font-mono text-orange-400 font-medium">
                {item.tag}
              </span>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

const HERO_WORDS = [
  "UNBREAKABLE.",
  "RESILIENT.",
  "INTELLIGENT.",
  "HIGH-VELOCITY.",
  "AUTONOMOUS.",
];

export function HeroSection() {
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setWordIdx((i) => (i + 1) % HERO_WORDS.length),
      2600,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#090a0d] pt-28 pb-12"
      id="platform"
    >
      <CyberneticEmberBackground />

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        {/* Status Pill Badge with Emil Tactile Physics */}
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
          className="flex items-center gap-2.5 bg-gradient-to-r from-orange-500/15 via-rose-500/10 to-transparent border border-orange-500/30 rounded-full px-4 py-1.5 mb-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_16px_rgba(255,85,0,0.15)]"
        >
          <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-[0_0_8px_rgba(251,146,60,0.9)]" />
          <span className="text-xs font-mono font-bold text-orange-300 tracking-widest uppercase">
            NETWORK OPERATIONS SENTINEL // v2.0 TITANIUM
          </span>
        </motion.div>

        {/* Dynamic Display Headline */}
        <div className="space-y-1 mb-6">
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
            className="text-6xl sm:text-7xl md:text-8xl font-black text-white tracking-tight leading-[0.95]"
          >
            BUILT FOR THE
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="text-6xl sm:text-7xl md:text-8xl font-black tracking-tight leading-[0.95]"
          >
            <motion.span
              key={wordIdx}
              initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-rose-500 inline-block drop-shadow-[0_4px_24px_rgba(255,85,0,0.35)]"
            >
              {HERO_WORDS[wordIdx]}
            </motion.span>
          </motion.h1>
        </div>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="text-zinc-400 text-base md:text-xl max-w-2xl leading-relaxed mb-10 font-normal"
        >
          High-performance Windows fleet telemetry engineered in native C# with{" "}
          <span className="text-white font-semibold">
            zero-loss SQLite outbox failover
          </span>
          , sub-second WebSocket dispatch, and predictive hardware wear
          telemetry.
        </motion.p>

        {/* CTA Buttons with Emil Tactile Physics */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col sm:flex-row items-center gap-4 z-20"
        >
          <Link href="/auth/register">
            <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-extrabold text-sm sm:text-base tracking-wide shadow-[inset_0_1px_0_0_rgba(255,255,255,0.35),0_8px_24px_rgba(255,85,0,0.4)] active:scale-[0.97] transition-[transform,box-shadow] duration-140 flex items-center gap-2.5">
              <span>🚀 Deploy Sentinel Agent</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>

          <Link href="/dashboard">
            <button className="px-8 py-4 rounded-2xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] hover:border-orange-500/40 text-white font-bold text-sm sm:text-base active:scale-[0.97] transition-[transform,background-color,border-color] duration-140 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
              ⚡ Open Command Deck
            </button>
          </Link>
        </motion.div>

        {/* Interactive 3D Hardware Telemetry Cockpit Deck */}
        <HardwareTelemetry3DDeck />
      </div>

      {/* Cinematic Sliding Telemetry Capsule Rail */}
      <SlidingTelemetryRail />
    </section>
  );
}
