"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Server,
  Cpu,
  HardDrive,
  Network,
  Shield,
  FileText,
  ChevronRight,
  CheckCircle,
  XCircle,
  Package,
  Activity,
  Play,
  Pause,
  AlertTriangle,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function GlobalInventoryExplorerPage() {
  const [activeTab, setActiveTab] = useState<
    "SOFTWARE" | "SERVICES" | "SECURITY" | "CHANGES"
  >("SOFTWARE");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [isApplyingBulk, setIsApplyingBulk] = useState<boolean>(false);

  const loadInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>(
        `/inventory/search?query=${encodeURIComponent(search)}&tab=${activeTab}`,
      );
      const rawData = res.data?.data ?? res.data;
      const data = Array.isArray(rawData)
        ? rawData
        : rawData?.items || rawData?.data || [];
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  // Handle Bulk Action execution
  const handleApplyBulkAction = async () => {
    if (!selectedAction) {
      toast.error("Please select a bulk action from the dropdown.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error(
        "Please select at least one row or machine to apply bulk action.",
      );
      return;
    }

    try {
      setIsApplyingBulk(true);
      const targetDeviceIds = Array.from(
        new Set(
          items
            .filter((i) => selectedIds.includes(i.id))
            .map((i) => i.deviceId || i.id),
        ),
      );

      await apiClient.post("/fleet/bulk/action", {
        deviceIds: targetDeviceIds,
        action: selectedAction,
        payload: {
          enabled: selectedAction === "MAINTENANCE",
        },
      });

      toast.success(
        `Successfully executed ${selectedAction} across ${targetDeviceIds.length} node(s).`,
      );
      setSelectedIds([]);
      await loadInventoryData();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to execute bulk operation.",
      );
    } finally {
      setIsApplyingBulk(false);
    }
  };

  // Handle Export CSV
  const handleExportCsv = () => {
    if (items.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    const headers = Object.keys(items[0]).filter(
      (k) => typeof items[0][k] !== "object",
    );
    const csvRows = [
      headers.join(","),
      ...items.map((row) =>
        headers
          .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `NOS_Inventory_${activeTab}_${Date.now()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(
      `Exported ${items.length} ${activeTab.toLowerCase()} rows to CSV.`,
    );
  };

  // Tab-specific column configurations
  const columns: Column<any>[] = useMemo(() => {
    const checkboxColumn: Column<any> = {
      key: "select",
      header: "",
      width: "40px",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.id)}
          onChange={(e) => {
            e.stopPropagation();
            setSelectedIds((prev) =>
              prev.includes(row.id)
                ? prev.filter((id) => id !== row.id)
                : [...prev, row.id],
            );
          }}
          className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
        />
      ),
    };
    switch (activeTab) {
      case "SERVICES":
        return [
          checkboxColumn,
          {
            key: "hostname",
            header: "Host Machine",
            sortable: true,
            render: (row) => (
              <Link
                href={`/devices/${row.deviceId || row.id}`}
                className="font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5 text-slate-400" />
                {String(row.hostname || row.deviceId || "SHIVA")}
              </Link>
            ),
          },
          { key: "serviceName", header: "Service Identifier", sortable: true },
          {
            key: "displayName",
            header: "Display / Service Title",
            sortable: true,
          },
          {
            key: "status",
            header: "Service Status",
            render: (row) => {
              const isRunning =
                String(row.status).toUpperCase() === "RUNNING" ||
                String(row.status).toUpperCase() === "ACTIVE";
              return (
                <Badge variant={isRunning ? "online" : "offline"} size="xs">
                  {isRunning ? "RUNNING" : String(row.status || "STOPPED")}
                </Badge>
              );
            },
          },
          {
            key: "startType",
            header: "Startup Mode",
            render: (row) => (
              <span className="font-mono text-xs text-slate-400">
                {String(row.startType || "AUTO")}
              </span>
            ),
          },
          {
            key: "osEdition",
            header: "Platform OS",
            render: (row) => (
              <Badge variant="info" size="xs">
                {String(row.osEdition || "Windows 11 Pro")}
              </Badge>
            ),
          },
        ];

      case "SECURITY":
        return [
          checkboxColumn,
          {
            key: "hostname",
            header: "Host Machine",
            sortable: true,
            render: (row) => (
              <Link
                href={`/devices/${row.deviceId || row.id}`}
                className="font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5 text-slate-400" />
                {String(row.hostname || row.deviceId || "SHIVA")}
              </Link>
            ),
          },
          {
            key: "defenderEnabled",
            header: "Windows Defender",
            render: (row) => (
              <Badge
                variant={row.defenderEnabled ? "online" : "offline"}
                size="xs"
              >
                {row.defenderEnabled ? "PROTECTED" : "DISABLED"}
              </Badge>
            ),
          },
          {
            key: "firewallEnabled",
            header: "Firewall Status",
            render: (row) => (
              <Badge
                variant={row.firewallEnabled ? "online" : "offline"}
                size="xs"
              >
                {row.firewallEnabled ? "ACTIVE" : "INACTIVE"}
              </Badge>
            ),
          },
          {
            key: "bitLockerStatus",
            header: "BitLocker Encryption",
            render: (row) => (
              <span className="font-semibold text-xs text-slate-300">
                {String(row.bitLockerStatus || "Enabled")}
              </span>
            ),
          },
          {
            key: "tpmVersion",
            header: "Hardware TPM",
            render: (row) => (
              <span className="font-mono text-xs text-emerald-400">
                {String(row.tpmVersion || "v2.0")}
              </span>
            ),
          },
          {
            key: "osEdition",
            header: "Platform OS",
            render: (row) => (
              <Badge variant="info" size="xs">
                {String(row.osEdition || "Windows 11 Pro")}
              </Badge>
            ),
          },
        ];

      case "CHANGES":
        return [
          checkboxColumn,
          {
            key: "hostname",
            header: "Host Machine",
            sortable: true,
            render: (row) => (
              <Link
                href={`/devices/${row.deviceId || row.id}`}
                className="font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5 text-slate-400" />
                {String(row.hostname || row.deviceId || "SHIVA")}
              </Link>
            ),
          },
          {
            key: "action",
            header: "Operational Action",
            render: (row) => (
              <Badge variant="info" size="xs">
                {String(row.action || "HEARTBEAT_UPDATE")}
              </Badge>
            ),
          },
          {
            key: "details",
            header: "Inventory Change Details",
            render: (row) => (
              <span className="text-xs text-slate-300">
                {String(row.details || "Agent synchronized configuration")}
              </span>
            ),
          },
          {
            key: "timestamp",
            header: "Recorded At",
            render: (row) => (
              <span className="font-mono text-xs text-slate-400">
                {row.timestamp
                  ? new Date(row.timestamp).toLocaleString()
                  : "Just now"}
              </span>
            ),
          },
          {
            key: "osEdition",
            header: "Platform OS",
            render: (row) => (
              <Badge variant="info" size="xs">
                {String(row.osEdition || "Windows 11 Pro")}
              </Badge>
            ),
          },
        ];

      case "SOFTWARE":
      default:
        return [
          checkboxColumn,
          {
            key: "hostname",
            header: "Host Machine",
            sortable: true,
            render: (row) => (
              <Link
                href={`/devices/${row.deviceId || row.id}`}
                className="font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
              >
                <Server className="w-3.5 h-3.5 text-slate-400" />
                {String(row.hostname || row.deviceId || "SHIVA")}
              </Link>
            ),
          },
          {
            key: "softwareName",
            header: "Application / Asset Name",
            sortable: true,
          },
          { key: "publisher", header: "Publisher", sortable: true },
          { key: "version", header: "Version", sortable: true },
          {
            key: "osEdition",
            header: "Platform OS",
            render: (row) => (
              <Badge variant="info" size="xs">
                {String(row.osEdition || "Windows 11 Pro")}
              </Badge>
            ),
          },
        ];
    }
  }, [activeTab, selectedIds, items]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-cyan-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Global Inventory Explorer
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cross-device software, services, hardware specs, and security
              compliance search across all monitored nodes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              NOC Dashboard
            </Link>
            <button
              onClick={loadInventoryData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
          {(["SOFTWARE", "SERVICES", "SECURITY", "CHANGES"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === tab
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                {tab}
              </button>
            ),
          )}
        </div>

        {/* Search, Filter & Bulk Actions Controls */}
        <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${activeTab.toLowerCase()}...`}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            {selectedIds.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                {selectedIds.length === items.length
                  ? "Deselect All"
                  : `Selected (${selectedIds.length})`}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
              Bulk Actions:
            </span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500"
            >
              <option value="">Select Action...</option>
              <option value="MAINTENANCE">Toggle Maintenance Mode</option>
              <option value="RETIRE">Retire Selected Nodes</option>
              <option value="MOVE">Move to Department</option>
              <option value="ASSIGN">Assign Ownership</option>
              <option value="UPDATE_TAGS">Update Security Tags</option>
            </select>
            <button
              onClick={handleApplyBulkAction}
              disabled={isApplyingBulk || selectedIds.length === 0}
              className={`px-4 py-2 text-white text-xs font-medium rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                selectedIds.length === 0
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {isApplyingBulk && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              {isApplyingBulk ? "Applying..." : "Apply"}
            </button>
            <div className="w-px h-6 bg-slate-700 mx-2"></div>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition shrink-0"
            >
              <FileText className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl">
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            searchable={false}
            emptyTitle={`No ${activeTab.toLowerCase()} assets matching search`}
            emptyDescription="Execute an agent inventory discovery scan to populate hardware and software inventory."
          />
        </div>
      </div>
    </div>
  );
}
