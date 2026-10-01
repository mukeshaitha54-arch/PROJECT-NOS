"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef } from "react";

// CPU usage gauge ring
function GaugeRing({
  value,
  max = 100,
  size = 100,
  strokeWidth = 8,
  color,
  label,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  label: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / max) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-black text-lg tabular-nums">
            {value.toFixed(1)}
            <span className="text-xs font-normal text-slate-400">%</span>
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}

// Sparkline chart
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const width = 120;
  const height = 36;
  const pts = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * width},${height - (v / max) * height}`,
    )
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A single process row
function ProcessRow({
  pid,
  name,
  cpu,
  mem,
}: {
  pid: number;
  name: string;
  cpu: number;
  mem: string;
}) {
  const [c, setC] = useState(cpu);
  useEffect(() => {
    const t = setInterval(
      () =>
        setC((p) => Math.max(0, Math.min(99, p + (Math.random() - 0.5) * 5))),
      2000,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0 text-xs">
      <span className="text-slate-600 w-10 tabular-nums">{pid}</span>
      <span className="text-slate-300 flex-1 font-mono truncate">{name}</span>
      <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          animate={{ width: `${c}%` }}
          transition={{ duration: 1 }}
        />
      </div>
      <span className="text-blue-300 w-10 text-right tabular-nums">
        {c.toFixed(0)}%
      </span>
      <span className="text-slate-500 w-12 text-right">{mem}</span>
    </div>
  );
}

const INITIAL_PROCESSES = [
  { pid: 4872, name: "nos-agent.exe", cpu: 0.3, mem: "38MB" },
  { pid: 1920, name: "chrome.exe", cpu: 8.2, mem: "312MB" },
  { pid: 3416, name: "postgres.exe", cpu: 1.1, mem: "142MB" },
  { pid: 5128, name: "svchost.exe", cpu: 0.4, mem: "64MB" },
  { pid: 892, name: "winlogon.exe", cpu: 0.0, mem: "12MB" },
];

export function LiveTelemetryMockHud() {
  const [cpu, setCpu] = useState(18.5);
  const [ram, setRam] = useState(61.3);
  const [temp, setTemp] = useState(48.2);
  const [paused, setPaused] = useState(false);
  const [readSpeed, setReadSpeed] = useState(124.7);
  const [writeSpeed, setWriteSpeed] = useState(42.1);
  const [cpuHistory, setCpuHistory] = useState<number[]>([
    10, 15, 18, 22, 16, 20, 18, 14, 22, 18,
  ]);
  const [netUp, setNetUp] = useState(12.4);
  const [netDown, setNetDown] = useState(48.2);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setCpu((p) => Math.max(2, Math.min(95, p + (Math.random() - 0.5) * 12)));
      setRam((p) => Math.max(30, Math.min(92, p + (Math.random() - 0.5) * 4)));
      setTemp((p) => Math.max(35, Math.min(88, p + (Math.random() - 0.5) * 3)));
      setReadSpeed((p) =>
        Math.max(0, Math.min(2000, p + (Math.random() - 0.5) * 80)),
      );
      setWriteSpeed((p) =>
        Math.max(0, Math.min(500, p + (Math.random() - 0.5) * 30)),
      );
      setNetUp((p) =>
        Math.max(0, Math.min(100, p + (Math.random() - 0.5) * 6)),
      );
      setNetDown((p) =>
        Math.max(0, Math.min(1000, p + (Math.random() - 0.5) * 20)),
      );
      setCpuHistory((h) => [
        ...h.slice(-9),
        Math.max(2, Math.min(95, h[h.length - 1] + (Math.random() - 0.5) * 12)),
      ]);
    }, 1800);
    return () => clearInterval(interval);
  }, [paused]);

  const tempColor = temp < 60 ? "#34d399" : temp < 75 ? "#fbbf24" : "#f87171";
  const cpuColor = cpu < 60 ? "#60a5fa" : cpu < 80 ? "#fbbf24" : "#f87171";
  const ramColor = ram < 70 ? "#a78bfa" : ram < 85 ? "#fbbf24" : "#f87171";

  return (
    <section
      className="relative bg-slate-950 py-28 px-6 overflow-hidden"
      id="telemetry-engine"
    >
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 tracking-widest uppercase bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-5">
            ⚡ Live Telemetry Sandbox
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            This Is What{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              Real-Time Monitoring
            </span>{" "}
            Feels Like
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Every metric you see below updates live — identical to what appears
            on your fleet dashboard. Try pausing it.
          </p>
        </motion.div>

        {/* HUD Panel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/60"
        >
          {/* HUD Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 bg-slate-900/40">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-slate-400 text-xs font-mono">
                NOS Fleet Monitor — SHIVA
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${paused ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}
              >
                {paused ? "⏸ PAUSED" : "● LIVE"}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPaused((p) => !p)}
              className={`text-xs font-black px-4 py-2 rounded-xl transition-all duration-300 ${
                paused
                  ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                  : "bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30"
              }`}
            >
              {paused ? "▶ Resume Telemetry" : "⏸ Pause Telemetry"}
            </motion.button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Left: Gauges */}
            <div className="bg-slate-800/40 rounded-2xl border border-white/8 p-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">
                System Health
              </div>
              <div className="flex justify-around mb-6">
                <GaugeRing
                  value={cpu}
                  color={cpuColor}
                  label="CPU"
                  size={90}
                  strokeWidth={7}
                />
                <GaugeRing
                  value={ram}
                  color={ramColor}
                  label="RAM"
                  size={90}
                  strokeWidth={7}
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-[90px] h-[90px] flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-4 border-white/5 flex items-center justify-center">
                      <div className="text-center">
                        <div
                          className="font-black text-xl tabular-nums"
                          style={{ color: tempColor }}
                        >
                          {temp.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-slate-500">°C</div>
                      </div>
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: `0 0 ${temp > 70 ? 20 : 8}px ${tempColor}40`,
                      }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    Temp
                  </span>
                </div>
              </div>

              {/* CPU sparkline */}
              <div className="border-t border-white/8 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">
                    CPU History (5 min)
                  </span>
                  <span className="text-xs text-blue-400 font-bold">
                    {cpu.toFixed(1)}%
                  </span>
                </div>
                <Sparkline values={cpuHistory} color={cpuColor} />
              </div>
            </div>

            {/* Center: Disk & Network */}
            <div className="space-y-4">
              {/* Disk */}
              <div className="bg-slate-800/40 rounded-2xl border border-white/8 p-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  💽 Disk I/O
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: "Read",
                      value: readSpeed,
                      max: 2000,
                      color: "#60a5fa",
                      unit: "MB/s",
                    },
                    {
                      label: "Write",
                      value: writeSpeed,
                      max: 500,
                      color: "#a78bfa",
                      unit: "MB/s",
                    },
                  ].map(({ label, value, max, color, unit }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">{label}</span>
                        <span
                          className="font-bold tabular-nums"
                          style={{ color }}
                        >
                          {value.toFixed(1)} {unit}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: color }}
                          animate={{
                            width: `${Math.min(100, (value / max) * 100)}%`,
                          }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Network */}
              <div className="bg-slate-800/40 rounded-2xl border border-white/8 p-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                  🌐 Network
                </div>
                <div className="space-y-3">
                  {[
                    {
                      label: "Upload ↑",
                      value: netUp,
                      max: 100,
                      color: "#34d399",
                      unit: "Mbps",
                    },
                    {
                      label: "Download ↓",
                      value: netDown,
                      max: 1000,
                      color: "#22d3ee",
                      unit: "Mbps",
                    },
                  ].map(({ label, value, max, color, unit }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">{label}</span>
                        <span
                          className="font-bold tabular-nums"
                          style={{ color }}
                        >
                          {value.toFixed(1)} {unit}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: color }}
                          animate={{
                            width: `${Math.min(100, (value / max) * 100)}%`,
                          }}
                          transition={{ duration: 1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Live Processes */}
            <div className="bg-slate-800/40 rounded-2xl border border-white/8 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  ⚙️ Processes
                </div>
                <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                  247 running
                </span>
              </div>
              <div className="mb-2 flex items-center gap-2 text-[10px] text-slate-600 px-0 pb-1 border-b border-white/5">
                <span className="w-10">PID</span>
                <span className="flex-1">Name</span>
                <span className="w-14">CPU</span>
                <span className="w-10">CPU%</span>
                <span className="w-12 text-right">RAM</span>
              </div>
              {INITIAL_PROCESSES.map((p) => (
                <ProcessRow key={p.pid} {...p} />
              ))}
              <div className="pt-2 text-center text-xs text-slate-600">
                + 242 more processes...
              </div>
            </div>
          </div>

          {/* HUD Bottom Bar */}
          <div className="border-t border-white/8 px-6 py-3 bg-slate-900/30 flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span>⚡ Heartbeat: 30s cycle</span>
              <span>•</span>
              <span>📡 WebSocket: ACTIVE</span>
              <span>•</span>
              <span>🔒 Outbox: 0 pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`}
              />
              <span className="text-xs text-slate-500">
                {paused ? "Collection paused" : "Streaming live data"}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
