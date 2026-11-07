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
    color: "orange",
  },
  {
    step: "02",
    icon: "🔑",
    title: "Authenticate Agent",
    desc: "The agent receives a cryptographically unique SHA-256 token. It registers to your organization's fleet instantly.",
    code: "NOS-Agent.exe --register --key <your-fleet-key>",
    color: "crimson",
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
    color: "amber",
  },
];

const colorMap: Record<
  string,
  { badge: string; codeBorder: string; codeText: string }
> = {
  orange: {
    badge: "bg-orange-500/15 border-orange-500/30 text-orange-300",
    codeBorder: "border-orange-500/20",
    codeText: "text-orange-200",
  },
  crimson: {
    badge: "bg-rose-500/15 border-rose-500/30 text-rose-300",
    codeBorder: "border-rose-500/20",
    codeText: "text-rose-200",
  },
  emerald: {
    badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
    codeBorder: "border-emerald-500/20",
    codeText: "text-emerald-200",
  },
  amber: {
    badge: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    codeBorder: "border-amber-500/20",
    codeText: "text-amber-200",
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
        className="relative bg-transparent py-28 px-6 overflow-hidden"
        id="installer"
      >
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#f47b36] tracking-widest uppercase bg-[#f47b36]/10 border border-[#f47b36]/20 rounded-full px-4 py-1.5 mb-5 shadow-sm">
              <span className="mirror-text">🚀 Rapid Deployment</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-[#211a16] mb-4">
              <span className="mirror-text">Zero to</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 mirror-text">
                Fleet Monitoring
              </span>{" "}
              <span className="mirror-text">in 5 Minutes</span>
            </h2>
            <p className="text-[#64564c] text-lg max-w-xl mx-auto mirror-text">
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
                  className="flex gap-5 rounded-3xl border border-white/[0.08] bg-[#111217]/70 backdrop-blur-sm p-6 hover:border-white/15 hover:bg-[#15161c]/80 transition-all duration-300 shadow-xl"
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
                      className={`rounded-xl border ${c.codeBorder} bg-black/50 p-3`}
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
      <section className="relative bg-gradient-to-b from-[#090a0d] to-[#0c0d10] py-20 px-6 border-t border-white/[0.06]">
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
                <span className="text-3xl font-black text-white tracking-tight font-mono">
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
      <section className="relative bg-transparent py-28 px-6 overflow-hidden border-t border-[#eadfd5]">
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#f47b36] tracking-widest uppercase bg-[#f47b36]/10 border border-[#f47b36]/20 rounded-full px-4 py-1.5 mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="mirror-text">Ready to Deploy</span>
            </div>

            <h2 className="text-5xl md:text-7xl font-black text-[#211a16] leading-[0.92] tracking-tight mb-6">
              <span className="mirror-text">TAKE COMMAND OF</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 mirror-text">
                YOUR ENTIRE FLEET
              </span>
            </h2>

            <p className="text-[#64564c] text-lg mb-10 max-w-xl mx-auto mirror-text">
              NOS turns every Windows machine into a transparent, observable,
              controllable node. Start with one device. Scale to thousands.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <motion.button
                  whileHover={{
                    scale: 1.04,
                    boxShadow: "0 0 50px rgba(244,123,54,0.4)",
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-black text-lg transition-all duration-300 shadow-2xl shadow-orange-500/30 active:scale-[0.97]"
                >
                  <span className="mirror-text">🚀 Launch Fleet Console →</span>
                </motion.button>
              </Link>
              <Link href="/auth/login">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-10 py-4 rounded-2xl border border-[#eadfd5] bg-white text-[#211a16] font-bold text-lg hover:bg-[#fff7f0] hover:border-[#f47b36]/40 transition-all duration-300 active:scale-[0.97] shadow-sm"
                >
                  <span className="mirror-text">Sign In to Dashboard</span>
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
