'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { dashboardApi } from '@/features/dashboard/services/dashboard.api';
import { Device, Heartbeat, TelemetrySnapshot, DeviceStatus, DashboardDeviceDetailResponse } from '@nos/shared-types';
import {
  Server, Activity, Cpu, HardDrive, Network, RefreshCw, ArrowLeft, ShieldCheck,
  AlertCircle, CheckCircle2, XCircle, AlertTriangle, Terminal, Clock, Flame, Zap, Wifi, Layers, Calendar, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useRealtimeDevice } from '@/features/realtime/hooks/useRealtimeDevice';
import { RealtimeStatusBadge } from '@/features/realtime/components/RealtimeStatusBadge';
import { useRealtimeContext } from '@/realtime/providers/RealtimeProvider';
import { DeviceTimeline, TimelineEvent } from '@/features/device/components/DeviceTimeline';
import { DeviceClaimWizard } from '@/features/device/components/DeviceClaimWizard';

type TimeRangeMode = '1h' | '24h' | '7d' | 'custom' | 'all';

function DeviceOperationalDetailPageContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const deviceId = resolvedParams.id;

  const [detail, setDetail] = useState<DashboardDeviceDetailResponse | null>(null);
  const [history, setHistory] = useState<TelemetrySnapshot[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [isClaimWizardOpen, setIsClaimWizardOpen] = useState<boolean>(false);


  // Historical filtering & pagination states
  const [timeRangeMode, setTimeRangeMode] = useState<TimeRangeMode>('1h');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  const fetchDeviceProfile = useCallback(async () => {
    try {
      setError(null);
      const data = await dashboardApi.getDeviceDetail(deviceId);
      setDetail(data);
      setLastSynced(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve target operational monitoring profile.');
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      let from: string | undefined = undefined;
      let to: string | undefined = undefined;
      const now = new Date();

      if (timeRangeMode === '1h') {
        from = new Date(now.getTime() - 3600 * 1000).toISOString();
      } else if (timeRangeMode === '24h') {
        from = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
      } else if (timeRangeMode === '7d') {
        from = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
      } else if (timeRangeMode === 'custom') {
        if (customFrom) from = new Date(customFrom).toISOString();
        if (customTo) to = new Date(customTo).toISOString();
      }

      const res = await dashboardApi.getDeviceHistory(deviceId, { from, to, page, limit });
      setHistory(res.snapshots);
      setTotalPages(res.totalPages);
      setTotalRecords(res.total);
    } catch (err: any) {
      console.error('Failed to fetch historical snapshots:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [deviceId, timeRangeMode, customFrom, customTo, page, limit]);

  const fetchTimeline = useCallback(async () => {
    try {
      setTimelineLoading(true);
      const res = await dashboardApi.getDeviceTimeline(deviceId, 1, 20);
      setTimelineEvents(res.events || []);
    } catch (err: any) {
      console.error('Failed to fetch device timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchDeviceProfile();
    fetchHistory();
    fetchTimeline();
  }, [fetchDeviceProfile, fetchHistory, fetchTimeline]);


  // Dedicated real-time node telemetry & status monitoring (Phase 4)
  useRealtimeDevice(deviceId, {
    onTelemetry: (evt) => {
      if (evt.snapshot) {
        setDetail((prev) => prev ? ({ ...prev, latestSnapshot: evt.snapshot as any }) : null);
        if (page === 1) {
          setHistory((prev) => [evt.snapshot as any, ...prev].slice(0, 20));
        }
        setLastSynced(new Date());
      }
    },
    onHeartbeat: () => fetchDeviceProfile(),
    onStatusChange: (status) => {
      setDetail((prev) => prev ? ({ ...prev, device: { ...prev.device, status: status as any } }) : null);
      fetchDeviceProfile();
    },
    onInventory: () => fetchDeviceProfile(),
  });

  const { on } = useRealtimeContext();

  useEffect(() => {
    const handleTelemetry = (payload: any) => {
      if (payload?.deviceId === deviceId && payload?.snapshot) {
        setDetail((prev) => prev ? ({ ...prev, currentSnapshot: payload.snapshot as any }) : null);
        if (page === 1) {
          setHistory((prev) => [payload.snapshot as any, ...prev].slice(0, 20));
        }
        setLastSynced(new Date());
      }
    };

    const unsubTele = on('telemetry.received', handleTelemetry);
    const unsubTeleNew = on('telemetry:new', handleTelemetry);
    const unsubOnline = on('device.online', fetchDeviceProfile);
    const unsubOffline = on('device.offline', fetchDeviceProfile);

    return () => {
      unsubTele();
      unsubTeleNew();
      unsubOnline();
      unsubOffline();
    };
  }, [on, deviceId, page, fetchDeviceProfile]);

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatThroughput = (bytesPerSec?: number) => {
    return formatBytes(bytesPerSec || 0) + '/s';
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hrs}h ${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  const renderStatusBadge = (status?: DeviceStatus | string) => {
    switch (status) {
      case 'ONLINE':
      case DeviceStatus.ONLINE:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        );
      case 'DEGRADED':
      case 'CRITICAL':
      case DeviceStatus.DEGRADED:
      case DeviceStatus.CRITICAL:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case 'OFFLINE':
      case DeviceStatus.OFFLINE:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3.5 h-3.5 text-slate-500" />
            Offline
          </span>
        );
    }
  };

  const renderSystemHealthBadge = (status?: string) => {
    switch (status) {
      case 'HEALTHY':
        return <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">System Status: HEALTHY</span>;
      case 'WARNING':
        return <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">System Status: WARNING</span>;
      case 'CRITICAL':
        return <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-red-600/30 text-red-300 border border-red-500 animate-pulse">System Status: CRITICAL</span>;
      default:
        return <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-slate-800 text-slate-400">System Status: {status || 'UNKNOWN'}</span>;
    }
  };

  const device = detail?.device;
  const telemetry = detail?.currentSnapshot;
  const heartbeat = detail?.latestHeartbeat;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Navigation & Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 hover:text-white hover:border-slate-700 transition">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Operational Dashboard
            </Link>
            <Link href="/device" className="text-xs font-medium text-slate-400 hover:text-cyan-400 transition">
              View Roster Directory
            </Link>
            <Link
              href={`/device/${deviceId}/inventory`}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/20 ring-1 ring-white/20 transition transform hover:-translate-y-0.5"
            >
              <Layers className="w-4 h-4 mr-1.5" />
              Device Inventory & Assets (Phase 3)
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <RealtimeStatusBadge />
            <button
              onClick={() => { fetchDeviceProfile(); fetchHistory(); }}
              disabled={loading}
              className="inline-flex items-center px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Now
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Device Claiming Banner & Wizard */}
        {device?.claimStatus === 'UNASSIGNED' && (
          <div className="bg-blue-900/40 border border-blue-500/50 p-6 rounded-2xl shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Unassigned Device</h3>
                <p className="text-sm text-blue-200 mt-1">This device has securely connected but has not been assigned to a Department, Team, or Owner.</p>
              </div>
            </div>
            <button 
              onClick={() => setIsClaimWizardOpen(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
            >
              Claim Device
            </button>
          </div>
        )}

        <DeviceClaimWizard 
          open={isClaimWizardOpen} 
          onClose={() => setIsClaimWizardOpen(false)} 
          onComplete={() => {
            setIsClaimWizardOpen(false);
            fetchDeviceProfile();
          }}
          deviceHostname={device?.hostname || 'Unknown Node'}
        />

        {/* Device Profile Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center space-x-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
              <Server className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-white tracking-tight">
                  {loading ? 'Retrieving Diagnostics...' : device?.hostname || 'Unknown Node'}
                </h1>
                {renderStatusBadge(detail?.deviceStatus)}
                {renderSystemHealthBadge(detail?.systemStatus)}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                <span>UUID: <strong className="text-slate-300">{device?.uuid}</strong></span>
                <span>•</span>
                <span>OS: <strong className="text-cyan-400">{device?.os} ({device?.osVersion})</strong></span>
              </p>
            </div>
          </div>

          <div className="bg-slate-950/80 px-4 py-3 rounded-xl border border-slate-800 text-right font-mono text-xs w-full md:w-auto">
            <span className="text-slate-500 block">Agent Middleware Release</span>
            <span className="text-emerald-400 font-bold text-sm">v{device?.agentVersion || '2.0.0-phase2d'}</span>
            <span className="text-slate-500 block mt-1">Uptime: <strong className="text-white font-sans">{formatUptime(detail?.uptime)}</strong></span>
          </div>
        </div>

        {/* Hardware Status Cards (Pure Raw Data - ZERO CHARTS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* CPU Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" /> CPU Diagnostics
              </span>
              <span className="text-xs font-mono text-cyan-400 font-extrabold">{detail?.currentCpu?.toFixed(1) || '0.0'}%</span>
            </div>
            <div className="my-4 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, detail?.currentCpu || 0)}%` }} />
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex justify-between items-center">
              <span>Freq: <strong className="text-slate-200">{telemetry?.cpuFrequency || 0} MHz</strong></span>
              <span>Temp: <strong className="text-amber-400">{telemetry?.cpuTemperature || 0}°C</strong></span>
            </div>
          </div>

          {/* Memory Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" /> RAM Utilization
              </span>
              <span className="text-xs font-mono text-blue-400 font-extrabold">{detail?.currentRam?.toFixed(1) || '0.0'}%</span>
            </div>
            <div className="my-4 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, detail?.currentRam || 0)}%` }} />
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex justify-between items-center">
              <span>Used: <strong className="text-slate-200">{formatBytes(telemetry?.memoryUsed)}</strong></span>
              <span>Total: <strong className="text-slate-200">{formatBytes(telemetry?.memoryTotal)}</strong></span>
            </div>
          </div>

          {/* Disk Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-purple-400" /> Primary Storage
              </span>
              <span className="text-xs font-mono text-purple-400 font-extrabold">{detail?.currentDisk?.toFixed(1) || '0.0'}%</span>
            </div>
            <div className="my-4 bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, detail?.currentDisk || 0)}%` }} />
            </div>
            <div className="pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex justify-between items-center">
              <span>Free: <strong className="text-slate-200">{formatBytes(telemetry?.diskFree)}</strong></span>
              <span>Total: <strong className="text-slate-200">{formatBytes(telemetry?.diskTotal)}</strong></span>
            </div>
          </div>

          {/* Network Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Network className="w-4 h-4 text-emerald-400" /> Network Adapters
              </span>
              <span className="text-xs font-mono text-emerald-400 font-extrabold">{detail?.currentNetwork?.activeConnections || 0} Sockets</span>
            </div>
            <div className="my-3.5 space-y-1 font-mono text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Inbound (DL):</span>
                <span className="font-bold text-emerald-400">{formatThroughput(detail?.currentNetwork?.downloadSpeed)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Outbound (UL):</span>
                <span className="font-bold text-cyan-400">{formatThroughput(detail?.currentNetwork?.uploadSpeed)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-xs font-mono text-slate-400 flex justify-between items-center truncate">
              <span>IP: <strong className="text-slate-200">{detail?.currentNetwork?.ipAddress || '0.0.0.0'}</strong></span>
            </div>
          </div>
        </div>

        {/* Latest Heartbeat Profile & Kernel Specs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Terminal className="w-4 h-4 text-cyan-400" /> Phase 2A Latest Heartbeat Packet
            </h3>
            {heartbeat ? (
              <dl className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                  <dt className="text-slate-500">Heartbeat UUID:</dt>
                  <dd className="text-slate-200 font-bold truncate mt-1">{heartbeat.id}</dd>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                  <dt className="text-slate-500">Packet Timestamp (UTC):</dt>
                  <dd className="text-emerald-400 font-bold truncate mt-1">{new Date(heartbeat.timestamp).toISOString()}</dd>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                  <dt className="text-slate-500">Reported CPU / RAM:</dt>
                  <dd className="text-white font-bold mt-1">{heartbeat.cpuUsage.toFixed(1)}% / {heartbeat.ramUsage.toFixed(1)}%</dd>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                  <dt className="text-slate-500">Discovered Node IP:</dt>
                  <dd className="text-white font-bold mt-1">{heartbeat.ipAddress}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center italic">No individual Phase 2A heartbeat packet registered in current memory tier.</p>
            )}
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 text-blue-400" /> Kernel & OS Runtime Specs
            </h3>
            <dl className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                <dt className="text-slate-500">Running OS Threads:</dt>
                <dd className="text-cyan-400 font-bold mt-1">{telemetry?.runningProcesses || '---'} processes</dd>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                <dt className="text-slate-500">Logical / Physical CPU Cores:</dt>
                <dd className="text-white font-bold mt-1">{telemetry ? `${telemetry.logicalProcessors} / ${telemetry.physicalProcessors}` : 'N/A'}</dd>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                <dt className="text-slate-500">Primary Adapter MAC:</dt>
                <dd className="text-amber-400 font-bold mt-1 truncate">{telemetry?.macAddress || '00:00:00:00:00:00'}</dd>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/60">
                <dt className="text-slate-500">System Boot Timestamp:</dt>
                <dd className="text-slate-300 font-bold mt-1 truncate">{telemetry ? new Date(telemetry.bootTime).toUTCString() : 'N/A'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Permanent Operational Device Timeline */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl p-6 shadow-2xl">
          <DeviceTimeline
            events={timelineEvents}
            loading={timelineLoading}
            onRefresh={fetchTimeline}
          />
        </div>

        {/* Paginated Historical Time-Series Log with Date Range Selectors (NO CHARTS) */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl shadow-2xl overflow-hidden">

          {/* Controls Bar */}
          <div className="p-6 border-b border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Historical Telemetry Log (Phase 2D Time-Series Suite)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect high-accuracy raw telemetry snapshots with precise pagination and date filter bounds. (Zero charts per Phase 2D requirements)
              </p>
            </div>

            {/* Range Selector Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-1">Range:</span>
              {(['1h', '24h', '7d', 'all', 'custom'] as TimeRangeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setTimeRangeMode(mode); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase transition border ${
                    timeRangeMode === mode
                      ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-500/10'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {mode === 'all' ? 'All Time' : mode === 'custom' ? 'Custom Range' : `Last ${mode}`}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs */}
          {timeRangeMode === 'custom' && (
            <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">From (UTC):</span>
                <input
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">To (UTC):</span>
                <input
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                  className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                onClick={() => { setPage(1); fetchHistory(); }}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition"
              >
                Apply Bounds
              </button>
            </div>
          )}

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead className="bg-slate-950/90 text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6">Snapshot UUID / UTC Time</th>
                  <th className="py-4 px-6">CPU Load</th>
                  <th className="py-4 px-6">Memory Util</th>
                  <th className="py-4 px-6">Disk Util</th>
                  <th className="py-4 px-6">Throughput Rate (In / Out)</th>
                  <th className="py-4 px-6">Active Sockets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {historyLoading && history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic font-sans">
                      Loading historical snapshots from CQRS repository...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 italic font-sans">
                      No historical telemetry recorded within selected temporal bounds ({timeRangeMode}).
                    </td>
                  </tr>
                ) : (
                  history.map((snap) => (
                    <tr key={snap.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-white text-xs">{new Date(snap.timestamp).toISOString()}</div>
                        <div className="text-[10px] text-slate-500 truncate w-48" title={snap.id}>{snap.id}</div>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-cyan-400">
                        {snap.cpuUsage.toFixed(1)}% <span className="text-[10px] text-slate-500 font-normal">({snap.cpuTemperature?.toFixed(1) || 0}°C)</span>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-blue-400">
                        {snap.memoryUsagePercent.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-6 font-bold text-purple-400">
                        {snap.diskUsagePercent.toFixed(1)}%
                      </td>
                      <td className="py-3.5 px-6 text-emerald-400 font-semibold">
                        ↓ {formatThroughput(snap.networkDownloadSpeed)} / ↑ {formatThroughput(snap.networkUploadSpeed)}
                      </td>
                      <td className="py-3.5 px-6 font-bold text-white">
                        {snap.activeConnections || 0}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Historical Pagination Footer */}
          <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans font-medium text-slate-400">
            <div>
              Showing <span className="text-slate-200 font-bold">{totalRecords > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
              <span className="text-slate-200 font-bold">{Math.min(page * limit, totalRecords)}</span> of{' '}
              <span className="text-slate-200 font-bold">{totalRecords}</span> captured snapshots
            </div>

            <div className="flex items-center gap-2 font-mono">
              <span className="font-sans mr-1">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || historyLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-200 ml-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-bold text-slate-200">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || historyLoading}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import nextDynamic from 'next/dynamic';
const DynamicDeviceOperationalDetailPage = nextDynamic(() => Promise.resolve(DeviceOperationalDetailPageContent), { ssr: false });
export default function DeviceOperationalDetailPage(props: any) {
  return <DynamicDeviceOperationalDetailPage {...props} />;
}