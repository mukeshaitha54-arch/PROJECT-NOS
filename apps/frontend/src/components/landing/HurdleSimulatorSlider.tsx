"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const STATES = [
  {
    id: "optimal",
    label: "OPTIMAL",
    sublabel: "All systems nominal",
    color: "emerald",
    icon: "🟢",
    description: "30s telemetry cycle active. All subsystems healthy.",
    details: [
      { key: "Agent CPU Usage", value: "0.2%", ok: true },
      { key: "Heartbeat", value: "LIVE (30s)", ok: true },
      { key: "Server Status", value: "CONNECTED", ok: true },
      { key: "Outbox Queue", value: "0 pending", ok: true },
      { key: "WebSocket", value: "ACTIVE", ok: true },
    ],
    diagram: "telemetry_flow_normal",
  },
  {
    id: "outage",
    label: "NETWORK OUTAGE",
    sublabel: "Server unreachable",
    color: "red",
    icon: "🔴",
    description:
      "NOS Agent detects server unavailability. Seamlessly switches to encrypted SQLite outbox. Zero data loss.",
    details: [
      { key: "Server Status", value: "UNREACHABLE", ok: false },
      { key: "Agent Mode", value: "OFFLINE BUFFER", ok: true },
      { key: "Outbox Queue", value: "48 buffered", ok: true },
      { key: "Data Loss", value: "ZERO", ok: true },
      { key: "Last Telemetry", value: "Cached locally", ok: true },
    ],
    diagram: "telemetry_flow_outage",
  },
  {
    id: "recovery",
    label: "RECOVERY",
    sublabel: "Auto-drain complete",
    color: "blue",
    icon: "🔵",
    description:
      "Connectivity restored. Outbox dispatcher auto-drains all buffered telemetry in FIFO order without flooding.",
    details: [
      { key: "Server Status", value: "RECONNECTED", ok: true },
      { key: "Outbox Drain", value: "48/48 synced", ok: true },
      { key: "Flush Rate", value: "Rate-limited", ok: true },
      { key: "WebSocket", value: "RESTORED", ok: true },
      { key: "Data Integrity", value: "100%", ok: true },
    ],
    diagram: "telemetry_flow_recovery",
  },
];

