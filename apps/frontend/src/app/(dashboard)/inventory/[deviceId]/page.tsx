"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import {
  Layers,
  Cpu,
  HardDrive,
  Network,
  Shield,
  RefreshCw,
  ArrowLeft,
  Server,
  Activity,
  FileText,
  AlertTriangle,
  Terminal,
  CheckCircle,
  XCircle,
  Wifi,
  Monitor,
  MemoryStick,
  Usb,
  Calendar,
  Bell,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { apiClient } from "@/lib/api-client";
import { useRealtimeContext } from "@/realtime/providers/RealtimeProvider";

type TabType =
  | "HARDWARE"
  | "SOFTWARE"
  | "SERVICES"
  | "PROCESSES"
  | "ALERTS"
  | "NETWORK"
  | "SECURITY"
  | "EXTENDED";

// ─── Small display helpers ──────────────────────────────────────────────────

function bytes(b: number | null | undefined, decimals = 1): string {
  if (!b || b === 0) return "0 B";
  const gb = b / 1_073_741_824;
  if (gb >= 1) return `${gb.toFixed(decimals)} GB`;
  const mb = b / 1_048_576;
  if (mb >= 1) return `${mb.toFixed(decimals)} MB`;
  return `${(b / 1024).toFixed(decimals)} KB`;
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  const displayVal =
    value !== null && value !== undefined && value !== ""
      ? String(value)
      : "N/A";

  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/[0.06] last:border-0">
      <span className="text-xs font-medium text-zinc-400 shrink-0 select-none">
        {label}
      </span>
      <span
        className={`text-xs font-semibold text-zinc-100 text-right break-words max-w-[70%] ${
          mono ? "font-mono text-blue-300" : ""
        }`}
        title={displayVal}
      >
        {displayVal}
      </span>
    </div>
  );
}

function formatDateClean(rawDate?: string | null): string {
  if (!rawDate) return "Standard UEFI";
  if (typeof rawDate === "string" && /^\d{8}/.test(rawDate)) {
    const y = rawDate.slice(0, 4);
    const m = rawDate.slice(4, 6);
    const d = rawDate.slice(6, 8);
    return `${m}/${d}/${y}`;
  }
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return "Standard UEFI";
  return d.toLocaleDateString();
}

