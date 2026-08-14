"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Monitor,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Copy,
  Check,
  X,
  Terminal,
  ExternalLink,
  RefreshCw,
  Cpu,
  HardDrive,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, DeviceStatusType } from "@/components/StatusBadge";
import { DeviceCard, DeviceCardData } from "@/components/DeviceCard";
import { DataTable, Column } from "@/components/DataTable";
import { useRealtime } from "@/realtime/hooks/useRealtime";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";

export default function DevicesListPage() {
  const [devices, setDevices] = useState<DeviceCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient
        .get<any, any>("/device/status")
        .catch(() => null);

      if (res?.data || res) {
        const payload = res.data || res;
        const list = payload.devices || [];
        setDevices(
          list.map((d: any) => ({
            id: d.id,
            hostname: d.hostname || d.deviceName || "Node-" + d.id.slice(0, 6),
            deviceName: d.deviceName || d.hostname,
            os: d.os || `${d.osPlatform || "Windows"} ${d.osVersion || "11"}`,
            ipAddress: d.ipAddress || d.ip || "127.0.0.1",
            status: (d.status || "ONLINE") as DeviceStatusType,
            cpuUsage: d.cpuUsage ?? 24,
            memoryUsagePercent: d.memoryUsagePercent ?? 48,
            lastSeen: d.lastSeen
              ? new Date(d.lastSeen).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now",
          })),
        );
      }
    } catch (err) {
      console.warn(
        "Devices list fetch error, using local state fallback:",
        err,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Real-time Socket.IO status and heartbeat updates
  const { on } = useRealtime();

  useEffect(() => {
    const unsubOnline = on("device.online", (payload) => {
      const targetId = payload?.deviceId || payload?.id;
      if (targetId) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === targetId
              ? { ...d, status: "ONLINE", lastSeen: "Just now" }
              : d,
          ),
        );
      } else {
        fetchDevices();
      }
    });

    const unsubOffline = on("device.offline", (payload) => {
      const targetId = payload?.deviceId || payload?.id;
      if (targetId) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === targetId ? { ...d, status: "OFFLINE" } : d,
          ),
        );
      }
    });

    const unsubHeartbeat = on("heartbeat.received", (payload) => {
      const targetId = payload?.deviceId;
      if (targetId) {
        setDevices((prev) =>
          prev.map((d) =>
            d.id === targetId
              ? {
                  ...d,
                  status: "ONLINE",
                  lastSeen: "Just now",
                  cpuUsage: payload.cpuUsage ?? d.cpuUsage,
                  memoryUsagePercent:
                    payload.memoryUsagePercent ?? d.memoryUsagePercent,
                }
              : d,
          ),
        );
      }
    });

    return () => {
      unsubOnline();
      unsubOffline();
      unsubHeartbeat();
    };
  }, [on, fetchDevices]);

  // Filtered devices for Grid / Table
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const name = (d.hostname || d.deviceName || "").toLowerCase();
      const ip = (d.ipAddress || "").toLowerCase();
      const matchesSearch =
        search === "" ||
        name.includes(search.toLowerCase()) ||
        ip.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        d.status?.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [devices, search, statusFilter]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    toast.success("Command copied to clipboard");
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const tableColumns: Column<DeviceCardData>[] = [
    {
      key: "hostname",
      header: "Device Name",
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gray-800 text-blue-400">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <Link
              href={`/devices/${d.id}`}
              className="font-semibold text-white hover:text-blue-400 transition"
            >
              {d.hostname}
            </Link>
            <p className="text-xs text-gray-500 font-mono">{d.id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (d) => <StatusBadge status={d.status} size="sm" />,
    },
    {
      key: "ipAddress",
      header: "IP Address",
      render: (d) => (
        <span className="font-mono text-xs text-gray-300">
          {d.ipAddress || "127.0.0.1"}
        </span>
      ),
    },
    {
      key: "os",
      header: "Platform OS",
      render: (d) => <span className="text-xs text-gray-300">{d.os}</span>,
    },
    {
      key: "lastSeen",
      header: "Last Seen",
      render: (d) => (
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5 text-gray-500" />
          {d.lastSeen}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      render: (d) => (
        <div className="flex items-center gap-2">
          <Link href={`/devices/${d.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-gray-700 hover:border-gray-600 text-gray-300 px-2.5"
            >
              Inspect
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const installCmd = `cd "C:\\Users\\mukes\\OneDrive\\Desktop\\NOS\\apps\\NOS.Agent"; dotnet run`;
  const registerCmd = `Invoke-WebRequest -Uri "http://localhost:3001/api/v1/device/register" -Method POST -Body '{"hostname":"NODE-01","organizationId":"default-org"}' -ContentType "application/json"`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Monitor className="w-6 h-6 text-blue-500" /> Fleet Device Roster
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Search, filter, and inspect enrolled nodes across your enterprise
            cluster.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDevices}
            disabled={loading}
            className="border-gray-800 text-gray-300 text-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Device
          </Button>
        </div>
      </div>

      {/* Filter and View Toggle Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900/90 border border-gray-800 p-4 rounded-xl shadow-lg">
        <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search devices by name or IP..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 outline-none shrink-0"
          >
            <option value="ALL">All Statuses</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="WARNING">Warning</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800 self-end sm:self-auto">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md text-xs transition ${
              viewMode === "table"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md text-xs transition ${
              viewMode === "grid"
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Rendering: Table or Grid */}
      {viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={filteredDevices}
          pageSize={10}
          searchable={false}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDevices.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500 text-xs bg-gray-900 border border-gray-800 rounded-xl">
              No devices match your filter criteria.
            </div>
          ) : (
            filteredDevices.map((d) => <DeviceCard key={d.id} device={d} />)
          )}
        </div>
      )}

      {/* Add Device Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Install NOS Agent
                  </h3>
                  <p className="text-xs text-gray-400">
                    Deploy .NET 8 telemetry agent to any fleet machine
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-gray-300 font-medium">
                  <span>
                    1. Launch Monitoring Worker (PowerShell / Terminal):
                  </span>
                  <button
                    onClick={() => copyToClipboard(installCmd, "install")}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[11px]"
                  >
                    {copiedCmd === "install" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 font-mono text-cyan-400 text-xs break-all select-all">
                  {installCmd}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-gray-300 font-medium">
                  <span>2. Manual CLI Registration Payload:</span>
                  <button
                    onClick={() => copyToClipboard(registerCmd, "register")}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[11px]"
                  >
                    {copiedCmd === "register" ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Copy
                  </button>
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 font-mono text-gray-300 text-xs break-all select-all max-h-24 overflow-y-auto">
                  {registerCmd}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="border-gray-700 text-gray-300 text-xs"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  fetchDevices();
                  setIsAddModalOpen(false);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
              >
                Check Registration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
