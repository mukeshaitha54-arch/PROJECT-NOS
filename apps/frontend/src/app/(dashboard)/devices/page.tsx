"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useRealtimeContext } from "@/realtime/providers/RealtimeProvider";
import { DeviceCard } from "@/components/dashboard/DeviceCard";
import { Loader2 } from "lucide-react";

export default function FleetDashboardPage() {
  const { user } = useAuth();
  const { on, lastEvent } = useRealtimeContext();
  const [devices, setDevices] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Realtime overrides
  const [realtimeData, setRealtimeData] = useState<Record<string, any>>({});

  useEffect(() => {
    async function fetchDevices() {
      try {
        const token = localStorage.getItem("accessToken");
        const [devicesRes, statsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/devices`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/devices/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const devicesJson = await devicesRes.json();
        const statsJson = await statsRes.json();

        setDevices(devicesJson.data || []);
        setStats(statsJson.data || null);
      } catch (err) {
        console.error("Failed to load devices", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDevices();
  }, []);

  useEffect(() => {
    // Listen for realtime telemetry
    const cleanupTelemetry = on("telemetry:new", (payload: any) => {
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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-gray-500">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <div className="text-xl font-bold">{stats?.total || 0}</div>
          </div>
          <div className="bg-black/40 border border-green-900/50 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-green-500 uppercase font-semibold">
              Online
            </div>
            <div className="text-xl font-bold text-green-400">
              {stats?.online || 0}
            </div>
          </div>
          <div className="bg-black/40 border border-red-900/50 rounded-lg px-4 py-2 text-center">
            <div className="text-xs text-red-500 uppercase font-semibold">
              Offline
            </div>
            <div className="text-xl font-bold text-red-400">
              {stats?.offline || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            realtimeData={realtimeData[device.id]}
          />
        ))}
      </div>
    </div>
  );
}
