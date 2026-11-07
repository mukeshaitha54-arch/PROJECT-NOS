"use client";

import Link from "next/link";

export function MechanismSection() {
  return (
    <section className="mechanism-section section-pad" id="how-it-works">
      <div className="page-width mechanism-layout">
        <div className="section-copy">
          <div className="eyebrow">
            <span className="section-index">01</span> SET IT IN MOTION
          </div>
          <h2>
            One little signal.
            <br />
            <em>A lot less work.</em>
          </h2>
          <p>
            Start with the telemetry event that occurs. Add the checks and
            remediation rules you want to happen next. Your NOS agent pipeline
            takes care of the in-between automatically.
          </p>
          <Link className="text-link" href="#estimator">
            Build a workflow that fits <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div
          className="mechanism-visual"
          aria-label="A telemetry event unfolds into an automated self-healing action"
        >
          <div className="mechanism-grid" aria-hidden="true" />
          <div className="mechanism-logo" aria-hidden="true">
            <span className="mechanism-ring" />
            <svg viewBox="0 0 40 40">
              <path d="M12 28V12h9.5a6.5 6.5 0 0 1 0 13H12m8 0 8 3" />
            </svg>
          </div>
          <div className="mechanism-plate">
            <span className="plate-rail rail-top" />
            <span className="plate-rail rail-bottom" />
            <div className="plate-step plate-trigger">
              <i>↙</i>
              <b>WHEN</b>
              <span>Spike detected</span>
            </div>
            <span className="plate-connector connector-one" />
            <div className="plate-step plate-check">
              <i>⌕</i>
              <b>CHECK</b>
              <span>Health metric</span>
            </div>
            <span className="plate-connector connector-two" />
            <div className="plate-step plate-action">
              <i>↗</i>
              <b>THEN</b>
              <span>Auto-recover</span>
            </div>
          </div>
          <span className="mechanism-label label-left">A MOMENT HAPPENS</span>
          <span className="mechanism-label label-right">
            THE REST JUST FOLLOWS
          </span>
        </div>
      </div>

      <div className="page-width feature-row">
        <article className="feature-item">
          <span className="feature-number">01 / NOTICE</span>
          <h3>Pick your “when”</h3>
          <p>
            A threshold breach, a silent heartbeat, or an unauthorized software
            change. Your telemetry stream reacts immediately right where it
            occurs.
          </p>
        </article>
        <article className="feature-item">
          <span className="feature-number">02 / CONNECT</span>
          <h3>Choose what follows</h3>
          <p>
            Connect rules to your notifications or automated commands. Execute
            graceful process restarts, isolate suspicious nodes, or alert
            on-call.
          </p>
        </article>
        <article className="feature-item">
          <span className="feature-number">03 / EXHALE</span>
          <h3>Let it run</h3>
          <p>
            Every step executes in strict deterministic order. If something
            demands operator eyes, you are alerted immediately. Otherwise, carry
            on.
          </p>
        </article>
      </div>
    </section>
  );
}
