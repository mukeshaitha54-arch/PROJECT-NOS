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
  CheckCircle,
  Server,
  Activity,
  Wrench,
  FileText,
  AlertTriangle,
  Terminal,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, Column } from "@/components/ui/data-table";
import { apiClient } from "@/lib/api-client";

type TabType =
  "HARDWARE" | "SOFTWARE" | "SERVICES" | "NETWORK" | "SECURITY" | "EXTENDED";

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

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<any>(`/inventory/${deviceId}`);
      setInventory(
        res.data?.data?.inventory || res.data?.inventory || res.data?.data,
      );
    } catch (err: any) {
      setError(
        err?.message || "Failed to retrieve asset inventory for this device.",
      );
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const softwareColumns: Column<any>[] = [
    { key: "name", header: "Application Name", sortable: true },
    { key: "publisher", header: "Publisher", sortable: true },
    { key: "version", header: "Version", sortable: true },
    { key: "installDate", header: "Install Date", sortable: true },
  ];

  const serviceColumns: Column<any>[] = [
    { key: "serviceName", header: "Service Name", sortable: true },
    { key: "displayName", header: "Display Name", sortable: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge
          variant={
            row.status === "RUNNING" || row.status === "Running"
              ? "online"
              : "neutral"
          }
          size="xs"
        >
          {String(row.status)}
        </Badge>
      ),
    },
    { key: "startType", header: "Start Type", sortable: true },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
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
                Device Asset & Inventory Explorer
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Device ID: {deviceId}
              </p>
            </div>
          </div>

          <button
            onClick={loadInventory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Re-Scan Inventory
          </button>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Tab Selection Bar */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2 overflow-x-auto">
          {(
            [
              "HARDWARE",
              "SOFTWARE",
              "SERVICES",
              "NETWORK",
              "SECURITY",
              "EXTENDED",
            ] as TabType[]
          ).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === tab
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab === "HARDWARE" && <Cpu className="w-3.5 h-3.5" />}
              {tab === "SOFTWARE" && <FileText className="w-3.5 h-3.5" />}
              {tab === "SERVICES" && <Activity className="w-3.5 h-3.5" />}
              {tab === "NETWORK" && <Network className="w-3.5 h-3.5" />}
              {tab === "SECURITY" && <Shield className="w-3.5 h-3.5" />}
              {tab === "EXTENDED" && <Terminal className="w-3.5 h-3.5" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Panels */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl">
          {activeTab === "HARDWARE" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Processor (CPU)
                  </h4>
                  <p className="text-sm font-bold text-white">
                    {inventory?.cpuModel || "N/A"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Vendor: {inventory?.cpuVendor || "N/A"} | Cores:{" "}
                    {inventory?.physicalCores || 0}P /{" "}
                    {inventory?.logicalCores || 0}L
                  </p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    System Board & BIOS
                  </h4>
                  <p className="text-sm font-bold text-white">
                    {inventory?.motherboard || "N/A"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    BIOS: {inventory?.biosVendor || "N/A"} v
                    {inventory?.biosVersion || "N/A"} (
                    {inventory?.biosReleaseDate || "Unknown"})
                  </p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Operating System
                  </h4>
                  <p className="text-sm font-bold text-white">
                    {inventory?.osEdition || "N/A"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Build: {inventory?.osBuild || "N/A"} (
                    {inventory?.architecture || "N/A"})
                  </p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Core System
                  </h4>
                  <p className="text-sm font-bold text-white">
                    {inventory?.manufacturer || "N/A"}{" "}
                    {inventory?.model || "N/A"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Serial: {inventory?.serialNumber || "N/A"}
                  </p>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Network Identity
                  </h4>
                  <p className="text-sm font-bold text-white">
                    {inventory?.hostname || "N/A"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Domain: {inventory?.domain || "N/A"} | Workgroup:{" "}
                    {inventory?.workgroup || "N/A"}
                  </p>
                </div>
              </div>

              {/* Memory Modules */}
              {inventory?.memoryModules &&
                inventory.memoryModules.length > 0 && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-3">
                      Memory Modules (RAM)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inventory.memoryModules.map((mem: any, i: number) => (
                        <div
                          key={i}
                          className="text-sm border-l-2 border-purple-500/50 pl-3"
                        >
                          <p className="font-bold text-white">
                            {mem.manufacturer || "Unknown"} {mem.capacityGB}GB
                          </p>
                          <p className="text-xs text-slate-400">
                            Speed: {mem.speedMHz} MHz | Form: {mem.formFactor} |
                            Type: {mem.memoryType}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Disk Drives */}
              {inventory?.diskDrives && inventory.diskDrives.length > 0 && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">
                    Storage Drives
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inventory.diskDrives.map((disk: any, i: number) => (
                      <div
                        key={i}
                        className="text-sm border-l-2 border-emerald-500/50 pl-3"
                      >
                        <p className="font-bold text-white">
                          {disk.model || "Unknown Drive"} ({disk.sizeGB}GB)
                        </p>
                        <p className="text-xs text-slate-400">
                          Type: {disk.mediaType} | Interface:{" "}
                          {disk.interfaceType} | SN: {disk.serialNumber}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GPUs */}
              {inventory?.gpus && inventory.gpus.length > 0 && (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-3">
                    Graphics (GPU)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inventory.gpus.map((gpu: any, i: number) => (
                      <div
                        key={i}
                        className="text-sm border-l-2 border-orange-500/50 pl-3"
                      >
                        <p className="font-bold text-white">
                          {gpu.name || "Unknown GPU"}
                        </p>
                        <p className="text-xs text-slate-400">
                          Driver: {gpu.driverVersion} | VRAM: {gpu.vramMB}MB |
                          Res: {gpu.resolution}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Network Adapters */}
              {inventory?.networkAdapters &&
                inventory.networkAdapters.length > 0 && (
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
                      Network Adapters
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {inventory.networkAdapters.map((net: any, i: number) => (
                        <div
                          key={i}
                          className="text-sm border-l-2 border-blue-500/50 pl-3"
                        >
                          <p className="font-bold text-white">
                            {net.name || "Unknown Adapter"}
                          </p>
                          <p className="text-xs text-slate-400">
                            MAC: {net.macAddress} | Status: {net.status} | IP:{" "}
                            {net.ipAddress}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {activeTab === "SOFTWARE" && (
            <DataTable
              columns={softwareColumns}
              data={inventory?.installedSoftware || []}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search installed software..."
              emptyTitle="No installed software records"
            />
          )}

          {activeTab === "SERVICES" && (
            <DataTable
              columns={serviceColumns}
              data={inventory?.windowsServices || []}
              loading={loading}
              searchable={true}
              searchPlaceholder="Search Windows services..."
              emptyTitle="No service records"
            />
          )}

          {activeTab === "EXTENDED" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Windows Defender */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                    Windows Defender
                  </h4>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {inventory?.windowsDefender
                      ? JSON.stringify(inventory.windowsDefender, null, 2)
                      : "N/A"}
                  </pre>
                </div>

                {/* TPM */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                    TPM (Trusted Platform Module)
                  </h4>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {inventory?.tpmExtended
                      ? JSON.stringify(inventory.tpmExtended, null, 2)
                      : "N/A"}
                  </pre>
                </div>

                {/* BitLocker */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                    BitLocker
                  </h4>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {inventory?.bitlockerInfo
                      ? JSON.stringify(inventory.bitlockerInfo, null, 2)
                      : "N/A"}
                  </pre>
                </div>

                {/* SMART Data */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                    S.M.A.R.T. Disk Health
                  </h4>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {inventory?.smartData
                      ? JSON.stringify(inventory.smartData, null, 2)
                      : "N/A"}
                  </pre>
                </div>

                {/* USB Devices */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                    Connected USB Devices
                  </h4>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">
                    {inventory?.usbDevices
                      ? JSON.stringify(inventory.usbDevices, null, 2)
                      : "N/A"}
                  </pre>
                </div>

                {/* Scheduled Tasks */}
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                    Scheduled Tasks
                  </h4>
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {inventory?.scheduledTasks
                      ? JSON.stringify(inventory.scheduledTasks, null, 2)
                      : "N/A"}
                  </pre>
                </div>
              </div>

              {/* Event Logs */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                  Critical Event Logs
                </h4>
                <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {inventory?.eventLogs
                    ? JSON.stringify(inventory.eventLogs, null, 2)
                    : "N/A"}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
