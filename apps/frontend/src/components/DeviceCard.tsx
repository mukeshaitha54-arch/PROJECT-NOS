"use client";

import React from "react";
import Link from "next/link";
import { Monitor, Cpu, HardDrive, ArrowRight } from "lucide-react";
import { StatusBadge, DeviceStatusType } from "./StatusBadge";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/card";

export interface DeviceCardData {
  id: string;
  hostname?: string;
  deviceName?: string;
  os?: string;
  ipAddress?: string;
  status: DeviceStatusType;
  cpuUsage?: number;
  memoryUsagePercent?: number;
  lastSeen?: string;
}

interface DeviceCardProps {
  device: DeviceCardData;
  className?: string;
}

export function DeviceCard({ device, className = "" }: DeviceCardProps) {
  const displayName = device.hostname || device.deviceName || "Unknown Node";
  const cpu = Math.round(device.cpuUsage ?? 0);
  const ram = Math.round(device.memoryUsagePercent ?? 0);

  return (
    <Link href={`/devices/${device.id}`} className="block group">
      <Card
        className={`bg-gray-900/90 border-gray-800 hover:border-blue-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10 ${className}`}
      >
        <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-gray-800 text-blue-400 group-hover:bg-blue-600/20 group-hover:text-blue-300 transition-colors">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h4 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                {displayName}
              </h4>
              <p className="text-[11px] text-gray-400 truncate">
                {device.ipAddress || "Dynamic IP"}
              </p>
            </div>
          </div>
          <StatusBadge status={device.status} size="xs" />
        </CardHeader>

        <CardContent className="p-4 pt-1 pb-3 space-y-2 text-xs text-gray-400">
          <div className="flex items-center justify-between text-[11px]">
            <span>Platform OS:</span>
            <span className="text-gray-200 font-mono truncate max-w-[140px]">
              {device.os || "Windows 11"}
            </span>
          </div>

          {/* Mini CPU & RAM progress bars */}
          <div className="space-y-1.5 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="flex items-center gap-1 text-gray-400">
                  <Cpu className="w-3 h-3 text-blue-400" /> CPU Load
                </span>
                <span className="font-mono text-gray-200">{cpu}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    cpu > 85
                      ? "bg-red-500"
                      : cpu > 65
                        ? "bg-amber-500"
                        : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(cpu, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="flex items-center gap-1 text-gray-400">
                  <HardDrive className="w-3 h-3 text-purple-400" /> RAM Usage
                </span>
                <span className="font-mono text-gray-200">{ram}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    ram > 85
                      ? "bg-red-500"
                      : ram > 65
                        ? "bg-amber-500"
                        : "bg-purple-500"
                  }`}
                  style={{ width: `${Math.min(ram, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400 bg-gray-950/40">
          <span>{device.lastSeen ? `Seen ${device.lastSeen}` : "Active"}</span>
          <span className="flex items-center gap-1 text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform">
            Inspect <ArrowRight className="w-3 h-3" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
