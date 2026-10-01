"use client";

import { motion } from "framer-motion";

const COMPARISON = [
  {
    dimension: "Agent Resource Footprint",
    legacy: { text: "300MB+ RAM, 5% CPU — Electron/Python bloat", bad: true },
    nos: { text: "< 40MB RAM, 0.2% CPU — Native C# AOT binary", good: true },
  },
  {
    dimension: "Network Interruption Handling",
    legacy: {
      text: "Drops telemetry, creates blindspots, loses crash logs",
      bad: true,
    },
    nos: {
      text: "Encrypted SQLite outbox buffers everything, auto-drains",
      good: true,
    },
  },
  {
    dimension: "Telemetry Control",
    legacy: {
      text: "Delete & reinstall agent to stop/start streaming",
      bad: true,
    },
    nos: {
      text: "Non-destructive Pause & Resume via control plane, < 1s",
      good: true,
    },
  },
  {
    dimension: "BSOD & Crash Visibility",
    legacy: {
      text: "BSOD goes unnoticed until user opens a support ticket",
      bad: true,
    },
    nos: {
      text: "Kernel Event ID 41 & 1001 Watchdog: instant BSOD alert",
      good: true,
    },
  },
  {
    dimension: "Hardware Failure Prediction",
    legacy: {
      text: "Only disk free-space monitoring — reactive, too late",
      bad: true,
    },
    nos: {
      text: "S.M.A.R.T. wear %, SSD life expectancy, battery degradation",
      good: true,
    },
  },
  {
    dimension: "Multi-Tenant Security",
    legacy: {
      text: "Shared data pools across accounts, compliance risk",
      bad: true,
    },
    nos: {
      text: "SHA-256 device token isolation per organization, zero cross-leak",
      good: true,
    },
  },
];

const PILLARS = [
  {
    icon: "⚡",
    title: "High-Frequency Telemetry",
    color: "from-blue-500 to-cyan-500",
    glow: "rgba(59,130,246,0.2)",
    description:
      "30-second multi-sample median-smoothed CPU, thermal, disk I/O, network Mbps, and process table — all streamed live via WebSocket.",
    badges: ["30s cycle", "WMI + PerfCounters", "WebSocket push", "0 polling"],
  },
  {
    icon: "🛡️",
    title: "Zero-Trust Multi-Tenant",
    color: "from-violet-500 to-purple-600",
    glow: "rgba(139,92,246,0.2)",
    description:
      "Cryptographic SHA-256 device token verification, organization-level data barriers, instant key revocation, and JWT-secured dashboard.",
    badges: ["SHA-256 tokens", "Org isolation", "Instant revoke", "JWT auth"],
  },
  {
    icon: "🧠",
    title: "Autonomous Self-Healing",
    color: "from-emerald-500 to-teal-500",
    glow: "rgba(52,211,153,0.2)",
    description:
      "Built-in CPU threshold monitor self-throttles the agent to prevent system slowdowns. Survival Mode kicks in automatically when resources are critical.",
    badges: ["Safe Mode", "Auto-throttle", "CPU watchdog", "0 crashes"],
  },
  {
    icon: "💽",
    title: "Predictive Hardware Reliability",
    color: "from-amber-500 to-orange-500",
    glow: "rgba(245,158,11,0.2)",
    description:
      "NVMe SSD write wear %, S.M.A.R.T. predictive failure indicators, battery degradation health, thermal throttling detection — before failure strikes.",
    badges: ["S.M.A.R.T.", "SSD wear %", "Battery health", "Thermal alerts"],
  },
];

export function ArchitecturalPillars() {
  return (
    <>
      {/* Comparison Table */}
      <section className="relative bg-slate-900 py-28 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.04)_0%,transparent_60%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-5">
              ⚡ NOS vs Legacy RMM
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Why{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                Every Other Tool
              </span>{" "}
              Falls Short
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Side-by-side against traditional RMM tools — the gap is not
              incremental. It's architectural.
            </p>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-3xl border border-white/10 overflow-hidden"
          >
            {/* Header row */}
            <div className="grid grid-cols-3 bg-slate-800/80 border-b border-white/10">
              <div className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Dimension
              </div>
              <div className="px-6 py-4 text-xs font-bold text-red-400 uppercase tracking-widest border-l border-white/8">
                ❌ Legacy RMM
              </div>
              <div className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase tracking-widest border-l border-white/8">
                ✅ NOS Sentinel
              </div>
            </div>

            {COMPARISON.map((row, i) => (
              <motion.div
                key={row.dimension}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="grid grid-cols-3 border-b border-white/6 last:border-0 hover:bg-white/[0.02] transition-colors"
              >
                <div className="px-6 py-4 text-sm font-semibold text-slate-300">
                  {row.dimension}
                </div>
                <div className="px-6 py-4 border-l border-white/8">
                  <span className="text-sm text-red-400/80 leading-relaxed">
                    {row.legacy.text}
                  </span>
                </div>
                <div className="px-6 py-4 border-l border-white/8">
                  <span className="text-sm text-emerald-300 leading-relaxed font-medium">
                    {row.nos.text}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pillars */}
      <section
        className="relative bg-gradient-to-b from-slate-900 to-slate-950 py-28 px-6 overflow-hidden"
        id="architecture"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-violet-400 tracking-widest uppercase bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
              🏗️ Core Architecture
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Four Pillars of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
                Absolute Resilience
              </span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {PILLARS.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                whileHover={{
                  y: -4,
                  boxShadow: `0 20px 60px ${pillar.glow}`,
                  borderColor: "rgba(255,255,255,0.15)",
                }}
                className="group rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-sm p-7 cursor-default transition-all duration-300"
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center text-2xl mb-5 shadow-lg`}
                  style={{ boxShadow: `0 8px 25px ${pillar.glow}` }}
                >
                  {pillar.icon}
                </div>

                <h3 className="text-xl font-black text-white mb-3">
                  {pillar.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-5">
                  {pillar.description}
                </p>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2">
                  {pillar.badges.map((b) => (
                    <span
                      key={b}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${pillar.color} bg-opacity-10 text-white border border-white/10`}
                      style={{ background: `${pillar.glow}` }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
