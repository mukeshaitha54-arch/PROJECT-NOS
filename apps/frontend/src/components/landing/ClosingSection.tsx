"use client";

import Link from "next/link";

export function ClosingSection() {
  return (
    <section className="closing-section page-width">
      <div className="closing-orbit" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="eyebrow">
        <span className="live-dot" /> READY TO STREAM FLEET TELEMETRY?
      </div>
      <h2>
        Make room for
        <br />
        the work <em>that matters.</em>
      </h2>
      <Link className="button button-primary" href="/auth/register">
        Launch Fleet Control <span aria-hidden="true">↗</span>
      </Link>
      <p>
        Zero dependencies. Cryptographically verified. Resilient to network
        partitions.
      </p>
    </section>
  );
}