function FlowDiagram({
  stateId,
  colorClass,
}: {
  stateId: string;
  colorClass: string;
}) {
  const nodes = [
    { id: "agent", label: "NOS Agent", sublabel: "Windows Service" },
    { id: "outbox", label: "SQLite Outbox", sublabel: "Encrypted Buffer" },
    { id: "server", label: "NOS Backend", sublabel: "API + WebSocket" },
    { id: "dash", label: "Dashboard", sublabel: "Real-time UI" },
  ];

  const links = [
    { from: 0, to: 1, active: stateId !== "optimal", label: "Buffer" },
    { from: 0, to: 2, active: stateId === "optimal", label: "POST /telemetry" },
    { from: 1, to: 2, active: stateId === "recovery", label: "Drain FIFO" },
    { from: 2, to: 3, active: stateId !== "outage", label: "WebSocket" },
  ];

  return (
    <div className="relative flex items-center justify-between gap-2 px-4 py-6">
      {nodes.map((n, i) => (
        <div key={n.id} className="flex flex-col items-center gap-1 z-10">
          <motion.div
            animate={{
              borderColor:
                stateId === "outage" && n.id === "server"
                  ? "#f87171"
                  : stateId !== "optimal" && n.id === "outbox"
                    ? "#60a5fa"
                    : "rgba(255,255,255,0.12)",
              boxShadow:
                stateId === "outage" && n.id === "server"
                  ? "0 0 15px rgba(248,113,113,0.3)"
                  : stateId !== "optimal" && n.id === "outbox"
                    ? "0 0 15px rgba(96,165,250,0.3)"
                    : "none",
            }}
            className="w-16 h-14 rounded-xl border-2 bg-slate-800/60 flex flex-col items-center justify-center"
          >
            <span className="text-[10px] font-bold text-white text-center leading-tight">
              {n.label}
            </span>
          </motion.div>
          <span className="text-[9px] text-slate-600 text-center">
            {n.sublabel}
          </span>
        </div>
      ))}

      {/* Connection lines drawn as SVG overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        {links.map((link, i) => {
          const fromX = (link.from / (nodes.length - 1)) * 100;
          const toX = (link.to / (nodes.length - 1)) * 100;
          return (
            <motion.line
              key={i}
              x1={`${fromX}%`}
              y1="50%"
              x2={`${toX}%`}
              y2="50%"
              stroke={
                link.active
                  ? stateId === "outage" && link.to === 2
                    ? "#f87171"
                    : "#60a5fa"
                  : "rgba(255,255,255,0.06)"
              }
              strokeWidth={link.active ? "2" : "1"}
              strokeDasharray={link.active ? "none" : "4 4"}
              animate={{ opacity: link.active ? 1 : 0.3 }}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function HurdleSimulatorSlider() {
  const [stateIdx, setStateIdx] = useState(0);
  const current = STATES[stateIdx];

  const colorMap: Record<
    string,
    { text: string; bg: string; border: string; btn: string }
  > = {
    emerald: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      btn: "bg-emerald-500 hover:bg-emerald-400",
    },
    red: {
      text: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      btn: "bg-red-500 hover:bg-red-400",
    },
    blue: {
      text: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      btn: "bg-blue-500 hover:bg-blue-400",
    },
  };
  const c = colorMap[current.color];

  return (
    <section className="relative bg-gradient-to-b from-slate-950 to-slate-900 py-28 px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 text-xs font-bold text-violet-400 tracking-widest uppercase bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
            🛡️ The Hurdle Engine
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            When Networks Fail,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
              NOS Persists
            </span>
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Drag through the three operational states and see how NOS handles
            every hurdle — from peak performance to full network outage and
            seamless recovery.
          </p>
        </motion.div>

        {/* Stage selector */}
        <div className="flex justify-center gap-4 mb-10">
          {STATES.map((s, i) => {
            const sc = colorMap[s.color];
            return (
              <motion.button
                key={s.id}
                onClick={() => setStateIdx(i)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border font-bold text-sm transition-all duration-300 ${
                  stateIdx === i
                    ? `${sc.bg} ${sc.border} ${sc.text}`
                    : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* State content panel */}
        <AnimateStatePanel state={current} colors={c} />

        {/* Step counter & navigation */}
        <div className="flex items-center justify-center gap-6 mt-8">
          <button
            onClick={() => setStateIdx((i) => Math.max(0, i - 1))}
            disabled={stateIdx === 0}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
          >
            ← Previous
          </button>
          <div className="flex gap-2">
            {STATES.map((_, i) => (
              <button
                key={i}
                onClick={() => setStateIdx(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${stateIdx === i ? "bg-blue-500 scale-125" : "bg-white/15 hover:bg-white/30"}`}
              />
            ))}
          </div>
          <button
            onClick={() =>
              setStateIdx((i) => Math.min(STATES.length - 1, i + 1))
            }
            disabled={stateIdx === STATES.length - 1}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm font-semibold"
          >
            Next →
          </button>
        </div>
      </div>
    </section>
  );
}

function AnimateStatePanel({
  state,
  colors,
}: {
  state: (typeof STATES)[0];
  colors: { text: string; bg: string; border: string; btn: string };
}) {
  return (
    <motion.div
      key={state.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.45 }}
      className={`rounded-3xl border ${colors.border} ${colors.bg} backdrop-blur-xl overflow-hidden`}
    >
      <div className="p-6 grid md:grid-cols-2 gap-6">
        {/* Left: Status details */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{state.icon}</span>
            <div>
              <div className={`text-lg font-black ${colors.text}`}>
                {state.label}
              </div>
              <div className="text-slate-500 text-sm">{state.sublabel}</div>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-5">
            {state.description}
          </p>
          <div className="space-y-2">
            {state.details.map((d) => (
              <div
                key={d.key}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-xs text-slate-500">{d.key}</span>
                <span
                  className={`text-xs font-bold ${d.ok ? "text-emerald-400" : "text-red-400"}`}
                >
                  {d.ok ? "✓" : "✕"} {d.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Flow diagram */}
        <div className="bg-slate-900/50 rounded-2xl border border-white/8 flex flex-col justify-center overflow-hidden">
          <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            Data Flow Diagram
          </div>
          <FlowDiagram stateId={state.id} colorClass={colors.text} />
        </div>
      </div>
    </motion.div>
  );
}
