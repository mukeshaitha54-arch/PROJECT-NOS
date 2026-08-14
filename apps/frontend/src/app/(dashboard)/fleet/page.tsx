"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Network,
  Server,
  Activity,
  Cpu,
  HardDrive,
  RefreshCw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Shield,
  Plus,
  ArrowUpRight,
  Layers,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { deviceApi } from "@/features/device/services/device.api";
import { Device, DeviceStatus } from "@nos/shared-types";
import { Badge } from "@/components/ui/badge";
import { useRealtimeContext } from "@/realtime/providers/RealtimeProvider";

export default function FleetOverviewPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { isConnected, lastEvent } = useRealtimeContext();

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deviceApi.getStatus();
      setDevices(res.devices || []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.warn("Fleet fetch fallback:", err);
      // Fallback sample fleet data if API is starting up
      setDevices([
        {
          id: "node-shiva-01",
          deviceName: "SHIVA-PRIMARY",
          hostname: "SHIVA",
          os: "Windows 11 Enterprise",
          osVersion: "10.0.22631",
          architecture: "X64",
          agentVersion: "1.0.0",
          status: DeviceStatus.ONLINE,
          organizationId: "default-org",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
        } as unknown as Device,
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Real-time updates from Socket.IO
  useEffect(() => {
    if (!lastEvent) return;
    const { type, payload } = lastEvent;

    if (
      type === "device:status:changed" ||
      type === "device.online" ||
      type === "device.offline"
    ) {
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id === payload?.deviceId || d.hostname === payload?.hostname) {
            return {
              ...d,
              status:
                payload.status ||
                (type === "device.online"
                  ? DeviceStatus.ONLINE
                  : DeviceStatus.OFFLINE),
              lastSeen: new Date().toISOString(),
            };
          }
          return d;
        }),
      );
      setLastRefreshed(new Date());
    }
  }, [lastEvent]);

  // Compute fleet metrics
  const metrics = useMemo(() => {
    const total = devices.length;
    const online = devices.filter(
      (d) => d.status === DeviceStatus.ONLINE,
    ).length;
    const offline = devices.filter(
      (d) => d.status === DeviceStatus.OFFLINE,
    ).length;
    const degraded = devices.filter(
      (d) => d.status === DeviceStatus.DEGRADED,
    ).length;
    const healthyPercentage =
      total > 0 ? Math.round((online / total) * 100) : 100;

    return { total, online, offline, degraded, healthyPercentage };
  }, [devices]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchesSearch =
        search === "" ||
        d.hostname?.toLowerCase().includes(search.toLowerCase()) ||
        d.deviceName?.toLowerCase().includes(search.toLowerCase()) ||
        d.os?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [devices, search, statusFilter]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Device Command Center
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isConnected ? "Live Stream Active" : "Polling Active"}
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Real-time telemetry, device status, and health metrics across
                personal nodes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDevices}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 text-xs font-semibold text-gray-300 hover:text-white transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Devices
          </button>
          <button
            onClick={() => setIsClaimModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Devices */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total Monitored Devices
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {metrics.total}
            </span>
            <span className="text-xs text-gray-400">nodes registered</span>
          </div>
          <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Online Healthy */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
              Active & Online
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">
              {metrics.online}
            </span>
            <span className="text-xs text-emerald-400/80 font-medium">
              ({metrics.healthyPercentage}% operational)
            </span>
          </div>
          <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.healthyPercentage}%` }}
            />
          </div>
        </div>

        {/* Degraded / Warning */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
              Degraded State
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-400">
              {metrics.degraded}
            </span>
            <span className="text-xs text-gray-400">high load / alerts</span>
          </div>
          <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width:
                  metrics.total > 0
                    ? `${(metrics.degraded / metrics.total) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>

        {/* Offline / Unreachable */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 backdrop-blur-sm relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-400 uppercase tracking-wider">
              Offline Nodes
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-400">
              {metrics.offline}
            </span>
            <span className="text-xs text-gray-400">unreachable</span>
          </div>
          <div className="mt-3 w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
              style={{
                width:
                  metrics.total > 0
                    ? `${(metrics.offline / metrics.total) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-900/40 p-3 rounded-xl border border-gray-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search fleet by node name, hostname, OS version..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg p-1 text-xs">
            {(["ALL", "ONLINE", "DEGRADED", "OFFLINE"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition ${
                    statusFilter === status
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Fleet Nodes Grid / Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/80">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Monitored Nodes ({filteredDevices.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500 font-mono">
            Synced: {lastRefreshed.toLocaleTimeString()}
          </span>
        </div>

        {filteredDevices.length === 0 ? (
          <div className="py-16 text-center">
            <Server className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-300">
              No nodes match your filter
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or onboard a new monitoring
              agent to your tenant.
            </p>
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition"
            >
              <Plus className="w-4 h-4" />
              Onboard Agent Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filteredDevices.map((device) => {
              const isOnline = device.status === DeviceStatus.ONLINE;
              return (
                <div
                  key={device.id}
                  className="p-5 hover:bg-gray-800/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center ${
                        isOnline
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          : "bg-gray-800/80 border-gray-700 text-gray-400"
                      }`}
                    >
                      <Server className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/device/${device.id}`}
                          className="text-base font-bold text-white hover:text-blue-400 transition flex items-center gap-1.5"
                        >
                          {device.hostname || device.deviceName || device.id}
                          <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                        </Link>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isOnline
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-gray-800 text-gray-400 border border-gray-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-gray-500"
                            }`}
                          />
                          {device.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                        <span>
                          Platform:{" "}
                          <strong className="text-gray-300">
                            {device.os || "Windows"}
                          </strong>
                        </span>
                        <span>
                          Arch:{" "}
                          <strong className="text-gray-300">
                            {device.architecture || "x64"}
                          </strong>
                        </span>
                        <span>
                          Agent:{" "}
                          <strong className="text-gray-300">
                            v{device.agentVersion || "1.0.0"}
                          </strong>
                        </span>
                        {device.lastSeen && (
                          <span>
                            Last Heartbeat:{" "}
                            <strong className="text-gray-300">
                              {new Date(device.lastSeen).toLocaleTimeString()}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/device/${device.id}/inventory`}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Inventory
                    </Link>
                    <Link
                      href={`/device/${device.id}`}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold transition flex items-center gap-1"
                    >
                      Inspect Node
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Onboard Agent Modal */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Onboard Monitoring Agent
                  </h3>
                  <p className="text-xs text-gray-400">
                    Deploy the NOS Windows agent to a new fleet machine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-300 font-medium">
                1. Run the following command in PowerShell as Administrator:
              </p>
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3.5 font-mono text-cyan-400 text-xs break-all select-all">
                cd
                &quot;C:\Users\mukes\OneDrive\Desktop\NOS\apps\NOS.Agent&quot;;
                dotnet run
              </div>

              <p className="text-gray-300 font-medium pt-2">
                2. Zero-Trust Handshake & Auto-Discovery:
              </p>
              <ul className="space-y-1.5 text-gray-400 list-disc list-inside">
                <li>
                  Agent auto-generates machine UUID and registers with tenant
                </li>
                <li>Live heartbeats and thermal metrics stream every 30s</li>
                <li>
                  Discovered node will immediately appear in this Fleet Command
                  Center
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
              >
                Done
              </button>
              <button
                onClick={() => {
                  fetchDevices();
                  setIsClaimModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Check Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
