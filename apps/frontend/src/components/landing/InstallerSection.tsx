"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const STEPS = [
  {
    step: "01",
    icon: "📥",
    title: "Run the Installer",
    desc: "One PowerShell command. The MSI-based installer silently registers NOS Agent as a Windows service with auto-start on boot.",
    code: "iex ((New-Object System.Net.WebClient).DownloadString('https://nos.is-local.org/install'))",
    color: "blue",
  },
  {
    step: "02",
    icon: "🔑",
    title: "Authenticate Agent",
    desc: "The agent receives a cryptographically unique SHA-256 token. It registers to your organization's fleet instantly.",
    code: "NOS-Agent.exe --register --key <your-fleet-key>",
    color: "violet",
  },
  {
    step: "03",
    icon: "📡",
    title: "Telemetry Begins",
    desc: "Metrics start streaming to your dashboard in real time. Even if connectivity fails, outbox queuing keeps every single datapoint safe.",
    code: "// Agent auto-starts. No restart needed.\nStatus: LIVE — Telemetry streaming...",
    color: "emerald",
  },
  {
    step: "04",
    icon: "📊",
    title: "Control Your Fleet",
    desc: "Manage all devices from the NOS Fleet Console. Pause telemetry, view crash logs, inspect S.M.A.R.T., trigger commands — all from one screen.",
    code: "// Dashboard: https://nos.is-local.org/dashboard\nDevices: 1 online | 0 offline | 0 alerts",
    color: "cyan",
  },
];

const colorMap: Record<
  string,
  { badge: string; codeBorder: string; codeText: string }
> = {
  blue: {
    badge: "bg-blue-500/15 border-blue-500/30 text-blue-300",
    codeBorder: "border-blue-500/20",
    codeText: "text-blue-200",
  },
  violet: {
    badge: "bg-violet-500/15 border-violet-500/30 text-violet-300",
    codeBorder: "border-violet-500/20",
    codeText: "text-violet-200",
  },
  emerald: {
    badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    codeBorder: "border-emerald-500/20",
    codeText: "text-emerald-200",
  },
  cyan: {
    badge: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
    codeBorder: "border-cyan-500/20",
    codeText: "text-cyan-200",
  },
};

const STATS = [
  { value: "< 40MB", label: "Agent RAM footprint", icon: "💡" },
  { value: "0.2%", label: "Average CPU impact", icon: "⚡" },
  { value: "30s", label: "Telemetry cycle period", icon: "🔄" },
  { value: "∞", label: "Offline buffer capacity", icon: "💾" },
  { value: "100%", label: "Data integrity on reconnect", icon: "🛡️" },
  { value: "< 1s", label: "Pause/Resume latency", icon: "⏱️" },
];

export function InstallerSection() {
  return (
    <>
      {/* How It Works */}
      <section
        className="relative bg-slate-950 py-28 px-6 overflow-hidden"
        id="installer"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.06)_0%,transparent_60%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-cyan-400 tracking-widest uppercase bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-1.5 mb-5">
              🚀 Get Started in 4 Steps
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Zero to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                Fleet Monitoring
              </span>{" "}
              in 5 Minutes
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              No bloat. No reboots. No configuration hell. NOS is designed to be
              operational in under 5 minutes from first download.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="space-y-6">
            {STEPS.map((step, i) => {
              const c = colorMap[step.color];
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12, duration: 0.6 }}
                  className="flex gap-5 rounded-3xl border border-white/8 bg-slate-900/50 backdrop-blur-sm p-6 hover:border-white/15 hover:bg-slate-900/70 transition-all duration-300"
                >
                  {/* Step badge */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-12 h-12 rounded-2xl border ${c.badge} flex items-center justify-center font-black text-sm`}
                    >
                      {step.step}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{step.icon}</span>
                      <h3 className="text-white font-black text-lg">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-slate-400 text-sm mb-3 leading-relaxed">
                      {step.desc}
                    </p>
                    {/* Code block */}
                    <div
                      className={`rounded-xl border ${c.codeBorder} bg-black/40 p-3`}
                    >
                      <pre
                        className={`font-mono text-xs ${c.codeText} whitespace-pre-wrap break-all`}
                      >
                        {step.code}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats row */}
      <section className="relative bg-gradient-to-b from-slate-950 to-slate-900 py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="flex flex-col items-center text-center gap-1 py-4"
              >
                <span className="text-2xl mb-1">{stat.icon}</span>
                <span className="text-3xl font-black text-white tracking-tight">
                  {stat.value}
                </span>
                <span className="text-xs text-slate-500 leading-tight">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative bg-slate-900 py-28 px-6 overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-violet-600/5 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.12)_0%,transparent_70%)] pointer-events-none" />

        {/* Glow rings */}
        {[200, 350, 500].map((r, i) => (
          <motion.div
            key={r}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-500/10 pointer-events-none"
            style={{ width: r, height: r }}
            animate={{ scale: [1, 1.04, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{
              duration: 4 + i * 1.5,
              repeat: Infinity,
              delay: i * 0.8,
            }}
          />
        ))}

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 tracking-widest uppercase bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Ready to Deploy
            </div>

            <h2 className="text-5xl md:text-7xl font-black text-white leading-[0.92] tracking-tight mb-6">
              TAKE COMMAND OF
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-400">
                YOUR ENTIRE FLEET
              </span>
            </h2>

            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
              NOS turns every Windows machine into a transparent, observable,
              controllable node. Start with one device. Scale to thousands.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <motion.button
                  whileHover={{
                    scale: 1.06,
                    boxShadow: "0 0 60px rgba(59,130,246,0.6)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black text-lg transition-all duration-300 shadow-2xl shadow-blue-500/30"
                >
                  🚀 Launch Fleet Console →
                </motion.button>
              </Link>
              <Link href="/auth/login">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-2xl border border-white/15 bg-white/5 text-white font-bold text-lg hover:bg-white/10 hover:border-white/25 transition-all duration-300"
                >
                  Sign In to Dashboard
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
