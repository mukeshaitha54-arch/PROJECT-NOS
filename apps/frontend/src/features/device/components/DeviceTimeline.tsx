"use client";

import React from "react";
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Wrench,
  RefreshCw,
  Cpu,
  User,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface TimelineEvent {
  id: string;
  deviceId: string;
  eventType: string;
  severity: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  title: string;
  detail?: string;
  actorName?: string;
  relatedType?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface DeviceTimelineProps {
  events: TimelineEvent[];
  loading?: boolean;
  onRefresh?: () => void;
}

const EVENT_ICON_MAP: Record<string, React.ReactNode> = {
  REGISTERED: <Activity className="w-4 h-4 text-cyan-400" />,
  HEARTBEAT: <Activity className="w-4 h-4 text-emerald-400" />,
  ONLINE: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  OFFLINE: <AlertTriangle className="w-4 h-4 text-red-400" />,
  INVENTORY_UPDATED: <RefreshCw className="w-4 h-4 text-cyan-400" />,
  INVENTORY_DIFF: <FileText className="w-4 h-4 text-purple-400" />,
  ALERT_TRIGGERED: <ShieldAlert className="w-4 h-4 text-red-400" />,
  ALERT_ACKNOWLEDGED: <User className="w-4 h-4 text-amber-400" />,
  ALERT_ESCALATED: <ShieldAlert className="w-4 h-4 text-orange-400" />,
  ALERT_RESOLVED: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  MAINTENANCE_START: <Wrench className="w-4 h-4 text-blue-400" />,
  MAINTENANCE_END: <Wrench className="w-4 h-4 text-emerald-400" />,
  SECURITY_EVENT: <ShieldAlert className="w-4 h-4 text-purple-400" />,
};

export function DeviceTimeline({
  events,
  loading = false,
  onRefresh,
}: DeviceTimelineProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-4 py-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-start">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="w-1/3 h-4" />
              <Skeleton className="w-2/3 h-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-12 border border-slate-800 rounded-xl bg-slate-900/40">
        <Activity className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">
          No Timeline Events Recorded
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Operational events, heartbeats, status changes, and alert incidents
          will automatically record here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-200">
            Device Operational Timeline
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            ({events.length} events)
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        )}
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {events.map((evt) => {
          const icon = EVENT_ICON_MAP[evt.eventType] || (
            <Info className="w-4 h-4 text-slate-400" />
          );
          const isExpanded = expandedId === evt.id;
          const formattedTime = new Date(evt.timestamp).toLocaleString();

          return (
            <div key={evt.id} className="relative group">
              {/* Event Dot */}
              <div className="absolute -left-[1.65rem] top-0.5 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-md">
                {icon}
              </div>

              {/* Event Content */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700/80">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-100">
                        {evt.title}
                      </span>
                      <Badge
                        variant={evt.severity.toLowerCase() as any}
                        size="xs"
                      >
                        {evt.eventType}
                      </Badge>
                      {evt.actorName && (
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          by {evt.actorName}
                        </span>
                      )}
                    </div>
                    {evt.detail && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {evt.detail}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 flex-shrink-0 whitespace-nowrap">
                    {formattedTime}
                  </span>
                </div>

                {/* Metadata Accordion Toggle */}
                {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                      {isExpanded ? "Hide Payload" : "View Payload Data"}
                    </button>

                    {isExpanded && (
                      <pre className="mt-2 p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto border border-slate-800/60">
                        {JSON.stringify(evt.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
