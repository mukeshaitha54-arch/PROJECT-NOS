"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRealtimeContext } from "@/realtime/providers/RealtimeProvider";
import { apiClient } from "@/lib/api-client";
import { deviceApi } from "@/features/device/services/device.api";
import { DeviceCard } from "@/components/dashboard/DeviceCard";
import { Loader2, Trash2, X } from "lucide-react";
import { getScopedDeviceCacheKey, getScopedStatsCacheKey } from "@/lib/cache";

export default function FleetDashboardPage() {
  const { user } = useAuth();
  const { on, lastEvent } = useRealtimeContext();

  const deviceCacheKey = getScopedDeviceCacheKey(
    user?.id,
    user?.organizationId,
  );
  const statsCacheKey = getScopedStatsCacheKey(user?.id, user?.organizationId);

  const [devices, setDevices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  // Keep a ref to the latest devices list for pure event handler checks
  const devicesRef = useRef<any[]>(devices);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  // Read scoped sessionStorage on mount effect
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cachedDevs = sessionStorage.getItem(deviceCacheKey);
        const cachedStats = sessionStorage.getItem(statsCacheKey);
        let hasCache = false;
        if (cachedDevs) {
          const parsed = JSON.parse(cachedDevs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDevices(parsed);
            hasCache = true;
          }
        }
        if (cachedStats) {
          const parsedStats = JSON.parse(cachedStats);
          if (parsedStats) {
            setStats(parsedStats);
          }
        }
        if (hasCache) {
          setLoading(false);
        }
      } catch {}
    }
  }, [deviceCacheKey, statsCacheKey]);

  // Realtime overrides
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({});

  const isFetchingRef = useRef<boolean>(false);
  const lastFetchTimestampRef = useRef<number>(0);

  const fetchDevices = useCallback(
    async (silent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      const requestTimestamp = Date.now();
      try {
        if (!silent) setLoading(true);
        let deviceList: any[] = [];
        let success = false;

        try {
          const statusRes = await deviceApi.getStatus();
          const payload = (statusRes as any)?.data || statusRes;
          if (Array.isArray(payload)) {
            deviceList = payload;
            success = true;
          }
        } catch {
          // Fall back to /devices
        }

        if (!success) {
          const res = await apiClient
            .get<any, any>("/devices")
            .catch(() => null);
          if (res?.data) {
            deviceList = res.data.data || res.data || [];
            success = true;
          }
        }

        if (success && requestTimestamp >= lastFetchTimestampRef.current) {
          lastFetchTimestampRef.current = requestTimestamp;
          setDevices(deviceList);
          const computedStats = {
            total: deviceList.length,
            online: deviceList.filter((d) => d.status === "ONLINE").length,
            offline: deviceList.filter((d) => d.status !== "ONLINE").length,
          };
          setStats(computedStats);
          if (typeof window !== "undefined") {
            try {
              sessionStorage.setItem(
                deviceCacheKey,
                JSON.stringify(deviceList),
              );
              sessionStorage.setItem(
                statsCacheKey,
                JSON.stringify(computedStats),
              );
            } catch {}
          }
        }
      } catch (err) {
        console.error("Failed to load devices", err);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [deviceCacheKey, statsCacheKey],
  );

  useEffect(() => {
    fetchDevices(false);
    // Ultra-low latency background sync every 4 seconds ensures instantaneous freshness with zero user F5 needed
    const interval = setInterval(() => {
      fetchDevices(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchDevices]);

  useEffect(() => {
    const cleanupTelemetry = on("telemetry.received", (payload: any) => {
      setRealtimeData((prev) => ({
        ...prev,
        [payload.deviceId]: payload,
      }));
    });

    const cleanupHeartbeat = on("heartbeat.received", (payload: any) => {
      setRealtimeData((prev) => ({
        ...prev,
        [payload.deviceId]: {
          ...prev[payload.deviceId],
          cpuUsage: payload.cpuUsage,
          memoryUsagePercent: payload.ramUsage,
          ipAddress: payload.ipAddress,
        },
      }));
      const targetId = payload?.deviceId || payload?.id;
      if (!targetId) return;
      const exists = devicesRef.current.some(
        (d) => d.id === targetId || d.uuid === targetId,
      );
      if (!exists) {
        fetchDevices(true);
        return;
      }
      setDevices((prev) =>
        prev.map((d) =>
          d.id === targetId || d.uuid === targetId
            ? {
                ...d,
                status: "ONLINE",
                lastSeen: payload.timestamp || new Date().toISOString(),
              }
            : d,
        ),
      );
    });

    const cleanupOnline = on("device.online", (payload: any) => {
      const targetId = payload?.deviceId || payload?.id;
      if (!targetId) return;
      const exists = devicesRef.current.some(
        (d) => d.id === targetId || d.uuid === targetId,
      );
      if (!exists) {
        fetchDevices(true);
        return;
      }
      setDevices((prev) =>
        prev.map((d) =>
          d.id === targetId || d.uuid === targetId
            ? {
                ...d,
                status: "ONLINE",
                lastSeen: payload.timestamp || new Date().toISOString(),
              }
            : d,
        ),
      );
    });

    const cleanupConnected = on("device.connected", (payload: any) => {
      const targetId = payload?.deviceId || payload?.id;
      if (!targetId) return;
      const exists = devicesRef.current.some(
        (d) => d.id === targetId || d.uuid === targetId,
      );
      if (!exists) {
        fetchDevices(true);
        return;
      }
      setDevices((prev) =>
        prev.map((d) =>
          d.id === targetId || d.uuid === targetId
            ? { ...d, status: "ONLINE" }
            : d,
        ),
      );
    });

    const cleanupRegistered = on("device.registered", () => {
      fetchDevices(true);
    });

    const cleanupOffline = on("device.offline", (payload: any) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === payload.deviceId ? { ...d, status: "OFFLINE" } : d,
        ),
      );
    });

    return () => {
      cleanupTelemetry();
      cleanupHeartbeat();
      cleanupOnline();
      cleanupConnected();
      cleanupRegistered();
      cleanupOffline();
    };
  }, [on, fetchDevices]);

  async function handleDeleteDevice(device: any) {
    setDeletingId(device.id);
    setConfirmDelete(null);
    try {
      await apiClient.delete(`/devices/${device.id}`);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
    } catch (err) {
      console.error("Failed to delete device", err);
      alert("Failed to delete device. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && devices.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#111217]/95 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl backdrop-blur-2xl text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Delete Device
                  </h3>
                  <p className="text-zinc-400 text-xs">This cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-zinc-300 text-sm mb-2">
              Are you sure you want to permanently delete:
            </p>
            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-3 mb-6">
              <p className="text-white font-mono font-bold">
                {confirmDelete.hostname}
              </p>
              <p className="text-zinc-400 text-xs font-mono mt-0.5">
                {confirmDelete.id}
              </p>
            </div>
            <p className="text-red-400 text-xs mb-5">
              ⚠️ All telemetry history, heartbeats, and alerts for this device
              will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] transition-colors text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDevice(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
              >
                {deletingId === confirmDelete.id ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Fleet Dashboard
          </h1>
          <p className="text-zinc-300 mt-1 text-sm">
            Manage and monitor your devices in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="dashboard-glass-card rounded-2xl px-5 py-2.5 text-center shadow-lg">
            <div className="text-[11px] text-zinc-300 uppercase font-bold tracking-wider">
              Total
            </div>
            <div className="text-2xl font-extrabold text-white font-mono drop-shadow-sm">
              {devices.length || stats?.total || 0}
            </div>
          </div>
          <div className="dashboard-glass-card rounded-2xl px-5 py-2.5 text-center shadow-lg border-emerald-500/30">
            <div className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider">
              Online
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono drop-shadow-sm">
              {devices.filter((d) => d.status === "ONLINE").length}
            </div>
          </div>
          <div className="dashboard-glass-card rounded-2xl px-5 py-2.5 text-center shadow-lg border-rose-500/30">
            <div className="text-[11px] text-rose-400 uppercase font-bold tracking-wider">
              Offline
            </div>
            <div className="text-2xl font-extrabold text-rose-400 font-mono drop-shadow-sm">
              {devices.filter((d) => d.status !== "ONLINE").length}
            </div>
          </div>
        </div>
      </div>

      {loading && devices.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="dashboard-glass-card rounded-2xl p-6 h-56 animate-pulse flex flex-col justify-between border border-white/[0.08]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/10 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-white/10 rounded" />
                <div className="h-2 bg-white/5 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center text-zinc-400 py-16 dashboard-glass-card rounded-2xl border border-white/[0.08] my-4">
          <p className="text-lg font-medium text-white">
            No devices registered yet.
          </p>
          <p className="text-sm mt-2 text-zinc-400">
            Install the NOS Agent on a Windows machine to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {devices.map((device) => (
            <div key={device.id}>
              <DeviceCard
                device={device}
                realtimeData={realtimeData[device.id]}
                onDelete={(d) => setConfirmDelete(d)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
