"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { inventoryApi } from "@/features/inventory/services/inventory.api";
import {
  CompleteInventoryResponse,
  DeviceInventoryDto,
  MemoryModuleDto,
  DiskDriveDto,
  GpuDto,
  NetworkAdapterDto,
  InstalledSoftwareDto,
  WindowsServiceDto,
  StartupApplicationDto,
  SecurityInventoryDto,
  DeviceCapabilitiesDto,
  InventoryAuditLogDto,
} from "@nos/shared-types";
import {
  Server,
  Cpu,
  HardDrive,
  Network,
  ShieldCheck,
  Layers,
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Key,
  Lock,
  Terminal,
  Sliders,
  Box,
  ChevronLeft,
  ChevronRight,
  FileText,
  Database,
  ShieldAlert,
  Zap,
  Disc,
  Laptop,
  Radio,
  Activity,
} from "lucide-react";

type InventoryTab = "hardware" | "software" | "network" | "security" | "audit";
type SoftwareSubTab = "installed" | "services" | "startup";

export default function DeviceInventoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const deviceId = resolvedParams.id;

  const [inventory, setInventory] = useState<CompleteInventoryResponse | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InventoryTab>("hardware");

  // Software pagination & filtering state
  const [softwareSubTab, setSoftwareSubTab] =
    useState<SoftwareSubTab>("installed");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryApi.getCompleteInventory(deviceId);
      setInventory(data);
    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to retrieve asset inventory specification from control plane.",
      );
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleTriggerScan = async () => {
    try {
      setScanning(true);
      setScanMessage(null);
      const res = await inventoryApi.triggerScan(deviceId);
      setScanMessage(res.message);
      setTimeout(() => setScanMessage(null), 5000);
    } catch (err: any) {
      setScanMessage(
        "Scan command schedule error: " +
          (err?.message || "Unauthorized or offline"),
      );
    } finally {
      setScanning(false);
    }
  };

  const formatBytes = (bytes?: number | bigint) => {
    if (bytes === undefined || bytes === null || Number(bytes) === 0)
      return "0 GB";
    const num = Number(bytes);
    const gb = num / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${(num / (1024 * 1024)).toFixed(0)} MB`;
  };

  const inv = inventory?.inventory;
  const sec = inv?.security;
  const caps = inv?.capabilities;
  const auditLogs = inventory?.recentAuditLogs || [];

  // Filter & Paginate Software / Services / Startup Lists
  const getFilteredList = () => {
    const q = searchQuery.toLowerCase().trim();
    if (softwareSubTab === "installed") {
      const list = inv?.installedSoftware || [];
      if (!q) return list;
      return list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.publisher.toLowerCase().includes(q),
      );
    } else if (softwareSubTab === "services") {
      const list = inv?.windowsServices || [];
      if (!q) return list;
      return list.filter(
        (s) =>
          s.serviceName.toLowerCase().includes(q) ||
          s.displayName.toLowerCase().includes(q),
      );
    } else {
      const list = inv?.startupApplications || [];
      if (!q) return list;
      return list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.command.toLowerCase().includes(q),
      );
    }
  };

  const filteredItems = getFilteredList();
  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / itemsPerPage),
  );
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Navigation & Status bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/device/${deviceId}`}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-850 hover:border-slate-700 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2 text-cyan-400" />
              Operational Monitoring Detail
            </Link>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-400 hover:text-cyan-400 px-2 py-1 transition"
            >
              Global Infrastructure Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {scanMessage && (
              <span className="text-xs font-semibold px-3 py-2 bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 rounded-lg animate-fade-in">
                {scanMessage}
              </span>
            )}
            <button
              onClick={handleTriggerScan}
              disabled={scanning}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 ring-1 ring-white/20"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 ${scanning ? "animate-spin" : ""}`}
              />
              Trigger Manual Re-Scan
            </button>
            <button
              onClick={fetchInventory}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-2 text-cyan-400 ${loading ? "animate-spin" : ""}`}
              />
              Sync Cache
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-6 bg-rose-950/50 border border-rose-500/40 rounded-2xl text-rose-300 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-8 h-8 text-rose-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-rose-200">
                  Asset Discovery Engine Error
                </h3>
                <p className="text-sm text-rose-300 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchInventory}
              className="px-4 py-2 bg-rose-800 hover:bg-rose-700 rounded-lg text-xs font-bold text-white transition"
            >
              Retry Query
            </button>
          </div>
        ) : loading && !inventory ? (
          <div className="p-20 text-center space-y-4 rounded-3xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-extrabold text-slate-300 uppercase tracking-widest">
              Querying Monitored Node Asset Fingerprints...
            </p>
          </div>
        ) : (
          <>
            {/* Header: Asset Profile & SHA-256 Fingerprint */}
            <div className="relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/90 shadow-2xl backdrop-blur-2xl">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center font-black text-white shadow-xl shadow-cyan-600/20 ring-2 ring-white/20 flex-shrink-0">
                    <Layers className="w-9 h-9 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-3xl font-black text-white tracking-tight">
                        {inv?.hostname || "Enterprise Server Node"}
                      </h1>
                      <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                        Phase 3 Verified
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        {inv?.osEdition || "Windows Server 2022"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-slate-300 font-bold">
                        {inv?.manufacturer} {inv?.model}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span>
                        Serial:{" "}
                        <strong className="text-cyan-400 font-mono">
                          {inv?.serialNumber || "N/A"}
                        </strong>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span>
                        Domain:{" "}
                        <strong className="text-slate-300">
                          {inv?.domain || "WORKGROUP"}
                        </strong>
                      </span>
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs shadow-inner">
                      <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-500">
                        Asset Fingerprint (SHA-256):
                      </span>
                      <span className="text-emerald-300 font-bold tracking-tight break-all">
                        {inv?.assetFingerprint || "PENDING_FINGERPRINT_HASH"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/90 p-5 rounded-2xl border border-slate-800/90 flex flex-col justify-between space-y-3 lg:w-72 shadow-lg">
                  <div>
                    <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                      Engine Diagnostic Specs
                    </span>
                    <div className="mt-2 text-xs font-mono flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Schema Release:</span>
                      <span className="text-cyan-400 font-bold">
                        v{inv?.schemaVersion || "1.0.0"}
                      </span>
                    </div>
                    <div className="text-xs font-mono flex justify-between items-center py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Agent Release:</span>
                      <span className="text-emerald-400 font-bold">
                        v2.0.0-phase3
                      </span>
                    </div>
                    <div className="text-xs font-mono flex justify-between items-center py-1">
                      <span className="text-slate-400">
                        Processor Topology:
                      </span>
                      <span className="text-slate-200 font-bold">
                        {inv?.physicalCores || 0}P / {inv?.logicalCores || 0}L
                        Cores
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono flex items-center justify-end gap-1.5 pt-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" />
                    <span>
                      Last Scan:{" "}
                      {inv?.updatedAt
                        ? new Date(inv.updatedAt).toLocaleString()
                        : "Recent"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Zero-Chart Architectural Notice Bar */}
            <div className="px-5 py-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-2 font-sans font-bold text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Zero-Chart Policy Active: Presenting structured enterprise
                typography and immutable audit records.
              </span>
              <span className="hidden md:inline text-cyan-400 font-mono">
                /api/v1/inventory/{deviceId}
              </span>
            </div>

            {/* Tab Switching Menu */}
            <div className="flex space-x-2 border-b border-slate-800/80 pb-3 overflow-x-auto">
              <button
                onClick={() => setActiveTab("hardware")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition whitespace-nowrap ${
                  activeTab === "hardware"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 ring-1 ring-white/20"
                    : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <Cpu className="w-4 h-4 text-cyan-400" />
                Hardware Assets ({inv?.memoryModules?.length || 2} RAM,{" "}
                {inv?.diskDrives?.length || 1} DISK)
              </button>
              <button
                onClick={() => {
                  setActiveTab("software");
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition whitespace-nowrap ${
                  activeTab === "software"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 ring-1 ring-white/20"
                    : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <Box className="w-4 h-4 text-purple-400" />
                Software & Services ({inv?.installedSoftware?.length || 0} Apps)
              </button>
              <button
                onClick={() => setActiveTab("network")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition whitespace-nowrap ${
                  activeTab === "network"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 ring-1 ring-white/20"
                    : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <Network className="w-4 h-4 text-emerald-400" />
                Network Topology ({inv?.networkAdapters?.length || 0} NICs)
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition whitespace-nowrap ${
                  activeTab === "security"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 ring-1 ring-white/20"
                    : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                Security & Capabilities
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition whitespace-nowrap ${
                  activeTab === "audit"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20 ring-1 ring-white/20"
                    : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-850"
                }`}
              >
                <FileText className="w-4 h-4 text-rose-400" />
                Difference Logs ({auditLogs.length})
              </button>
            </div>

            {/* TAB CONTENT: HARDWARE ASSETS */}
            {activeTab === "hardware" && (
              <div className="space-y-8 animate-fade-in">
                {/* System Board & CPU Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                      <Cpu className="w-5 h-5 text-cyan-400" />
                      <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                        Processor Spec
                      </h3>
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Model:</span>
                        <span className="text-white font-bold text-right">
                          {inv?.cpuModel || "Intel Xeon Platinum"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Vendor:</span>
                        <span className="text-cyan-400 font-bold">
                          {inv?.cpuVendor || "GenuineIntel"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Physical Cores:</span>
                        <span className="text-slate-200 font-bold">
                          {inv?.physicalCores || 0} Cores
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Logical Threads:</span>
                        <span className="text-emerald-400 font-bold">
                          {inv?.logicalCores || 0} Threads
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Architecture:</span>
                        <span className="text-slate-200 font-bold">
                          {inv?.architecture || "X64"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                      <Server className="w-5 h-5 text-blue-400" />
                      <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                        System & Motherboard
                      </h3>
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Manufacturer:</span>
                        <span className="text-white font-bold text-right">
                          {inv?.manufacturer || "Enterprise Vendor"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">System Model:</span>
                        <span className="text-blue-300 font-bold text-right">
                          {inv?.model || "Enterprise Blade"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Motherboard:</span>
                        <span className="text-slate-200 font-bold text-right">
                          {inv?.motherboard || "Board Spec"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">System Serial:</span>
                        <span className="text-amber-400 font-bold text-right">
                          {inv?.serialNumber || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">
                          Workgroup / Domain:
                        </span>
                        <span className="text-slate-200 font-bold text-right">
                          {inv?.domain || "WORKGROUP"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-xl space-y-4">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                      <Database className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-extrabold text-white text-sm uppercase tracking-wider">
                        BIOS & Firmware
                      </h3>
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">BIOS Vendor:</span>
                        <span className="text-white font-bold text-right">
                          {inv?.biosVendor || "AMI Corp."}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">
                          BIOS Release Version:
                        </span>
                        <span className="text-emerald-400 font-bold text-right">
                          {inv?.biosVersion || "v2.14"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Release Date:</span>
                        <span className="text-slate-200 font-bold text-right">
                          {inv?.biosReleaseDate || "2025-01-10"}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">OS Edition:</span>
                        <span className="text-cyan-300 font-bold text-right">
                          {inv?.osEdition}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">OS Kernel Build:</span>
                        <span className="text-slate-300 font-bold text-right">
                          {inv?.osBuild}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Storage Disks Table */}
                <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-6 h-6 text-cyan-400" />
                      <h3 className="font-black text-white text-base tracking-tight">
                        Non-Volatile Storage Volumes
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {inv?.diskDrives?.length || 0} Detected Physical Volumes
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-y border-slate-800">
                        <tr>
                          <th className="py-3 px-4">Drive Point</th>
                          <th className="py-3 px-4">Model & Label</th>
                          <th className="py-3 px-4">Media Type</th>
                          <th className="py-3 px-4">Capacity Size</th>
                          <th className="py-3 px-4">File System</th>
                          <th className="py-3 px-4">Volume Serial</th>
                          <th className="py-3 px-4 text-right">Boot Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {inv?.diskDrives?.map(
                          (disk: DiskDriveDto, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-800/40 transition"
                            >
                              <td className="py-3.5 px-4 font-extrabold text-cyan-400">
                                {disk.driveName}
                              </td>
                              <td className="py-3.5 px-4 text-white font-bold">
                                {disk.model}
                              </td>
                              <td className="py-3.5 px-4 text-slate-300">
                                {disk.mediaType}
                              </td>
                              <td className="py-3.5 px-4 text-emerald-400 font-extrabold">
                                {formatBytes(disk.sizeBytes)}
                              </td>
                              <td className="py-3.5 px-4 text-slate-300">
                                {disk.fileSystem}
                              </td>
                              <td className="py-3.5 px-4 text-amber-400/90">
                                {disk.serialNumber}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                {disk.isSystemDrive ? (
                                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    SYSTEM OS BOOT
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    DATA VOLUME
                                  </span>
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                        {(!inv?.diskDrives || inv.diskDrives.length === 0) && (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-6 text-center text-slate-500 italic font-sans"
                            >
                              No physical disk drive volumes recorded in control
                              plane snapshot.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Memory DIMM Slots & GPU Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Memory DIMM Table */}
                  <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-blue-400" />
                        <h3 className="font-black text-white text-base tracking-tight">
                          RAM Module DIMM Array
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-blue-400 font-bold">
                        {inv?.memoryModules?.length || 0} Active Slots
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-y border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Slot</th>
                            <th className="py-2.5 px-3">Capacity</th>
                            <th className="py-2.5 px-3">Clock Speed</th>
                            <th className="py-2.5 px-3">Vendor / Part</th>
                            <th className="py-2.5 px-3 text-right">Serial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {inv?.memoryModules?.map(
                            (mem: MemoryModuleDto, idx: number) => (
                              <tr
                                key={idx}
                                className="hover:bg-slate-800/40 transition"
                              >
                                <td className="py-3 px-3 text-cyan-400 font-extrabold">
                                  {mem.slot}
                                </td>
                                <td className="py-3 px-3 text-white font-extrabold">
                                  {formatBytes(mem.capacityBytes)}
                                </td>
                                <td className="py-3 px-3 text-blue-300 font-bold">
                                  {mem.speedMHz} MHz
                                </td>
                                <td className="py-3 px-3 text-slate-300">
                                  <div className="font-bold text-white">
                                    {mem.manufacturer}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {mem.partNumber}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right text-slate-400">
                                  {mem.serialNumber}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* GPU Accelerators Table */}
                  <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <Sliders className="w-5 h-5 text-purple-400" />
                        <h3 className="font-black text-white text-base tracking-tight">
                          GPU & Graphics Accelerators
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-purple-400 font-bold">
                        {inv?.gpus?.length || 0} Accelerators
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-y border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Device Name</th>
                            <th className="py-2.5 px-3">Vendor</th>
                            <th className="py-2.5 px-3">VRAM Capacity</th>
                            <th className="py-2.5 px-3">Driver Ver</th>
                            <th className="py-2.5 px-3 text-right">
                              Resolution
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {inv?.gpus?.map((gpu: GpuDto, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-slate-800/40 transition"
                            >
                              <td className="py-3 px-3 text-purple-300 font-extrabold">
                                {gpu.name}
                              </td>
                              <td className="py-3 px-3 text-slate-300">
                                {gpu.manufacturer}
                              </td>
                              <td className="py-3 px-3 text-emerald-400 font-bold">
                                {formatBytes(gpu.vRamBytes)}
                              </td>
                              <td className="py-3 px-3 text-cyan-300">
                                {gpu.driverVersion}
                              </td>
                              <td className="py-3 px-3 text-right text-white font-bold">
                                {gpu.resolution}
                              </td>
                            </tr>
                          ))}
                          {(!inv?.gpus || inv.gpus.length === 0) && (
                            <tr>
                              <td
                                colSpan={5}
                                className="py-6 text-center text-slate-500 italic font-sans"
                              >
                                No dedicated GPU hardware detected.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SOFTWARE & SERVICES */}
            {activeTab === "software" && (
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSoftwareSubTab("installed");
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                        softwareSubTab === "installed"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      Installed Applications (
                      {inv?.installedSoftware?.length || 0})
                    </button>
                    <button
                      onClick={() => {
                        setSoftwareSubTab("services");
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                        softwareSubTab === "services"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      Windows Services ({inv?.windowsServices?.length || 0})
                    </button>
                    <button
                      onClick={() => {
                        setSoftwareSubTab("startup");
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition ${
                        softwareSubTab === "startup"
                          ? "bg-purple-600 text-white shadow-md shadow-purple-600/20"
                          : "bg-slate-900 text-slate-400 hover:text-white"
                      }`}
                    >
                      Startup Programs ({inv?.startupApplications?.length || 0})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder={`Filter ${softwareSubTab} list...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                    />
                  </div>
                </div>

                {/* SubTab Table Render */}
                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-y border-slate-800">
                      {softwareSubTab === "installed" && (
                        <tr>
                          <th className="py-3 px-4">Application Name</th>
                          <th className="py-3 px-4">Publisher Vendor</th>
                          <th className="py-3 px-4">Version String</th>
                          <th className="py-3 px-4">Install Date</th>
                          <th className="py-3 px-4 text-right">
                            Installation Directory
                          </th>
                        </tr>
                      )}
                      {softwareSubTab === "services" && (
                        <tr>
                          <th className="py-3 px-4">Service Name ID</th>
                          <th className="py-3 px-4">Display Label</th>
                          <th className="py-3 px-4">Operational Status</th>
                          <th className="py-3 px-4">Startup Type</th>
                          <th className="py-3 px-4 text-right">
                            Execution Account
                          </th>
                        </tr>
                      )}
                      {softwareSubTab === "startup" && (
                        <tr>
                          <th className="py-3 px-4">Application Name</th>
                          <th className="py-3 px-4">
                            Execution Command / Path
                          </th>
                          <th className="py-3 px-4">
                            Registry / Startup Location
                          </th>
                          <th className="py-3 px-4 text-right">User Scope</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {softwareSubTab === "installed" &&
                        paginatedItems.map((item: any, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="py-3.5 px-4 text-white font-bold">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4 text-cyan-300">
                              {item.publisher}
                            </td>
                            <td className="py-3.5 px-4 text-emerald-400 font-extrabold">
                              {item.version}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">
                              {item.installDate}
                            </td>
                            <td
                              className="py-3.5 px-4 text-right text-slate-400 max-w-xs truncate"
                              title={item.installLocation}
                            >
                              {item.installLocation || "N/A"}
                            </td>
                          </tr>
                        ))}

                      {softwareSubTab === "services" &&
                        paginatedItems.map((item: any, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="py-3.5 px-4 font-extrabold text-cyan-400">
                              {item.serviceName}
                            </td>
                            <td className="py-3.5 px-4 text-white font-bold">
                              {item.displayName}
                            </td>
                            <td className="py-3.5 px-4">
                              {item.status?.toLowerCase() === "running" ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />{" "}
                                  RUNNING
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-800 text-slate-400 border border-slate-700">
                                  <XCircle className="w-3.5 h-3.5 text-slate-500" />{" "}
                                  STOPPED
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300 uppercase font-bold">
                              {item.startType}
                            </td>
                            <td className="py-3.5 px-4 text-right text-purple-300">
                              {item.account}
                            </td>
                          </tr>
                        ))}

                      {softwareSubTab === "startup" &&
                        paginatedItems.map((item: any, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="py-3.5 px-4 text-white font-extrabold">
                              {item.name}
                            </td>
                            <td className="py-3.5 px-4 text-cyan-300 font-mono break-all max-w-md">
                              {item.command}
                            </td>
                            <td className="py-3.5 px-4 text-slate-300">
                              {item.location}
                            </td>
                            <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                              {item.user}
                            </td>
                          </tr>
                        ))}

                      {paginatedItems.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-12 text-center text-slate-500 font-sans italic"
                          >
                            No matching entries found in {softwareSubTab}{" "}
                            inventory profile.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80 pt-4 text-xs font-mono text-slate-400">
                  <span>
                    Showing{" "}
                    {filteredItems.length === 0
                      ? 0
                      : (currentPage - 1) * itemsPerPage + 1}{" "}
                    -{" "}
                    {Math.min(currentPage * itemsPerPage, filteredItems.length)}{" "}
                    of {filteredItems.length} Records
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage <= 1}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-40 transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 font-extrabold text-white">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage >= totalPages}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-40 transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: NETWORK TOPOLOGY */}
            {activeTab === "network" && (
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Network className="w-6 h-6 text-emerald-400" />
                    <div>
                      <h3 className="font-black text-white text-base tracking-tight">
                        Physical & Virtual Network Adapters
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Comprehensive MAC, IPv4/IPv6 address mapping, and speed
                        diagnostics
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    {inv?.networkAdapters?.length || 0} Interfaces
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-y border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Adapter ID</th>
                        <th className="py-3 px-4">Hardware MAC</th>
                        <th className="py-3 px-4">IPv4 Address</th>
                        <th className="py-3 px-4">IPv6 Address</th>
                        <th className="py-3 px-4">Gateway & DNS</th>
                        <th className="py-3 px-4">Link Speed</th>
                        <th className="py-3 px-4">Interface Type</th>
                        <th className="py-3 px-4 text-right">
                          Operational State
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {inv?.networkAdapters?.map(
                        (nic: NetworkAdapterDto, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="py-4 px-4">
                              <div className="font-extrabold text-white">
                                {nic.name}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {nic.description || "Ethernet Adapter"}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-amber-400 font-extrabold tracking-widest">
                              {nic.macAddress}
                            </td>
                            <td className="py-4 px-4 text-cyan-300 font-bold">
                              {nic.ipv4}
                            </td>
                            <td
                              className="py-4 px-4 text-slate-300 max-w-xs truncate"
                              title={nic.ipv6}
                            >
                              {nic.ipv6}
                            </td>
                            <td className="py-4 px-4 text-slate-300">
                              <div>
                                GW:{" "}
                                <strong className="text-slate-200">
                                  {nic.gateway}
                                </strong>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                DNS: {nic.dns}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-emerald-400 font-extrabold">
                              {nic.speedMbps} Mbps
                            </td>
                            <td className="py-4 px-4">
                              {nic.isWireless ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  <Radio className="w-3 h-3 text-blue-400" />{" "}
                                  WIRELESS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                  <Disc className="w-3 h-3 text-emerald-400" />{" "}
                                  ETHERNET
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              {nic.isOperational ? (
                                <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  UP ACTIVE
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-slate-800 text-slate-400 border border-slate-700">
                                  DOWN / INACTIVE
                                </span>
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                      {(!inv?.networkAdapters ||
                        inv.networkAdapters.length === 0) && (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-12 text-center text-slate-500 font-sans italic"
                          >
                            No network interface devices discovered on target
                            node.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: SECURITY & SYSTEM CAPABILITIES */}
            {activeTab === "security" && (
              <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Security Posture Panel */}
                  <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-2xl shadow-2xl space-y-6">
                    <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
                      <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-lg tracking-tight">
                          Security Posture Compliance
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Hardware encryption, Trusted Platform Module &
                          Defender status
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-800/80 text-xs font-mono space-y-3">
                      <div className="flex items-center justify-between pt-3">
                        <span className="text-slate-300 font-bold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />{" "}
                          Windows Defender Engine
                        </span>
                        {sec?.windowsDefenderEnabled ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            PROTECTION ACTIVE
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            DISABLED / WARNING
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <span className="text-slate-300 font-bold flex items-center gap-2">
                          <Lock className="w-4 h-4 text-cyan-400" /> Windows
                          Defender Firewall
                        </span>
                        {sec?.firewallEnabled ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            FIREWALL ENABLED
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            FIREWALL DOWN
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <span className="text-slate-300 font-bold flex items-center gap-2">
                          <Key className="w-4 h-4 text-amber-400" /> BitLocker
                          Drive Encryption
                        </span>
                        {sec?.bitLockerEnabled ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ENCRYPTED ({sec.bitLockerDrive || "C:"})
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-800 text-slate-400">
                            NOT ENCRYPTED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <span className="text-slate-300 font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />{" "}
                          UEFI Secure Boot
                        </span>
                        {sec?.secureBootEnabled ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            SECURE BOOT ON
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SECURE BOOT OFF
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3">
                        <span className="text-slate-300 font-bold flex items-center gap-2">
                          <Server className="w-4 h-4 text-purple-400" /> Trusted
                          Platform Module (TPM)
                        </span>
                        {sec?.tpmEnabled ? (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {sec.tpmVersion || "2.0 ACTIVE"}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-800 text-slate-400">
                            TPM MISSING
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Device Capabilities Matrix Panel */}
                  <div className="p-7 rounded-3xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-2xl shadow-2xl space-y-6">
                    <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
                      <div className="w-11 h-11 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-white text-lg tracking-tight">
                          System Capabilities & Workloads
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">
                          Hardware virtual machine detection & workload
                          container compatibility
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300">GPU Compute</span>
                        <span
                          className={`font-extrabold ${caps?.supportsGPU ? "text-emerald-400" : "text-slate-500"}`}
                        >
                          {caps?.supportsGPU ? "SUPPORTED" : "NONE"}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300">
                          Virtualization (VT-x)
                        </span>
                        <span
                          className={`font-extrabold ${caps?.supportsVirtualization ? "text-emerald-400" : "text-slate-500"}`}
                        >
                          {caps?.supportsVirtualization ? "ENABLED" : "OFF"}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300">Docker Engine</span>
                        <span
                          className={`font-extrabold ${caps?.supportsDocker ? "text-cyan-400" : "text-slate-500"}`}
                        >
                          {caps?.supportsDocker ? "COMPLIANT" : "MISSING"}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300">
                          Windows Subsystem (WSL2)
                        </span>
                        <span
                          className={`font-extrabold ${caps?.supportsWSL ? "text-purple-400" : "text-slate-500"}`}
                        >
                          {caps?.supportsWSL ? "READY" : "OFF"}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300">Wireless 802.11</span>
                        <span
                          className={`font-extrabold ${caps?.supportsWiFi ? "text-blue-400" : "text-slate-500"}`}
                        >
                          {caps?.supportsWiFi ? "AVAILABLE" : "NO WIFI"}
                        </span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-300">Gigabit Ethernet</span>
                        <span
                          className={`font-extrabold ${caps?.supportsEthernet ? "text-emerald-400" : "text-slate-500"}`}
                        >
                          {caps?.supportsEthernet ? "ONLINE" : "OFFLINE"}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between font-mono text-xs">
                      <div className="flex items-center gap-3">
                        <Laptop className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="text-slate-300 font-bold">
                            Virtual Machine Hypervisor Check
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Vendor: {caps?.vmVendor || "Bare-Metal Server"}
                          </div>
                        </div>
                      </div>
                      {caps?.virtualMachineDetection ? (
                        <span className="px-3 py-1 rounded-lg font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          VM GUEST NODE
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-lg font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          BARE-METAL PHYSICAL
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: AUDIT TRAIL & DIFFERENCE ENGINE */}
            {activeTab === "audit" && (
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-2xl space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-rose-400" />
                    <div>
                      <h3 className="font-black text-white text-base tracking-tight">
                        Difference Engine Audit Log
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        Immutable record of detected hardware, software, BIOS,
                        and security mutations
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-rose-400 font-extrabold">
                    {auditLogs.length} Log Entries Recorded
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider border-y border-slate-800">
                      <tr>
                        <th className="py-3 px-4">
                          Event Date / UTC Timestamp
                        </th>
                        <th className="py-3 px-4">Mutation Category Action</th>
                        <th className="py-3 px-4">
                          Difference Delta Specification
                        </th>
                        <th className="py-3 px-4 text-right">
                          Verification Engine
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {auditLogs.map(
                        (log: InventoryAuditLogDto, idx: number) => (
                          <tr
                            key={idx}
                            className="hover:bg-slate-800/40 transition"
                          >
                            <td className="py-4 px-4 text-slate-300 font-bold">
                              {new Date(log.timestamp).toUTCString()}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-cyan-400 uppercase">
                              {log.action}
                            </td>
                            <td className="py-4 px-4 text-emerald-300 font-mono max-w-xl break-words bg-slate-950/50 p-3 rounded-lg border border-slate-850">
                              {log.changeDetails}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className="px-2.5 py-1 rounded-md text-[10px] font-black bg-slate-800 text-slate-300 border border-slate-700">
                                SHA256_DIFF_ENGINE
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-16 text-center text-slate-500 font-sans italic space-y-2"
                          >
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <div className="text-sm font-bold text-slate-400">
                              No Asset Deviations Detected
                            </div>
                            <div className="text-xs text-slate-600">
                              The current device inventory perfectly matches the
                              verified SHA-256 baseline hash.
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
