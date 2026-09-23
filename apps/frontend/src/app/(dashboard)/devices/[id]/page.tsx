"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useRealtimeContext } from "@/realtime/providers/RealtimeProvider";
import {
  Loader2,
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Clock,
  Wifi,
  Trash2,
  X,
  Layers,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { TelemetrySparkline } from "@/components/dashboard/TelemetrySparkline";
import { apiClient } from "@/lib/api-client";

// ── Smart Formatters ──────────────────────────────────────────────────────────

function formatBytesToGb(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val) || val <= 0) return "0.0";
  // If already in GB (< 1024)
  if (val < 1024) return val.toFixed(1);
  // If in MB (< 10 MB in bytes = 10,485,760, so if val < 10485760 it's in MB)
  if (val < 10485760) return (val / 1024).toFixed(1);
  // Otherwise in raw bytes
  return (val / (1024 * 1024 * 1024)).toFixed(1);
}

function formatSpeed(bytesPerSec: number | null | undefined): string {
  if (!bytesPerSec || isNaN(bytesPerSec) || bytesPerSec <= 0)
    return "0.00 MB/s";
  if (bytesPerSec >= 1048576) {
    return (bytesPerSec / (1024 * 1024)).toFixed(2) + " MB/s";
  } else if (bytesPerSec >= 1024) {
    return (bytesPerSec / 1024).toFixed(1) + " KB/s";
  } else if (bytesPerSec < 100) {
    // Already in MB/s
    return bytesPerSec.toFixed(2) + " MB/s";
  }
  return (bytesPerSec / (1024 * 1024)).toFixed(2) + " MB/s";
}

