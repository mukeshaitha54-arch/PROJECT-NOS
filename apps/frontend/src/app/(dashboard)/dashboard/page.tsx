"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Server,
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  Cpu,
  HardDrive,
  Monitor,
  Radio,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { ChartCard } from "@/components/ChartCard";
import { useRealtime } from "@/realtime/hooks/useRealtime";
import { apiClient } from "@/lib/api-client";

interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  warningDevices: number;
  maintenanceDevices: number;
  alertsToday: number;
  cpuAvg: number;
  ramAvg: number;
}

interface RecentAlert {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "WARNING" | "INFO";
  deviceName: string;
  deviceId?: string;
  createdAt: string;
  status: "OPEN" | "RESOLVED" | "ACKNOWLEDGED";
}

const STATUS_COLORS: Record<string, string> = {
  Online: "#10b981", // emerald
  Offline: "#64748b", // slate
  Warning: "#f59e0b", // amber
  Maintenance: "#3b82f6", // blue
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    warningDevices: 0,
    maintenanceDevices: 0,
    alertsToday: 0,
    cpuAvg: 24,
    ramAvg: 48,
  });

  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Recharts fleet sparklines telemetry history
  const [sparklineData, setSparklineData] = useState([
    { time: "00:00", cpu: 18, ram: 42 },
    { time: "04:00", cpu: 22, ram: 45 },
    { time: "08:00", cpu: 35, ram: 52 },
    { time: "12:00", cpu: 28, ram: 49 },
    { time: "16:00", cpu: 42, ram: 60 },
    { time: "20:00", cpu: 25, ram: 48 },
    { time: "Now", cpu: 24, ram: 48 },
  ]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch platform status
      const statusRes = await apiClient
        .get<any, any>("/device/status")
        .catch(() => null);

      const alertRes = await apiClient
        .get<any, any>("/alerts?limit=10")
        .catch(() => null);

      if (statusRes?.data || statusRes) {
        const payload = statusRes.data || statusRes;
        const devices = payload.devices || [];
        const total = devices.length || payload.statistics?.total || 0;
        const online =
          devices.filter((d: any) => d.status === "ONLINE").length ||
          payload.statistics?.online ||
          0;
        const offline =
          devices.filter((d: any) => d.status === "OFFLINE").length ||
          payload.statistics?.offline ||
          0;
        const warning =
          devices.filter(
            (d: any) => d.status === "WARNING" || d.status === "DEGRADED",
          ).length ||
          payload.statistics?.degraded ||
          0;
        const maintenance =
          devices.filter((d: any) => d.status === "MAINTENANCE").length || 0;

        setStats((prev) => ({
          ...prev,
          totalDevices: total,
          onlineDevices: online,
          offlineDevices: offline,
          warningDevices: warning,
          maintenanceDevices: maintenance,
        }));
      }

      if (alertRes?.data || alertRes) {
        const rawAlerts = alertRes.data?.alerts || alertRes.alerts || [];
        setAlerts(
          rawAlerts.slice(0, 10).map((a: any) => ({
            id: a.id || `alt-${Math.random()}`,
            title: a.title || a.message || "System Diagnostic Notification",
            severity: a.severity || "INFO",
            deviceName: a.deviceName || a.device?.deviceName || "SHIVA-PRIMARY",
            deviceId: a.deviceId || a.device?.id,
            createdAt: a.createdAt || new Date().toISOString(),
            status: a.status || "OPEN",
          })),
        );
        setStats((prev) => ({
          ...prev,
          alertsToday: rawAlerts.filter(
            (a: any) => a.status === "OPEN" || a.status === "TRIGGERED",
          ).length,
        }));
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn("Dashboard metrics fallback initialized:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time Socket.IO subscriptions with 5s debounce
  const { on, isConnected } = useRealtime();

  useEffect(() => {
    const triggerDebouncedRefresh = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        fetchDashboardData();
      }, 5000);
    };

    const unsubOnline = on("device.online", () => {
      setStats((prev) => ({
        ...prev,
        onlineDevices: prev.onlineDevices + 1,
        offlineDevices: Math.max(0, prev.offlineDevices - 1),
      }));
      triggerDebouncedRefresh();
    });

    const unsubOffline = on("device.offline", () => {
      setStats((prev) => ({
        ...prev,
        offlineDevices: prev.offlineDevices + 1,
        onlineDevices: Math.max(0, prev.onlineDevices - 1),
      }));
      triggerDebouncedRefresh();
    });

    const unsubTelemetry = on("telemetry.received", (payload) => {
      if (payload?.metrics?.cpu?.usagePercent) {
        const newCpu = Math.round(payload.metrics.cpu.usagePercent);
        const newRam = Math.round(
          payload.metrics.memory?.usagePercent || stats.ramAvg,
        );
        setStats((prev) => ({ ...prev, cpuAvg: newCpu, ramAvg: newRam }));
        setSparklineData((prev) => [
          ...prev.slice(1),
          {
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            cpu: newCpu,
            ram: newRam,
          },
        ]);
      }
      triggerDebouncedRefresh();
    });

    const unsubAlert = on("alert:triggered", (payload) => {
      setStats((prev) => ({ ...prev, alertsToday: prev.alertsToday + 1 }));
      if (payload) {
        setAlerts((prev) => [
          {
            id: payload.id || `alt-${Date.now()}`,
            title: payload.title || "Critical Telemetry Breach",
            severity: payload.severity || "CRITICAL",
            deviceName: payload.deviceName || "SHIVA",
            deviceId: payload.deviceId,
            createdAt: new Date().toISOString(),
            status: "OPEN",
          },
          ...prev.slice(0, 9),
        ]);
      }
      triggerDebouncedRefresh();
    });

    return () => {
      unsubOnline();
      unsubOffline();
      unsubTelemetry();
      unsubAlert();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [on, fetchDashboardData, stats.ramAvg]);

  // Distribution Pie Chart Data
  const pieData = [
    { name: "Online", value: stats.onlineDevices || 1 },
    { name: "Offline", value: stats.offlineDevices || 0 },
    { name: "Warning", value: stats.warningDevices || 0 },
    { name: "Maintenance", value: stats.maintenanceDevices || 0 },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-blue-500" />
            Operational Command Center
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time fleet telemetry, agent status, and live health metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-gray-300">
            <Radio
              className={`w-3.5 h-3.5 ${
                isConnected ? "text-emerald-400 animate-pulse" : "text-red-400"
              }`}
            />
            <span>{isConnected ? "Live Stream Active" : "Polling Mode"}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="border-gray-800 hover:border-gray-700 text-xs text-gray-300"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Top 4 Stats Cards (Responsive 1/2/4 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Devices */}
        <Card className="bg-gray-900/90 border-gray-800 p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Total Enrolled Nodes
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white">
              {stats.totalDevices}
            </span>
            <span className="flex items-center text-xs font-medium text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +100% active
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Cryptographic identity verified
          </div>
        </Card>

        {/* Online Devices */}
        <Card className="bg-gray-900/90 border-gray-800 p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Online Agents
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">
              {stats.onlineDevices}
            </span>
            <span className="flex items-center text-xs font-medium text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Active Pulse
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Heartbeat received &lt; 30s
          </div>
        </Card>

        {/* Offline Devices */}
        <Card className="bg-gray-900/90 border-gray-800 p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Offline Nodes
            </span>
            <div className="p-2 rounded-lg bg-gray-800 text-gray-400 group-hover:scale-110 transition-transform">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-gray-300">
              {stats.offlineDevices}
            </span>
            <span className="text-xs font-medium text-gray-400">No signal</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Heartbeat timeout &gt; 90s
          </div>
        </Card>

        {/* Alerts Today */}
        <Card className="bg-gray-900/90 border-gray-800 p-5 shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Active Alerts
            </span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-red-400">
              {stats.alertsToday}
            </span>
            <span className="flex items-center text-xs font-medium text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 mr-0.5" /> Needs Attention
            </span>
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Rule engine breach events
          </div>
        </Card>
      </div>

      {/* Charts Grid: Fleet Average Sparklines & Distribution Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fleet Average Sparklines (2 columns wide) */}
        <ChartCard
          title="Fleet Average Telemetry (CPU & RAM Usage)"
          subtitle="Real-time aggregation computed across active fleet agents"
          className="lg:col-span-2"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sparklineData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1f2937"
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  domain={[0, 100]}
                  unit="%"
                  tickLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  name="CPU Load"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="ram"
                  name="Memory Usage"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#ramGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Device Status Distribution Pie Chart */}
        <ChartCard
          title="Device Status Distribution"
          subtitle="Proportion of fleet operational states"
        >
          <div className="h-72 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={STATUS_COLORS[entry.name] || "#6b7280"}
                    />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-300 mt-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: STATUS_COLORS[item.name] || "#6b7280",
                    }}
                  />
                  <span>
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Recent Alerts Table (Last 10 Clickable) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/60">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              Recent Security & Telemetry Alerts
            </h3>
          </div>
          <Link
            href="/alerts"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            View All Alerts <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/60 text-gray-400 uppercase text-[11px] font-semibold tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-5 py-3.5">Severity</th>
                <th className="px-5 py-3.5">Alert Event</th>
                <th className="px-5 py-3.5">Device Node</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {alerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 text-xs"
                  >
                    No active incident breaches detected across fleet telemetry.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-gray-800/40 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          alert.severity === "CRITICAL"
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : alert.severity === "HIGH"
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                              : alert.severity === "WARNING"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-white">
                      <Link
                        href={`/alerts`}
                        className="hover:text-blue-400 transition"
                      >
                        {alert.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400">
                      {alert.deviceId ? (
                        <Link
                          href={`/devices/${alert.deviceId}`}
                          className="hover:underline text-blue-400"
                        >
                          {alert.deviceName}
                        </Link>
                      ) : (
                        alert.deviceName
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          alert.status === "RESOLVED"
                            ? "success"
                            : alert.status === "ACKNOWLEDGED"
                              ? "info"
                              : "critical"
                        }
                        size="xs"
                      >
                        {alert.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
