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
} from "lucide-react";
import { deviceApi } from "@/features/device/services/device.api";
import { Device, DeviceStatus } from "@nos/shared-types";
import { safeCopyToClipboard } from "@/lib/clipboard";
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
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { isConnected, lastEvent } = useRealtimeContext();

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await deviceApi.getStatus();
      setDevices(res.devices || []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error("Fleet fetch failed:", err);
      setError("Failed to load devices. Please check your connection.");
      setDevices([]);
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
            {isMounted ? `Synced: ${lastRefreshed.toLocaleTimeString()}` : ""}
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
                          href={`/devices/${device.id}`}
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
                      href={`/devices/${device.id}/inventory`}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-600 text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Inventory
                    </Link>
                    <Link
                      href={`/devices/${device.id}`}
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
    return "http://13.127.187.47/api/v1";
  };

  const createKey = async () => {
    setCreating(true);
    setError(null);
    try {
      let orgId = "org-mukesh-local";
      try {
        const meRes = await fetch(`${apiBase()}/auth/me`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          orgId =
            meData?.data?.organizationId || meData?.organizationId || orgId;
        }
      } catch (err) {
        // Fallback to default org
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
    const directUrl = `${apiBase().replace(/\/api\/v1$/, "")}/downloads/NOS-Agent.exe`;
    const a = document.createElement("a");
    a.href = directUrl;
    a.download = "NOS-Agent.exe";
    a.click();
  };

  const installerCommand = `powershell -ExecutionPolicy Bypass -File .\\install-nos-agent.ps1`;
  const manualCommand = `.\\NOS-Agent.exe`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Add New Device</h3>
              <p className="text-xs text-gray-400">
                Step {step === "create" ? "1" : "2"} of 2 —{" "}
                {step === "create"
                  ? "Generate enrollment key"
                  : "Deploy agent to target Windows PC"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {step === "create" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              Create a <strong>Registration Key</strong> that the agent will use
              to authenticate with this server on first run.
            </p>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Key Label (for your reference)
              </label>
              <input
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                placeholder="e.g., Target PC Key"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg">
                ⚠ {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={createKey}
                disabled={creating || !keyName.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2"
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
            <div className="bg-gray-800/90 border border-gray-700 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Your One-Time Registration Key
                </span>
                <span className="text-[11px] text-amber-400 font-medium">
                  Save this key (valid for all PCs)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-cyan-300 font-mono text-sm bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 break-all select-all">
                  {generatedKey}
                </code>
                <button
                  onClick={copyKey}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                    copiedKey
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-blue-600/20 border-blue-500/40 text-blue-300 hover:bg-blue-600/30"
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
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Select Installation Method for Target PC:
              </p>
              <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1 rounded-xl border border-gray-800">
                <button
                  onClick={() => setDeployOption("automated")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    deployOption === "automated"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Option 1: Automated Installer (Recommended)
                </button>
                <button
                  onClick={() => setDeployOption("manual")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    deployOption === "manual"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Option 2: Standalone Executable (.exe)
                </button>
              </div>
            </div>

            {/* OPTION 1 CONTENT */}
            {deployOption === "automated" && (
              <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    Automated Service Deployment
                  </span>
                  <button
                    onClick={downloadInstaller}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Installer (.ps1)
                  </button>
                </div>

                <ol className="space-y-2.5 text-gray-300 list-decimal list-inside pl-1">
                  <li>
                    Move the downloaded{" "}
                    <code className="text-cyan-400 font-mono bg-gray-900 px-1.5 py-0.5 rounded">
                      install-nos-agent.ps1
                    </code>{" "}
                    to the target PC.
                  </li>
                  <li>
                    Open <strong>PowerShell as Administrator</strong>.
                  </li>
                  <li>
                    Run the following installation command:
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] bg-gray-900 border border-gray-800 text-cyan-300 px-3 py-2 rounded-lg break-all">
                        {installerCommand}
                      </code>
                      <button
                        onClick={() => copyCommand(installerCommand)}
                        className={`px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition ${
                          copiedCmd
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                            : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {copiedCmd ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </li>
                </ol>

                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] leading-relaxed">
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
              <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    Manual Standalone Executable
                  </span>
                  <button
                    onClick={downloadExe}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download NOS-Agent.exe
                  </button>
                </div>

                <ol className="space-y-2.5 text-gray-300 list-decimal list-inside pl-1">
                  <li>
                    Move{" "}
                    <code className="text-cyan-400 font-mono bg-gray-900 px-1.5 py-0.5 rounded">
                      NOS-Agent.exe
                    </code>{" "}
                    to any directory on the target PC.
                  </li>
                  <li>
                    Double-click the EXE, or run it in PowerShell / Command
                    Prompt:
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="flex-1 font-mono text-[11px] bg-gray-900 border border-gray-800 text-cyan-300 px-3 py-2 rounded-lg">
                        {manualCommand}
                      </code>
                      <button
                        onClick={() => copyCommand(manualCommand)}
                        className={`px-2.5 py-2 rounded-lg border text-[11px] font-semibold transition ${
                          copiedCmd
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                            : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
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

                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
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
            <div className="pt-2 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Waiting for target PC to connect...</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    onRegistered();
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Check for New Devices
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-300"
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
