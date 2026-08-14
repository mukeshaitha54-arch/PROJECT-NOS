import React from "react";

type IndicatorStatus =
  "online" | "offline" | "degraded" | "maintenance" | "unknown";

interface StatusIndicatorProps {
  status: IndicatorStatus | string;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; ring: string; label: string; pulse: boolean }
> = {
  online: {
    color: "bg-emerald-400",
    ring: "ring-emerald-500/30",
    label: "Online",
    pulse: true,
  },
  offline: {
    color: "bg-red-500",
    ring: "ring-red-500/30",
    label: "Offline",
    pulse: false,
  },
  degraded: {
    color: "bg-amber-400",
    ring: "ring-amber-500/30",
    label: "Degraded",
    pulse: true,
  },
  maintenance: {
    color: "bg-blue-400",
    ring: "ring-blue-500/30",
    label: "Maintenance",
    pulse: false,
  },
  unknown: {
    color: "bg-slate-500",
    ring: "ring-slate-500/30",
    label: "Unknown",
    pulse: false,
  },
};

const SIZE_MAP = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3 h-3",
};

export function StatusIndicator({
  status,
  size = "sm",
  showLabel = false,
  className = "",
}: StatusIndicatorProps) {
  const key = (status || "unknown").toLowerCase();
  const cfg = STATUS_CONFIG[key] ?? STATUS_CONFIG.unknown;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`relative flex ${SIZE_MAP[size]}`}>
        {cfg.pulse && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${cfg.color} opacity-60 animate-ping`}
            aria-hidden="true"
          />
        )}
        <span
          className={`relative inline-flex rounded-full ${SIZE_MAP[size]} ${cfg.color} ring-2 ${cfg.ring}`}
        />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-slate-300">{cfg.label}</span>
      )}
    </span>
  );
}