function Card({
  title,
  color = "orange",
  children,
}: {
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    slate: "text-zinc-200 border-white/10",
    blue: "text-amber-300 border-amber-500/20",
    purple: "text-amber-400 border-amber-500/20",
    emerald: "text-emerald-400 border-emerald-500/20",
    orange: "text-[#3D8BFF] border-white/[0.08]",
    cyan: "text-blue-300 border-white/[0.08]",
    red: "text-rose-400 border-rose-500/20",
    green: "text-emerald-400 border-emerald-500/20",
    amber: "text-amber-400 border-amber-500/20",
  };
  return (
    <div className="p-5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-2xl border border-white/10 hover:border-blue-500/40 transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_1px_0_rgba(255,255,255,0.12)] relative overflow-hidden group">
      {/* Specular sheen inside each card */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-transparent pointer-events-none rounded-2xl" />
      <h4
        className={`text-xs font-extrabold uppercase tracking-wider mb-3.5 pb-2.5 border-b border-white/10 flex items-center justify-between ${colors[color] || colors.orange}`}
      >
        <span>{title}</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#3D8BFF] shadow-[0_0_8px_rgba(61,139,255,0.8)]" />
      </h4>
      <div className="relative z-10 space-y-1">{children}</div>
    </div>
  );
}

function StatusBool({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined)
    return <span className="text-zinc-500 text-xs">N/A</span>;
  return value ? (
    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
      <CheckCircle size={12} /> Enabled
    </span>
  ) : (
    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold">
      <XCircle size={12} /> Disabled
    </span>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DeviceInventoryDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const resolvedParams = use(params);
  const deviceId = resolvedParams.deviceId;

  const [activeTab, setActiveTab] = useState<TabType>("HARDWARE");
  const [inventory, setInventory] = useState<any>(null);
  const [processes, setProcesses] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rescanLoading, setRescanLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, procRes, alertRes] = await Promise.all([
        apiClient.get<any>(`/inventory/${deviceId}`).catch((e) => e.response),
        apiClient.get<any>(`/devices/${deviceId}/processes`).catch(() => null),
        apiClient.get<any>(`/devices/${deviceId}/alerts`).catch(() => null),
      ]);

      const inv =
        invRes?.data?.data?.inventory ||
        invRes?.data?.inventory ||
        invRes?.data?.data;
      setInventory(inv);

      if (
        !inv &&
        (invRes?.status === 404 || invRes?.data?.statusCode === 404)
      ) {
        setError(
          "Inventory has not yet been discovered for this device. The agent will run the asset discovery cycle on next startup.",
        );
      }

      const procList = procRes?.data?.data || procRes?.data || [];
      if (Array.isArray(procList)) {
        setProcesses(procList);
      }

      const alertList = alertRes?.data?.data || alertRes?.data || [];
      if (Array.isArray(alertList)) {
        setAlerts(alertList);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError(
          "Inventory has not yet been discovered for this device. The agent will run the asset discovery cycle on next startup.",
        );
        setInventory(null);
      } else if (err?.response?.status === 429) {
        setError("Rate limit reached. Waiting before retrying...");
      } else {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to load inventory.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const triggerRescan = useCallback(async () => {
    setRescanLoading(true);
    try {
      await apiClient.post(`/inventory/scan/${deviceId}`).catch(() => null);
      await new Promise((r) => setTimeout(r, 1000));
      await loadInventory();
    } finally {
      setRescanLoading(false);
    }
  }, [deviceId, loadInventory]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Real-time socket listener for live process updates and alerts
  const { on } = useRealtimeContext();
  useEffect(() => {
    const unsubHeartbeat = on("heartbeat.received", (payload: any) => {
      if (
        payload.deviceId === deviceId ||
        payload.deviceId === inventory?.deviceId ||
        payload.deviceId === inventory?.device?.uuid
      ) {
        if (
          payload.processes &&
          Array.isArray(payload.processes) &&
          payload.processes.length > 0
        ) {
          setProcesses(payload.processes);
        }
      }
    });

    const unsubAlert = on("alert:triggered", (payload: any) => {
      if (
        payload.deviceId === deviceId ||
        payload.deviceId === inventory?.deviceId
      ) {
        setAlerts((prev) => [payload, ...prev]);
      }
    });

    return () => {
      unsubHeartbeat();
      unsubAlert();
    };
  }, [on, deviceId, inventory]);

  // If inventory is not yet discovered, automatically poll every 15s so it displays as soon as agent finishes scan
  useEffect(() => {
    if (!inventory) {
      const pollTimer = setInterval(() => {
        loadInventory();
      }, 15000);
      return () => clearInterval(pollTimer);
    }
  }, [inventory, loadInventory]);

  // ─ Column definitions ────────────────────────────────────────────────────

  const softwareCols: Column<any>[] = [
    { key: "name", header: "Application", sortable: true },
    { key: "publisher", header: "Publisher", sortable: true },
    { key: "version", header: "Version", sortable: true },
    { key: "installDate", header: "Install Date", sortable: true },
    {
      key: "installLocation",
      header: "Location",
      render: (row) => (
        <span className="text-xs font-mono text-zinc-400 truncate max-w-[200px] block">
          {row.installLocation || "—"}
        </span>
      ),
    },
  ];

  const serviceCols: Column<any>[] = [
    { key: "serviceName", header: "Service Name", sortable: true },
    { key: "displayName", header: "Display Name", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === "Running" || row.status === "RUNNING"
              ? "online"
              : "neutral"
          }
          size="xs"
        >
          {row.status}
        </Badge>
      ),
    },
    { key: "startType", header: "Start Type", sortable: true },
  ];

  const processCols: Column<any>[] = [
    {
      key: "pid",
      header: "PID",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs text-blue-300">
          {r.pid ?? r.Pid ?? "—"}
        </span>
      ),
    },
    {
      key: "name",
      header: "Process Name",
      sortable: true,
      render: (r) => (
        <span className="font-semibold text-xs text-zinc-100">
          {r.processName ?? r.ProcessName ?? r.name ?? r.Name}
        </span>
      ),
    },
    {
      key: "memoryMb",
      header: "Memory",
      sortable: true,
      render: (r) => (
        <span className="font-mono text-xs text-cyan-400 font-semibold">
          {(
            r.memoryMb ??
            r.MemoryMb ??
            (r.memoryBytes ? r.memoryBytes / 1048576 : 0)
          ).toFixed(1)}{" "}
          MB
        </span>
      ),
    },
    {
      key: "threads",
      header: "Threads",
      sortable: true,
      render: (r) => (
        <span className="text-xs text-zinc-300">
          {r.threads ?? r.Threads ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: () => (
        <Badge variant="online" size="xs">
          Running
        </Badge>
      ),
    },
  ];

  // ─ Tab definitions ───────────────────────────────────────────────────────

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "HARDWARE", label: "Hardware", icon: <Cpu size={14} /> },
    { id: "SOFTWARE", label: "Software", icon: <FileText size={14} /> },
    { id: "SERVICES", label: "Services", icon: <Activity size={14} /> },
    { id: "PROCESSES", label: "Processes", icon: <Terminal size={14} /> },
    { id: "ALERTS", label: "Alerts", icon: <AlertTriangle size={14} /> },
    { id: "NETWORK", label: "Network", icon: <Network size={14} /> },
    { id: "SECURITY", label: "Security", icon: <Shield size={14} /> },
    { id: "EXTENDED", label: "Extended", icon: <Server size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-transparent text-white font-sans space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/devices/${deviceId}`}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-black/30 backdrop-blur-xl border border-white/[0.08] hover:border-[#3D8BFF]/50 text-xs font-semibold text-zinc-200 hover:text-white transition shadow-sm active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 mr-2 text-[#3D8BFF]" />
            Device Profile
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Layers className="w-6 h-6 text-[#3D8BFF] drop-shadow-[0_0_10px_rgba(244,123,54,0.4)]" />
              Device Asset &amp; Inventory Explorer
            </h1>
            <p className="text-xs font-mono text-zinc-400 mt-1">
              Device ID:{" "}
              <span className="text-blue-300 font-medium">{deviceId}</span>
            </p>
          </div>
        </div>

        <button
          onClick={triggerRescan}
          disabled={loading || rescanLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] text-white text-xs font-bold transition shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading || rescanLoading ? "animate-spin" : ""}`}
          />
          Re-Scan Inventory
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-rose-300 flex items-center gap-3 backdrop-blur-xl shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Summary Metrics Row in Glossy Frosted Glass */}
      {inventory && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "CPU",
              value:
                inventory.cpuModel?.split(" ").slice(-2).join(" ") || "N/A",
            },
            {
              label: "OS",
              value: inventory.osEdition?.replace("Microsoft ", "") || "N/A",
            },
            {
              label: "RAM Sticks",
              value: `${inventory.memoryModules?.length || 0} modules`,
            },
            {
              label: "Disks",
              value: `${inventory.diskDrives?.length || 0} drives`,
            },
            {
              label: "Software",
              value: `${inventory.installedSoftware?.length || 0} apps`,
            },
            {
              label: "Services",
              value: `${inventory.windowsServices?.length || 0} found`,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="dashboard-glass-card rounded-2xl p-3.5 relative overflow-hidden group border border-white/[0.08] bg-black/25 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_8px_24px_rgba(0,0,0,0.3)] transition-all hover:border-[#3D8BFF]/45"
            >
              <div className="text-[10px] text-[#3D8BFF]/90 uppercase font-bold tracking-wider">
                {item.label}
              </div>
              <div
                className="text-sm sm:text-base font-extrabold text-white mt-1 truncate drop-shadow-sm"
                title={item.value}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2.5 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap active:scale-[0.98] ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-blue-500/20 to-blue-500/5 text-[#3D8BFF] border border-blue-500/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_0_16px_rgba(61,139,255,0.2)]"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.05] border border-transparent"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab Content Card (Transparent Frosted Glass with Specular Sheen) */}
      <div className="dashboard-glass-card rounded-3xl p-6 sm:p-8 bg-black/25 backdrop-blur-3xl backdrop-saturate-150 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_16px_40px_rgba(0,0,0,0.4)] relative overflow-hidden">
        {/* Specular sheen inside main container */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-blue-500/[0.02] pointer-events-none rounded-3xl" />

        <div className="relative z-10">
          {loading && !inventory && (
            <div className="text-center py-20 text-zinc-400">
              <RefreshCw className="animate-spin w-8 h-8 mx-auto mb-4 text-[#3D8BFF]" />
              <p className="font-semibold text-sm">
                Running asset discovery scan…
              </p>
            </div>
          )}

          {/* ── HARDWARE TAB ── */}
          {activeTab === "HARDWARE" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* CPU */}
                <Card title="Processor (CPU)" color="orange">
                  <InfoRow label="Model" value={inventory?.cpuModel} />
                  <InfoRow label="Vendor" value={inventory?.cpuVendor} />
                  <InfoRow
                    label="Physical Cores"
                    value={inventory?.physicalCores}
                  />
                  <InfoRow
                    label="Logical Processors"
                    value={inventory?.logicalCores}
                  />
                </Card>

                {/* System Board & BIOS */}
                <Card title="System Board & BIOS" color="amber">
                  <InfoRow label="Motherboard" value={inventory?.motherboard} />
                  <InfoRow label="BIOS Vendor" value={inventory?.biosVendor} />
                  <InfoRow
                    label="BIOS Version"
                    value={inventory?.biosVersion}
                    mono
                  />
                  <InfoRow
                    label="BIOS Date"
                    value={formatDateClean(inventory?.biosReleaseDate)}
                  />
                </Card>

                {/* Operating System */}
                <Card title="Operating System" color="emerald">
                  <InfoRow label="Edition" value={inventory?.osEdition} />
                  <InfoRow label="Build" value={inventory?.osBuild} mono />
                  <InfoRow
                    label="Architecture"
                    value={inventory?.architecture}
                  />
                  <InfoRow
                    label="OS Serial"
                    value={
                      inventory?.osSerialNumber &&
                      inventory?.osSerialNumber !== "N/A" &&
                      inventory?.osSerialNumber !== "To be filled by O.E.M."
                        ? inventory.osSerialNumber
                        : "OEM Authenticated"
                    }
                    mono
                  />
                </Card>

                {/* Core System */}
                <Card title="Core System" color="cyan">
                  <InfoRow
                    label="Manufacturer"
                    value={inventory?.manufacturer}
                  />
                  <InfoRow label="Model" value={inventory?.model} />
                  <InfoRow
                    label="Serial Number"
                    value={inventory?.serialNumber}
                    mono
                  />
                </Card>

                {/* Network Identity */}
                <Card title="Network Identity" color="blue">
                  <InfoRow label="Hostname" value={inventory?.hostname} mono />
                  <InfoRow label="Domain" value={inventory?.domain} mono />
                  <InfoRow label="Workgroup" value={inventory?.workgroup} />
                </Card>
              </div>

              {/* RAM Sticks */}
              {inventory?.memoryModules &&
                inventory.memoryModules.length > 0 && (
                  <Card
                    title={`Memory Modules — ${inventory.memoryModules.length} Stick(s)`}
                    color="purple"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                      {inventory.memoryModules.map((mem: any, i: number) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl bg-white/[0.02] border-l-2 border-purple-400 border border-white/[0.04] shadow-sm"
                        >
                          <p className="text-sm font-bold text-white">
                            {mem.manufacturer || "Unknown"}{" "}
                            <span className="text-purple-300 font-mono">
                              {mem.capacityGB
                                ? `${mem.capacityGB} GB`
                                : mem.capacityBytes
                                  ? bytes(mem.capacityBytes)
                                  : "? GB"}
                            </span>
                          </p>
                          <p className="text-xs text-zinc-300 mt-1 font-mono">
                            {mem.speedMHz ? `${mem.speedMHz} MHz` : ""}{" "}
                            {mem.partNumber ? `| PN: ${mem.partNumber}` : ""}{" "}
                            {mem.slot ? `| Slot: ${mem.slot}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

              {/* Disk Drives */}
              {inventory?.diskDrives && inventory.diskDrives.length > 0 && (
                <Card
                  title={`Storage Drives — ${inventory.diskDrives.length} Drive(s)`}
                  color="emerald"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {inventory.diskDrives.map((disk: any, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-white/[0.02] border-l-2 border-emerald-400 border border-white/[0.04] shadow-sm"
                      >
                        <p className="text-sm font-bold text-white">
                          {disk.model || "Unknown Drive"}{" "}
                          <span className="text-emerald-400 font-mono">
                            (
                            {disk.sizeGB
                              ? `${disk.sizeGB} GB`
                              : disk.sizeBytes
                                ? bytes(disk.sizeBytes)
                                : "?"}
                            )
                          </span>
                        </p>
                        <p className="text-xs text-zinc-300 mt-1 font-mono">
                          {disk.mediaType ? `Type: ${disk.mediaType}` : ""}{" "}
                          {disk.interfaceType
                            ? `| Interface: ${disk.interfaceType}`
                            : ""}{" "}
                          {disk.serialNumber
                            ? `| SN: ${disk.serialNumber}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* GPUs */}
              {inventory?.gpus && inventory.gpus.length > 0 && (
                <Card
                  title={`Graphics (GPU) — ${inventory.gpus.length} Adapter(s)`}
                  color="orange"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                    {inventory.gpus.map((gpu: any, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-white/[0.02] border-l-2 border-[#3D8BFF] border border-white/[0.04] shadow-sm"
                      >
                        <p className="text-sm font-bold text-white">
                          {gpu.name || "Unknown GPU"}
                        </p>
                        <p className="text-xs text-blue-300 mt-1 font-mono">
                          {gpu.vramMB
                            ? `VRAM: ${(gpu.vramMB / 1024).toFixed(1)} GB`
                            : gpu.vramBytes
                              ? `VRAM: ${bytes(gpu.vramBytes)}`
                              : ""}{" "}
                          {gpu.driverVersion
                            ? `| Driver: ${gpu.driverVersion}`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── SOFTWARE TAB ── */}
          {activeTab === "SOFTWARE" && (
            <DataTable
              columns={softwareCols}
              data={inventory?.installedSoftware || []}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search installed software…"
              emptyTitle="No software records yet"
            />
          )}

          {/* ── SERVICES TAB ── */}
          {activeTab === "SERVICES" && (
            <DataTable
              columns={serviceCols}
              data={inventory?.windowsServices || []}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search Windows services…"
              emptyTitle="No service records yet"
            />
          )}

          {/* ── PROCESSES TAB ── */}
          {activeTab === "PROCESSES" && (
            <DataTable
              columns={processCols}
              data={processes}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search running processes…"
              emptyTitle="No live process stream yet"
            />
          )}

          {/* ── ALERTS TAB ── */}
          {activeTab === "ALERTS" && (
            <div className="rounded-2xl border border-white/[0.08] bg-black/35 backdrop-blur-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell size={16} className="text-amber-400" />
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Incident &amp; Failure History ({alerts.length})
                  </h3>
                </div>
                <span className="text-xs text-blue-300/80 font-mono">
                  Timestamped Event Ledger
                </span>
              </div>
              {alerts.length === 0 ? (
                <div className="p-14 text-center text-zinc-400">
                  <CheckCircle
                    size={36}
                    className="mx-auto mb-3 text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]"
                  />
                  <p className="text-sm font-bold text-white">
                    No alert events recorded for this device
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                    System threshold violations and hardware errors will be
                    logged here with live timestamps.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 hover:bg-white/[0.03] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 mt-0.5">
                          <AlertTriangle size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              {alert.severity || "WARNING"}
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {alert.title ||
                                alert.message ||
                                `Rule ${alert.ruleId || "Triggered"}`}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/30">
                              {alert.status || "OPEN"}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-1">
                            {alert.description ||
                              alert.message ||
                              "Threshold breached"}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono shrink-0">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NETWORK TAB ── */}
          {activeTab === "NETWORK" && (
            <div className="space-y-4">
              {inventory?.networkAdapters &&
              inventory.networkAdapters.length > 0 ? (
                inventory.networkAdapters.map((net: any, i: number) => (
                  <Card
                    key={i}
                    title={net.name || net.description || `Adapter ${i + 1}`}
                    color="cyan"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <InfoRow
                          label="MAC Address"
                          value={net.macAddress}
                          mono
                        />
                        <InfoRow
                          label="IPv4 Address"
                          value={net.ipAddress || net.ipv4}
                          mono
                        />
                        <InfoRow label="IPv6 Address" value={net.ipv6} mono />
                        <InfoRow label="Gateway" value={net.gateway} mono />
                      </div>
                      <div>
                        <InfoRow
                          label="DNS Domain"
                          value={net.dns || net.dnsDomain}
                          mono
                        />
                        <InfoRow
                          label="Type"
                          value={
                            net.isWireless
                              ? "Wireless (Wi-Fi)"
                              : net.isPhysical
                                ? "Wired (Ethernet)"
                                : "Virtual"
                          }
                        />
                        <InfoRow
                          label="Status"
                          value={
                            net.isOperational ? "Connected" : "Disconnected"
                          }
                        />
                        <InfoRow
                          label="Speed"
                          value={net.speedMbps ? `${net.speedMbps} Mbps` : null}
                        />
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="text-center py-16 text-zinc-400">
                  <Wifi
                    size={36}
                    className="mx-auto mb-3 text-cyan-400 opacity-60"
                  />
                  <p className="font-semibold text-sm">
                    No network adapters found in inventory yet.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === "SECURITY" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Defender */}
              <Card title="Windows Defender / Antivirus" color="emerald">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-zinc-400">
                    Real-Time Protection
                  </span>
                  <StatusBool
                    value={
                      inventory?.windowsDefenderEnabled ??
                      inventory?.security?.windowsDefenderEnabled
                    }
                  />
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-medium text-zinc-400">
                    Firewall
                  </span>
                  <StatusBool
                    value={
                      inventory?.firewallEnabled ??
                      inventory?.security?.firewallEnabled
                    }
                  />
                </div>
              </Card>

              {/* TPM */}
              <Card title="TPM (Trusted Platform Module)" color="cyan">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-zinc-400">
                    TPM Enabled
                  </span>
                  <StatusBool
                    value={
                      inventory?.tpmEnabled ?? inventory?.security?.tpmEnabled
                    }
                  />
                </div>
                <InfoRow
                  label="TPM Version"
                  value={
                    inventory?.tpmVersion ?? inventory?.security?.tpmVersion
                  }
                  mono
                />
              </Card>

              {/* BitLocker */}
              <Card title="BitLocker Encryption" color="amber">
                <div className="flex justify-between items-center py-2 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-zinc-400">
                    BitLocker Enabled
                  </span>
                  <StatusBool
                    value={
                      inventory?.bitLockerEnabled ??
                      inventory?.security?.bitLockerEnabled
                    }
                  />
                </div>
                <InfoRow
                  label="Protected Drive"
                  value={
                    inventory?.bitLockerDrive ??
                    inventory?.security?.bitLockerDrive
                  }
                />
              </Card>

              {/* Secure Boot */}
              <Card title="Secure Boot" color="green">
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-medium text-zinc-400">
                    Secure Boot
                  </span>
                  <StatusBool
                    value={
                      inventory?.secureBootEnabled ??
                      inventory?.security?.secureBootEnabled
                    }
                  />
                </div>
              </Card>
            </div>
          )}

          {/* ── EXTENDED TAB ── */}
          {activeTab === "EXTENDED" && (
            <div className="space-y-6">
              {/* Startup Apps */}
              {inventory?.startupApplications &&
                inventory.startupApplications.length > 0 && (
                  <Card
                    title={`Startup Applications — ${inventory.startupApplications.length} entries`}
                    color="amber"
                  >
                    <div className="space-y-1 mt-1 max-h-64 overflow-y-auto scrollbar-thin">
                      {inventory.startupApplications.map(
                        (app: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-xs py-2 border-b border-white/[0.06] last:border-0"
                          >
                            <span className="text-zinc-100 font-semibold">
                              {app.name}
                            </span>
                            <span className="text-blue-300/80 font-mono truncate max-w-[320px]">
                              {app.command || app.executablePath}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </Card>
                )}

              {/* USB Devices */}
              <Card title="Connected USB Devices" color="blue">
                {inventory?.usbDevices && inventory.usbDevices.length > 0 ? (
                  <div className="space-y-1 mt-1 max-h-64 overflow-y-auto scrollbar-thin">
                    {inventory.usbDevices.map((usb: any, i: number) => (
                      <div
                        key={i}
                        className="text-xs py-2 border-b border-white/[0.06] last:border-0 flex justify-between items-center"
                      >
                        <span className="text-zinc-100 font-semibold">
                          {usb.description || usb.name}
                        </span>{" "}
                        <span className="text-blue-300/80 font-mono text-[11px]">
                          VID:{usb.vendorId} PID:{usb.productId}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 mt-1">
                    USB enumeration requires the agent to run with Administrator
                    privileges. Data will appear on next scan.
                  </p>
                )}
              </Card>

              {/* Windows Updates (KB patches) */}
              {inventory?.windowsUpdates &&
                inventory.windowsUpdates.length > 0 && (
                  <Card
                    title={`Windows Updates — ${inventory.windowsUpdates.length} KB patches`}
                    color="cyan"
                  >
                    <div className="max-h-64 overflow-y-auto scrollbar-thin mt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-zinc-400 border-b border-white/[0.06]">
                            <th className="text-left py-2 font-bold uppercase tracking-wider text-[11px]">
                              KB ID
                            </th>
                            <th className="text-left py-2 font-bold uppercase tracking-wider text-[11px]">
                              Installed On
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.windowsUpdates.map(
                            (kb: any, i: number) => (
                              <tr
                                key={i}
                                className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                              >
                                <td className="py-2 font-mono text-cyan-400 font-semibold">
                                  {kb.hotFixId || kb.kbId}
                                </td>
                                <td className="py-2 text-zinc-300 font-mono">
                                  {kb.installedOn || kb.installedAt}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* S.M.A.R.T Disk Health */}
                <Card title="S.M.A.R.T Disk Health" color="emerald">
                  {inventory?.smartData && inventory.smartData.length > 0 ? (
                    <pre className="text-xs font-mono text-zinc-200 bg-black/40 border border-white/[0.06] p-3 rounded-xl whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">
                      {JSON.stringify(inventory.smartData, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-zinc-400">
                      S.M.A.R.T data requires elevated WMI access. Available on
                      next privileged scan.
                    </p>
                  )}
                </Card>

                {/* Event Logs */}
                <Card title="Recent Critical Events" color="red">
                  {inventory?.eventLogs && inventory.eventLogs.length > 0 ? (
                    <pre className="text-xs font-mono text-zinc-200 bg-black/40 border border-white/[0.06] p-3 rounded-xl whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin">
                      {JSON.stringify(inventory.eventLogs, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-zinc-400">
                      No critical Windows Event Viewer entries in the last 24
                      hours.
                    </p>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
