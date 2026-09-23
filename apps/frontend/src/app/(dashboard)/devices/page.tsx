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
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);

  // Realtime overrides
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({});

  async function fetchDevices() {
    try {
      const res = await apiClient
        .get<any, any>("/device/status")
        .catch(() => null);
      if (res?.data) {
        const payload = res.data.data || res.data;
        setDevices(payload.devices || []);
        setStats({
          total: payload.summary?.totalRegistered || 0,
          online: payload.summary?.totalOnline || 0,
          offline: payload.summary?.totalOffline || 0,
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

  if (loading) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0f1117] border border-red-800/60 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/40 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">
                    Delete Device
                  </h3>
                  <p className="text-gray-400 text-sm">This cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              Are you sure you want to permanently delete:
            </p>
            <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-3 mb-6">
              <p className="text-white font-mono font-semibold">
                {confirmDelete.hostname}
              </p>
              <p className="text-gray-400 text-xs font-mono mt-0.5">
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
                className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteDevice(confirmDelete)}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
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

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fleet Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Manage and monitor your devices in real-time.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-black/40 border border-gray-800 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-gray-500 uppercase font-semibold">
              Total
            </div>
            <div className="text-xl font-bold">
              {devices.length || stats?.total || 0}
            </div>
          </div>
          <div className="bg-black/40 border border-green-900/50 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-green-500 uppercase font-semibold">
              Online
            </div>
            <div className="text-xl font-bold text-green-400">
              {devices.filter((d) => d.status === "ONLINE").length}
            </div>
          </div>
          <div className="bg-black/40 border border-red-900/50 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-red-500 uppercase font-semibold">
              Offline
            </div>
            <div className="text-xl font-bold text-red-400">
              {devices.filter((d) => d.status !== "ONLINE").length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {devices.map((device) => (
          <div key={device.id} className="relative group">
            <DeviceCard
              device={device}
              realtimeData={realtimeData[device.id]}
            />
            {/* Delete button — shows on hover */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirmDelete(device);
              }}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-red-900/0 hover:bg-red-900/80 border border-transparent hover:border-red-700/60 text-transparent hover:text-red-300 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
              title="Delete device"
            >
              <Trash2 size={14} />
            </button>
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
