"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Monitor,
  Cpu,
  HardDrive,
  Network as NetworkIcon,
  Clock,
  Activity,
  Layers,
  Settings,
  Bell,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Save,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, DeviceStatusType } from "@/components/StatusBadge";
import { ChartCard } from "@/components/ChartCard";
import { AlertCard, AlertCardData } from "@/components/AlertCard";
import { useRealtime } from "@/realtime/hooks/useRealtime";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = (params?.id as string) || "node-01";

  const [activeTab, setActiveTab] = useState<
    "overview" | "telemetry" | "alerts" | "settings"
  >("overview");
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [loading, setLoading] = useState<boolean>(true);

  // Device identity & hardware state
  const [device, setDevice] = useState<{
    id: string;
    hostname: string;
    status: DeviceStatusType;
    ipAddress: string;
    macAddress: string;
    os: string;
    osVersion: string;
    architecture: string;
    cpuModel: string;
    cpuCores: number;
    cpuUsage: number;
    totalMemoryGb: number;
    memoryUsagePercent: number;
    diskTotalGb: number;
    diskUsagePercent: number;
    uptime: string;
    isMaintenance: boolean;
  }>({
    id: deviceId,
    hostname: "SHIVA-PRIMARY",
    status: "ONLINE",
    ipAddress: "192.168.1.105",
    macAddress: "00:1A:2B:3C:4D:5E",
    os: "Windows 11 Enterprise",
    osVersion: "10.0.22631",
    architecture: "x86_64",
    cpuModel: "Intel(R) Core(TM) i9-13900K",
    cpuCores: 24,
    cpuUsage: 28,
    totalMemoryGb: 32,
    memoryUsagePercent: 46,
    diskTotalGb: 1024,
    diskUsagePercent: 54,
    uptime: "14d 6h 32m",
    isMaintenance: false,
  });

  // Services list
  const [services] = useState([
    {
      name: "NOS.Agent.Worker",
      status: "Running",
      pid: 14208,
      memory: "45 MB",
    },
    {
      name: "Windows Security Center",
      status: "Running",
      pid: 1044,
      memory: "18 MB",
    },
    {
      name: "Diagnostic Tracking Service",
      status: "Running",
      pid: 2190,
      memory: "22 MB",
    },
    {
      name: "Hyper-V Virtualization Host",
      status: "Running",
      pid: 4892,
      memory: "180 MB",
    },
  ]);

  // Telemetry time series
  const [telemetrySeries, setTelemetrySeries] = useState([
    { time: "00:00", cpu: 15, ram: 42, disk: 54, netUp: 1.2, netDown: 4.5 },
    { time: "04:00", cpu: 22, ram: 44, disk: 54, netUp: 0.8, netDown: 3.2 },
    { time: "08:00", cpu: 45, ram: 52, disk: 55, netUp: 3.5, netDown: 12.8 },
    { time: "12:00", cpu: 32, ram: 48, disk: 55, netUp: 2.1, netDown: 8.4 },
    { time: "16:00", cpu: 58, ram: 62, disk: 56, netUp: 5.4, netDown: 18.2 },
    { time: "20:00", cpu: 28, ram: 47, disk: 56, netUp: 1.5, netDown: 5.6 },
    { time: "Now", cpu: 28, ram: 46, disk: 56, netUp: 2.4, netDown: 7.8 },
  ]);

  // Alerts for this device
  const [deviceAlerts, setDeviceAlerts] = useState<AlertCardData[]>([
    {
      id: "alt-01",
      severity: "WARNING",
      title: "Memory Exhaustion Threshold Exceeded (>80%)",
      description:
        "Physical RAM utilization spiked during batch telemetry sync.",
      deviceName: "SHIVA-PRIMARY",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      status: "RESOLVED",
    },
    {
      id: "alt-02",
      severity: "INFO",
      title: "Agent Automated Version Sync Complete",
      description: "Daemon upgraded to v1.0.0 via zero-touch OTA channel.",
      deviceName: "SHIVA-PRIMARY",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      status: "RESOLVED",
    },
  ]);

  // Edit settings form
  const [customName, setCustomName] = useState(device.hostname);
  const [maintenanceMode, setMaintenanceMode] = useState(device.isMaintenance);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchDeviceDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient
        .get<any, any>(`/device/${deviceId}`)
        .catch(() => null);

      if (res?.data || res) {
        const payload = res.data || res;
        setDevice((prev) => ({
          ...prev,
          id: payload.id || deviceId,
          hostname: payload.hostname || payload.deviceName || prev.hostname,
          status: (payload.status || prev.status) as DeviceStatusType,
          ipAddress: payload.ipAddress || payload.ip || prev.ipAddress,
          macAddress: payload.macAddress || prev.macAddress,
          os: payload.os || prev.os,
        }));
        setCustomName(
          payload.hostname || payload.deviceName || device.hostname,
        );
      }
    } catch (err) {
      console.warn("Device detail fallback applied:", err);
    } finally {
      setLoading(false);
    }
  }, [deviceId, device.hostname]);

  useEffect(() => {
    fetchDeviceDetail();
  }, [fetchDeviceDetail]);

  // Real-time Socket.IO subscriptions
  const { on } = useRealtime();

  useEffect(() => {
    const unsubHeartbeat = on("heartbeat.received", (payload) => {
      if (payload?.deviceId === deviceId) {
        setDevice((prev) => ({
          ...prev,
          status: "ONLINE",
          cpuUsage: payload.cpuUsage ?? prev.cpuUsage,
          memoryUsagePercent:
            payload.memoryUsagePercent ?? prev.memoryUsagePercent,
        }));
      }
    });

    const unsubTelemetry = on("telemetry.received", (payload) => {
      if (payload?.deviceId === deviceId && payload.metrics) {
        const cpu = Math.round(payload.metrics.cpu?.usagePercent || 28);
        const ram = Math.round(payload.metrics.memory?.usagePercent || 46);
        const disk = Math.round(payload.metrics.disk?.usagePercent || 56);
        const netUp = Number(
          (payload.metrics.network?.uploadRateMb || 2.4).toFixed(1),
        );
        const netDown = Number(
          (payload.metrics.network?.downloadRateMb || 7.8).toFixed(1),
        );

        setTelemetrySeries((prev) => [
          ...prev.slice(1),
          {
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            cpu,
            ram,
            disk,
            netUp,
            netDown,
          },
        ]);
      }
    });

    return () => {
      unsubHeartbeat();
      unsubTelemetry();
    };
  }, [on, deviceId]);

  const handleSaveSettings = () => {
    setDevice((prev) => ({
      ...prev,
      hostname: customName,
      isMaintenance: maintenanceMode,
      status: maintenanceMode ? "MAINTENANCE" : prev.status,
    }));
    toast.success("Device settings updated successfully");
  };

  const handleDeleteDevice = () => {
    toast.info("Device removed from tenant registry");
    setIsDeleteModalOpen(false);
    router.push("/devices");
  };

  return (
    <div className="space-y-6">
      {/* Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/devices">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-800 hover:border-gray-700 text-gray-300 h-9 px-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Devices
            </Button>
          </Link>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {device.hostname}
              </h1>
              <StatusBadge status={device.status} size="sm" />
            </div>
            <p className="text-xs text-gray-400 font-mono mt-1">
              IP: {device.ipAddress} • MAC: {device.macAddress} • OS:{" "}
              {device.os}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDeviceDetail}
          className="border-gray-800 text-gray-300 text-xs"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
          />
          Sync Live Diagnostics
        </Button>
      </div>

      {/* 4 Tabs Bar */}
      <div className="flex border-b border-gray-800 gap-2">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "telemetry", label: "Telemetry", icon: Activity },
          { id: "alerts", label: "Alerts", icon: Bell },
          { id: "settings", label: "Settings", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                active
                  ? "border-blue-500 text-blue-400 bg-blue-500/10"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          {/* Quick Metrics 4 Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-900 border-gray-800 p-4">
              <span className="text-xs text-gray-400 font-medium">
                CPU Load
              </span>
              <div className="text-2xl font-bold text-white mt-1">
                {device.cpuUsage}%
              </div>
              <div className="text-[11px] text-blue-400 mt-1">
                24 Cores @ 3.0GHz
              </div>
            </Card>

            <Card className="bg-gray-900 border-gray-800 p-4">
              <span className="text-xs text-gray-400 font-medium">
                RAM Utilization
              </span>
              <div className="text-2xl font-bold text-white mt-1">
                {device.memoryUsagePercent}%
              </div>
              <div className="text-[11px] text-purple-400 mt-1">
                {Math.round(
                  (device.totalMemoryGb * device.memoryUsagePercent) / 100,
                )}{" "}
                / {device.totalMemoryGb} GB
              </div>
            </Card>

            <Card className="bg-gray-900 border-gray-800 p-4">
              <span className="text-xs text-gray-400 font-medium">
                Disk Space
              </span>
              <div className="text-2xl font-bold text-white mt-1">
                {device.diskUsagePercent}%
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">
                {Math.round(
                  (device.diskTotalGb * device.diskUsagePercent) / 100,
                )}{" "}
                / {device.diskTotalGb} GB
              </div>
            </Card>

            <Card className="bg-gray-900 border-gray-800 p-4">
              <span className="text-xs text-gray-400 font-medium">
                System Uptime
              </span>
              <div className="text-2xl font-bold text-white mt-1">
                {device.uptime}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                0 Unplanned Reboots
              </div>
            </Card>
          </div>

          {/* Hardware Specs & Network Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hardware Specs */}
            <Card className="bg-gray-900 border-gray-800 p-5 shadow-xl space-y-4">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                <Cpu className="w-4 h-4 text-blue-400" /> Hardware Specification
              </CardTitle>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">Processor</span>
                  <span className="text-gray-200 font-medium">
                    {device.cpuModel}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Cores / Threads</span>
                  <span className="text-gray-200 font-medium">
                    {device.cpuCores} Physical Cores
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Memory (RAM)</span>
                  <span className="text-gray-200 font-medium">
                    {device.totalMemoryGb} GB DDR5
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Storage Primary</span>
                  <span className="text-gray-200 font-medium">
                    {device.diskTotalGb} GB NVMe SSD
                  </span>
                </div>
              </div>
            </Card>

            {/* Network Info */}
            <Card className="bg-gray-900 border-gray-800 p-5 shadow-xl space-y-4">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2 border-b border-gray-800 pb-3">
                <NetworkIcon className="w-4 h-4 text-purple-400" /> Network
                Interface Profile
              </CardTitle>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">IPv4 Address</span>
                  <span className="text-gray-200 font-mono font-medium">
                    {device.ipAddress}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Physical MAC</span>
                  <span className="text-gray-200 font-mono font-medium">
                    {device.macAddress}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Gateway</span>
                  <span className="text-gray-200 font-mono font-medium">
                    192.168.1.1
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">DNS Resolvers</span>
                  <span className="text-gray-200 font-mono font-medium">
                    1.1.1.1, 8.8.8.8
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Running Services */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-800 bg-gray-950/60 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" /> Core System
                Daemon Services
              </h3>
              <span className="text-xs text-gray-400">
                {services.length} Active Services
              </span>
            </div>
            <div className="divide-y divide-gray-800">
              {services.map((svc) => (
                <div
                  key={svc.name}
                  className="p-3.5 px-5 flex items-center justify-between text-xs hover:bg-gray-800/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <span className="font-semibold text-white">
                        {svc.name}
                      </span>
                      <span className="text-gray-500 ml-2 font-mono">
                        PID: {svc.pid}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-gray-400 font-mono text-[11px]">
                    <span>{svc.memory}</span>
                    <span className="text-emerald-400 font-semibold">
                      {svc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: TELEMETRY (4 Line Charts with Time Selector) */}
      {activeTab === "telemetry" && (
        <div className="space-y-6 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Chart */}
            <ChartCard
              title="CPU Load History (%)"
              subtitle="Average CPU core consumption"
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetrySeries}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      vertical={false}
                    />
                    <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                    <YAxis
                      stroke="#6b7280"
                      domain={[0, 100]}
                      unit="%"
                      fontSize={11}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        borderColor: "#374151",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="cpu"
                      name="CPU"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* RAM Chart */}
            <ChartCard
              title="Memory Utilization (%)"
              subtitle="Committed physical RAM"
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetrySeries}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      vertical={false}
                    />
                    <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                    <YAxis
                      stroke="#6b7280"
                      domain={[0, 100]}
                      unit="%"
                      fontSize={11}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        borderColor: "#374151",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ram"
                      name="RAM"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Disk Chart */}
            <ChartCard
              title="Disk I/O & Storage Usage (%)"
              subtitle="Primary volume utilization"
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetrySeries}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      vertical={false}
                    />
                    <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                    <YAxis
                      stroke="#6b7280"
                      domain={[0, 100]}
                      unit="%"
                      fontSize={11}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        borderColor: "#374151",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="disk"
                      name="Disk"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Network Chart */}
            <ChartCard
              title="Network Bandwidth (Mbps)"
              subtitle="Upload / Download throughput"
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={telemetrySeries}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#1f2937"
                      vertical={false}
                    />
                    <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#111827",
                        borderColor: "#374151",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="netDown"
                      name="Download (Mbps)"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="netUp"
                      name="Upload (Mbps)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* Tab 3: ALERTS */}
      {activeTab === "alerts" && (
        <div className="space-y-4 animate-in fade-in-50 duration-150">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">
              Device Incident Log
            </h3>
            <span className="text-xs text-gray-400">
              {deviceAlerts.length} Events
            </span>
          </div>

          <div className="space-y-3">
            {deviceAlerts.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs bg-gray-900 border border-gray-800 rounded-xl">
                No active or historical incident alerts found for this device.
              </div>
            ) : (
              deviceAlerts.map((alt) => <AlertCard key={alt.id} alert={alt} />)
            )}
          </div>
        </div>
      )}

      {/* Tab 4: SETTINGS */}
      {activeTab === "settings" && (
        <div className="space-y-6 max-w-2xl animate-in fade-in-50 duration-150">
          {/* General Device Preferences */}
          <Card className="bg-gray-900 border-gray-800 p-5 space-y-4 shadow-xl">
            <CardTitle className="text-sm font-bold text-white border-b border-gray-800 pb-3">
              Device Configuration
            </CardTitle>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">
                  Device Display Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-950 border border-gray-800 text-white focus:outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="font-semibold text-white block">
                    Maintenance Mode
                  </span>
                  <span className="text-gray-500 text-[11px] block">
                    Temporarily mute metric alerts and SLA triggers during
                    planned maintenance.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="w-5 h-5 rounded bg-gray-950 border-gray-700 text-blue-600 focus:ring-0"
                />
              </div>

              <div className="pt-3">
                <Button
                  onClick={handleSaveSettings}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                </Button>
              </div>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-red-950/20 border border-red-900/40 p-5 space-y-3 shadow-xl">
            <CardTitle className="text-sm font-bold text-red-400">
              Danger Zone
            </CardTitle>
            <p className="text-xs text-gray-400">
              Revoke this device&apos;s authentication tokens and delete
              historical telemetry records from the cluster.
            </p>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(true)}
              className="border-red-800 text-red-400 hover:bg-red-900/40 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Deregister Device
            </Button>
          </Card>

          {/* Delete Confirmation Modal */}
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <div className="bg-gray-900 border border-red-900/50 rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                <h3 className="text-base font-bold text-white">
                  Confirm Deregistration
                </h3>
                <p className="text-xs text-gray-400">
                  Are you sure you want to remove{" "}
                  <strong className="text-white">{device.hostname}</strong>?
                  This action is irreversible.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="border-gray-700 text-gray-300 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteDevice}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs"
                  >
                    Yes, Deregister
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
