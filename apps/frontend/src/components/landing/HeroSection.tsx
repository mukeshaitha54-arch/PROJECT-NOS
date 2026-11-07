"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { MirrorText } from "@/components/ui/MirrorText";

const HERO_WORDS = ["UNBREAKABLE", "RESILIENT", "HIGH-VELOCITY", "AUTONOMOUS"];

const SLIDING_ITEMS = [
  { label: "CPU 27.4% NOMINAL", icon: "⚡", glow: "text-orange-500" },
  { label: "RAM 4.1GB / 16GB", icon: "🧠", glow: "text-amber-500" },
  { label: "OUTBOX 0 PENDING (HEALTHY)", icon: "🛡️", glow: "text-emerald-500" },
  { label: "HEARTBEAT 30s INTERVAL", icon: "⏱️", glow: "text-rose-500" },
  { label: "ENCRYPTION TLSv1.3 AES-GCM", icon: "🔒", glow: "text-cyan-500" },
  { label: "SOCKET CONNECTED", icon: "📡", glow: "text-emerald-400" },
  { label: "AGENT v1.0.0 RUNNING", icon: "🚀", glow: "text-orange-400" },
  { label: "PLATFORM WIN11 X64", icon: "💻", glow: "text-indigo-400" },
];

export function HeroSection() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tiltStyle, setTiltStyle] = useState("");
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setWordIdx((i) => (i + 1) % HERO_WORDS.length),
      2400,
    );
    return () => clearInterval(t);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const bounds = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width - 0.5;
    const y = (e.clientY - bounds.top) / bounds.height - 0.5;
    setTiltStyle(
      `rotateY(${-x * 12 - 3}deg) rotateX(${y * -8}deg) rotateZ(${-x * 1.5}deg)`,
    );
  };

  const handlePointerLeave = () => {
    setTiltStyle("");
  };

  return (
    <section className="hero page-width" id="top">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="live-dot" />{" "}
          <span className="mirror-text">NETWORK OPERATIONS SENTINEL</span>{" "}
          <span className="text-[#f47b36] font-mono">{"//"}</span>{" "}
          <span className="mirror-text">v2.0 TITANIUM</span>
        </div>

        <h1 className="tracking-tight">
          <span className="block">
            <MirrorText>BUILT FOR THE</MirrorText>
          </span>
          <span className="block mt-1 text-[#f47b36]">
            <em>
              <MirrorText>{HERO_WORDS[wordIdx]}</MirrorText>
            </em>
          </span>
        </h1>

        <p className="hero-intro">
          High-performance Windows fleet telemetry engineered in native C# with{" "}
          <strong className="text-[#f47b36] font-semibold mirror-text">
            zero-loss SQLite outbox failover
          </strong>
          , sub-second WebSocket dispatch, and predictive hardware wear
          telemetry.
        </p>

        <div className="hero-actions">
          <Link className="button button-primary" href="/auth/register">
            <span className="mirror-text">Deploy Sentinel Agent</span>{" "}
            <span aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="/dashboard">
            <span className="play-icon" aria-hidden="true">
              ▶
            </span>{" "}
            <span className="mirror-text">Open Command Deck</span>
          </Link>
        </div>

        <div className="hero-proof">
          <div className="avatar-stack" aria-hidden="true">
            <span>N</span>
            <span>O</span>
            <span>S</span>
            <span>+</span>
          </div>
          <p>
            <strong className="mirror-text">NATIVE C# & GO TELEMETRY</strong>
            <br />
            <span className="mirror-text">Sub-second push · 0 data loss</span>
          </p>
          <div className="proof-divider" />
          <p className="proof-stars">
            <span>★★★★★</span>
            <br />
            <span className="mirror-text">Enterprise Fleet Resilient</span>
          </p>
        </div>
      </div>

      <div
        className="hero-visual"
        aria-label="Real-time NOS Agent Telemetry & Outbox Cockpit"
      >
        <div className="visual-glow" />
        <div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="flow-window tilt-card"
          style={{
            transform: tiltStyle || undefined,
            transition: tiltStyle
              ? "transform 0.1s ease-out"
              : "transform 0.5s ease-out",
          }}
        >
          <div className="window-top">
            <div className="window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span className="window-title mirror-text">
              NOS {"//"} AGENT TELEMETRY COCKPIT
            </span>
            <span className="live-pill">
              <i /> LIVE
            </span>
          </div>

          <div className="flow-summary">
            <div>
              <span className="micro-label mirror-text">MONITORED NODE</span>
              <strong className="mirror-text">
                SHIVA (Win11 x64 · Online)
              </strong>
            </div>
            <div className="flow-run-id">
              <span>AGENT</span> #v1.0.0
            </div>
          </div>

          <div className="flow-steps">
            <div className="flow-step step-one">
              <span className="step-node">
                <span>⚡</span>
              </span>
              <span className="step-copy">
                <strong className="mirror-text">
                  CPU Core Allocation: 27.4%
                </strong>
                <small className="mirror-text">
                  Multi-core PerfCounters · 30s cycle
                </small>
              </span>
              <span className="step-time">NOMINAL</span>
            </div>

            <div className="flow-step step-two">
              <span className="step-node">
                <span>🧠</span>
              </span>
              <span className="step-copy">
                <strong className="mirror-text">
                  RAM Buffer Saturation: 4.1 / 16 GB
                </strong>
                <small className="mirror-text">
                  Paged pool & commit charge balanced
                </small>
              </span>
              <span className="step-state">PASSED</span>
            </div>

            <div className="flow-step step-three">
              <span className="step-node">
                <span>🛡️</span>
              </span>
              <span className="step-copy">
                <strong className="mirror-text">
                  SQLite Outbox Failover: 0 Pending
                </strong>
                <small className="mirror-text">
                  WAL journal enabled · Zero-loss armed
                </small>
              </span>
              <span className="step-state">SYNCED</span>
            </div>

            <div className="flow-step step-four">
              <span className="step-node">
                <span>🔒</span>
              </span>
              <span className="step-copy">
                <strong className="mirror-text">
                  Cryptographic Posture & Token
                </strong>
                <small className="mirror-text">
                  TLSv1.3 AES-GCM · SHA-256 node token
                </small>
              </span>
              <span className="step-time">SECURE</span>
            </div>
          </div>

          <div className="flow-footer">
            <span className="foot-chip mirror-text">30s Heartbeat</span>
            <span className="foot-chip mirror-text">WebSocket TLS</span>
            <span className="foot-chip mirror-text">AOT Compiled</span>
          </div>
        </div>
      </div>

      {/* Full-width Cinematic Sliding Telemetry Capsule Marquee Rail */}
      <div
        className="w-full mt-14 overflow-hidden py-3.5 border-y border-[#eadfd5]/80 bg-white/40 backdrop-blur-md select-none rounded-2xl shadow-sm"
        style={{ gridColumn: "1 / -1" }}
      >
        <div className="flex gap-5 animate-marquee whitespace-nowrap">
          {[
            ...SLIDING_ITEMS,
            ...SLIDING_ITEMS,
            ...SLIDING_ITEMS,
            ...SLIDING_ITEMS,
          ].map((item, idx) => (
            <div
              key={idx}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/90 border border-[#eadfd5] shadow-sm text-xs font-mono font-medium text-[#2d241d] hover:border-[#f47b36] hover:text-[#f47b36] hover:scale-105 transition-all duration-200 cursor-default"
            >
              <span className="text-sm">{item.icon}</span>
              <span className="mirror-text font-bold tracking-tight">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
