"use client";

import React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  Check,
  RotateCcw,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export type AlertSeverityType = "CRITICAL" | "HIGH" | "WARNING" | "INFO";
export type AlertStatusType = "OPEN" | "RESOLVED" | "ACKNOWLEDGED";

export interface AlertCardData {
  id: string;
  severity: AlertSeverityType;
  title: string;
  description?: string;
  deviceName?: string;
  deviceId?: string;
  createdAt: string;
  status: AlertStatusType;
}

interface AlertCardProps {
  alert: AlertCardData;
  onAcknowledge?: (id: string) => void;
  onResolve?: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  className?: string;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (isNaN(diffMs)) return dateStr;

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

export function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
  onSelect,
  isSelected = false,
  className = "",
}: AlertCardProps) {
  const getSeverityIcon = () => {
    switch (alert.severity?.toUpperCase()) {
      case "CRITICAL":
        return <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />;
      case "HIGH":
        return <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0" />;
      case "WARNING":
        return <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getSeverityBorder = () => {
    switch (alert.severity?.toUpperCase()) {
      case "CRITICAL":
        return "border-red-500/30 hover:border-red-500/60 bg-red-950/10";
      case "HIGH":
        return "border-orange-500/30 hover:border-orange-500/60 bg-orange-950/10";
      case "WARNING":
        return "border-amber-500/30 hover:border-amber-500/60 bg-amber-950/10";
      default:
        return "border-gray-800 hover:border-gray-700 bg-gray-900/60";
    }
  };

  const getStatusBadgeVariant = () => {
    switch (alert.status?.toUpperCase()) {
      case "RESOLVED":
        return "success";
      case "ACKNOWLEDGED":
        return "info";
      default:
        return "critical";
    }
  };

  return (
    <div
      className={`relative rounded-xl border p-4 transition-all duration-200 shadow-sm ${getSeverityBorder()} ${
        isSelected ? "ring-2 ring-blue-500" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(alert.id)}
              className="mt-1 rounded bg-gray-800 border-gray-700 text-blue-600 focus:ring-0 focus:outline-none"
            />
          )}

          <div className="mt-0.5">{getSeverityIcon()}</div>

          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-white truncate">
                {alert.title}
              </h4>
              <Badge variant={getStatusBadgeVariant()} size="xs">
                {alert.status}
              </Badge>
            </div>

            {alert.description && (
              <p className="text-xs text-gray-400 line-clamp-2">
                {alert.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1">
              <span className="text-gray-300 font-medium">
                Node: {alert.deviceName || "Cluster"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(alert.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {alert.status === "OPEN" && onAcknowledge && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAcknowledge(alert.id)}
              className="h-7 text-xs border-gray-700 hover:border-gray-600 text-gray-300 px-2"
            >
              <RotateCcw className="w-3 h-3 mr-1 text-amber-400" /> Ack
            </Button>
          )}

          {alert.status !== "RESOLVED" && onResolve && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(alert.id)}
              className="h-7 text-xs border-emerald-800/60 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/40 px-2"
            >
              <Check className="w-3 h-3 mr-1" /> Resolve
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
