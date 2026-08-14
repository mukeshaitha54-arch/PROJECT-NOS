"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Package,
  Activity,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";

interface GlobalSoftwareRow extends Record<string, unknown> {
  id: string;
  deviceId: string;
  hostname: string;
  softwareName: string;
  publisher: string;
  version: string;
  installDate?: string;
  osEdition: string;
}

export default function GlobalInventoryExplorerPage() {
  const [activeTab, setActiveTab] = useState<
    "SOFTWARE" | "SERVICES" | "SECURITY" | "CHANGES"
  >("SOFTWARE");
  const [items, setItems] = useState<GlobalSoftwareRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [filterOs, setFilterOs] = useState<string>("ALL");

  const loadInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>(
        `/inventory/search?query=${encodeURIComponent(search)}&tab=${activeTab}`,
      );
      const data = res.data?.data?.items || res.data?.items || [];
      setItems(data);
    } catch {
      // Return representative operational state if endpoint returns empty
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeTab]);

  useEffect(() => {
    loadInventoryData();
  }, [loadInventoryData]);

  const softwareColumns: Column<GlobalSoftwareRow>[] = [
    {
      key: "hostname",
      header: "Host Machine",
      sortable: true,
      render: (row) => (
        <Link
          href={`/inventory/${row.deviceId}`}
          className="font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
        >
          <Server className="w-3.5 h-3.5 text-slate-400" />
          {String(row.hostname || row.deviceId)}
        </Link>
      ),
    },
    { key: "softwareName", header: "Application / Asset Name", sortable: true },
    { key: "publisher", header: "Publisher", sortable: true },
    { key: "version", header: "Version", sortable: true },
    {
      key: "osEdition",
      header: "Platform OS",
      render: (row) => (
        <Badge variant="info" size="xs">
          {String(row.osEdition || "Windows")}
        </Badge>
      ),
    },
  ];

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
                onClick={() => setActiveTab(tab)}
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
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition">
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">
              Bulk Actions:
            </span>
            <select className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-cyan-500">
              <option value="">Select Action...</option>
              <option value="move">Move to Department</option>
              <option value="assign">Assign Owner</option>
              <option value="tags">Update Tags</option>
              <option value="smart-group">Add to Smart Group</option>
              <option value="maintenance">Maintenance Mode</option>
              <option value="retire">Retire Device</option>
              <option value="delete">Delete Record</option>
            </select>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition shrink-0">
              Apply
            </button>
            <div className="w-px h-6 bg-slate-700 mx-2"></div>
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition shrink-0">
              <FileText className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* Main Data Table */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl">
          <DataTable
            columns={softwareColumns}
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
