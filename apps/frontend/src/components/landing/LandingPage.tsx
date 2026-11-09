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
          <a href="#how-it-works">How it works</a>
          <a href="#this-page">What it monitors</a>
          <a href="#what-gets-built">What gets built</a>
          <a href="#install">Install</a>
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
            /nos-sentinel
          </p>
          <h1 id="hero-title">
            Your entire Windows fleet, watched live by a sentinel.
          </h1>
          <p className="lead">
            NOS Sentinel reads every hardware signal the moment a device boots,
            then streams CPU, RAM, storage wear, and crash events to your
            command console in real time. One PowerShell line. No extension.
          </p>
          <div className="hero-actions">
            <Link
              className="button button-primary"
              href={isAuthenticated ? "/dashboard" : "/auth/login"}
            >
              Open Command Deck
            </Link>
            <a className="button button-ghost" href="#install">
              Deploy Silent Agent ↓
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
            /how-it-works
          </p>
          <h2 id="how-title">Three passes, every heartbeat.</h2>
          <p className="lead" style={{ maxWidth: "32ch" }}>
            One tiny native agent turns every Windows boot into a live,
            continuously-streamed telemetry pipeline.
          </p>
          <div className="how-grid">
            <article className="step-card">
              <span className="step-number" aria-hidden="true">
                🔍
              </span>
              <h3>Scan the hardware</h3>
              <p>
                On startup the agent walks every kernel subsystem and sorts each
                signal into a typed telemetry layer — CPU counters, RAM pages,
                NVMe SMART attributes, and Windows Event Log entries. Nothing is
                sent until the first full snapshot is ready.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number" aria-hidden="true">
                📡
              </span>
              <h3>Stream on schedule</h3>
              <p>
                A telemetry packet is dispatched once it crosses the 30-second
                rolling window. When the network is unavailable, metrics are
                staged atomically into the local encrypted SQLite outbox in WAL
                mode — parents before children, oldest first. Nothing is ever
                lost.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number" aria-hidden="true">
                🛡️
              </span>
              <h3>Stay out of the way</h3>
              <p>
                The agent compiles to a standalone native binary with no CLR
                runtime. Under 40 MB resident RAM, 0.2% CPU. Registers as a
                silent Windows NT service and self-heals if killed. Anyone who
                wants to pause it can — telemetry resumes seamlessly on next
                boot.
              </p>
            </article>
          </div>
        </section>

        {/* This Page / What the agent monitors Section */}
        <section
          id="this-page"
          className="this-page page-width section-shell"
          aria-labelledby="stats-title"
        >
          <p className="eyebrow" data-sr-eyebrow>
            /this-page
          </p>
          <h2 id="stats-title">How it decides what to monitor.</h2>
          <p className="lead" style={{ maxWidth: "32ch" }}>
            A small set of rules keeps telemetry fast, faithful, and completely
            local to each device.
          </p>

          <dl className="stats-list">
            <div className="stat">
              <dt className="stat-label">cpu</dt>
              <dd className="stat-value">&lt; 40MB</dd>
              <p className="stat-note">
                CPU load &amp; thermal counters are sampled across all cores,
                averaged over 30 seconds, and pushed as a single compact packet
                — never raw streams.
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">ram</dt>
              <dd className="stat-value">0.2%</dd>
              <p className="stat-note">
                Physical pages, commit charge, and paged-pool pressure are
                measured live. The agent itself stays under 40 MB resident so it
                never shows up in your own charts.
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">storage</dt>
              <dd className="stat-value">30s</dd>
              <p className="stat-note">
                S.M.A.R.T. attributes — spare blocks, media errors, wear-level
                indicators, temperature — are read once per heartbeat cycle and
                flagged when thresholds breach.
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">outbox</dt>
              <dd className="stat-value">∞</dd>
              <p className="stat-note">
                Add <code>offline</code> to any network drop and the agent
                stages every pending metric into the local encrypted SQLite WAL
                outbox — drained in order the moment connectivity returns.
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">crash</dt>
              <dd className="stat-value">100%</dd>
              <p className="stat-note">
                Windows Event IDs 41 &amp; 1001 are watched in real time.
                Unexpected shutdowns and BSODs surface to your fleet console
                within seconds of the next boot.
              </p>
            </div>
            <div className="stat">
              <dt className="stat-label">skip</dt>
              <dd className="stat-value">&lt; 1s</dd>
              <p className="stat-note">
                Mark any device <code>maintenance</code> from the console and
                telemetry pauses non-destructively — WAL outbox stays armed,
                data integrity is 100% on resume.
              </p>
            </div>
          </dl>
        </section>

        {/* What Gets Built / Telemetry Cockpit Capabilities Section */}
        <section
          id="what-gets-built"
          className="built page-width section-shell"
          aria-labelledby="built-title"
        >
          <p className="eyebrow" data-sr-eyebrow>
            /what-gets-built
          </p>
          <h2 id="built-title">What the sentinel found on this fleet.</h2>
          <p className="lead" style={{ maxWidth: "32ch" }}>
            Every layer gets its own live feed. Here&apos;s the view you get the
            moment the agent phones home.
          </p>
          <div className="built-grid">
            <article className="built-card">
              <div className="built-badge">Storage Sentry</div>
              <h3>S.M.A.R.T. Predictive Wear &amp; NVMe Life</h3>
              <p>
                Visible spare blocks, media errors, and write amplification
                factors get sampled, trended, and surfaced before a drive fails.
                Temperature thresholds trigger fleet-wide heat alerts
                automatically.
              </p>
            </article>

            <article className="built-card">
              <div className="built-badge">Crash Watchdog</div>
              <h3>
                Kernel Crash &amp; BSOD Detection (Event ID 41 &amp; 1001)
              </h3>
              <p>
                Unexpected shutdowns, power-loss events, and blue-screen crashes
                stay in their original Windows Event Log order while the agent
                parses them into your console. Mini-dump stack traces are
                captured and linked to the affected device node.
              </p>
            </article>

            <article className="built-card">
              <div className="built-badge">Zero-Trust</div>
              <h3>SHA-256 Node Tokens &amp; TLS 1.3 Mutual Auth</h3>
              <p>
                Every agent instance is cryptographically fingerprinted at
                registration time. Tokens are hardware-bound, rotated on demand,
                and verified over TLS 1.3 AES-GCM — impersonation is
                structurally impossible.
              </p>
            </article>

            <article className="built-card">
              <div className="built-badge">Live Control</div>
              <h3>Sub-Second Fleet Console &amp; Remote Ops</h3>
              <p>
                Images, remote diagnostics, telemetry interval changes, tag
                assignments, and remediation scripts are framed as a single
                bidirectional WebSocket layer — dispatched and confirmed in
                under a second, fleet-wide.
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
            /install
          </p>
          <h2 id="install-title">One command.</h2>
          <p className="lead">
            Paste one PowerShell line as Administrator on any Windows device.
            The agent installs silently, registers itself as an NT service, arms
            the outbox, connects to your console, and disappears into the
            background — all in under 30 seconds. Deploy via Active Directory
            GPO or Microsoft Intune and cover your entire fleet at once.
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
                  <th scope="col">What it does</th>
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
                    Cryptographic tenant registration token generated in your
                    NOS console — ties the device to your organization&apos;s
                    isolated database
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
                    Multi-sample rolling-average heartbeat cadence. Lower for
                    high-frequency monitoring (10s), raise for bandwidth
                    conservation (300s)
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
                    Registers the agent as a silent Windows NT background
                    service (NOS-Sentinel). Survives reboots and auto-heals if
                    the process is killed
                  </td>
                </tr>
                <tr>
                  <td>
                    <code>--outbox-max</code>
                  </td>
                  <td>
                    <code>500 MB</code>
                  </td>
                  <td>
                    Maximum encrypted SQLite WAL failover disk buffer before a
                    rolling purge — protects data integrity through extended
                    offline periods
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
          <p className="eyebrow" data-sr-eyebrow>
            /one-more-thing
          </p>
          <h2 id="closing-title">Give every device a pulse.</h2>
          <p className="lead">
            A few kernel counters. A tiny native service. Your entire Windows
            fleet — visible, alive, and streaming — the moment you scroll into
            the console.
          </p>
          <div className="closing-actions">
            <Link
              className="button button-primary"
              href={isAuthenticated ? "/dashboard" : "/auth/login"}
            >
              Launch Command Deck ↗
            </Link>
            <a className="button button-ghost" href="#install">
              Back to install ↑
            </a>
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
          &copy; 2026 NOS Sentinel — Native C# fleet telemetry. Zero data loss.
          Sub-second dispatch.
        </p>
      </footer>
    </div>
  );
}
