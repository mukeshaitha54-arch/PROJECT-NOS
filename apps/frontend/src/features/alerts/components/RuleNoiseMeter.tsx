"use client";

interface RuleNoiseMeterProps {
  score: number; // 0–100
  showBreakdown?: boolean;
  breakdown?: {
    deduplicationFactor: number;
    suppressionFactor: number;
    cooldownFactor: number;
    correlationFactor: number;
    falsePositiveFactor: number;
    maintenanceFactor: number;
  };
  recommendation?: string;
}

function getRating(score: number): {
  label: string;
  color: string;
  bg: string;
} {
  if (score <= 25)
    return { label: "LOW", color: "#10b981", bg: "rgba(16,185,129,0.15)" };
  if (score <= 50)
    return { label: "MEDIUM", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" };
  if (score <= 75)
    return { label: "HIGH", color: "#f97316", bg: "rgba(249,115,22,0.15)" };
  return { label: "CRITICAL", color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
}

function getBarColor(score: number): string {
  if (score <= 25) return "linear-gradient(90deg, #10b981, #34d399)";
  if (score <= 50) return "linear-gradient(90deg, #f59e0b, #fbbf24)";
  if (score <= 75) return "linear-gradient(90deg, #f97316, #fb923c)";
  return "linear-gradient(90deg, #ef4444, #f87171)";
}

const BREAKDOWN_LABELS: Record<string, string> = {
  deduplicationFactor: "Deduplication",
  suppressionFactor: "Suppression",
  cooldownFactor: "Cooldown",
  correlationFactor: "Correlation",
  falsePositiveFactor: "False Positives",
  maintenanceFactor: "Maintenance",
};

export function RuleNoiseMeter({
  score,
  showBreakdown = false,
  breakdown,
  recommendation,
}: RuleNoiseMeterProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const rating = getRating(clampedScore);
  const barColor = getBarColor(clampedScore);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {/* Score Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Noise Score
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "2px 8px",
              borderRadius: "12px",
              background: rating.bg,
              border: `1px solid ${rating.color}40`,
              color: rating.color,
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            {rating.label}
          </span>
        </div>
        <span
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: rating.color,
            fontFamily: "var(--font-mono, monospace)",
            lineHeight: 1,
          }}
        >
          {clampedScore}
          <span style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>
            /100
          </span>
        </span>
      </div>

      {/* Bar */}
      <div
        style={{
          height: "8px",
          borderRadius: "99px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${clampedScore}%`,
            height: "100%",
            background: barColor,
            borderRadius: "99px",
            transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: `0 0 6px ${rating.color}60`,
          }}
        />
      </div>

      {/* Breakdown Table */}
      {showBreakdown && breakdown && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px 16px",
            paddingTop: "4px",
          }}
        >
          {Object.entries(breakdown).map(([key, val]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                {BREAKDOWN_LABELS[key] || key}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "#94a3b8",
                  fontWeight: 600,
                  fontFamily: "monospace",
                }}
              >
                {val}pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "8px",
            padding: "8px 10px",
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          💡 {recommendation}
        </div>
      )}
    </div>
  );
}
