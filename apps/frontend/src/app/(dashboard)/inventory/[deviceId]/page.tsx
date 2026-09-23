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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { apiClient } from "@/lib/api-client";

type TabType =
  "HARDWARE" | "SOFTWARE" | "SERVICES" | "NETWORK" | "SECURITY" | "EXTENDED";

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
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span
        className={`text-xs font-semibold text-slate-200 ${mono ? "font-mono" : ""}`}
      >
        {value ?? "N/A"}
      </span>
    </div>
  );
}

function Card({
  title,
  color = "slate",
  children,
}: {
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  const colors: Record<string, string> = {
    slate: "text-slate-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    emerald: "text-emerald-400",
    orange: "text-orange-400",
    cyan: "text-cyan-400",
    red: "text-red-400",
    green: "text-green-400",
    amber: "text-amber-400",
  };
  return (
    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
      <h4
        className={`text-xs font-bold uppercase tracking-wider mb-3 pb-2 border-b border-slate-800 ${colors[color] || colors.slate}`}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function StatusBool({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined)
    return <span className="text-slate-500 text-xs">N/A</span>;
  return value ? (
    <span className="flex items-center gap-1 text-green-400 text-xs font-semibold">
      <CheckCircle size={12} /> Enabled
    </span>
  ) : (
    <span className="flex items-center gap-1 text-red-400 text-xs font-semibold">
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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rescanLoading, setRescanLoading] = useState(false);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<any>(`/inventory/${deviceId}`);
      const inv =
        res.data?.data?.inventory || res.data?.inventory || res.data?.data;
      setInventory(inv);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError(
          "Inventory has not yet been discovered for this device. The agent will run the asset discovery cycle on next startup.",
        );
        setInventory(null);
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
    await loadInventory();
    setRescanLoading(false);
  }, [loadInventory]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

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
        <span className="text-xs font-mono text-slate-400 truncate max-w-[200px] block">
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

  // ─ Tab definitions ───────────────────────────────────────────────────────

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "HARDWARE", label: "Hardware", icon: <Cpu size={13} /> },
    { id: "SOFTWARE", label: "Software", icon: <FileText size={13} /> },
    { id: "SERVICES", label: "Services", icon: <Activity size={13} /> },
    { id: "NETWORK", label: "Network", icon: <Network size={13} /> },
    { id: "SECURITY", label: "Security", icon: <Shield size={13} /> },
    { id: "EXTENDED", label: "Extended", icon: <Terminal size={13} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/devices/${deviceId}`}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Device Profile
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Device Asset &amp; Inventory Explorer
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Device ID: {deviceId}
              </p>
            </div>
          </div>

          <button
            onClick={triggerRescan}
            disabled={loading || rescanLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading || rescanLoading ? "animate-spin" : ""}`}
            />
            Re-Scan Inventory
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Summary Row */}
        {inventory && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
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
                className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2"
              >
                <div className="text-[10px] text-slate-500 uppercase font-semibold">
                  {item.label}
                </div>
                <div className="text-xs font-bold text-slate-200 mt-0.5 truncate">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl">
          {loading && !inventory && (
            <div className="text-center py-16 text-slate-500">
              <RefreshCw className="animate-spin w-8 h-8 mx-auto mb-4 text-cyan-500" />
              <p>Running asset discovery scan…</p>
            </div>
          )}

          {/* ── HARDWARE TAB ── */}
          {activeTab === "HARDWARE" && !loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* CPU */}
                <Card title="Processor (CPU)" color="blue">
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
                <Card title="System Board & BIOS" color="purple">
                  <InfoRow label="Motherboard" value={inventory?.motherboard} />
                  <InfoRow label="BIOS Vendor" value={inventory?.biosVendor} />
                  <InfoRow
                    label="BIOS Version"
                    value={inventory?.biosVersion}
                    mono
                  />
                  <InfoRow
                    label="BIOS Date"
                    value={
                      inventory?.biosReleaseDate
                        ? new Date(
                            inventory.biosReleaseDate,
                          ).toLocaleDateString()
                        : null
                    }
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
                    value={inventory?.osSerialNumber}
                    mono
                  />
                </Card>

                {/* Core System */}
                <Card title="Core System" color="orange">
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
                <Card title="Network Identity" color="cyan">
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
                          className="border-l-2 border-purple-500/50 pl-3"
                        >
                          <p className="text-sm font-bold text-white">
                            {mem.manufacturer || "Unknown"}{" "}
                            {mem.capacityGB
                              ? `${mem.capacityGB} GB`
                              : mem.capacityBytes
                                ? bytes(mem.capacityBytes)
                                : "? GB"}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
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
                        className="border-l-2 border-emerald-500/50 pl-3"
                      >
                        <p className="text-sm font-bold text-white">
                          {disk.model || "Unknown Drive"}{" "}
                          <span className="text-emerald-400">
                            (
                            {disk.sizeGB
                              ? `${disk.sizeGB} GB`
                              : disk.sizeBytes
                                ? bytes(disk.sizeBytes)
                                : "?"}
                            )
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
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
                        className="border-l-2 border-orange-500/50 pl-3"
                      >
                        <p className="text-sm font-bold text-white">
                          {gpu.name || "Unknown GPU"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
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
              emptySubtitle="The agent will scan on next boot or on Re-Scan"
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
              emptySubtitle="Services are collected during the 24-hour inventory cycle"
            />
          )}

          {/* ── NETWORK TAB ── */}
          {activeTab === "NETWORK" && !loading && (
            <div className="space-y-4">
              {inventory?.networkAdapters &&
              inventory.networkAdapters.length > 0 ? (
                inventory.networkAdapters.map((net: any, i: number) => (
                  <Card
                    key={i}
                    title={net.name || net.description || `Adapter ${i + 1}`}
                    color="blue"
                  >
                    <div className="grid grid-cols-2 gap-x-8">
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
                <div className="text-center py-16 text-slate-500">
                  <Wifi size={32} className="mx-auto mb-3 opacity-40" />
                  <p>No network adapters found in inventory yet.</p>
                </div>
              )}
            </div>
          )}

          {/* ── SECURITY TAB ── */}
          {activeTab === "SECURITY" && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Defender */}
              <Card title="Windows Defender / Antivirus" color="green">
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-xs text-slate-400">
                    Real-Time Protection
                  </span>
                  <StatusBool
                    value={
                      inventory?.windowsDefenderEnabled ??
                      inventory?.security?.windowsDefenderEnabled
                    }
                  />
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-xs text-slate-400">Firewall</span>
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
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-xs text-slate-400">TPM Enabled</span>
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
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-xs text-slate-400">
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
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-xs text-slate-400">Secure Boot</span>
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
          {activeTab === "EXTENDED" && !loading && (
            <div className="space-y-6">
              {/* Startup Apps */}
              {inventory?.startupApplications &&
                inventory.startupApplications.length > 0 && (
                  <Card
                    title={`Startup Applications — ${inventory.startupApplications.length} entries`}
                    color="amber"
                  >
                    <div className="space-y-1 mt-1 max-h-64 overflow-y-auto">
                      {inventory.startupApplications.map(
                        (app: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between items-center text-xs py-1 border-b border-slate-800/40"
                          >
                            <span className="text-slate-200 font-semibold">
                              {app.name}
                            </span>
                            <span className="text-slate-500 font-mono truncate max-w-[320px]">
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
                  <div className="space-y-1 mt-1">
                    {inventory.usbDevices.map((usb: any, i: number) => (
                      <div
                        key={i}
                        className="text-xs py-1 border-b border-slate-800/40 last:border-0"
                      >
                        <span className="text-slate-200 font-semibold">
                          {usb.description || usb.name}
                        </span>{" "}
                        <span className="text-slate-500 font-mono">
                          VID:{usb.vendorId} PID:{usb.productId}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
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
                    <div className="max-h-64 overflow-y-auto mt-1">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left py-1">KB ID</th>
                            <th className="text-left py-1">Installed On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventory.windowsUpdates.map(
                            (kb: any, i: number) => (
                              <tr
                                key={i}
                                className="border-t border-slate-800/40"
                              >
                                <td className="py-1 font-mono text-cyan-400">
                                  {kb.hotFixId || kb.kbId}
                                </td>
                                <td className="py-1 text-slate-400">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* S.M.A.R.T Disk Health */}
                <Card title="S.M.A.R.T Disk Health" color="emerald">
                  {inventory?.smartData && inventory.smartData.length > 0 ? (
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {JSON.stringify(inventory.smartData, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-slate-500">
                      S.M.A.R.T data requires elevated WMI access. Available on
                      next privileged scan.
                    </p>
                  )}
                </Card>

                {/* Event Logs */}
                <Card title="Recent Critical Events" color="red">
                  {inventory?.eventLogs && inventory.eventLogs.length > 0 ? (
                    <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {JSON.stringify(inventory.eventLogs, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-slate-500">
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
