"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Shield,
  CheckCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Server,
  Database,
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";

interface AuditLogRow extends Record<string, unknown> {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  correlationId?: string;
  details?: string;
  timestamp: string;
}

export default function OperationalAuditCenterPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("ALL");
  const [resourceFilter, setResourceFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const payload: any = { page, limit };
      if (search) payload.search = search;
      if (actionFilter !== "ALL") payload.action = actionFilter;
      if (resourceFilter !== "ALL") payload.resourceType = resourceFilter;

      let items: any[] = [];
      let total = 0;
      try {
        const res = await apiClient.post<any>("/tenant/audit/search", payload);
        const rawItems =
          res.data?.data?.items ?? res.data?.items ?? res.data?.data;
        items = Array.isArray(rawItems) ? rawItems : [];
        total = res.data?.data?.total || res.data?.total || items.length;
      } catch {
        // Fallback to GET /audit endpoint
        const fbRes = await apiClient
          .get<any>(`/audit?page=${page}&limit=${limit}`)
          .catch(() => null);
        const rawItems =
          fbRes?.data?.data?.items ??
          fbRes?.data?.items ??
          fbRes?.data?.data ??
          fbRes?.data;
        items = Array.isArray(rawItems) ? rawItems : [];
        total = fbRes?.data?.data?.total || fbRes?.data?.total || items.length;
      }

      const formatted = items.map((r: any) => ({
        ...r,
        userName:
          r.userName ||
          r.userEmail ||
          r.actor ||
          (r.userId
            ? `User (${String(r.userId).slice(0, 8)})`
            : "mukesh Admin"),
      }));

      setLogs(formatted);
      setTotalRecords(total);
    } catch (err: any) {
      toast.error(
        "Failed to load audit logs",
        err.response?.data?.message || err.message,
      );
      setLogs([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, actionFilter, resourceFilter]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const exportCsv = () => {
    toast.success(
      "CSV Audit Report Exported",
      "Downloading official compliance audit trail log.",
    );
    const csvContent =
      "data:text/csv;charset=utf-8,ID,Action,Resource,User,Timestamp\n" +
      logs
        .map(
          (e) =>
            `${e.id},${e.action},${e.resourceType},${e.userName || "System"},${e.timestamp}`,
        )
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `NOS_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const auditColumns: Column<AuditLogRow>[] = [
    {
      key: "timestamp",
      header: "Timestamp (UTC)",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-300">
          {new Date(row.timestamp as string).toLocaleString()}
        </span>
      ),
    },
    {
      key: "action",
      header: "Audit Action",
      sortable: true,
      render: (row) => (
        <Badge variant="info" size="xs">
          {String(row.action)}
        </Badge>
      ),
    },
    {
      key: "resourceType",
      header: "Resource",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-slate-200">
          {String(row.resourceType)}{" "}
          {row.resourceId ? `(${String(row.resourceId).slice(0, 8)})` : ""}
        </span>
      ),
    },
    {
      key: "userName",
      header: "User / Actor",
      sortable: true,
      render: (row) => (
        <span className="text-slate-300 font-semibold">
          {String(row.userName || "System Engine")}
        </span>
      ),
    },
    {
      key: "correlationId",
      header: "Correlation ID",
      render: (row) => (
        <span className="font-mono text-[11px] text-slate-500">
          {String(row.correlationId || "N/A")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Operational Audit Center
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable security audit trail logging authentication, device
            configuration, inventory changes, and admin operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] text-xs font-semibold text-slate-300 hover:text-white active:scale-[0.97] transition-[transform,background-color] duration-140 ease-out"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={loadAuditLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_16px_-4px_rgba(6,182,212,0.5)] text-white text-xs font-semibold active:scale-[0.97] transition-[transform,background-color,box-shadow] duration-140 ease-out"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by user, action, resource..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20 transition-[border-color,box-shadow] duration-140"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl glass-card border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-8px_rgba(0,0,0,0.6)] p-6">
        <DataTable
          columns={auditColumns}
          data={logs}
          loading={loading}
          searchable={false}
          emptyTitle="No audit log entries found"
          emptyDescription="Platform operations and security actions will record here automatically."
          onRowClick={(row) =>
            setExpandedId(expandedId === row.id ? null : row.id)
          }
        />
      </div>
    </div>
  );
}
