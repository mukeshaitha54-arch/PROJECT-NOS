import React from "react";
import { Badge } from "./ui/badge";

export type DeviceStatusType =
  "ONLINE" | "OFFLINE" | "WARNING" | "MAINTENANCE" | "DEGRADED" | string;

interface StatusBadgeProps {
  status: DeviceStatusType;
  className?: string;
  size?: "xs" | "sm" | "md";
  showDot?: boolean;
}

export function StatusBadge({
  status,
  className = "",
  size = "sm",
  showDot = true,
}: StatusBadgeProps) {
  const normalized = (status || "OFFLINE").toUpperCase();

  let variant: "online" | "offline" | "warning" | "maintenance" | "neutral" =
    "neutral";
  let label = normalized;

  switch (normalized) {
    case "ONLINE":
      variant = "online";
      label = "Online";
      break;
    case "OFFLINE":
      variant = "offline";
      label = "Offline";
      break;
    case "WARNING":
    case "DEGRADED":
      variant = "warning";
      label = "Warning";
      break;
    case "MAINTENANCE":
      variant = "maintenance";
      label = "Maintenance";
      break;
    default:
      variant = "neutral";
      label = status;
  }

  return (
    <Badge
      variant={variant}
      size={size}
      dot={showDot}
      className={`font-semibold tracking-wide ${className}`}
    >
      {label}
    </Badge>
  );
}
