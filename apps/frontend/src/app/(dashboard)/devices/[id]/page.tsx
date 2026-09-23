"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { TelemetrySparkline } from "@/components/dashboard/TelemetrySparkline";
import { apiClient } from "@/lib/api-client";

export default function DeviceDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { on } = useRealtimeContext();

  const [activeTab, setActiveTab] = useState("overview");

  const [device, setDevice] = useState<any>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [software, setSoftware] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [realtimeData, setRealtimeData] = useState<any>(null);

  const [timeUntilUpdate, setTimeUntilUpdate] = useState<number>(30);
  const [lastServerTime, setLastServerTime] = useState<number>(Date.now());

  useEffect(() => {
    async function fetchData() {
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

        setDevice(devRes?.data?.data || devRes?.data || null);
        setTelemetryHistory(telRes?.data?.data || telRes?.data || []);
        setProcesses(procRes?.data?.data || procRes?.data || []);
        setServices(svcRes?.data?.data || svcRes?.data || []);
        setSoftware(swRes?.data?.data || swRes?.data || []);
        setAlerts(alertRes?.data?.data || alertRes?.data || []);

        const initialTimestamp =
          res.data?.data?.latestSnapshot?.timestamp ||
          res.data?.latestSnapshot?.timestamp;
        setLastServerTime(
          initialTimestamp ? new Date(initialTimestamp).getTime() : Date.now(),
        );
        setTimeUntilUpdate(30);
      } catch (err) {
        console.error("Failed to load device details", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    const cleanupTelemetry = on("telemetry.received", (payload: any) => {
      if (payload.deviceId === id) {
        setRealtimeData(payload);
        setTelemetryHistory((prev) => [...prev, payload].slice(-60)); // Keep last 60 points in UI
        if (payload.timestamp) {
          setLastServerTime(new Date(payload.timestamp).getTime());
        } else {
          setLastServerTime(Date.now());
        }
      }
    });

    const cleanupStatus = on("device.online", (payload: any) => {
      if (payload.deviceId === id) {
        setDevice((prev: any) => (prev ? { ...prev, status: "ONLINE" } : prev));
      }
    });

    const cleanupStatusOffline = on("device.offline", (payload: any) => {
      if (payload.deviceId === id) {
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
  }, [id, on]);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastServerTime) / 1000);
      setTimeUntilUpdate(Math.max(0, 30 - elapsed));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastServerTime]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  if (!device) {
    return <div className="text-red-500">Device not found.</div>;
  }

  const currentCpu =
    realtimeData?.cpuUsage ?? device.latestSnapshot?.cpuUsage ?? 0;
  const currentMem =
    realtimeData?.memoryUsagePercent ??
    device.latestSnapshot?.memoryUsagePercent ??
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
    realtimeData?.ipAddress ?? device.latestSnapshot?.ipAddress ?? "N/A";
  const macAddress =
    realtimeData?.macAddress ?? device.latestSnapshot?.macAddress ?? "N/A";
  const uptime =
    realtimeData?.systemUptime ?? device.latestSnapshot?.systemUptime ?? 0;

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
      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            {device.hostname || "Unknown Device"}
            <span
              className={`text-xs px-2 py-1 rounded-full ${device.status === "ONLINE" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}
            >
              {device.status}
            </span>
          </h1>
          <p className="text-gray-400 mt-1 font-mono text-sm">{device.id}</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-center min-w-[100px]">
            <div className="text-xs text-gray-500 uppercase font-semibold">
              CPU
            </div>
            <div className="text-xl font-bold text-gray-200">
              {currentCpu.toFixed(1)}%
            </div>
          </div>
          <div className="bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-center min-w-[100px]">
            <div className="text-xs text-gray-500 uppercase font-semibold">
              RAM
            </div>
            <div className="text-xl font-bold text-gray-200">
              {currentMem.toFixed(1)}%
            </div>
          </div>
          <div className="bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-center min-w-[100px]">
            <div className="text-xs text-gray-500 uppercase font-semibold">
              DISK
            </div>
            <div className="text-xl font-bold text-gray-200">
              {currentDisk.toFixed(1)}%
            </div>
          </div>
          <div className="bg-black/40 border border-[#C8A96E]/20 rounded-lg px-4 py-2 text-center min-w-[120px] flex flex-col justify-center">
            <div className="text-xs text-[#C8A96E] uppercase font-semibold flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Next Update
            </div>
            <div className="text-xl font-mono font-bold text-gray-200">
              {timeUntilUpdate}s
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
            className={`px-4 py-2 border-b-2 transition-colors ${
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
      <div className="py-4">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase">
                  IP Address
                </div>
                <div className="text-sm text-gray-200 font-mono">
                  {ipAddress}
                </div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase">
                  MAC Address
                </div>
                <div className="text-sm text-gray-200 font-mono">
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
                  <Wifi className="w-3 h-3" /> Download
                </div>
                <div className="text-sm text-gray-200 font-mono">
                  {(netDownload / 1024 / 1024).toFixed(2)} MB/s
                </div>
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-1 font-semibold uppercase flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Upload
                </div>
                <div className="text-sm text-gray-200 font-mono">
                  {(netUpload / 1024 / 1024).toFixed(2)} MB/s
                </div>
              </div>
            </div>

            {/* New Extended Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2">
                <h4 className="text-xs text-blue-400 font-semibold uppercase border-b border-gray-800 pb-2">
                  CPU Specs
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Temp</span>
                  <span className="text-gray-200 font-mono">
                    {cpuTemp.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frequency</span>
                  <span className="text-gray-200 font-mono">
                    {cpuFreq.toFixed(2)} GHz
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Logical Cores</span>
                  <span className="text-gray-200 font-mono">
                    {logicalProcessors}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Physical Cores</span>
                  <span className="text-gray-200 font-mono">
                    {physicalProcessors}
                  </span>
                </div>
              </div>

              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2">
                <h4 className="text-xs text-purple-400 font-semibold uppercase border-b border-gray-800 pb-2">
                  Memory
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total</span>
                  <span className="text-gray-200 font-mono">
                    {(memTotal / 1024).toFixed(1)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Used</span>
                  <span className="text-gray-200 font-mono">
                    {(memUsed / 1024).toFixed(1)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Free</span>
                  <span className="text-gray-200 font-mono">
                    {(memFree / 1024).toFixed(1)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Usage</span>
                  <span className="text-gray-200 font-mono">
                    {currentMem.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2">
                <h4 className="text-xs text-emerald-400 font-semibold uppercase border-b border-gray-800 pb-2">
                  Disk I/O
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total</span>
                  <span className="text-gray-200 font-mono">
                    {(diskTotal / 1024).toFixed(1)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Free</span>
                  <span className="text-gray-200 font-mono">
                    {(diskFree / 1024).toFixed(1)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Read</span>
                  <span className="text-gray-200 font-mono">
                    {(diskRead / 1024 / 1024).toFixed(1)} MB/s
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Write</span>
                  <span className="text-gray-200 font-mono">
                    {(diskWrite / 1024 / 1024).toFixed(1)} MB/s
                  </span>
                </div>
              </div>

              <div className="bg-black/40 border border-gray-800 rounded-lg p-4 space-y-2">
                <h4 className="text-xs text-orange-400 font-semibold uppercase border-b border-gray-800 pb-2">
                  Network & System
                </h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Active Conns</span>
                  <span className="text-gray-200 font-mono">
                    {activeConnections}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sent</span>
                  <span className="text-gray-200 font-mono">
                    {(bytesSent / 1024 / 1024 / 1024).toFixed(2)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Received</span>
                  <span className="text-gray-200 font-mono">
                    {(bytesReceived / 1024 / 1024 / 1024).toFixed(2)} GB
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Boot Time</span>
                  <span className="text-gray-200 font-mono text-xs">
                    {bootTime ? new Date(bootTime).toLocaleString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-black/40 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-200 mb-4">
                  Live CPU History
                </h3>
                <TelemetrySparkline
                  data={sparklineData}
                  height={200}
                  dataKey="value"
                  color="#C8A96E"
                />
              </div>
              <div className="bg-black/40 border border-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-200 mb-4">
                  Live Memory History
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
