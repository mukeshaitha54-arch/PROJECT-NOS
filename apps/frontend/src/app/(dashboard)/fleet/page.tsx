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
  Copy,
  Check,
  Download,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { deviceApi } from "@/features/device/services/device.api";
import { apiClient } from "@/lib/api-client";
import { Device, DeviceStatus } from "@nos/shared-types";
import { safeCopyToClipboard } from "@/lib/clipboard";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useRealtimeContext } from "@/realtime/providers/RealtimeProvider";
import { getScopedDeviceCacheKey } from "@/lib/cache";

export default function FleetOverviewPage() {
  const { user } = useAuth();
  const deviceCacheKey = getScopedDeviceCacheKey(
    user?.id,
    user?.organizationId,
  );

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isClaimModalOpen, setIsClaimModalOpen] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const [confirmDelete, setConfirmDelete] = useState<Device | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Keep a ref to the latest devices list for pure event handler checks
  const devicesRef = React.useRef<Device[]>(devices);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const handleDeleteDevice = async (device: Device) => {
    setIsDeleting(true);
    try {
      await apiClient.delete(`/devices/${device.id}`);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      setConfirmDelete(null);
    } catch (err) {
      console.error("Failed to delete device", err);
      alert("Failed to delete device. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem(deviceCacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDevices(parsed);
            setLoading(false);
          }
        }
      } catch {}
    }
  }, [deviceCacheKey]);

  const { isConnected, lastEvent } = useRealtimeContext();

  const isFetchingRef = React.useRef<boolean>(false);
  const lastFetchTimestampRef = React.useRef<number>(0);

  const fetchDevices = useCallback(
    async (silent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      const requestTimestamp = Date.now();
      try {
        if (!silent) setLoading(true);
        setError(null);
        let fetchSuccess = false;
        let list: Device[] = [];

        try {
          const res = await deviceApi.getStatus();
          const payload = (res as any).data || res;
          if (payload && Array.isArray(payload.devices)) {
            list = payload.devices;
            fetchSuccess = true;
          }
        } catch {
          // Fallback to /devices
        }

        if (!fetchSuccess) {
          try {
            const fallbackRes = await apiClient.get<any>("/devices");
            const fbPayload = fallbackRes?.data?.data || fallbackRes?.data;
            if (Array.isArray(fbPayload)) {
              list = fbPayload;
              fetchSuccess = true;
            }
          } catch {
            // Request failed
          }
        }

        if (!fetchSuccess) {
          if (!silent) {
            setError("Failed to load devices. Please check your connection.");
          }
          return;
        }

        if (requestTimestamp >= lastFetchTimestampRef.current) {
          lastFetchTimestampRef.current = requestTimestamp;
          setDevices(list);
          if (typeof window !== "undefined") {
            try {
              if (list.length > 0) {
                sessionStorage.setItem(deviceCacheKey, JSON.stringify(list));
              } else {
                sessionStorage.removeItem(deviceCacheKey);
              }
            } catch {}
          }
          setLastRefreshed(new Date());
        }
      } catch (err: any) {
        console.error("Fleet fetch failed:", err);
        if (!silent) {
          setError("Failed to load devices. Please check your connection.");
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [deviceCacheKey],
  );

  useEffect(() => {
    fetchDevices(false);
    // Background sync every 8 seconds ensures freshness with zero user F5 needed
    const interval = setInterval(() => {
      fetchDevices(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  // Real-time updates from Socket.IO with sub-millisecond reactions and auto-discovery
  useEffect(() => {
    if (!lastEvent) return;
    const { type, payload } = lastEvent;

    if (
      type === "device:status:changed" ||
      type === "device.online" ||
      type === "device.offline" ||
      type === "device.connected" ||
      type === "device.registered" ||
      type === "heartbeat.received"
    ) {
      const targetId = payload?.deviceId || payload?.id;
      const targetHostname = payload?.hostname;
      const currentDevices = devicesRef.current;
      const exists = currentDevices.some(
        (d) =>
          (targetId && (d.id === targetId || (d as any).uuid === targetId)) ||
          (targetHostname &&
            d.hostname &&
            d.hostname.toLowerCase() === targetHostname.toLowerCase()),
      );

      if (!exists) {
        // New device discovered in real time — immediately fetch silently to show it!
        fetchDevices(true);
        return;
      }

      setDevices((prev) =>
        prev.map((d) => {
          const isMatch =
            (targetId && (d.id === targetId || (d as any).uuid === targetId)) ||
            (targetHostname &&
              d.hostname &&
              d.hostname.toLowerCase() === targetHostname.toLowerCase());
          if (isMatch) {
            return {
              ...d,
              status:
                payload.status ||
                (type === "device.offline"
                  ? DeviceStatus.OFFLINE
                  : DeviceStatus.ONLINE),
              lastSeen: payload?.timestamp || new Date().toISOString(),
            };
          }
          return d;
        }),
      );
      setLastRefreshed(new Date());
    }
  }, [lastEvent, fetchDevices]);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-orange-500/20 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 shadow-md shadow-orange-500/20">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Device Command Center
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isConnected ? "Live Stream Active" : "Polling Active"}
                </span>
              </h1>
              <p className="text-xs text-zinc-300 mt-1">
                Real-time telemetry, device status, and health metrics across
                personal nodes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchDevices(false)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-orange-500/25 hover:border-orange-500/60 text-xs font-semibold text-white hover:bg-white/[0.08] transition shadow-sm active:scale-[0.98]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin text-orange-400" : "text-orange-400"}`}
            />
            Refresh Devices
          </button>
          <button
            onClick={() => setIsClaimModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-xs font-semibold text-white shadow-lg shadow-orange-500/30 active:scale-[0.97] transition"
          >
            <Plus className="w-4 h-4" />
            Add Device
          </button>
        </div>
      </div>

      {/* Metric Cards Grid with Transparent Glossy Frosted Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Devices */}
        <div className="dashboard-glass-card rounded-2xl p-5 relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Total Monitored Devices
            </span>
            <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono drop-shadow-sm">
              {metrics.total}
            </span>
            <span className="text-xs text-zinc-300 font-medium">
              nodes registered
            </span>
          </div>
          <div className="mt-3 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Online Healthy */}
        <div className="dashboard-glass-card rounded-2xl p-5 relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Active & Online
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono drop-shadow-sm">
              {metrics.online}
            </span>
            <span className="text-xs text-emerald-300 font-semibold">
              ({metrics.healthyPercentage}% operational)
            </span>
          </div>
          <div className="mt-3 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${metrics.healthyPercentage}%` }}
            />
          </div>
        </div>

        {/* Degraded / Warning */}
        <div className="dashboard-glass-card rounded-2xl p-5 relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Degraded State
            </span>
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono drop-shadow-sm">
              {metrics.degraded}
            </span>
            <span className="text-xs text-zinc-300 font-medium">
              high load / alerts
            </span>
          </div>
          <div className="mt-3 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
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
        <div className="dashboard-glass-card rounded-2xl p-5 relative overflow-hidden group transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Offline Nodes
            </span>
            <div className="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400 font-mono drop-shadow-sm">
              {metrics.offline}
            </span>
            <span className="text-xs text-zinc-300 font-medium">
              unreachable
            </span>
          </div>
          <div className="mt-3 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 dashboard-glass-card p-3 rounded-2xl shadow-lg">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search fleet by node name, hostname, OS version..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-orange-500/20 rounded-xl text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-orange-500/80 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/[0.04] border border-orange-500/20 rounded-xl p-1 text-xs">
            {(["ALL", "ONLINE", "DEGRADED", "OFFLINE"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    statusFilter === status
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30"
                      : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
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
      <div className="dashboard-glass-card rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-orange-500/20 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Monitored Nodes ({filteredDevices.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {isMounted ? `Synced: ${lastRefreshed.toLocaleTimeString()}` : ""}
          </span>
        </div>

        {loading && filteredDevices.length === 0 ? (
          <div className="divide-y divide-orange-500/15">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.05]" />
                  <div className="space-y-2">
                    <div className="h-5 w-44 bg-white/[0.06] rounded-md" />
                    <div className="h-3.5 w-72 bg-white/[0.04] rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-20 bg-white/[0.05] rounded-lg" />
                  <div className="h-7 w-28 bg-white/[0.05] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="py-16 text-center">
            <Server className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-zinc-200">
              No nodes match your filter
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Try adjusting your search criteria or onboard a new monitoring
              agent to your tenant.
            </p>
            <button
              onClick={() => setIsClaimModalOpen(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 text-xs font-semibold text-white hover:from-orange-400 hover:to-rose-500 transition active:scale-[0.97] shadow-lg shadow-orange-500/25"
            >
              <Plus className="w-4 h-4" />
              Onboard Agent Now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-orange-500/15">
            {filteredDevices.map((device) => {
              const isOnline = device.status === DeviceStatus.ONLINE;
              return (
                <div
                  key={device.id}
                  className="p-5 hover:bg-white/[0.06] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center ${
                        isOnline
                          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                          : "bg-white/[0.04] border-orange-500/20 text-zinc-400"
                      }`}
                    >
                      <Server className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5">
                        <Link
                          href={`/devices/${device.id}`}
                          className="text-base font-bold text-white hover:text-orange-400 transition flex items-center gap-1.5"
                        >
                          {device.hostname || device.deviceName || device.id}
                          <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-orange-400" />
                        </Link>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isOnline
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-white/[0.05] text-zinc-400 border border-orange-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-zinc-500"
                            }`}
                          />
                          {device.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-zinc-300">
                        <span>
                          Platform:{" "}
                          <strong className="text-white font-semibold">
                            {device.os || "Windows"}
                          </strong>
                        </span>
                        <span>
                          Arch:{" "}
                          <strong className="text-white font-semibold">
                            {device.architecture || "x64"}
                          </strong>
                        </span>
                        <span>
                          Agent:{" "}
                          <strong className="text-white font-semibold">
                            v{device.agentVersion || "1.0.0"}
                          </strong>
                        </span>
                        {device.lastSeen && (
                          <span>
                            Last Heartbeat:{" "}
                            <strong className="text-white font-semibold">
                              {new Date(device.lastSeen).toLocaleTimeString()}
                            </strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Link
                      href={`/inventory/${device.id}`}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-orange-500/20 hover:border-orange-500/50 hover:bg-white/[0.1] text-xs font-semibold text-white transition flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Inventory
                    </Link>
                    <Link
                      href={`/devices/${device.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/35 hover:bg-orange-500/30 text-xs font-bold transition flex items-center gap-1 active:scale-[0.97]"
                    >
                      Inspect Node
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setConfirmDelete(device)}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition flex items-center justify-center"
                      title="Delete Device Permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Device Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#111217]/95 border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl backdrop-blur-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Delete Device Permanently
                  </h3>
                  <p className="text-zinc-400 text-xs">Irreversible action</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-zinc-300 text-sm mb-3">
              Are you sure you want to permanently delete this device and all
              its records?
            </p>

            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 mb-4 space-y-1">
              <p className="text-white font-mono font-bold text-sm">
                {confirmDelete.hostname || confirmDelete.deviceName || "Device"}
              </p>
              <p className="text-zinc-400 text-xs font-mono truncate">
                ID: {confirmDelete.id}
              </p>
              {confirmDelete.uuid && (
                <p className="text-zinc-400 text-xs font-mono truncate">
                  UUID: {confirmDelete.uuid}
                </p>
              )}
            </div>

            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-3 mb-5 flex items-start gap-2">
              <AlertTriangle
                size={16}
                className="text-red-400 shrink-0 mt-0.5"
              />
              <p className="text-red-300 text-xs leading-relaxed">
                All telemetry snapshots, heartbeats, and discovered inventory
                will be permanently deleted. If the agent is currently running,
                it will automatically uninstall its service upon its next
                communication.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-orange-500/20 text-zinc-300 hover:bg-white/[0.06] transition-colors text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDevice(confirmDelete)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device / Onboard Agent Modal */}
      {isClaimModalOpen && (
        <AddDeviceModal
          onClose={() => setIsClaimModalOpen(false)}
          onRegistered={() => {
            fetchDevices();
            setIsClaimModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Add Device Modal Component ───────────────────────────────────────────────
function AddDeviceModal({
  onClose,
  onRegistered,
}: {
  onClose: () => void;
  onRegistered: () => void;
}) {
  const [step, setStep] = React.useState<"create" | "download">("create");
  const [deployOption, setDeployOption] = React.useState<
    "automated" | "manual"
  >("automated");
  const [keyName, setKeyName] = React.useState("Fleet Device Key");
  const [creating, setCreating] = React.useState(false);
  const [generatedKey, setGeneratedKey] = React.useState<string | null>(null);
  const [copiedKey, setCopiedKey] = React.useState(false);
  const [copiedCmd, setCopiedCmd] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const getToken = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("nos_access_token") ||
        localStorage.getItem("accessToken") ||
        ""
      : "";

  const apiBase = () => {
    if (typeof window !== "undefined") {
      if (
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        return `${window.location.origin}/api/v1`;
      }
      return (
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api/v1"
      );
    }
    return "http://nos.is-local.org/api/v1";
  };

  const createKey = async () => {
    setCreating(true);
    setError(null);
    try {
      let orgId: string | null = null;
      try {
        const meRes = await fetch(`${apiBase()}/auth/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          orgId =
            meData?.data?.organizationId || meData?.organizationId || null;
        }
      } catch (err) {
        // resolution failed
      }

      if (!orgId) {
        setError(
          "Unable to determine your organization. Please refresh and try again.",
        );
        setCreating(false);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);

      const res = await fetch(`${apiBase()}/fleet/registration-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          organizationId: orgId,
          displayName: keyName,
          maxUses: 0,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error?.message || errData?.message || `Error ${res.status}`,
        );
      }

      const data = await res.json();
      const plain = data.plainKey || data?.data?.key || data?.data?.plainKey;
      if (!plain) throw new Error("No key returned from server");

      setGeneratedKey(plain);
      setStep("download");
    } catch (e: any) {
      setError(e.message || "Failed to generate key");
    } finally {
      setCreating(false);
    }
  };

  const copyKey = async () => {
    if (!generatedKey) return;
    await safeCopyToClipboard(generatedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copyCommand = async (cmd: string) => {
    await safeCopyToClipboard(cmd);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const downloadInstaller = () => {
    const url = `${apiBase()}/fleet/installer/windows?registrationKey=${encodeURIComponent(generatedKey || "")}&serverUrl=${encodeURIComponent(apiBase())}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "install-nos-agent.ps1";
    a.click();
  };

  const downloadExe = () => {
    // Use the API endpoint which serves the EXE from backend assets
    const exeUrl = `${apiBase()}/fleet/installer/agent`;
    const a = document.createElement("a");
    a.href = exeUrl;
    a.download = "NOS-Agent.exe";
    a.click();
  };

  const installerCommand = `powershell -ExecutionPolicy Bypass -File .\\install-nos-agent.ps1`;
  const manualCommand = `.\\NOS-Agent.exe`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0f1015]/95 border border-orange-500/30 rounded-3xl max-w-2xl w-full p-6 shadow-2xl my-8 backdrop-blur-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-500/20 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add New Device</h3>
              <p className="text-xs text-zinc-400">
                Step {step === "create" ? "1" : "2"} of 2 —{" "}
                {step === "create"
                  ? "Generate enrollment key"
                  : "Deploy agent to target Windows PC"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {step === "create" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Create a <strong>Registration Key</strong> that the agent will use
              to authenticate with this server on first run.
            </p>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Key Label (for your reference)
              </label>
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full bg-white/[0.04] border border-orange-500/25 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/80"
                placeholder="e.g., Target PC Key"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
                ⚠ {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/[0.04] border border-orange-500/20 hover:bg-white/[0.08] text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={createKey}
                disabled={creating || !keyName.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-md shadow-orange-500/25"
              >
                {creating && (
                  <svg
                    className="animate-spin w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                Generate Key & Continue
              </button>
            </div>
          </div>
        )}

        {step === "download" && generatedKey && (
          <div className="space-y-5">
            {/* Key display banner */}
            <div className="bg-white/[0.04] border border-orange-500/25 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Your One-Time Registration Key
                </span>
                <span className="text-[11px] text-amber-400 font-medium">
                  Save this key (valid for all PCs)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-orange-300 font-mono text-sm bg-white/[0.06] border border-orange-500/20 rounded-xl px-3 py-2.5 break-all select-all">
                  {generatedKey}
                </code>
                <button
                  onClick={copyKey}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    copiedKey
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-orange-500/15 border-orange-500/30 text-orange-300 hover:bg-orange-500/25"
                  }`}
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-4 h-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Key
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Deployment Method Tabs */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Select Installation Method for Target PC:
              </p>
              <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-orange-500/20">
                <button
                  onClick={() => setDeployOption("automated")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    deployOption === "automated"
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Option 1: Automated Installer (Recommended)
                </button>
                <button
                  onClick={() => setDeployOption("manual")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    deployOption === "manual"
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Option 2: Standalone Executable (.exe)
                </button>
              </div>
            </div>

            {/* OPTION 1 CONTENT */}
            {deployOption === "automated" && (
              <div className="bg-white/[0.03] border border-orange-500/20 rounded-2xl p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    Automated Service Deployment
                  </span>
                  <button
                    onClick={downloadInstaller}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-bold transition shadow-md shadow-orange-500/20 active:scale-[0.97]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Installer (.ps1)
                  </button>
                </div>

                <ol className="space-y-2.5 text-zinc-300 list-decimal list-inside pl-1">
                  <li>
                    Move the downloaded{" "}
                    <code className="text-orange-400 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">
                      install-nos-agent.ps1
                    </code>{" "}
                    to the target PC.
                  </li>
                  <li>
                    Open <strong>PowerShell as Administrator</strong> and{" "}
                    <code className="text-orange-400 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-[10px]">
                      cd
                    </code>{" "}
                    to the folder where you saved the script. Example:{" "}
                    <code className="text-orange-400 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-[10px]">
                      cd $env:USERPROFILE\Downloads
                    </code>
                  </li>
                  <li>
                    Run the following installation command:
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] bg-white/[0.06] border border-orange-500/20 text-orange-300 px-3 py-2 rounded-xl break-all">
                        {installerCommand}
                      </code>
                      <button
                        onClick={() => copyCommand(installerCommand)}
                        className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition ${
                          copiedCmd
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                            : "bg-white/[0.06] border-orange-500/20 text-zinc-300 hover:bg-white/[0.1]"
                        }`}
                      >
                        {copiedCmd ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </li>
                </ol>

                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px] leading-relaxed">
                  <strong>What this does:</strong> It automatically downloads
                  the agent binary in the background, prompts you for the
                  Registration Key, registers the device with the platform, and
                  installs it as a background Windows Service that starts
                  automatically on system boot.
                </div>
              </div>
            )}

            {/* OPTION 2 CONTENT */}
            {deployOption === "manual" && (
              <div className="bg-white/[0.03] border border-orange-500/20 rounded-2xl p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    Manual Standalone Executable
                  </span>
                  <button
                    onClick={downloadExe}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-bold transition shadow-md shadow-orange-500/20 active:scale-[0.97]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download NOS-Agent.exe
                  </button>
                </div>

                <ol className="space-y-2.5 text-zinc-300 list-decimal list-inside pl-1">
                  <li>
                    Move{" "}
                    <code className="text-orange-400 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded">
                      NOS-Agent.exe
                    </code>{" "}
                    to any directory on the target PC.
                  </li>
                  <li>
                    Double-click the EXE, or run it in PowerShell / Command
                    Prompt:
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] bg-white/[0.06] border border-orange-500/20 text-orange-300 px-3 py-2 rounded-xl">
                        {manualCommand}
                      </code>
                      <button
                        onClick={() => copyCommand(manualCommand)}
                        className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold transition ${
                          copiedCmd
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                            : "bg-white/[0.06] border-orange-500/20 text-zinc-300 hover:bg-white/[0.1]"
                        }`}
                      >
                        {copiedCmd ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </li>
                  <li>
                    On its very first run, it presents an interactive CLI wizard
                    asking for your <strong>Server URL</strong> (defaults to
                    current server) and <strong>Registration Key</strong>.
                  </li>
                </ol>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                  <strong>What this does:</strong> Runs directly without
                  installing system services. Once the key is entered, it
                  validates credentials, stores device config locally in{" "}
                  <code className="text-white font-mono">
                    %LOCALAPPDATA%\NOS
                  </code>
                  , and immediately begins streaming live telemetry.
                </div>
              </div>
            )}

            {/* Live Connection Listener Footer */}
            <div className="pt-2 border-t border-orange-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Waiting for target PC to connect...</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    onRegistered();
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition active:scale-[0.97]"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Check for New Devices
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] border border-orange-500/20 hover:bg-white/[0.1] text-xs font-semibold text-zinc-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
