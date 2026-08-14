"use client";

import {
  RulePerformanceMetricsDto,
  RuleUsageStatisticsDto,
} from "@nos/shared-types";

interface RuleStatisticsPanelProps {
  metrics?: RulePerformanceMetricsDto;
  usage?: RuleUsageStatisticsDto;
  activeTab?: "performance" | "usage";
}

function StatRow({
  label,
  value,
  unit = "",
  color = "#94a3b8",
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        padding: "8px 12px",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "8px",
      }}
    >
      <span style={{ fontSize: "12px", color: "#64748b" }}>{label}</span>
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color,
          fontFamily: "monospace",
        }}
      >
        {value}
        {unit && (
          <span
            style={{ fontSize: "10px", color: "#475569", marginLeft: "2px" }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

const TREND_CONFIG = {
  INCREASING: { label: "↑ Increasing", color: "#ef4444" },
  STABLE: { label: "→ Stable", color: "#f59e0b" },
  DECREASING: { label: "↓ Decreasing", color: "#10b981" },
};

export function RuleStatisticsPanel({
  metrics,
  usage,
}: RuleStatisticsPanelProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        background: "rgba(15, 23, 42, 0.8)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "20px",
      }}
    >
      {/* Performance Metrics */}
      {metrics && (
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#e2e8f0",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⚡</span> Performance Metrics
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <StatRow
              label="Avg Execution"
              value={metrics.avgExecutionMs.toFixed(2)}
              unit="ms"
              color={metrics.avgExecutionMs > 300 ? "#f97316" : "#10b981"}
            />
            <StatRow
              label="Max Execution"
              value={metrics.maxExecutionMs.toFixed(2)}
              unit="ms"
              color={metrics.maxExecutionMs > 400 ? "#ef4444" : "#94a3b8"}
            />
            <StatRow
              label="Min Execution"
              value={metrics.minExecutionMs.toFixed(2)}
              unit="ms"
              color="#10b981"
            />
            <StatRow
              label="P95 Execution"
              value={metrics.p95ExecutionMs.toFixed(2)}
              unit="ms"
              color="#f59e0b"
            />
            <StatRow
              label="P99 Execution"
              value={metrics.p99ExecutionMs.toFixed(2)}
              unit="ms"
              color="#f97316"
            />
            <StatRow
              label="Memory Usage"
              value={`${(metrics.memoryUsageBytes / 1024).toFixed(1)}`}
              unit="KB"
              color="#a78bfa"
            />
          </div>
        </div>
      )}

      {/* Usage Statistics */}
      {usage && (
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#e2e8f0",
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span>📊</span> Usage Statistics
            </div>
            {usage.triggerTrend && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: TREND_CONFIG[usage.triggerTrend]?.color || "#94a3b8",
                }}
              >
                {TREND_CONFIG[usage.triggerTrend]?.label}
              </span>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <StatRow
              label="Total Evaluations"
              value={usage.totalEvaluations.toLocaleString()}
              color="#60a5fa"
            />
            <StatRow
              label="Total Triggers"
              value={usage.totalTriggers.toLocaleString()}
              color="#f97316"
            />
            <StatRow
              label="Total Suppressions"
              value={usage.totalSuppressions.toLocaleString()}
              color="#f59e0b"
            />
            <StatRow
              label="Total Deduplications"
              value={usage.totalDeduplications.toLocaleString()}
              color="#22d3ee"
            />
            <StatRow
              label="Total Escalations"
              value={usage.totalEscalations.toLocaleString()}
              color="#ef4444"
            />
            <StatRow
              label="Daily Trigger Avg"
              value={usage.dailyTriggerAverage.toFixed(1)}
              color="#a78bfa"
            />
            <StatRow
              label="Weekly Trigger Avg"
              value={usage.weeklyTriggerAverage.toFixed(1)}
              color="#c084fc"
            />
          </div>

          {/* Last Activity */}
          <div
            style={{ marginTop: "10px", fontSize: "11px", color: "#475569" }}
          >
            {usage.neverTriggered ? (
              <span style={{ color: "#f59e0b" }}>
                ⚠ This rule has never triggered
              </span>
            ) : usage.lastTriggeredAt ? (
              <span>
                Last triggered:{" "}
                {new Date(usage.lastTriggeredAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Rates */}
      {metrics && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            paddingTop: "4px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ textAlign: "center", padding: "10px" }}>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#f97316",
                fontFamily: "monospace",
              }}
            >
              {metrics.triggerRate.toFixed(1)}%
            </div>
            <div
              style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}
            >
              Trigger Rate
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "10px" }}>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#22d3ee",
                fontFamily: "monospace",
              }}
            >
              {metrics.suppressionRate.toFixed(1)}%
            </div>
            <div
              style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}
            >
              Suppression Rate
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
