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
  // Use realtime data if available, then latestSnapshot from API, then 0
  const cpuUsage =
    realtimeData?.cpuUsage ??
    device.latestSnapshot?.cpuUsage ??
    device.telemetrySnapshots?.[0]?.cpuUsage ??
    0;
  const memoryUsage =
    realtimeData?.memoryUsagePercent ??
    device.latestSnapshot?.memoryUsagePercent ??
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

  const isOnline = device.status === "ONLINE";
  const ipAddress =
    realtimeData?.ipAddress ?? device.latestSnapshot?.ipAddress ?? "—";

  return (
    <Link href={`/devices/${device.id}`}>
      <Card className="hover:border-[#C8A96E]/50 transition-colors cursor-pointer bg-black/40 border-gray-800 h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-medium text-gray-100 flex items-center gap-2">
                {device.hostname || "Unknown Device"}
              </CardTitle>
              <div className="text-xs text-gray-500 mt-0.5 font-mono">
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
                  className="p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete Device Permanently"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Cpu size={12} />
                <span>CPU</span>
              </div>
              <div className="text-xl font-bold text-gray-100">
                {cpuUsage.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <MemoryStick size={12} />
                <span>RAM</span>
              </div>
              <div className="text-xl font-bold text-gray-100">
                {memoryUsage.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Network size={12} />
                <span>↓ Down</span>
              </div>
              <div className="text-sm font-semibold text-cyan-400">
                {fmtSpeed(netDownload)}
              </div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Network size={12} />
                <span>↑ Up</span>
              </div>
              <div className="text-sm font-semibold text-purple-400">
                {fmtSpeed(netUpload)}
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-xs text-gray-400 mb-1">
              CPU Activity (Live)
            </div>
            <TelemetrySparkline data={cpuHistory} height={40} />
          </div>

          <div className="border-t border-gray-800 pt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-gray-400">Heartbeat History</span>
              <span className="text-gray-500">Last 50</span>
            </div>
            <HeartbeatTimeline heartbeats={heartbeats} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
