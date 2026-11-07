"use client";

import { useState } from "react";
import Link from "next/link";

export function CapacityEstimatorSection() {
  const [nodes, setNodes] = useState(25);

  const minNodes = 5;
  const maxNodes = 500;
  const progress = ((nodes - minNodes) / (maxNodes - minNodes)) * 100;
  const monthlyEstimate = nodes <= 10 ? 29 : Math.round(nodes * 3.8);
  const dataPointsPerDay = (nodes * 2880).toLocaleString();

  const planName =
    nodes <= 25
      ? "STARTER CLUSTER"
      : nodes <= 100
        ? "GROWING FLEET"
        : "ENTERPRISE MESH";

  return (
    <section className="pricing-section section-pad" id="estimator">
      <div className="page-width pricing-layout">
        <div className="pricing-copy">
          <div className="eyebrow">
            <span className="section-index">03</span> REAL-TIME FLEET CAPACITY
          </div>
          <h2>
            More flow.
            <br />
            <em>Less figuring it out.</em>
          </h2>
          <p>
            Start with an agent deployment that fits today. Adjust the slider to
            preview real-time throughput, metrics ingestion volume, and
            fleet-wide telemetry sync.
          </p>
          <div className="pricing-promise">
            <span>✓</span> Deterministic ingestion <span>✓</span> Zero dropped
            pulses <span>✓</span> Self-healing daemons
          </div>
        </div>

        <div className="price-card">
          <div className="price-card-top">
            <div>
              <span className="micro-label">ESTIMATED CAPACITY THROUGHPUT</span>
              <p className="price-value">
                <span>$</span>
                <strong>{monthlyEstimate}</strong>
                <small>/ month</small>
              </p>
            </div>
            <span className="price-plan">{planName}</span>
          </div>

          <div className="meter-heading">
            <label htmlFor="run-meter">
              How many active nodes in your fleet?
            </label>
            <span>
              <strong>{nodes}</strong> nodes
            </span>
          </div>

          <input
            id="run-meter"
            className="run-meter"
            type="range"
            min={minNodes}
            max={maxNodes}
            step={5}
            value={nodes}
            onChange={(e) => setNodes(Number(e.target.value))}
            style={
              {
                "--range-progress": `${progress}%`,
              } as React.CSSProperties
            }
            aria-label="Monitored fleet nodes"
          />

          <div className="meter-scale">
            <span>5 nodes</span>
            <span>500+ nodes</span>
          </div>

          <div className="meter-note">
            <span className="meter-spark">✳</span>
            <span>
              Generating ~<strong>{dataPointsPerDay}</strong> verified telemetry
              datapoints daily.
            </span>
          </div>

          <div className="price-divider" />

          <div className="plan-row">
            <span>
              <i className="plan-check">✓</i> 30s High-precision telemetry &
              thermal checks
            </span>
            <span>Included</span>
          </div>

          <div className="plan-row">
            <span>
              <i className="plan-check">✓</i> Cryptographic device identity
              (mTLS)
            </span>
            <span>Included</span>
          </div>

          <div className="plan-row">
            <span>
              <i className="plan-check">✓</i> Real-time WebSocket streaming &
              audit trails
            </span>
            <span>Included</span>
          </div>

          <Link
            href="/auth/register"
            className="button button-primary price-cta"
          >
            Deploy this capacity <span aria-hidden="true">↗</span>
          </Link>
          <p className="price-footnote">
            Instant deployment with our single-binary zero-dependency agent.
          </p>
        </div>
      </div>
    </section>
  );
}
