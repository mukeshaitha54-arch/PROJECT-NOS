"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRealtimeContext } from "@/realtime/providers/RealtimeProvider";
import { apiClient } from "@/lib/api-client";
import { DeviceCard } from "@/components/dashboard/DeviceCard";
import { Loader2, Trash2, X } from "lucide-react";

export default function FleetDashboardPage() {
  const { user } = useAuth();
  const { on, lastEvent } = useRealtimeContext();
  const [devices, setDevices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  // Realtime overrides
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({});

  async function fetchDevices() {
    try {
      const res = await apiClient.get<any, any>("/devices").catch(() => null);
      if (res?.data) {
        const deviceList: any[] = res.data.data || res.data || [];
        setDevices(deviceList);
        setStats({
          total: deviceList.length,
          online: deviceList.filter((d) => d.status === "ONLINE").length,
          offline: deviceList.filter((d) => d.status !== "ONLINE").length,
        });
      }
    } catch (err) {
      console.error("Failed to load devices", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDevices();
  }, []);

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
    });

    const cleanupOnline = on("device.online", (payload: any) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === payload.deviceId ? { ...d, status: "ONLINE" } : d,
        ),
      );
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
      cleanupOffline();
    };
  }, [on]);

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
                className="flex-1 px-4 py-2 rounded-xl border border-orange-500/20 text-zinc-300 hover:bg-white/[0.06] transition-colors text-sm font-semibold"
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

      {devices.length === 0 && (
        <div className="text-center text-gray-500 py-16">
          <p className="text-lg">No devices registered yet.</p>
          <p className="text-sm mt-2">
            Install the NOS Agent on a Windows machine to get started.
          </p>
        </div>
      )}
    </div>
  );
}
