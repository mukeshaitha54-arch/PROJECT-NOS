"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useAuth } from "@/contexts/auth-context";
import "@/styles/swarm-rebuild.css";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [copyStatus, setCopyStatus] = useState("");

  const bootstrapCommand =
    'powershell -ExecutionPolicy Bypass -Command "iwr -useb http://x.nos.is-local.org/api/fleet/installer/bootstrap.ps1 | iex"';

  useEffect(() => {
    document.documentElement.classList.add("landing-active");
    document.body.classList.add("landing-page");
    return () => {
      document.documentElement.classList.remove("landing-active");
      document.body.classList.remove("landing-page");
      if (
        typeof window !== "undefined" &&
        (window as any).SwarmRebuild?.destroy
      ) {
        (window as any).SwarmRebuild.destroy();
      }
    };
  }, []);

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(bootstrapCommand);
      setCopyStatus("Copied!");
    } catch {
      const selection = document.createElement("textarea");
      selection.value = bootstrapCommand;
      selection.setAttribute("readonly", "");
      selection.style.position = "fixed";
      selection.style.opacity = "0";
      document.body.append(selection);
      selection.select();
      const copied = document.execCommand("copy");
      selection.remove();
      if (copied) {
        setCopyStatus("Copied!");
      } else {
        setCopyStatus("Failed to copy");
      }
    }
    setTimeout(() => {
      setCopyStatus("");
    }, 1800);
  };

  const handleReplay = () => {
    if (typeof window !== "undefined" && (window as any).SwarmRebuild?.replay) {
      (window as any).SwarmRebuild.replay();
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0A0B0E] text-[#ECEEF4] overflow-x-hidden selection:bg-[#3D8BFF] selection:text-white">
      {/* 1. Swarm Rebuild Autonomous Engine */}
      <Script
        src="/swarm-rebuild.js"
        data-agents="14"
        data-bg="#0A0B0E"
        data-accent="#3D8BFF"
        strategy="afterInteractive"
      />

      {/* Header */}
      <header className="site-header page-width">
        <Link
          className="brand"
          href="#top"
          aria-label="NOS Sentinel — Network Operations System"
        >
          <svg
            className="brand-mark"
            data-sr-logo
            viewBox="0 0 26 26"
            role="img"
            aria-label="NOS Sentinel logo"
          >
            <rect
              x="2.5"
              y="2.5"
              width="21"
              height="21"
              rx="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
            <path
              d="M9 7.5v9l2.8-2.8 2.1 4.5 2-1-2.1-4.4h3.8L9 7.5Z"
              fill="currentColor"
            />
          </svg>
          <span>NOS Sentinel</span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#how-it-works">Architecture</a>
          <a href="#this-page">Performance</a>
          <a href="#what-gets-built">Telemetry Deck</a>
          <a href="#install">Deploy Agent</a>
        </nav>
        <Link
          className="button button-light header-button"
          href={isAuthenticated ? "/dashboard" : "/auth/login"}
        >
          {isAuthenticated ? "Open Console" : "Launch Console"}{" "}
          <span aria-hidden="true">↗</span>
        </Link>
      </header>

      {/* Main Content */}
      <main id="top">
        {/* Hero Section */}
        <section
          className="hero page-width section-shell"
          aria-labelledby="hero-title"
        >
          <p className="eyebrow" data-sr-eyebrow>
            Enterprise Fleet Telemetry &amp; Hardware Reliability
          </p>
          <h1 id="hero-title">
            High-performance Windows fleet telemetry engineered in native C#
            with zero-loss SQLite outbox failover.
          </h1>
          <p className="lead">
            Sub-second WebSocket dispatch, multi-sample hardware
            instrumentation, S.M.A.R.T. NVMe predictive wear analytics, and
            kernel crash watchdog across every endpoint.
          </p>
          <div className="hero-actions">
            <Link
              className="button button-primary"
              href={isAuthenticated ? "/dashboard" : "/auth/login"}
            >
              Open Command Deck
            </Link>
            <a className="button button-ghost" href="#install">
              Deploy Silent Agent
            </a>
          </div>

          {/* Interactive Editor Preview Mockup Frame */}
          <div
            className="editor-preview"
            data-sr-editor
            role="region"
            aria-label="NOS Sentinel Live Cockpit Editor"
          >
            <div className="editor-chrome">
              <div
                className="chrome-dots"
                aria-hidden="true"
                onClick={handleReplay}
                title="Click to replay telemetry swarm"
              >
                <span />
                <span />
                <span />
              </div>
              <div className="chrome-filename">
                NOS-Sentinel-v2.4.1 // Host: SHIVA-WIN11-PRO // Sub-Second
                WebSocket: CONNECTED
              </div>
              <div className="chrome-spacer" aria-hidden="true" />
            </div>

            <div className="editor-body">
              <aside
                className="editor-layers"
                aria-label="Active Telemetry Subsystems"
              >
                <div className="layers-header">
                  <span>Subsystems</span>
                  <span className="pill">5 Active</span>
                </div>
                <ul className="layers-list">
                  <li className="layer-item is-active">
                    <span className="layer-dot" />
                    <span className="layer-name">Ring-0 CPU PerfCounters</span>
                  </li>
                  <li className="layer-item">
                    <span className="layer-dot" />
                    <span className="layer-name">Zero-Loss SQLite Outbox</span>
                  </li>
                  <li className="layer-item">
                    <span className="layer-dot" />
                    <span className="layer-name">Bidirectional WebSocket</span>
                  </li>
                  <li className="layer-item">
                    <span className="layer-dot" />
                    <span className="layer-name">
                      S.M.A.R.T. NVMe Wear Sentry
                    </span>
                  </li>
                  <li className="layer-item">
                    <span className="layer-dot" />
                    <span className="layer-name">
                      Crash &amp; BSOD Watchdog
                    </span>
                  </li>
                </ul>
              </aside>

              <div
                className="editor-canvas"
                role="img"
                aria-label="Real-time telemetry node metrics"
              >
                <div className="canvas-card">
                  <div className="canvas-card-header">
                    <div className="canvas-card-title">
                      <span className="status-indicator" />
                      <span>Node: SHIVA // AMD Ryzen 9 5900X (12C/24T)</span>
                    </div>
                    <span className="canvas-tag">30s Heartbeat</span>
                  </div>
                  <div className="canvas-card-body">
                    <div className="metric-row">
                      <span className="metric-label">
                        CPU Load (Multi-sample Avg)
                      </span>
                      <span className="metric-value">27.4% Nominal</span>
                    </div>
                    <div className="metric-bar">
                      <div
                        className="metric-bar-fill"
                        style={{ width: "27.4%" }}
                      />
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">
                        RAM Buffer Saturation
                      </span>
                      <span className="metric-value">
                        4.1 / 16.0 GB (25.6%)
                      </span>
                    </div>
                    <div className="metric-bar">
                      <div
                        className="metric-bar-fill"
                        style={{ width: "25.6%" }}
                      />
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">
                        NVMe Wear Life &amp; Temp
                      </span>
                      <span className="metric-value">
                        98% Health // 42°C (Samsung 980 PRO)
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">
                        Local SQLite Outbox Queue
                      </span>
                      <span className="metric-value">
                        0 Pending // WAL Clean (Zero Lost)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="how page-width section-shell"
          aria-labelledby="how-title"
        >
          <p className="eyebrow" data-sr-eyebrow>
            End-to-End Architectural Pipeline
          </p>
          <h2 id="how-title">
            Engineered from hardware counters to central cockpit without a
            single dropped packet.
          </h2>
          <div className="how-grid">
            <article className="step-card">
              <span className="step-number" aria-hidden="true">
                01
              </span>
              <h3>Native C# AOT Hardware Instrumentation</h3>
              <p>
                Compiled directly into standalone native machine code via .NET
                Native AOT. Zero CLR runtime overhead, sub-40MB resident memory
                footprint, and negligible 0.2% CPU utilization across
                high-concurrency enterprise workloads.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number" aria-hidden="true">
                02
              </span>
              <h3>Encrypted SQLite Outbox &amp; Offline Buffering</h3>
              <p>
                When network connectivity or VPN links drop, telemetry events
                are atomically staged into a local SQLite database in WAL
                journal mode. Zero dropped metrics, zero memory leaks, and
                seamless sub-second drain upon reconnect.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number" aria-hidden="true">
                03
              </span>
              <h3>Sub-Second WebSocket Dispatch &amp; Fleet Analytics</h3>
              <p>
                Bidirectional WebSocket multiplexing transmits multi-sample CPU,
                RAM, thermal metrics, and storage telemetry directly to your
                command console with zero polling latency.
              </p>
            </article>
          </div>
        </section>

        {/* This Page / Enterprise Performance Audit Section (Raw on background, no white bar, no orange) */}
        <section
          id="this-page"
          className="this-page page-width section-shell"
          aria-labelledby="stats-title"
        >
          <p className="eyebrow" data-sr-eyebrow>
            Enterprise Performance Audit
          </p>
          <h2 id="stats-title">
            Lightweight by design. Uncompromising on reliability.
          </h2>
          <p className="lead">
            Every metric below is backed by native kernel performance benchmarks
            and production stress testing.
          </p>

          <dl className="stats-list">
            <div className="stat">
              <dt className="stat-label">Agent RAM Footprint</dt>
              <dd className="stat-value">&lt; 40MB</dd>
              <p className="stat-note">
                Native AOT resident memory working set
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">Average CPU Impact</dt>
              <dd className="stat-value">0.2%</dd>
              <p className="stat-note">
                Multi-core performance counter aggregation
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">Telemetry Cycle Period</dt>
              <dd className="stat-value">30s</dd>
              <p className="stat-note">
                Multi-sample rolling average heartbeats
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">Offline Buffer Capacity</dt>
              <dd className="stat-value">∞</dd>
              <p className="stat-note">
                Local encrypted SQLite database in WAL mode
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">Data Integrity on Reconnect</dt>
              <dd className="stat-value">100%</dd>
              <p className="stat-note">
                Ordered transaction drain with checksum ACK
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">Pause/Resume Latency</dt>
              <dd className="stat-value">&lt; 1s</dd>
              <p className="stat-note">
                Dynamic non-destructive telemetry throttling
              </p>
            </div>
          </dl>
        </section>

        {/* What Gets Built / Hardware Sentry Capabilities Section */}
        <section
          id="what-gets-built"
          className="built page-width section-shell"
          aria-labelledby="built-title"
        >
          <p className="eyebrow" data-sr-eyebrow>
            Hardware Sentry Capabilities
          </p>
          <h2 id="built-title">
            Deep hardware visibility that standard device managers miss.
          </h2>
          <div className="built-grid">
            <article className="built-card">
              <div className="built-badge">Storage Sentry</div>
              <h3>S.M.A.R.T. Predictive Hardware Wear &amp; NVMe Life</h3>
              <p>
                Continuously tracks SSD spare blocks, media degradation,
                temperature thresholds, and warns you before drive failure
                occurs.
              </p>
            </article>

            <article className="built-card">
              <div className="built-badge">Crash Watchdog</div>
              <h3>Kernel Crash &amp; BSOD Watchdog (Event ID 41 &amp; 1001)</h3>
              <p>
                Instant detection of abnormal shutdowns, power loss, and
                blue-screen crash events with automatic mini-dump stack trace
                capture.
              </p>
            </article>

            <article className="built-card">
              <div className="built-badge">Zero-Trust</div>
              <h3>Zero-Trust SHA-256 Node Tokens &amp; Mutual Auth</h3>
              <p>
                Every agent instance is cryptographically registered with signed
                SHA-256 hardware fingerprinted credentials over TLS v1.3.
              </p>
            </article>

            <article className="built-card">
              <div className="built-badge">Live Control</div>
              <h3>Instant Sub-Second Fleet Control Deck</h3>
              <p>
                Execute remote diagnostics, manage telemetry intervals, assign
                organizational tags, and push remediation scripts in real time.
              </p>
            </article>
          </div>
        </section>

        {/* Silent PowerShell Deployment Section */}
        <section
          id="install"
          className="install page-width section-shell"
          aria-labelledby="install-title"
        >
          <p className="eyebrow" data-sr-eyebrow>
            Silent Fleet Onboarding
          </p>
          <h2 id="install-title">
            Deploy across your enterprise fleet with a single PowerShell
            command.
          </h2>
          <p className="lead">
            Install silently across thousands of Windows workstations via Active
            Directory GPO, Microsoft Intune, or a single administrative
            terminal.
          </p>

          <div className="install-snippet">
            <div className="snippet-header">
              <span className="snippet-label">
                PowerShell (Run as Administrator)
              </span>
              <button
                type="button"
                className="snippet-copy button button-light"
                onClick={handleCopyScript}
                aria-label="Copy bootstrap command to clipboard"
              >
                {copyStatus || "Copy command"}
              </button>
            </div>
            <pre className="snippet-pre">
              <code id="script-example">{bootstrapCommand}</code>
            </pre>
          </div>

          <div className="options-table-shell">
            <table className="options-table">
              <thead>
                <tr>
                  <th scope="col">Parameter</th>
                  <th scope="col">Default</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>--org-token</code>
                  </td>
                  <td>
                    <code>Required</code>
                  </td>
                  <td>
                    Cryptographic tenant registration token for your
                    organization
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>--interval</code>
                  </td>
                  <td>
                    <code>30s</code>
                  </td>
                  <td>
                    Rolling average sampling and dispatch cadence (10s – 300s)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>--service</code>
                  </td>
                  <td>
                    <code>true</code>
                  </td>
                  <td>
                    Registers automatically as a silent Windows NT background
                    service (NOS-Sentinel)
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>--outbox-max</code>
                  </td>
                  <td>
                    <code>500MB</code>
                  </td>
                  <td>
                    Maximum encrypted SQLite WAL failover disk buffer before
                    rolling purge
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Closing CTA */}
        <section
          className="closing page-width section-shell"
          aria-labelledby="closing-title"
        >
          <h2 id="closing-title">
            Take command of your entire Windows fleet in seconds.
          </h2>
          <p className="lead">
            Launch your dedicated telemetry cockpit and stream real-time metrics
            with zero configuration friction.
          </p>
          <div className="closing-actions">
            <Link
              className="button button-primary"
              href={isAuthenticated ? "/dashboard" : "/auth/login"}
            >
              Launch Command Deck
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer page-width">
        <div className="footer-brand">
          <svg
            className="brand-mark"
            viewBox="0 0 26 26"
            role="img"
            aria-label="NOS Sentinel brand mark"
          >
            <rect
              x="2.5"
              y="2.5"
              width="21"
              height="21"
              rx="6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 2"
            />
            <path
              d="M9 7.5v9l2.8-2.8 2.1 4.5 2-1-2.1-4.4h3.8L9 7.5Z"
              fill="currentColor"
            />
          </svg>
          <span>NOS Sentinel</span>
        </div>
        <p className="footer-credit">
          &copy; 2026 NOS — Neural Operations System. Sub-second telemetry
          engineered in Native C#.
        </p>
      </footer>
    </div>
  );
}