function formatDataSize(bytes: number | null | undefined): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "0.00 GB";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  const { on, socket } = useRealtimeContext();

  const [activeTab, setActiveTab] = useState("overview");

  const [device, setDevice] = useState<any>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [software, setSoftware] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [realtimeData, setRealtimeData] = useState<any>(null);

  // Self-resetting 30s countdown timer
  const [timeUntilUpdate, setTimeUntilUpdate] = useState<number>(30);

  // Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);
      try {
        const [devRes, telRes, procRes, svcRes, swRes, alertRes] =
          await Promise.all([
            apiClient.get<any, any>(`/devices/${id}`).catch(() => null),
            apiClient
              .get<any, any>(`/devices/${id}/telemetry?range=1h`)
              .catch(() => null),
            apiClient
              .get<any, any>(`/devices/${id}/processes`)
              .catch(() => null),
            apiClient
              .get<any, any>(`/devices/${id}/services`)
              .catch(() => null),
            apiClient
              .get<any, any>(`/devices/${id}/software`)
              .catch(() => null),
            apiClient.get<any, any>(`/devices/${id}/alerts`).catch(() => null),
          ]);

        const dev = devRes?.data?.data || devRes?.data || null;
        if (dev) {
          setDevice(dev);
        }
        setTelemetryHistory(telRes?.data?.data || telRes?.data || []);
        setProcesses(procRes?.data?.data || procRes?.data || []);
        setServices(svcRes?.data?.data || svcRes?.data || []);
        setSoftware(swRes?.data?.data || swRes?.data || []);
        setAlerts(alertRes?.data?.data || alertRes?.data || []);
      } catch (err) {
        console.error("Failed to load device details", err);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [id],
  );

  // Initial load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Realtime Socket listener
  useEffect(() => {
    const cleanupTelemetry = on("telemetry.received", (payload: any) => {
      if (
        payload.deviceId === id ||
        payload.deviceId === device?.id ||
        payload.deviceId === device?.uuid
      ) {
        setRealtimeData(payload);
        setTelemetryHistory((prev) => [...prev, payload].slice(-60));
        // Reset countdown timer immediately on fresh telemetry
        setTimeUntilUpdate(30);
      }
    });

    const cleanupStatus = on("device.online", (payload: any) => {
      if (
        payload.deviceId === id ||
        payload.deviceId === device?.id ||
        payload.deviceId === device?.uuid
      ) {
        setDevice((prev: any) => (prev ? { ...prev, status: "ONLINE" } : prev));
      }
    });

    const cleanupStatusOffline = on("device.offline", (payload: any) => {
      if (
        payload.deviceId === id ||
        payload.deviceId === device?.id ||
        payload.deviceId === device?.uuid
      ) {
        setDevice((prev: any) =>
          prev ? { ...prev, status: "OFFLINE" } : prev,
        );
      }
    });

    return () => {
      cleanupTelemetry();
      cleanupStatus();
      cleanupStatusOffline();
    };
  }, [id, device?.id, device?.uuid, on]);

  // Socket room management
  useEffect(() => {
    if (socket) {
      socket.emit("joinRoom", `device:${id}`);
      if (device?.id && device.id !== id) {
        socket.emit("joinRoom", `device:${device.id}`);
      }
      return () => {
        socket.emit("leaveRoom", `device:${id}`);
        if (device?.id && device.id !== id) {
          socket.emit("leaveRoom", `device:${device.id}`);
        }
      };
    }
  }, [id, device?.id, socket]);

  // Autonomous self-resetting 30s timer with automatic polling fallback
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilUpdate((prev) => {
        if (prev <= 1) {
          // Reached 0: Fetch latest telemetry silently and restart countdown at 30
          fetchData(false);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchData]);

  // Handle Permanent Deletion
  async function handleDeleteDevice() {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/devices/${id}`);
      router.push("/devices");
    } catch (err) {
      console.error("Failed to delete device", err);
      alert("Failed to delete device. Please try again.");
      setIsDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-red-400 font-semibold text-lg">
          Device not found.
        </div>
        <Link
          href="/devices"
          className="inline-flex items-center gap-2 text-sm text-[#C8A96E] hover:underline"
        >
          <ArrowLeft size={16} /> Back to Fleet Dashboard
        </Link>
      </div>
    );
  }

  const currentCpu =
    realtimeData?.cpuUsage ??
    device.latestSnapshot?.cpuUsage ??
    device.latestHeartbeat?.cpuUsage ??
    0;
  const currentMem =
    realtimeData?.memoryUsagePercent ??
    device.latestSnapshot?.memoryUsagePercent ??
    device.latestHeartbeat?.ramUsage ??
    0;
  const currentDisk =
    realtimeData?.diskUsagePercent ??
    device.latestSnapshot?.diskUsagePercent ??
    0;

  const netUpload =
    realtimeData?.networkUploadSpeed ??
    device.latestSnapshot?.networkUploadSpeed ??
    0;
  const netDownload =
    realtimeData?.networkDownloadSpeed ??
    device.latestSnapshot?.networkDownloadSpeed ??
    0;
  const ipAddress =
    realtimeData?.ipAddress ??
    device.latestSnapshot?.ipAddress ??
    device.latestHeartbeat?.ipAddress ??
    "N/A";
  const macAddress =
    realtimeData?.macAddress ?? device.latestSnapshot?.macAddress ?? "N/A";
  const uptime =
    realtimeData?.systemUptime ??
    device.latestSnapshot?.systemUptime ??
    device.latestHeartbeat?.uptime ??
    0;

  const bootTime =
    realtimeData?.bootTime ?? device.latestSnapshot?.bootTime ?? null;
  const cpuTemp =
    realtimeData?.cpuTemperature ?? device.latestSnapshot?.cpuTemperature ?? 0;
  const cpuFreq =
    realtimeData?.cpuFrequency ?? device.latestSnapshot?.cpuFrequency ?? 0;
  const activeConnections =
    realtimeData?.activeConnections ??
    device.latestSnapshot?.activeConnections ??
    0;
  const bytesSent =
    realtimeData?.bytesSent ?? device.latestSnapshot?.bytesSent ?? 0;
  const bytesReceived =
    realtimeData?.bytesReceived ?? device.latestSnapshot?.bytesReceived ?? 0;
  const logicalProcessors =
    realtimeData?.logicalProcessors ??
    device.latestSnapshot?.logicalProcessors ??
    0;
  const physicalProcessors =
    realtimeData?.physicalProcessors ??
    device.latestSnapshot?.physicalProcessors ??
    0;
  const runningProcesses =
    realtimeData?.runningProcesses ??
    device.latestSnapshot?.runningProcesses ??
    0;
  const runningServices =
    realtimeData?.runningServices ??
    device.latestSnapshot?.runningServices ??
    0;
  const gateway =
    realtimeData?.gateway ?? device.latestSnapshot?.gateway ?? "N/A";
  const dns = realtimeData?.dns ?? device.latestSnapshot?.dns ?? "N/A";

  const memTotal =
    realtimeData?.memoryTotal ?? device.latestSnapshot?.memoryTotal ?? 0;
  const memUsed =
    realtimeData?.memoryUsed ?? device.latestSnapshot?.memoryUsed ?? 0;
  const memFree =
    realtimeData?.memoryFree ?? device.latestSnapshot?.memoryFree ?? 0;

  const diskTotal =
    realtimeData?.diskTotal ?? device.latestSnapshot?.diskTotal ?? 0;
  const diskFree =
    realtimeData?.diskFree ?? device.latestSnapshot?.diskFree ?? 0;
  const diskRead =
    realtimeData?.diskReadSpeed ?? device.latestSnapshot?.diskReadSpeed ?? 0;
  const diskWrite =
    realtimeData?.diskWriteSpeed ?? device.latestSnapshot?.diskWriteSpeed ?? 0;

  const sparklineData = telemetryHistory.map((t: any) => ({
    timestamp: t.periodStart || t.timestamp,
    value: t.cpuAvg || t.cpuUsage || 0,
    memory: t.memoryAvg || t.memoryUsagePercent || 0,
  }));

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "telemetry", label: "Telemetry" },
    { id: "processes", label: "Processes" },
    { id: "services", label: "Services" },
    { id: "software", label: "Software" },
    { id: "alerts", label: "Alerts" },
  ];

  return (
    <div className="space-y-6">
      {/* Permanent Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0f1117] border border-red-800/60 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Delete Device Permanently
                  </h3>
                  <p className="text-gray-400 text-xs">Irreversible action</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-gray-300 text-sm mb-3">
              Are you sure you want to permanently delete this device and all
              its records?
            </p>

            <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3 mb-4 space-y-1">
              <p className="text-white font-mono font-semibold text-sm">
                {device.hostname || "Device"}
              </p>
              <p className="text-gray-400 text-xs font-mono truncate">
                ID: {device.id}
              </p>
              {device.uuid && (
                <p className="text-gray-500 text-xs font-mono truncate">
                  UUID: {device.uuid}
                </p>
              )}
            </div>

            <div className="bg-red-950/20 border border-red-900/40 rounded-lg p-3 mb-5 flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="text-red-400 shrink-0 mt-0.5"
              />
              <p className="text-red-300 text-xs leading-relaxed">
                All telemetry snapshots, heartbeats, alerts, and discovered
                inventory will be permanently deleted from the database. If the
                agent is still running, it will automatically revoke its
                credentials upon the next beat.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDevice}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/devices"
              className="text-gray-400 hover:text-white transition-colors"
              title="Back to fleet"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              {device.hostname || "Unknown Device"}
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  device.status === "ONLINE"
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {device.status}
              </span>
            </h1>
          </div>
          <p className="text-gray-400 mt-1 font-mono text-xs pl-8">
            Node ID: {device.id}{" "}
            {device.uuid ? `| Hardware: ${device.uuid}` : ""}
          </p>
        </div>

        {/* Action Controls & Live Stats */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Action Buttons */}
          <Link
            href={`/inventory/${device.id}`}
            className="px-3.5 py-2 rounded-lg bg-[#C8A96E]/10 border border-[#C8A96E]/30 text-[#C8A96E] hover:bg-[#C8A96E]/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Layers size={14} />
            View Asset Inventory
          </Link>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-2 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/50 hover:border-red-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={14} />
            Delete Device
          </button>

          <div className="bg-black/40 border border-gray-800 rounded-lg px-3.5 py-1.5 text-center min-w-[80px]">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">
              CPU
            </div>
            <div className="text-lg font-bold text-gray-200">
              {currentCpu.toFixed(1)}%
            </div>
          </div>

          <div className="bg-black/40 border border-gray-800 rounded-lg px-3.5 py-1.5 text-center min-w-[80px]">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">
              RAM
            </div>
            <div className="text-lg font-bold text-gray-200">
              {currentMem.toFixed(1)}%
            </div>
          </div>

          <div className="bg-black/40 border border-gray-800 rounded-lg px-3.5 py-1.5 text-center min-w-[80px]">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">
              DISK
            </div>
            <div className="text-lg font-bold text-gray-200">
              {currentDisk.toFixed(1)}%
            </div>
          </div>

          {/* Self-Resetting 30s Countdown Timer */}
          <div className="bg-black/40 border border-[#C8A96E]/30 rounded-lg px-4 py-1.5 text-center min-w-[125px] flex flex-col justify-center">
            <div className="text-[10px] text-[#C8A96E] uppercase font-semibold flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              Next Beat
            </div>
            <div className="text-xl font-mono font-bold text-gray-100 my-0.5">
              {timeUntilUpdate}s
            </div>
            <div className="text-[9px] text-[#C8A96E]/80 flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8A96E] animate-pulse"></span>
              Auto-Streaming
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 transition-colors text-sm font-medium ${
              activeTab === tab.id
                ? "border-[#C8A96E] text-[#C8A96E]"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="py-2">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Primary Networking Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase">
                  IP Address
                </div>
                <div className="text-sm text-gray-200 font-mono truncate">
                  {ipAddress}
                </div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase">
                  MAC Address
                </div>
                <div className="text-sm text-gray-200 font-mono truncate">
                  {macAddress}
                </div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase">
                  Uptime
                </div>
                <div className="text-sm text-gray-200 font-mono">
                  {(uptime / 3600).toFixed(1)} hrs
                </div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-cyan-400" /> Download Speed
                </div>
                <div className="text-sm text-gray-200 font-mono">
                  {formatSpeed(netDownload)}
                </div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-purple-400" /> Upload Speed
                </div>
                <div className="text-sm text-gray-200 font-mono">
                  {formatSpeed(netUpload)}
                </div>
              </div>
            </div>

            {/* Extended Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU Specs */}
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2.5">
                <h4 className="text-xs text-blue-400 font-semibold uppercase border-b border-gray-800 pb-2">
                  CPU Specifications
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Usage</span>
                  <span className="text-gray-200 font-mono">
                    {currentCpu.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Temperature</span>
                  <span className="text-gray-200 font-mono">
                    {cpuTemp > 0 ? `${cpuTemp.toFixed(1)}°C` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frequency</span>
                  <span className="text-gray-200 font-mono">
                    {cpuFreq > 0 ? `${cpuFreq.toFixed(2)} GHz` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Logical Cores</span>
                  <span className="text-gray-200 font-mono">
                    {logicalProcessors || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Physical Cores</span>
                  <span className="text-gray-200 font-mono">
                    {physicalProcessors || "N/A"}
                  </span>
                </div>
              </div>

              {/* Memory Specs */}
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2.5">
                <h4 className="text-xs text-purple-400 font-semibold uppercase border-b border-gray-800 pb-2">
                  RAM Memory
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total</span>
                  <span className="text-gray-200 font-mono">
                    {formatBytesToGb(memTotal)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Used</span>
                  <span className="text-gray-200 font-mono">
                    {formatBytesToGb(memUsed)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Free</span>
                  <span className="text-gray-200 font-mono">
                    {formatBytesToGb(memFree)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Usage</span>
                  <span className="text-gray-200 font-mono">
                    {currentMem.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Disk I/O */}
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2.5">
                <h4 className="text-xs text-emerald-400 font-semibold uppercase border-b border-gray-800 pb-2">
                  Disk Storage & I/O
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Disk Total</span>
                  <span className="text-gray-200 font-mono">
                    {formatBytesToGb(diskTotal)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Disk Free</span>
                  <span className="text-gray-200 font-mono">
                    {formatBytesToGb(diskFree)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Disk Usage</span>
                  <span className="text-gray-200 font-mono">
                    {currentDisk.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Read Speed</span>
                  <span className="text-gray-200 font-mono">
                    {formatSpeed(diskRead)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Write Speed</span>
                  <span className="text-gray-200 font-mono">
                    {formatSpeed(diskWrite)}
                  </span>
                </div>
              </div>

              {/* Network & Gateway */}
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2.5">
                <h4 className="text-xs text-orange-400 font-semibold uppercase border-b border-gray-800 pb-2">
                  Network & Route
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Active Conns</span>
                  <span className="text-gray-200 font-mono">
                    {activeConnections}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bytes Sent</span>
                  <span className="text-gray-200 font-mono">
                    {formatDataSize(bytesSent)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bytes Recv</span>
                  <span className="text-gray-200 font-mono">
                    {formatDataSize(bytesReceived)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Gateway</span>
                  <span
                    className="text-gray-200 font-mono text-xs truncate max-w-[130px]"
                    title={gateway}
                  >
                    {gateway}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">DNS</span>
                  <span
                    className="text-gray-200 font-mono text-xs truncate max-w-[130px]"
                    title={dns}
                  >
                    {dns}
                  </span>
                </div>
              </div>

              {/* Running State Banner */}
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2 lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col border-r border-gray-800 pr-4">
                  <span className="text-xs text-gray-500 uppercase font-semibold">
                    Running Processes
                  </span>
                  <span className="text-2xl font-mono text-cyan-400 font-bold">
                    {runningProcesses}
                  </span>
                </div>
                <div className="flex flex-col border-r border-gray-800 pr-4">
                  <span className="text-xs text-gray-500 uppercase font-semibold">
                    Running Services
                  </span>
                  <span className="text-2xl font-mono text-purple-400 font-bold">
                    {runningServices}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase font-semibold">
                    Exact Boot Time
                  </span>
                  <span className="text-base font-mono text-gray-200">
                    {bootTime ? new Date(bootTime).toLocaleString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sparklines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-black/40 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-200 mb-4 flex items-center justify-between">
                  <span>Live CPU History</span>
                  <span className="text-xs text-gray-500 font-mono">
                    Last 60 snapshots
                  </span>
                </h3>
                <TelemetrySparkline
                  data={sparklineData}
                  height={200}
                  dataKey="value"
                  color="#C8A96E"
                />
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-200 mb-4 flex items-center justify-between">
                  <span>Live Memory History</span>
                  <span className="text-xs text-gray-500 font-mono">
                    Last 60 snapshots
                  </span>
                </h3>
                <TelemetrySparkline
                  data={sparklineData}
                  height={200}
                  dataKey="memory"
                  color="#3b82f6"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "telemetry" && (
          <div className="space-y-6">
            <div className="bg-black/40 border border-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-200 mb-4">
                Telemetry Log (Recent 60 Records)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-400">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">CPU %</th>
                      <th className="px-4 py-3">RAM %</th>
                      <th className="px-4 py-3">Disk %</th>
                      <th className="px-4 py-3">Down Speed</th>
                      <th className="px-4 py-3">Up Speed</th>
                      <th className="px-4 py-3">Procs</th>
                      <th className="px-4 py-3">Svcs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {telemetryHistory
                      .slice(-25)
                      .reverse()
                      .map((t, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-gray-800 hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-3 font-mono text-xs">
                            {new Date(
                              t.timestamp || t.periodStart,
                            ).toLocaleTimeString()}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-200">
                            {(t.cpuAvg || t.cpuUsage || 0).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-200">
                            {(t.memoryAvg || t.memoryUsagePercent || 0).toFixed(
                              1,
                            )}
                            %
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-200">
                            {(t.diskUsagePercent || 0).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 font-mono text-cyan-400">
                            {formatSpeed(t.networkDownloadSpeed)}
                          </td>
                          <td className="px-4 py-3 font-mono text-purple-400">
                            {formatSpeed(t.networkUploadSpeed)}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {t.runningProcesses || "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-300">
                            {t.runningServices || "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "processes" && (
          <div className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3">PID</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">CPU %</th>
                  <th className="px-6 py-3">Memory (MB)</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 font-mono">{proc.pid}</td>
                    <td className="px-6 py-4 font-medium text-gray-300">
                      {proc.name}
                    </td>
                    <td className="px-6 py-4">{proc.cpuPercent}%</td>
                    <td className="px-6 py-4">
                      {(proc.memoryBytes / 1024 / 1024).toFixed(1)}
                    </td>
                    <td className="px-6 py-4">{proc.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "services" && (
          <div className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3">Service Name</th>
                  <th className="px-6 py-3">Display Name</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Start Type</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-800 hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 font-mono">{svc.serviceName}</td>
                    <td className="px-6 py-4">{svc.displayName}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${svc.status === "Running" ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-400"}`}
                      >
                        {svc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{svc.startType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "software" && (
          <div className="bg-black/40 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-500 uppercase bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3">Application Name</th>
                  <th className="px-6 py-3">Publisher</th>
                  <th className="px-6 py-3">Version</th>
                  <th className="px-6 py-3">Install Date</th>
                </tr>
              </thead>
              <tbody>
                {software.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No software inventory reported yet. Visit the Asset
                      Inventory tab to discover.
                    </td>
                  </tr>
                ) : (
                  software.map((sw, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-800 hover:bg-gray-800/50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-300">
                        {sw.name}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {sw.publisher || "—"}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {sw.version || "—"}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-xs">
                        {sw.installDate
                          ? new Date(sw.installDate).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="bg-black/40 border border-gray-800 rounded-lg p-6">
            {alerts.length === 0 ? (
              <div className="text-gray-500">
                No alerts found for this device.
              </div>
            ) : (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border-l-4 border-red-500 pl-4 py-2"
                  >
                    <div className="text-sm text-gray-400">
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                    <div className="text-gray-200">
                      {alert.message || `Rule ${alert.ruleId} triggered`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
