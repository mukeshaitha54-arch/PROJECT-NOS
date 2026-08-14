"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Filter,
  CheckCircle2,
  RotateCcw,
  Check,
  Search,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertCard,
  AlertCardData,
  AlertSeverityType,
  AlertStatusType,
} from "@/components/AlertCard";
import { useRealtime } from "@/realtime/hooks/useRealtime";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export default function AlertsCenterPage() {
  const [alerts, setAlerts] = useState<AlertCardData[]>([
    {
      id: "alt-01",
      severity: "CRITICAL",
      title: "Device Heartbeat Lost (Timeout > 90s)",
      description:
        "No UDP/HTTP telemetry payload received from node within failure window.",
      deviceName: "SHIVA-PRIMARY",
      deviceId: "node-shiva-01",
      createdAt: new Date(Date.now() - 120000).toISOString(),
      status: "OPEN",
    },
    {
      id: "alt-02",
      severity: "HIGH",
      title: "CPU Critical Spike (>90%)",
      description:
        "Host kernel reported continuous high computing saturation for >2 minutes.",
      deviceName: "SHIVA-PRIMARY",
      deviceId: "node-shiva-01",
      createdAt: new Date(Date.now() - 900000).toISOString(),
      status: "OPEN",
    },
    {
      id: "alt-03",
      severity: "WARNING",
      title: "Low Disk Storage Threshold (<15%)",
      description:
        "System partition volume C:\\ is running near maximum capacity.",
      deviceName: "BACKUP-NODE-02",
      deviceId: "node-backup-02",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      status: "ACKNOWLEDGED",
    },
    {
      id: "alt-04",
      severity: "INFO",
      title: "OTA Agent Self-Healing Daemon Executed",
      description:
        "Outbox dispatcher resumed queue transmission after transient network blip.",
      deviceName: "SHIVA-PRIMARY",
      deviceId: "node-shiva-01",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      status: "RESOLVED",
    },
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [timeFilter, setTimeFilter] = useState<string>("7d");
  const [selectedAlertIds, setSelectedAlertIds] = useState<string[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any, any>("/alerts").catch(() => null);

      if (res?.data || res) {
        const payload = res.data || res;
        const list = payload.alerts || payload || [];
        if (Array.isArray(list) && list.length > 0) {
          setAlerts(
            list.map((a: any) => ({
              id: a.id || `alt-${Math.random()}`,
              severity: (a.severity || "INFO") as AlertSeverityType,
              title: a.title || a.message || "Security Alert Event",
              description: a.description || a.context,
              deviceName:
                a.deviceName || a.device?.deviceName || "Cluster Node",
              deviceId: a.deviceId || a.device?.id,
              createdAt: a.createdAt || new Date().toISOString(),
              status: (a.status || "OPEN") as AlertStatusType,
            })),
          );
        }
      }
    } catch (err) {
      console.warn("Alerts fetch fallback initialized:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Real-time Socket.IO subscriptions with sonner toast
  const { on } = useRealtime();

  useEffect(() => {
    const unsubAlert = on("alert:triggered", (payload) => {
      if (payload) {
        const newAlert: AlertCardData = {
          id: payload.id || `alt-${Date.now()}`,
          severity: (payload.severity || "CRITICAL") as AlertSeverityType,
          title: payload.title || "Critical Telemetry Alert",
          description:
            payload.description || "Breach condition detected by rule engine.",
          deviceName: payload.deviceName || "SHIVA",
          deviceId: payload.deviceId,
          createdAt: new Date().toISOString(),
          status: "OPEN",
        };

        setAlerts((prev) => [newAlert, ...prev]);

        // Sonner toast notification
        const isCritical = newAlert.severity === "CRITICAL";
        toast(newAlert.title, {
          description: `Device: ${newAlert.deviceName} • ${newAlert.description || "Alert triggered"}`,
          duration: isCritical ? Infinity : 5000,
          className: isCritical
            ? "bg-red-950 text-red-200 border-red-800 font-semibold"
            : "bg-gray-900 text-gray-200 border-gray-800",
        });
      }
    });

    return () => {
      unsubAlert();
    };
  }, [on]);

  // Filter logic
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alt) => {
      const matchesSearch =
        search === "" ||
        alt.title.toLowerCase().includes(search.toLowerCase()) ||
        alt.deviceName?.toLowerCase().includes(search.toLowerCase()) ||
        alt.description?.toLowerCase().includes(search.toLowerCase());

      const matchesSeverity =
        severityFilter === "ALL" ||
        alt.severity?.toUpperCase() === severityFilter.toUpperCase();

      const matchesStatus =
        statusFilter === "ALL" ||
        alt.status?.toUpperCase() === statusFilter.toUpperCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [alerts, search, severityFilter, statusFilter]);

  // Selection handlers
  const toggleSelectAlert = (id: string) => {
    setSelectedAlertIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedAlertIds.length === filteredAlerts.length) {
      setSelectedAlertIds([]);
    } else {
      setSelectedAlertIds(filteredAlerts.map((a) => a.id));
    }
  };

  // Bulk actions
  const handleBulkResolve = () => {
    setAlerts((prev) =>
      prev.map((a) =>
        selectedAlertIds.includes(a.id)
          ? { ...a, status: "RESOLVED" as AlertStatusType }
          : a,
      ),
    );
    toast.success(`Resolved ${selectedAlertIds.length} selected alerts`);
    setSelectedAlertIds([]);
  };

  const handleBulkAcknowledge = () => {
    setAlerts((prev) =>
      prev.map((a) =>
        selectedAlertIds.includes(a.id)
          ? { ...a, status: "ACKNOWLEDGED" as AlertStatusType }
          : a,
      ),
    );
    toast.info(`Acknowledged ${selectedAlertIds.length} selected alerts`);
    setSelectedAlertIds([]);
  };

  const handleAcknowledgeSingle = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "ACKNOWLEDGED" as AlertStatusType } : a,
      ),
    );
    toast.info("Alert acknowledged");
  };

  const handleResolveSingle = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "RESOLVED" as AlertStatusType } : a,
      ),
    );
    toast.success("Alert resolved");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-amber-400" /> Incident & Alerts Center
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time rule engine breaches, SLA escalations, and hardware
            warning notifications.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAlerts}
          disabled={loading}
          className="border-gray-800 text-gray-300 text-xs"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Floating Bulk Action Bar (Appears when items are selected) */}
      {selectedAlertIds.length > 0 && (
        <div className="bg-blue-950/70 border border-blue-800/80 p-3.5 px-5 rounded-xl shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-semibold text-white">
              {selectedAlertIds.length} alerts selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleBulkAcknowledge}
              className="h-8 text-xs border-amber-800/60 bg-amber-950/20 text-amber-300 hover:bg-amber-900/40"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-400" />{" "}
              Acknowledge Selected
            </Button>
            <Button
              size="sm"
              onClick={handleBulkResolve}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Resolve Selected
            </Button>
            <button
              onClick={() => setSelectedAlertIds([])}
              className="p-1 text-gray-400 hover:text-white ml-2"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-gray-900/90 border border-gray-800 p-4 rounded-xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search alert title or node..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 outline-none shrink-0"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 outline-none shrink-0"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {/* Time range selector & Select All */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800 text-xs">
            {[
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTimeFilter(t.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  timeFilter === t.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            className="border-gray-800 text-gray-300 text-xs h-8"
          >
            {selectedAlertIds.length === filteredAlerts.length &&
            filteredAlerts.length > 0
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>
      </div>

      {/* Alert Cards Layout (1-2 columns responsive) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAlerts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500 text-xs bg-gray-900 border border-gray-800 rounded-xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-gray-300 text-sm">
              All clear! No matching alerts found.
            </p>
            <p className="text-gray-500 mt-1">
              Telemetry rules and heartbeat monitors are within nominal limits.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              isSelected={selectedAlertIds.includes(alert.id)}
              onSelect={toggleSelectAlert}
              onAcknowledge={handleAcknowledgeSingle}
              onResolve={handleResolveSingle}
            />
          ))
        )}
      </div>
    </div>
  );
}
