"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import "@/styles/swarm-rebuild.css";

const TELEMETRY_CAPSULES = [
  { label: "CPU 27.4% NOMINAL", icon: "⚡" },
  { label: "RAM 4.1GB / 16GB", icon: "🧠" },
  { label: "OUTBOX 0 PENDING (HEALTHY)", icon: "🛡️" },
  { label: "HEARTBEAT 30s INTERVAL", icon: "⏱️" },
  { label: "ENCRYPTION TLSv1.3 AES-GCM", icon: "🔒" },
  { label: "SOCKET CONNECTED", icon: "📡" },
  { label: "NVMe WEAR 98% GOOD", icon: "💾" },
  { label: "C# AOT DAEMON <40MB", icon: "⚙️" },
];

export default function LandingPage() {
  const [copied, setCopied] = useState(false);
  const installCmd =
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = installCmd;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* 1. Swarm Rebuild Script Tag with Configuration */}
      <Script
        src="/swarm-rebuild.js"
        data-agents="14"
        data-bg="#0A0B0E"
        data-accent="#3D8BFF"
        strategy="afterInteractive"
      />

      {/* 2. Glassy NOS Watermark catching cursor sheen */}
      <div className="nos-watermark" data-sr-skip aria-hidden="true">
        <span className="nos-glass">NOS</span>
        <span className="nos-shine">NOS</span>
      </div>

      {/* 3. Site Header Navigation */}
      <header className="site-header page-width" id="top">
        <a className="brand" href="#top" aria-label="NOS Sentinel home">
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
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#this-page">Telemetry Stats</a>
          <a href="#what-gets-built">Architecture</a>
          <a href="#install">Deploy Agent</a>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link
            href="/auth/login"
            className="button button-outline header-button"
          >
            Sign In
          </Link>
          <Link href="/fleet" className="button button-light header-button">
            Launch Console <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      {/* Main Content Sections */}
      <div className="landing-content-flow">
        {/* 4. Hero Section */}
        <section
          className="hero page-width section-shell"
          aria-labelledby="hero-title"
        >
          <p className="eyebrow">
            /hero <span>1200 × auto</span>
          </p>
          <div className="hero-copy">
            <h1 id="hero-title">
              Your fleet,
              <br />
              rebuilt{" "}
              <span className="selected-word">
                live<i></i>
                <i></i>
                <i></i>
                <i></i>
              </span>{" "}
              by NOS Sentinel.
            </h1>
            <p className="hero-lead">
              High-performance Windows fleet telemetry engineered in native C#
              with zero-loss encrypted SQLite outbox failover, sub-second
              WebSocket dispatch, and predictive hardware wear telemetry. Every
              node is observed in real time without blindspots.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="#install">
                Deploy Agent <span aria-hidden="true">↗</span>
              </a>
              <button
                className="button button-outline"
                type="button"
                data-sr-replay
              >
                <span className="replay-icon" aria-hidden="true">
                  ↻
                </span>{" "}
                Replay the build
              </button>
              <Link className="button button-outline" href="/fleet">
                Command Deck <span aria-hidden="true">→</span>
              </Link>
            </div>
            <p className="hero-hint">
              <span>Scroll to build</span>
              <i></i> Stop and the swarm comes to your cursor <i></i> Esc skips
            </p>
          </div>

          {/* 5. Visual Editor Mockup (Fleet Command Cockpit) */}
          <div
            className="editor"
            aria-label="A visual editor preview of the NOS fleet telemetry cockpit"
          >
            <div className="editor-topbar">
              <div className="window-dots" aria-hidden="true">
                <i></i>
                <i></i>
                <i></i>
              </div>
              <div className="device-tabs" aria-label="Preview size">
                <span className="active">
                  Desktop <b>1440</b>
                </span>
                <span>
                  Tablet <b>810</b>
                </span>
                <span>
                  Phone <b>390</b>
                </span>
              </div>
              <span className="publish-pill">
                <i></i> Live Stream Active
              </span>
            </div>

            <div className="editor-body">
              {/* Left Layers List */}
              <aside className="layers-panel" aria-label="Page layers">
                <h2>LAYERS</h2>
                <ul>
                  <li>
                    <span>⌄</span>
                    <i className="layer-icon page-icon"></i>Fleet
                  </li>
                  <li className="indent">
                    <span>⌄</span>
                    <i className="layer-icon nav-icon"></i>Control Plane
                  </li>
                  <li className="indent selected-layer">
                    <span>⌄</span>
                    <i className="layer-icon hero-icon"></i>Node: SHIVA
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon text-icon"></i>Native C# AOT Daemon
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon text-icon"></i>Telemetry Outbox (0
                    Pending)
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon button-icon"></i>S.M.A.R.T. Wear
                    Engine
                  </li>
                  <li className="indent">
                    <span>⌄</span>
                    <i className="layer-icon grid-icon"></i>Telemetry Grid
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon card-icon"></i>Monitored Nodes × 3
                  </li>
                  <li className="indent">
                    <i className="layer-icon footer-icon"></i>Audit Log Center
                  </li>
                </ul>
              </aside>

              {/* Center Dotted Canvas Panel */}
              <div className="canvas-panel">
                <div className="canvas-ruler ruler-horizontal">
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className="canvas-ruler ruler-vertical">
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <div className="mock-page">
                  <div className="mock-nav">
                    <i className="mock-logo"></i>
                    <span></span>
                    <span></span>
                    <span></span>
                    <b>Node: ONLINE</b>
                  </div>
                  <div className="mock-hero">
                    <i className="mock-kicker"></i>
                    <i className="mock-heading heading-wide"></i>
                    <i className="mock-heading heading-short"></i>
                    <i className="mock-copy"></i>
                    <i className="mock-action"></i>
                  </div>
                  <div className="mock-cards">
                    <i></i>
                    <i></i>
                    <i></i>
                  </div>
                </div>
              </div>

              {/* Right Properties Panel */}
              <aside
                className="properties-panel"
                aria-label="Selected layer properties"
              >
                <h2>FRAME</h2>
                <div className="property-grid">
                  <span>
                    X <b>120</b>
                  </span>
                  <span>
                    Y <b>64</b>
                  </span>
                  <span>
                    W <b>1200</b>
                  </span>
                  <span>
                    H <b>640</b>
                  </span>
                </div>
                <div className="property-group">
                  <h3>AGENT RUNTIME</h3>
                  <span>
                    <i className="fill-swatch"></i>Native C# AOT <b>0.2% CPU</b>
                  </span>
                </div>
                <div className="property-group">
                  <h3>OUTBOX BUFFER</h3>
                  <span>
                    WAL SQLite<em>0 Pending</em>
                  </span>
                </div>
                <div className="property-group">
                  <h3>SECURITY POSTURE</h3>
                  <span>
                    TLSv1.3 AES-GCM<em>SHA-256</em>
                  </span>
                </div>
              </aside>
            </div>
          </div>

          {/* 6. Continuous Marquee Sliding Rail for Telemetry Capsules */}
          <div className="sr-marquee-wrapper" data-sr-skip>
            <div className="sr-marquee-track">
              {[
                ...TELEMETRY_CAPSULES,
                ...TELEMETRY_CAPSULES,
                ...TELEMETRY_CAPSULES,
                ...TELEMETRY_CAPSULES,
              ].map((item, idx) => (
                <div key={idx} className="sr-pill">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Section: How It Works */}
        <section
          className="content-section page-width section-shell"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <p className="eyebrow">/how-it-works</p>
          <div className="section-heading">
            <h2 id="how-title">
              Three passes,
              <br />
              <span>every node.</span>
            </h2>
            <p>
              One tiny native daemon turns your Windows fleet into a live,
              zero-blindspot telemetry stream.
            </p>
          </div>
          <div className="steps-panel">
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8"></circle>
                <path d="m16 16 4.2 4.2M8 10.8h5.6M10.8 8v5.6"></path>
              </svg>
              <h3>Scan the node</h3>
              <p>
                Ultra-lightweight native C# AOT binary. Walks system hardware,
                CPU perf counters, memory pools, process table, and NVMe wear.
                Consumes &lt;40MB RAM and 0.2% CPU with zero runtime bloat.
              </p>
            </article>
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7"></path>
                <circle cx="19" cy="6" r="1.5"></circle>
              </svg>
              <h3>Buffer on disconnect</h3>
              <p>
                When connectivity drops, telemetry flows seamlessly into an
                encrypted local SQLite outbox with WAL journal. Auto-drains in
                FIFO order upon reconnect without data loss or network floods.
              </p>
            </article>
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"></path>
                <circle cx="12" cy="12" r="4"></circle>
              </svg>
              <h3>Control in real time</h3>
              <p>
                Sub-second WebSocket control plane gives instant visibility.
                Non-destructive Pause &amp; Resume with &lt;1s latency. Kernel
                BSOD watchdog flags Event ID 41 &amp; 1001 crashes
                instantaneously.
              </p>
            </article>
          </div>
        </section>

        {/* 8. Section: Telemetry Stats & Swarm Rebuild Metrics */}
        <section
          className="content-section page-width section-shell"
          id="this-page"
          aria-labelledby="stats-title"
        >
          <p className="eyebrow">/this-page</p>
          <div className="section-heading">
            <h2 id="stats-title">
              What the swarm found
              <br />
              <span>on this page.</span>
            </h2>
            <p>
              Every layer gets its own entrance. Here’s the telemetry crew and
              the metrics ahead.
            </p>
          </div>
          {/* Swarm Dynamic Counters */}
          <div className="stats-grid">
            <article className="stat-card">
              <strong data-sr-stat="layers">--</strong>
              <span>Layers in total</span>
            </article>
            <article className="stat-card">
              <strong data-sr-stat="texts">--</strong>
              <span>Text runs typed in</span>
            </article>
            <article className="stat-card">
              <strong data-sr-stat="frames">--</strong>
              <span>Boxes and media framed</span>
            </article>
            <article className="stat-card">
              <strong data-sr-stat="agents">--</strong>
              <span>Agents on shift</span>
            </article>
          </div>

          {/* NOS Fleet Performance Badges — Completely raw on background flow without white bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "20px",
              marginTop: "40px",
            }}
          >
            <div className="stat-card-clean">
              <span>💡 Agent Footprint</span>
              <strong>&lt; 40MB</strong>
              <span>Native C# binary</span>
            </div>
            <div className="stat-card-clean">
              <span>⚡ Average Impact</span>
              <strong>0.2%</strong>
              <span>Sub-percent CPU usage</span>
            </div>
            <div className="stat-card-clean">
              <span>🔄 Telemetry Cycle</span>
              <strong>30s</strong>
              <span>Median-smoothed polling</span>
            </div>
            <div className="stat-card-clean">
              <span>💾 Outbox Capacity</span>
              <strong>∞</strong>
              <span>Encrypted SQLite buffer</span>
            </div>
            <div className="stat-card-clean">
              <span>🛡️ Data Integrity</span>
              <strong>100%</strong>
              <span>Zero-loss reconnection</span>
            </div>
            <div className="stat-card-clean">
              <span>⏱️ Control Latency</span>
              <strong>&lt; 1s</strong>
              <span>Instant Pause / Resume</span>
            </div>
          </div>
        </section>

        {/* 9. Section: Architectural Comparison */}
        <section
          className="content-section page-width section-shell"
          id="what-gets-built"
          aria-labelledby="built-title"
        >
          <p className="eyebrow">/what-gets-built</p>
          <div className="section-heading">
            <h2 id="built-title">
              How NOS Sentinel compares
              <br />
              <span>against legacy RMM.</span>
            </h2>
            <p>
              A clear architectural breakdown of why enterprise engineering
              teams migrate from bloated legacy agents to NOS Sentinel.
            </p>
          </div>
          <div className="built-list">
            <article className="built-row">
              <span className="built-tag">footprint</span>
              <h3>Agent Resource Footprint</h3>
              <p>
                Legacy RMM bloats systems with 300MB+ RAM and 5% CPU using
                Electron or Python runtimes. NOS Sentinel is a native C# AOT
                binary running under 40MB RAM and 0.2% CPU.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">outbox</span>
              <h3>Network Interruption Handling</h3>
              <p>
                Legacy RMM drops telemetry packets during network interruptions,
                leaving blindspots and lost crash logs. NOS Sentinel buffers
                every single event into an encrypted SQLite outbox and
                auto-drains on reconnect with 100% integrity.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">kernel</span>
              <h3>BSOD &amp; Crash Visibility</h3>
              <p>
                Legacy RMM leaves blue-screen crashes unnoticed until a user
                submits a support ticket. NOS Sentinel integrates Kernel Event
                ID 41 &amp; 1001 Watchdog for sub-second crash alerts.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">isolation</span>
              <h3>Zero-Trust Multi-Tenant Security</h3>
              <p>
                Shared data pools risk compliance violations and cross-tenant
                leakage. NOS Sentinel enforces cryptographic SHA-256 node token
                isolation per organization, ensuring complete data sovereignty.
              </p>
            </article>
          </div>
        </section>

        {/* 10. Section: Rapid Deployment / Install */}
        <section
          className="content-section page-width section-shell install-section"
          id="install"
          aria-labelledby="install-title"
        >
          <p className="eyebrow">/install</p>
          <div className="section-heading">
            <h2 id="install-title">
              One command,
              <br />
              <span>first thing on the machine.</span>
            </h2>
            <p>
              Run the bootstrap command on any Windows host and telemetry begins
              streaming immediately.
            </p>
          </div>

          <div className="install-grid">
            <div className="code-card">
              <div className="code-card-top">
                <span>bootstrap.ps1</span>
                <button
                  className="copy-button"
                  type="button"
                  onClick={handleCopy}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre>
                <code id="script-example">
                  <span className="code-comment">
                    # Download and install NOS Agent as Windows Service
                  </span>
                  {"\n"}
                  <span className="code-tag">powershell</span>{" "}
                  <span className="code-attr">-ExecutionPolicy</span>{" "}
                  <span className="code-string">Bypass</span>{" "}
                  <span className="code-attr">-Command</span>{" "}
                  <span className="code-string">
                    &quot;iwr -useb
                    http://x.nos.is-local.org/api/fleet/installer/bootstrap.ps1
                    | iex&quot;
                  </span>
                </code>
              </pre>
              {copied && (
                <span className="copy-status" role="status" aria-live="polite">
                  Copied to clipboard
                </span>
              )}
            </div>

            <div className="install-notes">
              <article>
                <span>01</span>
                <div>
                  <h3>Zero Reboot Required</h3>
                  <p>
                    Installs as a non-intrusive Windows service and begins
                    streaming telemetry without system restarts.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Encrypted Outbox Pre-armed</h3>
                  <p>
                    Local SQLite database initializes with WAL mode before the
                    first socket frame is transmitted.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Sub-Second Stream</h3>
                  <p>
                    Cryptographic SHA-256 registration connects to your
                    organization deck in under 5 minutes.
                  </p>
                </div>
              </article>
            </div>
          </div>

          {/* Configuration Options Table */}
          <div className="options">
            <h3>Configuration &amp; Swarm Attributes</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Default</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>data-agents</code>
                    </td>
                    <td>14</td>
                    <td>Number of cursor agents (up to 8 under 640px).</td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-speed</code>
                    </td>
                    <td>1</td>
                    <td>Build speed. Cycles through 1×, 2× and 4×.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-line</code>
                    </td>
                    <td>0.88</td>
                    <td>Build line as a fraction of viewport height.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-bg</code>
                    </td>
                    <td>#0A0B0E</td>
                    <td>Background color for the opening scan screen.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-accent</code>
                    </td>
                    <td>#3D8BFF</td>
                    <td>Frame, cursor and progress-bar accent color.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-sr-skip</code>
                    </td>
                    <td>—</td>
                    <td>
                      Leave this element and its children out of the rebuild.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-sr-logo</code>
                    </td>
                    <td>—</td>
                    <td>Logo cloned into the scan screen.</td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-sr-replay</code>
                    </td>
                    <td>—</td>
                    <td>Make any element a replay control.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 11. Closing Section */}
        <section
          className="closing-section page-width section-shell"
          aria-labelledby="closing-title"
        >
          <p className="eyebrow">/one-more-thing</p>
          <div className="closing-orbit" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </div>
          <h2 id="closing-title">
            Give every node
            <br />
            <span>zero-loss visibility.</span>
          </h2>
          <p>
            A fleet of cursor agents. High-frequency telemetry. Your Windows
            fleet, observable in real time.
          </p>
          <div className="hero-actions">
            <Link className="button button-light" href="/fleet">
              Launch Fleet Console <span aria-hidden="true">↗</span>
            </Link>
            <button
              className="button button-outline"
              type="button"
              data-sr-replay
            >
              Replay the build{" "}
              <span className="replay-icon" aria-hidden="true">
                ↻
              </span>
            </button>
            <a className="button button-outline" href="#top">
              Back to top <span aria-hidden="true">↑</span>
            </a>
          </div>
        </section>
      </div>

      {/* 12. Site Footer */}
      <footer className="site-footer page-width">
        <a className="brand footer-brand" href="#top">
          <svg className="brand-mark" viewBox="0 0 26 26" aria-hidden="true">
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
        </a>
        <span>High-Performance Windows Fleet Telemetry · Zero-Loss Outbox</span>
      </footer>
    </>
  );
}
