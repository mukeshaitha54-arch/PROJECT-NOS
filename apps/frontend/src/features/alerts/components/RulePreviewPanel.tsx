"use client";

import { RulePreviewDto, RuleComplexityScore } from "@nos/shared-types";
import { RuleComplexityBadge } from "./RuleComplexityBadge";
import { RuleNoiseMeter } from "./RuleNoiseMeter";

interface RulePreviewPanelProps {
  preview: RulePreviewDto;
  isLoading?: boolean;
}

const IMPACT_CONFIG = {
  LOW: {
    color: "#10b981",
    bg: "rgba(16,185,129,0.1)",
    border: "rgba(16,185,129,0.3)",
  },
  MEDIUM: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    border: "rgba(245,158,11,0.3)",
  },
  HIGH: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.1)",
    border: "rgba(249,115,22,0.3)",
  },
  CRITICAL: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.1)",
    border: "rgba(239,68,68,0.3)",
  },
};

function StatCard({
  label,
  value,
  unit = "",
  color = "#94a3b8",
}: {
  label: string;
  value: number | string;
  unit?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          color: "#475569",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color,
          fontFamily: "monospace",
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: "12px",
              color: "#64748b",
              fontWeight: 500,
              marginLeft: "2px",
            }}
          >
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

export function RulePreviewPanel({
  preview,
  isLoading,
}: RulePreviewPanelProps) {
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "120px",
          background: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "16px",
          color: "#64748b",
          fontSize: "13px",
          gap: "8px",
        }}
      >
        <span
          style={{
            animation: "spin 1s linear infinite",
            display: "inline-block",
          }}
        >
          ⟳
        </span>
        Computing preview...
      </div>
    );
  }

  const impact = IMPACT_CONFIG[preview.estimatedImpact];
  const riskBar = Math.min(100, preview.riskRating);

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>
          Impact Preview
        </span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <RuleComplexityBadge score={preview.complexityScore} size="sm" />
          <span
            style={{
              padding: "3px 10px",
              borderRadius: "12px",
              background: impact.bg,
              border: `1px solid ${impact.border}`,
              color: impact.color,
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            {preview.estimatedImpact} Impact
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
        }}
      >
        <StatCard
          label="Est. Devices"
          value={preview.estimatedDevices}
          color="#60a5fa"
        />
        <StatCard
          label="Daily Alerts"
          value={preview.estimatedDailyAlerts}
          color="#f97316"
        />
        <StatCard
          label="Weekly Alerts"
          value={preview.estimatedWeeklyAlerts}
          color="#a78bfa"
        />
        <StatCard
          label="Suppression"
          value={preview.estimatedSuppression}
          unit="%"
          color="#10b981"
        />
        <StatCard
          label="Cooldown Saves"
          value={preview.estimatedCooldownSaves}
          color="#22d3ee"
        />
        <StatCard
          label="Correlations"
          value={preview.estimatedCorrelation}
          color="#f59e0b"
        />
      </div>

      {/* Risk Bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Risk Rating
          </span>
          <span
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: impact.color,
              fontFamily: "monospace",
            }}
          >
            {riskBar}/100
          </span>
        </div>
        <div
          style={{
            height: "6px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "99px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${riskBar}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${impact.color}80, ${impact.color})`,
              borderRadius: "99px",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      </div>

      {/* Noise Score */}
      <RuleNoiseMeter score={preview.noiseScore} />

      {/* Tags */}
      {preview.affectedTags?.length > 0 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {preview.affectedTags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: "2px 8px",
                borderRadius: "10px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#94a3b8",
                fontSize: "11px",
                fontWeight: 500,
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
