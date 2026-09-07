import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { HeartbeatTimeline } from "./HeartbeatTimeline";
import { TelemetrySparkline } from "./TelemetrySparkline";
import { Activity, Cpu, HardDrive, MemoryStick, Network } from "lucide-react";

interface DeviceCardProps {
  device: any;
  realtimeData?: any;
}

export function DeviceCard({ device, realtimeData }: DeviceCardProps) {
  // Use realtime data if available, fallback to snapshot, fallback to 0
  const cpuUsage =
    realtimeData?.cpuUsage ?? device.telemetrySnapshots?.[0]?.cpuUsage ?? 0;
  const memoryUsage =
    realtimeData?.memoryUsagePercent ??
    device.telemetrySnapshots?.[0]?.memoryUsagePercent ??
    0;

  // Mock heartbeats if not provided in list (we will fetch this in device details, but in list we might not have it)
  // Or just pass empty array if not available.
  const heartbeats = device.heartbeats || [];

  // Realtime sparkline data
  const cpuHistory = [
    ...(device.telemetrySnapshots || []).map((t: any) => ({
      timestamp: t.timestamp,
      value: t.cpuUsage,
    })),
    ...(realtimeData
      ? [{ timestamp: realtimeData.timestamp, value: realtimeData.cpuUsage }]
      : []),
  ].slice(-20); // Keep last 20 points

  const isOnline = device.status === "ONLINE";

  return (
    <Link href={`/devices/${device.id}`}>
      <Card className="hover:border-[#C8A96E]/50 transition-colors cursor-pointer bg-black/40 border-gray-800 h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-medium text-gray-100 flex items-center gap-2">
                {device.hostname || "Unknown Device"}
              </CardTitle>
              <div className="text-xs text-gray-500 mt-1">{device.id}</div>
            </div>
            <Badge variant={isOnline ? "online" : "offline"}>
              {device.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Cpu size={14} />
                <span>CPU</span>
              </div>
              <div className="text-xl font-semibold">
                {cpuUsage.toFixed(1)}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <MemoryStick size={14} />
                <span>RAM</span>
              </div>
              <div className="text-xl font-semibold">
                {memoryUsage.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="text-xs text-gray-400 mb-2">
              CPU Activity (Live)
            </div>
            <TelemetrySparkline data={cpuHistory} height={40} />
          </div>

          <div className="border-t border-gray-800 pt-3 mt-2">
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
