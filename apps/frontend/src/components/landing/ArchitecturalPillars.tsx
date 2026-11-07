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
    color: "from-orange-500 to-amber-500",
    glow: "rgba(255,85,0,0.25)",
    description:
      "30-second multi-sample median-smoothed CPU, thermal, disk I/O, network Mbps, and process table — all streamed live via WebSocket.",
    badges: ["30s cycle", "WMI + PerfCounters", "WebSocket push", "0 polling"],
  },
  {
    icon: "🛡️",
    title: "Zero-Trust Multi-Tenant",
    color: "from-rose-600 to-orange-500",
    glow: "rgba(225,29,72,0.25)",
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
    color: "from-amber-500 to-orange-600",
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
      <section className="relative bg-transparent py-28 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#f47b36] tracking-widest uppercase bg-[#f47b36]/10 border border-[#f47b36]/20 rounded-full px-4 py-1.5 mb-5 shadow-sm">
              <span className="mirror-text">⚡ Architectural Benchmark</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#211a16] mb-4">
              <span className="mirror-text">Why</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 mirror-text">
                Every Other Tool
              </span>{" "}
              <span className="mirror-text">Falls Short</span>
            </h2>
            <p className="text-[#64564c] text-lg max-w-xl mx-auto mirror-text">
              Side-by-side against traditional RMM tools — the gap is not
              incremental. It&apos;s architectural.
            </p>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-3xl border border-[#eadfd5] bg-white/85 backdrop-blur-2xl overflow-hidden shadow-[0_16px_40px_-12px_rgba(244,123,54,0.08),inset_0_1px_0_0_rgba(255,255,255,0.9)]"
          >
            {/* Header row */}
            <div className="grid grid-cols-3 bg-[#fff8f2] border-b border-[#eadfd5]">
              <div className="px-6 py-4 text-xs font-bold text-[#64564c] uppercase tracking-widest">
                Dimension
              </div>
              <div className="px-6 py-4 text-xs font-bold text-rose-600 uppercase tracking-widest border-l border-[#eadfd5]">
                ❌ Legacy RMM
              </div>
              <div className="px-6 py-4 text-xs font-bold text-[#f47b36] uppercase tracking-widest border-l border-[#eadfd5]">
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
                className="grid grid-cols-3 border-b border-[#eadfd5]/60 last:border-0 hover:bg-[#fff9f4]/60 transition-colors"
              >
                <div className="px-6 py-4 text-sm font-bold text-[#211a16]">
                  {row.dimension}
                </div>
                <div className="px-6 py-4 border-l border-[#eadfd5]/60">
                  <span className="text-sm text-rose-700/80 leading-relaxed font-medium">
                    {row.legacy.text}
                  </span>
                </div>
                <div className="px-6 py-4 border-l border-[#eadfd5]/60">
                  <span className="text-sm text-[#c25e1a] leading-relaxed font-semibold">
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
        className="relative bg-transparent py-28 px-6 overflow-hidden"
        id="architecture"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#f47b36] tracking-widest uppercase bg-[#f47b36]/10 border border-[#f47b36]/20 rounded-full px-4 py-1.5 mb-5 shadow-sm">
              <span className="mirror-text">🏗️ Core Architecture</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#211a16] mb-4">
              <span className="mirror-text">Four Pillars of</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 mirror-text">
                Absolute Fleet Precision
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
                  borderColor: "rgba(244,123,54,0.35)",
                }}
                className="group rounded-3xl border border-[#eadfd5] bg-white/80 backdrop-blur-xl p-7 cursor-default transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.03),inset_0_1px_0_0_rgba(255,255,255,0.9)] hover:bg-white/95"
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center text-2xl mb-5 shadow-lg`}
                  style={{ boxShadow: `0 8px 25px ${pillar.glow}` }}
                >
                  {pillar.icon}
                </div>

                <h3 className="text-xl font-black text-[#211a16] mb-3">
                  {pillar.title}
                </h3>
                <p className="text-[#64564c] text-sm leading-relaxed mb-5 font-normal">
                  {pillar.description}
                </p>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2">
                  {pillar.badges.map((b) => (
                    <span
                      key={b}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full text-[#c25e1a] bg-[#fff5ee] border border-[#f47b36]/25 font-mono shadow-sm`}
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
