import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { HeartbeatTimeline } from "./HeartbeatTimeline";
import { TelemetrySparkline } from "./TelemetrySparkline";
import { Cpu, MemoryStick, Network, Trash2 } from "lucide-react";

function fmtSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return "0.00 MB/s";
  if (bytesPerSec >= 1048576)
    return (bytesPerSec / 1048576).toFixed(2) + " MB/s";
  if (bytesPerSec >= 1024) return (bytesPerSec / 1024).toFixed(1) + " KB/s";
  return bytesPerSec.toFixed(0) + " B/s";
}

interface DeviceCardProps {
  device: any;
  realtimeData?: any;
  onDelete?: (device: any) => void;
}

export function DeviceCard({
  device,
  realtimeData,
  onDelete,
}: DeviceCardProps) {
  const cpuUsage =
    realtimeData?.cpuUsage ??
    device.latestSnapshot?.cpuUsage ??
    device.lastHeartbeat?.cpuUsage ??
    device.latestHeartbeat?.cpuUsage ??
    device.heartbeats?.[0]?.cpuUsage ??
    device.telemetrySnapshots?.[0]?.cpuUsage ??
    0;
  const memoryUsage =
    realtimeData?.memoryUsagePercent ??
    device.latestSnapshot?.memoryUsagePercent ??
    device.lastHeartbeat?.ramUsage ??
    device.latestHeartbeat?.ramUsage ??
    device.heartbeats?.[0]?.ramUsage ??
    device.telemetrySnapshots?.[0]?.memoryUsagePercent ??
    0;
  const netDownload =
    realtimeData?.networkDownloadSpeed ??
    device.latestSnapshot?.networkDownloadSpeed ??
    0;
  const netUpload =
    realtimeData?.networkUploadSpeed ??
    device.latestSnapshot?.networkUploadSpeed ??
    0;

  // Heartbeats for timeline
  const heartbeats = device.heartbeats || [];

  // Sparkline — use latestSnapshot + realtime appended
  const snapshotHistory = device.latestSnapshot
    ? [
        {
          timestamp: device.latestSnapshot.timestamp,
          value: device.latestSnapshot.cpuUsage ?? 0,
        },
      ]
    : [];
  const cpuHistory = [
    ...snapshotHistory,
    ...(realtimeData
      ? [
          {
            timestamp: realtimeData.timestamp || new Date().toISOString(),
            value: realtimeData.cpuUsage ?? 0,
          },
        ]
      : []),
  ].slice(-20);

  const ipAddress =
    realtimeData?.ipAddress ??
    device.latestSnapshot?.ipAddress ??
    device.lastHeartbeat?.ipAddress ??
    device.latestHeartbeat?.ipAddress ??
    device.heartbeats?.[0]?.ipAddress ??
    "—";

  const isOnline = device.status === "ONLINE";

  return (
    <Link href={`/devices/${device.id}`}>
      <div className="dashboard-glass-card hover:border-[#3D8BFF]/60 transition-all duration-200 cursor-pointer rounded-2xl h-full flex flex-col p-5 shadow-xl hover:shadow-[0_0_24px_rgba(244,123,54,0.22)] relative overflow-hidden group">
        {/* Specular Ambient Edge Sheen */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.06] via-transparent to-transparent pointer-events-none" />

        <div className="flex justify-between items-start pb-3 border-b border-white/[0.06]">
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-[#3D8BFF] transition-colors flex items-center gap-2">
              {device.hostname || "Unknown Device"}
            </h3>
            <div className="text-xs text-blue-300/90 mt-0.5 font-mono">
              {ipAddress}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "online" : "offline"}>
              {device.status}
            </Badge>
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete(device);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                title="Delete Device Permanently"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-4 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
                <Cpu size={13} className="text-[#3D8BFF]" />
                <span>CPU</span>
              </div>
              <div className="text-2xl font-black text-white font-mono drop-shadow-sm">
                {cpuUsage.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
                <MemoryStick size={13} className="text-amber-400" />
                <span>RAM</span>
              </div>
              <div className="text-2xl font-black text-white font-mono drop-shadow-sm">
                {memoryUsage.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
                <Network size={13} className="text-cyan-400" />
                <span>↓ Down</span>
              </div>
              <div className="text-sm font-bold text-cyan-400 font-mono">
                {fmtSpeed(netDownload)}
              </div>
            </div>
            <div className="space-y-1 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-semibold">
                <Network size={13} className="text-purple-400" />
                <span>↑ Up</span>
              </div>
              <div className="text-sm font-bold text-purple-400 font-mono">
                {fmtSpeed(netUpload)}
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-xs text-zinc-300 font-semibold mb-1 flex items-center justify-between">
              <span>CPU Activity (Live)</span>
              <span className="text-[10px] text-[#3D8BFF] font-mono">
                30s Pulse
              </span>
            </div>
            <TelemetrySparkline data={cpuHistory} height={40} />
          </div>

          <div className="border-t border-white/[0.08] pt-3">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-zinc-300 font-semibold">
                Heartbeat History
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">
                Last 50
              </span>
            </div>
            <HeartbeatTimeline heartbeats={heartbeats} />
          </div>
        </div>
      </div>
    </Link>
  );
}
