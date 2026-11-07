"use client";

import Link from "next/link";

export function DaySection() {
  return (
    <section className="day-section section-pad" id="operational-cockpit">
      <div className="page-width day-layout">
        <div className="day-copy">
          <div className="eyebrow">
            <span className="section-index">02</span> YOUR FLEET, IN MOTION
          </div>
          <h2>
            A smoother day.
            <br />
            Fewer <em>blind spots.</em>
          </h2>
          <p>
            While you focus on building and scaling your infrastructure,
            heartbeats get parsed, memory leaks get diagnosed, and cryptographic
            node credentials get rotated automatically in the background.
          </p>
          <div className="day-stat">
            <strong>0.02s</strong>
            <span>realtime telemetry ingestion response time</span>
          </div>
        </div>

        <div className="dashboard-wrap">
          <div className="dashboard">
            <div className="dash-top">
              <div>
                <span className="dash-overline">
                  OPERATIONAL COCKPIT · TODAY
                </span>
                <h3>
                  Good morning, Operator <span>☀</span>
                </h3>
              </div>
              <div className="dash-avatar">N</div>
            </div>

            <div className="dash-metrics">
              <div>
                <span>NODES STREAMING</span>
                <strong>
                  100% <i>↗</i>
                </strong>
              </div>
              <div>
                <span>TELEMETRY INGESTED</span>
                <strong>
                  4.8M <small>today</small>
                </strong>
              </div>
              <div>
                <span>ACTIVE BREACHES</span>
                <strong className="needs-none">
                  0 <small>all nominal</small>
                </strong>
              </div>
            </div>

            <div className="activity-head">
              <strong>Live Telemetry Events</strong>
              <Link
                href="/dashboard"
                className="text-[#8d927f] hover:text-[#f47b36]"
              >
                VIEW ALL ↗
              </Link>
            </div>

            <div className="activity-list">
              <div className="activity-row">
                <span className="activity-icon icon-green">↗</span>
                <span className="activity-text">
                  <b>Host srv-lon-01 telemetry synced</b>
                  <small>Agent heartbeat & thermal pulse received</small>
                </span>
                <span className="activity-tag">JUST NOW</span>
              </div>

              <div className="activity-row">
                <span className="activity-icon icon-purple">▤</span>
                <span className="activity-text">
                  <b>Cryptographic identity verified</b>
                  <small>Mutual TLS cert validated against trust store</small>
                </span>
                <span className="activity-tag">2 MIN AGO</span>
              </div>

              <div className="activity-row">
                <span className="activity-icon icon-orange">◷</span>
                <span className="activity-text">
                  <b>Automated metrics rollup committed</b>
                  <small>Telemetry indexed into time-series cache</small>
                </span>
                <span className="activity-tag">8 MIN AGO</span>
              </div>
            </div>

            <div className="dash-bottom">
              <span>
                <i /> All fleet nodes streaming live
              </span>
              <span>LAST CHECK JUST NOW</span>
            </div>
          </div>
          <div className="dashboard-shadow" />
        </div>
      </div>
    </section>
  );
}
