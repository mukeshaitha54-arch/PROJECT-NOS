import React from "react";

interface MetricGaugeProps {
  value: number; // 0–100
  label?: string;
  sublabel?: string;
  variant?: "cpu" | "ram" | "disk" | "network" | "default";
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}

function getColor(value: number, variant: string): string {
  if (variant === "network") return "stroke-cyan-500";
  if (value >= 90) return "stroke-red-500";
  if (value >= 75) return "stroke-amber-500";
  if (value >= 60) return "stroke-yellow-400";
  return "stroke-emerald-500";
}

function getTextColor(value: number, variant: string): string {
  if (variant === "network") return "text-cyan-400";
  if (value >= 90) return "text-red-400";
  if (value >= 75) return "text-amber-400";
  if (value >= 60) return "text-yellow-400";
  return "text-emerald-400";
}

const SIZE_CONFIG = {
  sm: { size: 56, stroke: 5, r: 22, fontSize: "text-xs" },
  md: { size: 80, stroke: 6, r: 32, fontSize: "text-sm" },
  lg: { size: 110, stroke: 8, r: 44, fontSize: "text-base" },
};

export function MetricGauge({
  value,
  label,
  sublabel,
  variant = "default",
  size = "md",
  showValue = true,
}: MetricGaugeProps) {
  const cfg = SIZE_CONFIG[size];
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  const circumference = 2 * Math.PI * cfg.r;
  const progress = circumference - (clamped / 100) * circumference;
  const center = cfg.size / 2;
  const colorClass = getColor(clamped, variant);
  const textColorClass = getTextColor(clamped, variant);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: cfg.size, height: cfg.size }}>
        <svg
          width={cfg.size}
          height={cfg.size}
          viewBox={`0 0 ${cfg.size} ${cfg.size}`}
          className="-rotate-90"
          aria-label={`${label ?? "Metric"}: ${clamped.toFixed(1)}%`}
        >
          {/* Track */}
          <circle
            cx={center}
            cy={center}
            r={cfg.r}
            fill="none"
            stroke="currentColor"
            strokeWidth={cfg.stroke}
            className="text-slate-700"
          />
          {/* Progress */}
          <circle
            cx={center}
            cy={center}
            r={cfg.r}
            fill="none"
            strokeWidth={cfg.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-700 ease-out`}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`font-bold tabular-nums ${cfg.fontSize} ${textColorClass}`}
            >
              {clamped.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
      {label && (
        <div className="text-center">
          <p className="text-xs font-medium text-slate-300">{label}</p>
          {sublabel && <p className="text-[10px] text-slate-500">{sublabel}</p>}
        </div>
      )}
    </div>
  );
}

/** Horizontal bar gauge variant */
export function MetricBar({
  value,
  label,
  variant = "default",
}: {
  value: number;
  label?: string;
  variant?: MetricGaugeProps["variant"];
}) {
  const clamped = Math.max(0, Math.min(100, value ?? 0));
  const barColor =
    variant === "network"
      ? "bg-cyan-500"
      : clamped >= 90
        ? "bg-red-500"
        : clamped >= 75
          ? "bg-amber-500"
          : clamped >= 60
            ? "bg-yellow-400"
            : "bg-emerald-500";

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-400">{label}</span>
          <span className="text-xs font-mono font-semibold text-slate-300">
            {clamped.toFixed(1)}%
          </span>
        </div>
      )}
      <div
        className="h-1.5 bg-slate-800 rounded-full overflow-hidden"
        aria-label={`${label}: ${clamped}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
