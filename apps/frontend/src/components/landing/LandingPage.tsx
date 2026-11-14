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

    // Dynamic glossy mouse pointer lighting
    const handlePointerMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });

    return () => {
      document.documentElement.classList.remove("landing-active");
      document.body.classList.remove("landing-page");
      window.removeEventListener("mousemove", handlePointerMove);
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
        setCopyStatus("Copy failed");
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
    <>
      {/* Autonomous Sentinel Rebuild Engine */}
      <Script
        src="/swarm-rebuild.js"
        data-agents="14"
        data-bg="#0A0B0E"
        data-accent="#3D8BFF"
        strategy="afterInteractive"
      />

      {/* Header */}
      <header className="site-header page-width">
        <a className="brand" href="#top" aria-label="NOS Sentinel home">
          <svg
            className="brand-mark"
            data-sr-logo
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="NOS Sentinel insignia"
          >
            <defs>
              <linearGradient
                id="nos-logo-grad"
                x1="0"
                y1="0"
                x2="32"
                y2="32"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#3D8BFF" />
                <stop offset="50%" stopColor="#00E5FF" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient
                id="nos-logo-fill"
                x1="8"
                y1="8"
                x2="24"
                y2="24"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#3D8BFF" stopOpacity="0.05" />
              </linearGradient>
              <filter
                id="nos-glow-filter"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <rect
              x="2.5"
              y="2.5"
              width="27"
              height="27"
              rx="7.5"
              stroke="url(#nos-logo-grad)"
              strokeWidth="1.75"
              fill="url(#nos-logo-fill)"
            />
            <path
              d="M10 22V10L22 22V10"
              stroke="url(#nos-logo-grad)"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="10"
              cy="10"
              r="2"
              fill="#3D8BFF"
              filter="url(#nos-glow-filter)"
            />
            <circle
              cx="16"
              cy="16"
              r="2.2"
              fill="#00E5FF"
              filter="url(#nos-glow-filter)"
            />
            <circle
              cx="22"
              cy="22"
              r="2"
              fill="#6366F1"
              filter="url(#nos-glow-filter)"
            />
          </svg>
          <span>NOS Sentinel</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#this-page">Telemetry deck</a>
          <a href="#what-gets-built">Hardware sentry</a>
          <a href="#install">Install</a>
        </nav>
        <Link
          className="button button-light header-button"
          href={isAuthenticated ? "/dashboard" : "/auth/login"}
        >
          {isAuthenticated ? "Launch Console" : "Get the agent"}{" "}
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
          <p className="eyebrow">
            /hero <span>1560 × auto</span>
          </p>
          <div className="hero-copy">
            <h1 id="hero-title">
              Your fleet,
              <br />
              watched{" "}
              <span className="selected-word">
                live<i></i>
                <i></i>
                <i></i>
                <i></i>
              </span>{" "}
              by a<br />
              sentinel.
            </h1>
            <p className="hero-lead">
              NOS Sentinel instruments every hardware layer the moment an
              endpoint boots, then streams live kernel telemetry directly to
              your command deck. Ring-0 multi-core CPU counters get polled.
              Physical RAM working sets and S.M.A.R.T. NVMe predictive wear are
              monitored. Encrypted SQLite WAL outbox guarantees zero dropped
              packets. Built in Native C# AOT under 40MB RAM and 0.2% CPU.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="#install">
                Deploy silent agent <span aria-hidden="true">↗</span>
              </a>
              <button
                className="button button-outline"
                type="button"
                data-sr-replay
                onClick={handleReplay}
              >
                <span className="replay-icon" aria-hidden="true">
                  ↻
                </span>{" "}
                Replay the build
              </button>
            </div>
            <p className="hero-hint">
              <span>Scroll to build</span>
              <i></i> Stop and the agents come to your cursor <i></i> Esc skips
            </p>
          </div>

          <div
            className="editor"
            aria-label="A visual editor preview of a rebuilt web page"
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
                <i></i> Connected // Sub-Second
              </span>
            </div>
            <div className="editor-body">
              <aside className="layers-panel" aria-label="Page layers">
                <h2>TELEMETRY LAYERS</h2>
                <ul>
                  <li>
                    <span>⌄</span>
                    <i className="layer-icon page-icon"></i>Endpoint
                    (SHIVA-WIN11)
                  </li>
                  <li className="indent">
                    <span>⌄</span>
                    <i className="layer-icon nav-icon"></i>Heartbeat (30s
                    Rolling)
                  </li>
                  <li className="indent selected-layer">
                    <span>⌄</span>
                    <i className="layer-icon hero-icon"></i>Ring-0 CPU (12C/24T)
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon text-icon"></i>CPU Load (27.4%
                    Nominal)
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon text-icon"></i>RAM Working Set
                    (4.1/16GB)
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon button-icon"></i>Encrypted SQLite
                    WAL (0 Lost)
                  </li>
                  <li className="indent">
                    <span>⌄</span>
                    <i className="layer-icon grid-icon"></i>Storage Sentry
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon card-icon"></i>NVMe SMART (98%
                    Health // 42°C)
                  </li>
                  <li className="indent">
                    <i className="layer-icon footer-icon"></i>Crash Watchdog
                    (Event 41/1001)
                  </li>
                </ul>
              </aside>
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
                    <span>Node: SHIVA-WIN11-PRO</span>
                    <span>WebSocket TLS 1.3</span>
                    <span>SQLite WAL Active</span>
                    <b>Online</b>
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
              <aside
                className="properties-panel"
                aria-label="Selected layer properties"
              >
                <h2>NODE PROFILE</h2>
                <div className="property-grid">
                  <span>
                    CPU <b>0.2%</b>
                  </span>
                  <span>
                    RAM <b>&lt;40MB</b>
                  </span>
                  <span>
                    PING <b>8ms</b>
                  </span>
                  <span>
                    LOSS <b>0.0%</b>
                  </span>
                </div>
                <div className="property-group">
                  <h3>TELEMETRY PUSH</h3>
                  <span>
                    <i className="fill-swatch"></i>3D8BFF <b>WebSocket</b>
                  </span>
                </div>
                <div className="property-group">
                  <h3>DATA INTEGRITY</h3>
                  <span>
                    R <b>100%</b>
                    <em>WAL Armed</em>
                  </span>
                </div>
                <div className="property-group">
                  <h3>CADENCE</h3>
                  <span>
                    Gap <b>30s</b>
                    <em>Multi-Sample</em>
                  </span>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
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
              <span>every heartbeat.</span>
            </h2>
            <p>
              One native C# AOT agent turns enterprise hardware metrics into a
              sub-second, scroll-driven live telemetry stream.
            </p>
          </div>
          <div className="steps-panel">
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8"></circle>
                <path d="m16 16 4.2 4.2M8 10.8h5.6M10.8 8v5.6"></path>
              </svg>
              <h3>Scan &amp; Ring-0 Kernel Profiling</h3>
              <p>
                On boot, NOS Sentinel hooks directly into Windows ring-0
                performance counters and sorts every metric into a telemetry
                layer: multi-core CPU load, physical RAM working sets, paged
                pool exhaustion, and S.M.A.R.T. NVMe wear. Nothing is
                transmitted until cryptographically verified.
              </p>
            </article>
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7"></path>
                <circle cx="19" cy="6" r="1.5"></circle>
              </svg>
              <h3>Encrypted SQLite WAL Outbox</h3>
              <p>
                When network, VPN, or Wi-Fi connectivity drops, all telemetry
                frames stage into an encrypted local SQLite outbox operating in
                Write-Ahead Logging (WAL) mode. Zero dropped metrics, zero
                memory leaks, and automatic ordered drain the millisecond
                connectivity resumes.
              </p>
            </article>
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"></path>
                <circle cx="12" cy="12" r="4"></circle>
              </svg>
              <h3>Sub-Second Command Deck</h3>
              <p>
                Consumes under 40MB resident RAM and less than 0.2% CPU.
                Telemetry broadcasts over bidirectional TLS 1.3 WebSockets with
                multi-sample rolling averages every 30s. Fleets stay responsive,
                and anyone preferring reduced motion gets the finished cockpit
                immediately.
              </p>
            </article>
          </div>
        </section>

        {/* This Page / What The Sentinel Found Section */}
        <section
          className="content-section page-width section-shell"
          id="this-page"
          aria-labelledby="stats-title"
        >
          <p className="eyebrow">/this-page</p>
          <div className="section-heading">
            <h2 id="stats-title">
              What the sentinel found
              <br />
              <span>on this fleet.</span>
            </h2>
            <p>
              Every layer gets its own entrance. Here’s the telemetry crew and
              the hardware benchmarks measured.
            </p>
          </div>
          <div className="stats-grid">
            <article className="stat-card">
              <strong data-sr-stat="layers">&lt; 40MB</strong>
              <span>Resident RAM Working Set</span>
            </article>
            <article className="stat-card">
              <strong data-sr-stat="texts">0.2%</strong>
              <span>Average CPU Utilization</span>
            </article>
            <article className="stat-card">
              <strong data-sr-stat="frames">100%</strong>
              <span>Data Integrity (WAL Outbox)</span>
            </article>
            <article className="stat-card">
              <strong data-sr-stat="agents">30s</strong>
              <span>Multi-sample Rolling Heartbeat</span>
            </article>
          </div>
        </section>

        {/* What Gets Built / Hardware Sentry Subsystems Section */}
        <section
          className="content-section page-width section-shell"
          id="what-gets-built"
          aria-labelledby="built-title"
        >
          <p className="eyebrow">/what-gets-built</p>
          <div className="section-heading">
            <h2 id="built-title">
              How it decides
              <br />
              <span>what to monitor.</span>
            </h2>
            <p>
              Deep hardware instrumentation that standard task managers and
              device monitors miss.
            </p>
          </div>
          <div className="built-list">
            <article className="built-row">
              <span className="built-tag">cpu</span>
              <h3>Ring-0 CPU &amp; Thermal Limits</h3>
              <p>
                Multi-core performance counter aggregation with instant per-core
                thermal limits, clock throttling detection, and hardware
                interrupt load tracking.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">ram</span>
              <h3>Physical RAM &amp; Commit Charge</h3>
              <p>
                Resident working set auditing, committed virtual memory limits,
                paged/non-paged system pool exhaustion, and memory leak
                detection across running processes.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">nvme</span>
              <h3>S.M.A.R.T. Predictive NVMe Health</h3>
              <p>
                Continuously interrogates NVMe controller logs for percentage
                used, available spare blocks, media degradation errors,
                read/write byte counters, and junction temperatures.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">crash</span>
              <h3>Kernel Crash &amp; BSOD Watchdog</h3>
              <p>
                Instant detection of abnormal shutdowns, power failures, and
                blue-screen crash events (Windows Event ID 41 &amp; 1001) with
                automated mini-dump stack trace capture.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">outbox</span>
              <h3>Encrypted SQLite WAL Buffer</h3>
              <p>
                Atomic local disk queue with Write-Ahead Logging stages
                telemetry during network blackouts, preventing lost metrics with
                zero memory bloat.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">sec</span>
              <h3>Zero-Trust SHA-256 Node Authentication</h3>
              <p>
                Cryptographic tenant registration tokens, unique hardware UUID
                fingerprinting, and mutual TLS 1.3 encryption protect every
                telemetry payload.
              </p>
            </article>
          </div>
        </section>

        {/* Install Section */}
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
              <span>first thing in the terminal.</span>
            </h2>
            <p>
              Run in an elevated PowerShell terminal and your Windows endpoint
              connects to the fleet in seconds.
            </p>
          </div>
          <div className="install-grid">
            <div className="code-card">
              <div className="code-card-top">
                <span>PowerShell (Administrator)</span>
                <button
                  className="copy-button"
                  type="button"
                  data-copy-script
                  onClick={handleCopyScript}
                >
                  {copyStatus || "Copy"}
                </button>
              </div>
              <pre>
                <code id="script-example">
                  <span className="code-muted">
                    &lt;# Run in elevated PowerShell on Windows 10/11 / Server
                    #&gt;
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
              <span className="copy-status" role="status" aria-live="polite">
                {copyStatus}
              </span>
            </div>
            <div className="install-notes">
              <article>
                <span>01</span>
                <div>
                  <h3>Run with administrative privileges</h3>
                  <p>
                    Elevated terminal permits silent registration of the Windows
                    NT background service (NOS-Sentinel) and ring-0 performance
                    counter access.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Zero runtime dependencies</h3>
                  <p>
                    Standalone Native C# AOT binary compiled to machine code. No
                    .NET runtime installation required, no external
                    dependencies, and self-healing watchdog.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Every endpoint streams live</h3>
                  <p>
                    Instant bidirectional WebSocket handshake initiates
                    sub-second telemetry broadcast to your command console with
                    zero manual configuration.
                  </p>
                </div>
              </article>
            </div>
          </div>
          <div className="options">
            <h3>Deployment &amp; Engine Parameters</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Default</th>
                    <th>What it does</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <code>--org-token</code>
                    </td>
                    <td>Required</td>
                    <td>
                      Cryptographic organization registration token for strict
                      multi-tenant isolation.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>--interval</code>
                    </td>
                    <td>30s</td>
                    <td>
                      Rolling average sampling and dispatch cadence across
                      endpoints (10s – 300s).
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>--service</code>
                    </td>
                    <td>true</td>
                    <td>
                      Registers automatically as a silent, self-restarting
                      Windows NT service (NOS-Sentinel).
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>--outbox-max</code>
                    </td>
                    <td>500MB</td>
                    <td>
                      Maximum encrypted SQLite WAL failover disk buffer before
                      rolling FIFO purge.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-agents</code>
                    </td>
                    <td>14</td>
                    <td>
                      Autonomous cursor agent count rebuilding each layer of the
                      telemetry deck.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-bg</code>
                    </td>
                    <td>#0A0B0E</td>
                    <td>
                      Deep obsidian background hex color for the terminal and
                      canvas.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-accent</code>
                    </td>
                    <td>#3D8BFF</td>
                    <td>
                      Cyber blue accent color for frames, cursors, and telemetry
                      indicators.
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <code>data-sr-skip</code>
                    </td>
                    <td>—</td>
                    <td>
                      Add to any DOM container to preserve its interactive
                      controls during the build.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Closing Section */}
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
            Give every device
            <br />
            <span>a pulse.</span>
          </h2>
          <p>
            Sub-second telemetry. Ring-0 hardware sentinels. Zero-loss SQLite
            outbox. Your entire fleet, monitored live.
          </p>
          <div className="hero-actions">
            <button
              className="button button-light"
              type="button"
              data-sr-replay
              onClick={handleReplay}
            >
              Replay the build <span aria-hidden="true">↻</span>
            </button>
            <a className="button button-outline" href="#install">
              Back to install <span aria-hidden="true">↑</span>
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="site-footer page-width flex flex-col md:flex-row items-center justify-between gap-4 py-8 border-t border-white/[0.08] text-sm text-zinc-400">
        <div className="flex items-center gap-3">
          <a className="brand footer-brand flex items-center gap-2" href="#top">
            <svg
              className="brand-mark w-7 h-7"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              role="img"
              aria-label="NOS Sentinel insignia"
            >
              <rect
                x="2.5"
                y="2.5"
                width="27"
                height="27"
                rx="7.5"
                stroke="url(#nos-logo-grad)"
                strokeWidth="1.75"
                fill="url(#nos-logo-fill)"
              />
              <path
                d="M10 22V10L22 22V10"
                stroke="url(#nos-logo-grad)"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="10" r="2" fill="#3D8BFF" />
              <circle cx="16" cy="16" r="2.2" fill="#00E5FF" />
              <circle cx="22" cy="22" r="2" fill="#6366F1" />
            </svg>
            <span className="font-semibold text-white">NOS Sentinel</span>
          </a>
          <span className="text-zinc-600 hidden md:inline">•</span>
          <span className="text-xs text-zinc-500 hidden md:inline">
            Enterprise Windows Fleet Intelligence
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <a
            href="mailto:nos.platformm@gmail.com"
            className="text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 font-medium"
          >
            <span>Help: nos.platformm@gmail.com</span>
          </a>
          <span className="text-zinc-600">•</span>
          <a
            href="/privacy"
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Privacy &amp; Terms
          </a>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-mono">
            © 2026 NOS • License 2026
          </span>
        </div>
      </footer>
    </>
  );
}
