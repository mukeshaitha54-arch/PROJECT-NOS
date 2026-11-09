"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useAuth } from "@/contexts/auth-context";
import "@/styles/swarm-rebuild.css";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [copyStatus, setCopyStatus] = useState("");

  const scriptTagCode =
    '<script src="swarm-rebuild.js" data-agents="14" data-bg="#0A0B0E"><\/script>';

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
      await navigator.clipboard.writeText(scriptTagCode);
      setCopyStatus("Copied!");
    } catch {
      const selection = document.createElement("textarea");
      selection.value = scriptTagCode;
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
    <div className="relative min-h-screen bg-[#0A0B0E] text-[#ECEEF4] overflow-x-hidden selection:bg-[#286ac7] selection:text-white">
      {/* 1. Swarm Rebuild Autonomous Engine */}
      <Script
        src="/swarm-rebuild.js"
        data-agents="14"
        data-bg="#0A0B0E"
        data-accent="#3D8BFF"
        strategy="afterInteractive"
      />

      {/* 2. Glassy NOS Watermark catching cursor sheen & mouse radiance */}
      <div className="nos-watermark" data-sr-skip aria-hidden="true">
        <span className="nos-glass">NOS</span>
        <span className="nos-shine">NOS</span>
      </div>

      {/* 3. Header Navigation */}
      <header className="site-header page-width">
        <a className="brand" href="#top" aria-label="Swarm Rebuild home">
          <svg
            className="brand-mark"
            data-sr-logo
            viewBox="0 0 26 26"
            role="img"
            aria-label="Swarm Rebuild logo"
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
          <span>Swarm Rebuild</span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#what-gets-built">What gets built</a>
          <a href="#install">Install</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {isAuthenticated ? (
            <Link
              className="button button-outline header-button"
              href="/dashboard"
            >
              Dashboard <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <Link
              className="button button-outline header-button"
              href="/auth/login"
            >
              Sign In
            </Link>
          )}
          <a className="button button-light header-button" href="#install">
            Get the script <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      {/* 4. Main Body Content */}
      <main id="top">
        <section
          className="hero page-width section-shell"
          aria-labelledby="hero-title"
        >
          <p className="eyebrow">
            /hero <span>1200 × auto</span>
          </p>
          <div className="hero-copy">
            <h1 id="hero-title">
              Your page,
              <br />
              rebuilt{" "}
              <span className="selected-word">
                live<i></i>
                <i></i>
                <i></i>
                <i></i>
              </span>{" "}
              by a swarm.
            </h1>
            <p className="hero-lead">
              Swarm Rebuild reads every layer of the page the moment it loads,
              then sends a crew of cursor agents to rebuild each one as your
              visitor scrolls. Boxes get framed and filled. Text gets typed. One
              script tag, no extension.
            </p>
            <div className="hero-actions">
              <a className="button button-light" href="#install">
                Install the script <span aria-hidden="true">↗</span>
              </a>
              <button
                className="button button-outline"
                type="button"
                onClick={handleReplay}
                data-sr-replay
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
                <i></i> Publish
              </span>
            </div>
            <div className="editor-body">
              <aside className="layers-panel" aria-label="Page layers">
                <h2>LAYERS</h2>
                <ul>
                  <li>
                    <span>⌄</span>
                    <i className="layer-icon page-icon"></i>Page
                  </li>
                  <li className="indent">
                    <span>⌄</span>
                    <i className="layer-icon nav-icon"></i>Navigation
                  </li>
                  <li className="indent selected-layer">
                    <span>⌄</span>
                    <i className="layer-icon hero-icon"></i>Hero
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon text-icon"></i>Heading
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon text-icon"></i>Subheading
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon button-icon"></i>Button
                  </li>
                  <li className="indent">
                    <span>⌄</span>
                    <i className="layer-icon grid-icon"></i>Feature grid
                  </li>
                  <li className="deep-indent">
                    <i className="layer-icon card-icon"></i>Card × 3
                  </li>
                  <li className="indent">
                    <i className="layer-icon footer-icon"></i>Footer
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
                    <b>Get started</b>
                  </div>
                  <div className="mock-hero">
                    <i className="mock-kicker"></i>
                    <i className="mock-heading heading-wide"></i>
                    <i className="mock-heading heading-short"></i>
                    <i className="mock-paragraph"></i>
                    <i className="mock-paragraph short"></i>
                    <div className="mock-buttons">
                      <b></b>
                      <s></s>
                    </div>
                  </div>
                  <div className="mock-grid">
                    <div className="mock-card">
                      <i className="mock-card-icon"></i>
                      <i className="mock-card-title"></i>
                      <i className="mock-card-line"></i>
                      <i className="mock-card-line"></i>
                    </div>
                    <div className="mock-card">
                      <i className="mock-card-icon"></i>
                      <i className="mock-card-title"></i>
                      <i className="mock-card-line"></i>
                      <i className="mock-card-line"></i>
                    </div>
                    <div className="mock-card">
                      <i className="mock-card-icon"></i>
                      <i className="mock-card-title"></i>
                      <i className="mock-card-line"></i>
                      <i className="mock-card-line"></i>
                    </div>
                  </div>
                </div>
              </div>
              <aside
                className="property-panel"
                aria-label="Selected element properties"
              >
                <h2>INSPECTOR</h2>
                <div className="prop-row">
                  <span>Type</span>
                  <b>Hero</b>
                </div>
                <div className="prop-row">
                  <span>Target</span>
                  <b>h1#hero-title</b>
                </div>
                <div className="prop-row">
                  <span>W × H</span>
                  <b>760 × 124</b>
                </div>
                <div className="prop-row">
                  <span>Font</span>
                  <b>Bricolage 64</b>
                </div>
                <div className="prop-row">
                  <span>Agents</span>
                  <b>Ada, Bo, Dex</b>
                </div>
                <div className="prop-row">
                  <span>State</span>
                  <b>Rebuilding…</b>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section
          className="content-section page-width section-shell"
          id="how-it-works"
          aria-labelledby="how-title"
        >
          <p className="eyebrow">/how-it-works</p>
          <div className="section-head">
            <h2 id="how-title">
              Three passes,
              <br />
              <span>every visit.</span>
            </h2>
            <p>
              The swarm doesn&apos;t wait for scroll to begin its plan. It
              categorizes every element before the opening title fades, then
              acts in order.
            </p>
          </div>
          <div className="three-up">
            <article>
              <div className="article-number">01</div>
              <h3>1. Structural scan</h3>
              <p>
                On load, the script walks the DOM and maps every visible
                element: its bounding box, typography, background and role.
                Hidden elements are queued for reveal.
              </p>
            </article>
            <article>
              <div className="article-number">02</div>
              <h3>2. Scroll-linked frame</h3>
              <p>
                As the visitor scrolls, elements on the upcoming screen get
                drawn: first a dashed wireframe, then the fill, then the real
                element drops in seamlessly underneath.
              </p>
            </article>
            <article>
              <div className="article-number">03</div>
              <h3>3. Live cursor crew</h3>
              <p>
                Agents carry real names and task badges. They type headings
                character-by-character, plant buttons, and drift to the
                visitor&apos;s cursor whenever scrolling stops.
              </p>
            </article>
          </div>
        </section>

        <section
          className="content-section page-width section-shell"
          id="this-page"
          aria-labelledby="stats-title"
        >
          <p className="eyebrow">
            /inspect <span>live</span>
          </p>
          <div className="section-head">
            <h2 id="stats-title">
              What the swarm found
              <br />
              <span>on this page.</span>
            </h2>
            <p>
              Every number below is read from this document at runtime. When you
              add sections, the swarm adapts.
            </p>
          </div>
          <div className="stats-grid">
            <div className="stat-card" data-sr-stat="agents">
              <span className="stat-num">14</span>
              <span className="stat-label">Cursor agents deployed</span>
            </div>
            <div className="stat-card" data-sr-stat="layers">
              <span className="stat-num">42</span>
              <span className="stat-label">DOM layers indexed</span>
            </div>
            <div className="stat-card" data-sr-stat="frames">
              <span className="stat-num">3</span>
              <span className="stat-label">Build passes</span>
            </div>
            <div className="stat-card" data-sr-stat="chars">
              <span className="stat-num">0</span>
              <span className="stat-label">External dependencies</span>
            </div>
          </div>
        </section>

        <section
          className="content-section page-width section-shell"
          id="what-gets-built"
          aria-labelledby="built-title"
        >
          <p className="eyebrow">/rules</p>
          <div className="section-head">
            <h2 id="built-title">
              How it decides
              <br />
              <span>what to rebuild.</span>
            </h2>
            <p>
              The swarm classifies every element so the right tool acts on the
              right layer.
            </p>
          </div>
          <div className="rules-grid">
            <div className="rule-card">
              <span className="rule-badge">TEXT</span>
              <h3>Headings &amp; paragraphs</h3>
              <p>
                Typed letter by letter with a blinking caret. Agents take turns
                on multi-line blocks.
              </p>
            </div>
            <div className="rule-card">
              <span className="rule-badge">BOXES</span>
              <h3>Cards, panels &amp; grids</h3>
              <p>
                Outlined with dashed frames, corner-dragged to size, then filled
                with their background tone.
              </p>
            </div>
            <div className="rule-card">
              <span className="rule-badge">MEDIA</span>
              <h3>Images, video &amp; canvases</h3>
              <p>
                Shimmered with a diagonal pulse until fully resolved, then
                snapped cleanly into position.
              </p>
            </div>
            <div className="rule-card">
              <span className="rule-badge">CONTROLS</span>
              <h3>Buttons &amp; inputs</h3>
              <p>
                Targeted with precision clicks, state rings, and real-time hover
                activation markers.
              </p>
            </div>
          </div>
        </section>

        <section
          className="content-section page-width section-shell install-section"
          id="install"
          aria-labelledby="install-title"
        >
          <p className="eyebrow">/install</p>
          <div className="section-head">
            <h2 id="install-title">
              One tag,
              <br />
              <span>first thing in the body.</span>
            </h2>
            <p>
              Drop this single script tag into your HTML. No configuration
              required to get started.
            </p>
          </div>
          <div className="install-grid">
            <div className="install-box">
              <div className="install-topbar">
                <span className="install-filename">index.html</span>
                <button
                  className="copy-button"
                  type="button"
                  onClick={handleCopyScript}
                >
                  {copyStatus || "Copy"}
                </button>
              </div>
              <pre>
                <code id="script-example">
                  <span className="code-muted">&lt;body&gt;</span>
                  {"\n"} <span className="code-tag">&lt;script</span>{" "}
                  <span className="code-attr">src</span>=
                  <span className="code-string">
                    &quot;swarm-rebuild.js&quot;
                  </span>
                  {"\n"} <span className="code-attr">data-agents</span>=
                  <span className="code-string">&quot;14&quot;</span>{" "}
                  <span className="code-attr">data-bg</span>=
                  <span className="code-string">&quot;#0A0B0E&quot;</span>
                  <span className="code-tag">&gt;&lt;/script&gt;</span>
                  {"\n"}{" "}
                  <span className="code-comment">&lt;!-- your page --&gt;</span>
                  {"\n"}
                  <span className="code-muted">&lt;/body&gt;</span>
                </code>
              </pre>
              {copyStatus && (
                <span className="copy-status" role="status" aria-live="polite">
                  {copyStatus}
                </span>
              )}
            </div>
            <div className="install-notes">
              <article>
                <span>01</span>
                <div>
                  <h3>Put it before your content</h3>
                  <p>
                    First inside <code>&lt;body&gt;</code> so the scan can start
                    immediately.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>No dependencies</h3>
                  <p>
                    Vanilla JavaScript, a single file, and nothing sent to a
                    server.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Every visitor sees it</h3>
                  <p>
                    No extension or signup required. Respect reduced-motion
                    preferences automatically.
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
                    <td>#000</td>
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
            A few cursor agents. A tiny bit of theater. Your page, rebuilt live.
          </p>
          <div className="hero-actions">
            <button
              className="button button-light"
              type="button"
              onClick={handleReplay}
              data-sr-replay
            >
              Replay the build <span aria-hidden="true">↻</span>
            </button>
            <a className="button button-outline" href="#install">
              Back to install <span aria-hidden="true">↑</span>
            </a>
          </div>
        </section>
      </main>

      {/* 5. Footer */}
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
          <span>Swarm Rebuild</span>
        </a>
        <span>A scroll-driven entrance for any page</span>
      </footer>
    </div>
  );
}
