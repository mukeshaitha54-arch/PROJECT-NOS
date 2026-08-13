'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { dashboardApi } from '@/features/dashboard/services/dashboard.api';
import { DashboardOverviewResponse, DashboardDeviceRow, DeviceStatus } from '@nos/shared-types';
import {
  Server, Activity, CheckCircle, AlertTriangle, XCircle, ShieldAlert,
  Search, RefreshCw, ChevronLeft, ChevronRight, Filter, Cpu, HardDrive, Network as NetworkIcon, Monitor
} from 'lucide-react';
import { useRealtimeDashboard } from '@/features/realtime/hooks/useRealtimeDashboard';
import { RealtimeStatusBadge } from '@/features/realtime/components/RealtimeStatusBadge';

function OperationalDashboardPageContent() {
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [devices, setDevices] = useState<DashboardDeviceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Pagination State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [osFilter, setOsFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Real-time last updated indicator (polling replaced by enterprise socket layer)
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [overviewData, tableData] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getDevices({ page, limit, search, status: statusFilter, os: osFilter }),
      ]);
      setOverview(overviewData);
      setDevices(tableData.devices);
      setTotalPages(tableData.totalPages);
      setTotalRecords(tableData.total);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve operational monitoring metrics from control plane.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, osFilter]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Enterprise Real-Time Socket Layer Replacing Dashboard Polling (Phase 4)
  useRealtimeDashboard({
    onDashboardUpdate: (evt) => {
      if (evt && evt.overview) {
        setOverview(evt.overview);
        setLastUpdated(new Date().toLocaleTimeString());
      } else {
        loadDashboardData();
      }
    },
    onDeviceOnline: () => loadDashboardData(),
    onDeviceOffline: () => loadDashboardData(),
    onTelemetry: (evt) => {
      if (evt.snapshot && evt.deviceId) {
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id === evt.deviceId || d.uuid === evt.deviceId) {
              return {
                ...d,
                cpu: Math.round(evt.snapshot.cpuUsage * 10) / 10,
                ram: Math.round(evt.snapshot.memoryUsagePercent * 10) / 10,
                disk: Math.round(evt.snapshot.diskUsagePercent * 10) / 10,
                network: {
                  ...d.network,
                  uploadSpeed: evt.snapshot.networkUploadSpeed || 0,
                  downloadSpeed: evt.snapshot.networkDownloadSpeed || 0,
                  ipAddress: evt.snapshot.ipAddress || d.network.ipAddress,
                  activeConnections: evt.snapshot.activeConnections || d.network.activeConnections,
                },
                lastSeen: evt.snapshot.timestamp,
              };
            }
            return d;
          }),
        );
        setLastUpdated(new Date().toLocaleTimeString());
      }
    },
  });

  const getStatusBadge = (status: DeviceStatus | string) => {
    switch (status) {
      case 'ONLINE':
      case DeviceStatus.ONLINE:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Online</span>;
      case 'OFFLINE':
      case DeviceStatus.OFFLINE:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30"><XCircle className="w-3 h-3 mr-1" /> Offline</span>;
      case 'CRITICAL':
      case DeviceStatus.CRITICAL:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600/30 text-red-300 border border-red-500 animate-pulse"><ShieldAlert className="w-3 h-3 mr-1" /> Critical</span>;
      case 'DEGRADED':
      case 'WARNING':
      case DeviceStatus.DEGRADED:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">{String(status)}</span>;
    }
  };

  const getUsageBar = (percent: number, type: 'cpu' | 'ram' | 'disk') => {
    let color = 'bg-emerald-500';
    if (percent > 85) color = 'bg-rose-500';
    else if (percent > 70) color = 'bg-amber-500';

    return (
      <div className="w-full min-w-[100px] flex items-center gap-2">
        <div className="flex-1 bg-slate-700/60 rounded-full h-2 overflow-hidden">
          <div className={`${color} h-full rounded-full transition-all duration-300`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </div>
        <span className="text-xs font-mono text-slate-300 w-10 text-right">{percent.toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 sm:p-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-cyan-400 animate-pulse" />
            Operational Monitoring Layer
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time infrastructure telemetry, hardware health sensing, and operational diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <RealtimeStatusBadge />
          
          <span className="text-xs text-slate-500 hidden md:inline">Last update: {lastUpdated}</span>

          <button
            onClick={() => loadDashboardData()}
            disabled={loading}
            className="inline-flex items-center px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Devices */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Devices</span>
            <div className="p-2 bg-slate-800 rounded-lg text-cyan-400"><Server className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-white">{overview ? overview.totalDevices : '...'}</span>
            <span className="text-xs text-slate-500 font-medium">Enrolled Nodes</span>
          </div>
        </div>

        {/* Online */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-emerald-500/20 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Online</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-emerald-300">{overview ? overview.online : '...'}</span>
            <span className="text-xs text-emerald-500/80 font-medium">Active Pulse</span>
          </div>
        </div>

        {/* Offline */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-rose-500/20 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Offline</span>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400"><XCircle className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-rose-300">{overview ? overview.offline : '...'}</span>
            <span className="text-xs text-rose-500/80 font-medium">No Signal</span>
          </div>
        </div>

        {/* Critical */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-red-500/30 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Critical</span>
            <div className="p-2 bg-red-600/20 rounded-lg text-red-400"><ShieldAlert className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-red-300">{overview ? overview.critical : '...'}</span>
            <span className="text-xs text-red-400/80 font-medium">Action Needed</span>
          </div>
        </div>

        {/* Warning / Degraded */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-amber-500/20 backdrop-blur-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Warning</span>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><AlertTriangle className="w-5 h-5" /></div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-amber-300">{overview ? (overview.warning || overview.degraded) : '...'}</span>
            <span className="text-xs text-amber-400/80 font-medium">Degraded Nodes</span>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
        {/* Controls Bar */}
        <div className="p-5 border-b border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search hostnames, UUIDs, or OS..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ONLINE">Online</option>
                <option value="OFFLINE">Offline</option>
                <option value="CRITICAL">Critical</option>
                <option value="DEGRADED">Warning / Degraded</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>

            {/* OS Filter */}
            <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Monitor className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-400">OS:</span>
              <select
                value={osFilter}
                onChange={(e) => { setOsFilter(e.target.value); setPage(1); }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Operating Systems</option>
                <option value="Windows">Windows</option>
                <option value="Linux">Linux</option>
                <option value="Ubuntu">Ubuntu</option>
                <option value="macOS">macOS</option>
              </select>
            </div>
          </div>
        </div>

        {/* Device Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 px-6">Hostname / OS</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 w-44">CPU Load</th>
                <th className="py-4 px-6 w-44">RAM Usage</th>
                <th className="py-4 px-6 w-44">Disk Util</th>
                <th className="py-4 px-6">Network (Up / Down)</th>
                <th className="py-4 px-6">Last Seen (UTC)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {devices.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                    No monitored devices match your search or status criteria.
                  </td>
                </tr>
              ) : (
                devices.map((device) => (
                  <tr
                    key={device.id}
                    className="hover:bg-slate-800/40 transition duration-150 group"
                  >
                    <td className="py-4 px-6">
                      <Link href={`/device/${device.id}`} className="block focus:outline-none">
                        <span className="font-bold text-white group-hover:text-cyan-400 transition flex items-center gap-2">
                          {device.hostname}
                        </span>
                        <span className="text-xs text-slate-400 block mt-0.5 font-mono">
                          {device.os} {device.osVersion}
                        </span>
                      </Link>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap">
                      {getStatusBadge(device.status)}
                    </td>
                    <td className="py-4 px-6">
                      {getUsageBar(device.cpu || 0, 'cpu')}
                    </td>
                    <td className="py-4 px-6">
                      {getUsageBar(device.ram || 0, 'ram')}
                    </td>
                    <td className="py-4 px-6">
                      {getUsageBar(device.disk || 0, 'disk')}
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap font-mono text-xs">
                      <div className="flex flex-col text-slate-300">
                        <span>↑ {(device.network.uploadSpeed / 1024).toFixed(1)} KB/s</span>
                        <span className="text-slate-500">↓ {(device.network.downloadSpeed / 1024).toFixed(1)} KB/s</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 whitespace-nowrap text-xs text-slate-400 font-mono">
                      {device.lastSeen ? new Date(device.lastSeen).toUTCString().replace('GMT', 'UTC') : 'Never Onboarded'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
          <div>
            Showing <span className="text-slate-200 font-semibold">{totalRecords > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="text-slate-200 font-semibold">{Math.min(page * limit, totalRecords)}</span> of{' '}
            <span className="text-slate-200 font-semibold">{totalRecords}</span> devices
          </div>

          <div className="flex items-center gap-2">
            <span className="mr-2">Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>

            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-mono font-bold text-slate-200">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

import nextDynamic from 'next/dynamic';
const DynamicOperationalDashboardPage = nextDynamic(() => Promise.resolve(OperationalDashboardPageContent), { ssr: false });
export default function OperationalDashboardPage(props: any) {
  return <DynamicOperationalDashboardPage {...props} />;
}