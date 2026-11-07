"use client";

import { useRef, useState } from "react";
import Link from "next/link";

export function HeroSection() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tiltStyle, setTiltStyle] = useState("");

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const bounds = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width - 0.5;
    const y = (e.clientY - bounds.top) / bounds.height - 0.5;
    setTiltStyle(
      `rotateY(${-x * 8 - 3}deg) rotateX(${y * -5}deg) rotateZ(${-x * 1.2}deg)`,
    );
  };

  const handlePointerLeave = () => {
    setTiltStyle("");
  };

  return (
    <section className="hero page-width" id="top">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="live-dot" /> A BETTER WAY TO MOVE FLEET WORK FORWARD
        </div>
        <h1>
          Make fleet control
          <br />
          feel like <em>flow.</em>
        </h1>
        <p className="hero-intro">
          Bring your devices, servers, and edge nodes together. Let telemetry
          ingestion, anomaly detection, and self-healing daemons take care of
          themselves without dropping a single datapoint.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/auth/register">
            Build your first flow <span aria-hidden="true">↗</span>
          </Link>
          <a className="text-link" href="#how-it-works">
            <span className="play-icon" aria-hidden="true">
              ▶
            </span>{" "}
            See how it works
          </a>
        </div>
        <div className="hero-proof">
          <div className="avatar-stack" aria-hidden="true">
            <span>N</span>
            <span>O</span>
            <span>S</span>
            <span>+</span>
          </div>
          <p>
            <strong>MADE FOR YOUR FLEET</strong>
            <br />
            and the way you operate
          </p>
          <div className="proof-divider" />
          <p className="proof-stars">
            <span>★★★★★</span>
            <br />
            Make room for good work
          </p>
        </div>
      </div>

      <div
        className="hero-visual"
        aria-label="A live workflow automatically enrolling a new agent node"
      >
        <div className="visual-glow" />
        <div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="flow-window tilt-card"
          style={{
            transform: tiltStyle || undefined,
          }}
        >
          <div className="window-top">
            <div className="window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span className="window-title">
              FLOW / AGENT TELEMETRY PIPELINE
            </span>
            <span className="live-pill">
              <i /> LIVE
            </span>
          </div>

          <div className="flow-summary">
            <div>
              <span className="micro-label">RUNNING NOW</span>
              <strong>Node self-healing pipeline</strong>
            </div>
            <div className="flow-run-id">
              <span>RUN</span> #WF-8401
            </div>
          </div>

          <div className="flow-steps">
            <div className="flow-step step-one">
              <span className="step-node">
                <span>↙</span>
              </span>
              <span className="step-copy">
                <strong>Agent node enrolled</strong>
                <small>Agent Daemon · Node #10482</small>
              </span>
              <span className="step-time">09:41:02</span>
            </div>

            <div className="flow-step step-two">
              <span className="step-node">
                <span>✓</span>
              </span>
              <span className="step-copy">
                <strong>Check system telemetry</strong>
                <small>CPU, RAM & Thermal thresholds nominal</small>
              </span>
              <span className="step-state">PASSED</span>
            </div>

            <div className="flow-step step-three">
              <span className="step-node">
                <span>↗</span>
              </span>
              <span className="step-copy">
                <strong>Ingest telemetry stream</strong>
                <small>Realtime Engine · 100% synchronized</small>
              </span>
              <span className="step-state">SENT</span>
            </div>

            <div className="flow-step step-four">
              <span className="step-node">
                <span>✉</span>
              </span>
              <span className="step-copy">
                <strong>Verify node posture</strong>
                <small>Security Engine · Cryptographic identity valid</small>
              </span>
              <span className="step-state">DONE</span>
            </div>
          </div>

          <div className="flow-footer">
            <span className="flow-footer-mark">↗</span>
            <span>4 steps, 0 packet drops, 18ms latency</span>
            <span className="flow-footer-check">✓ ALL GOOD</span>
          </div>
        </div>

        <div className="float-note note-source">
          <span className="app-icon flow-source-icon">+</span>
          <span>
            <b>New node online</b>
            <small>Daemon handshake</small>
          </span>
          <i>↗</i>
        </div>

        <div className="float-note note-done">
          <span className="done-icon">✓</span>
          <span>
            <b>Posture clean</b>
            <small>zero manual intervention</small>
          </span>
        </div>

        <div className="visual-caption">
          <span className="caption-line" /> ONE WORKFLOW. START TO FINISH.
        </div>
      </div>
    </section>
  );
}
