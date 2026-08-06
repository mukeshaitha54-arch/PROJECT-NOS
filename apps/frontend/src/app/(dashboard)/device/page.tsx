'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { deviceApi } from '@/features/device/services/device.api';
import { DeviceStatusResponse, Device, Heartbeat, DeviceStatus } from '@nos/shared-types';
import { Server, Activity, Cpu, HardDrive, RefreshCw, Clock, ShieldCheck, AlertCircle, ArrowLeft, Terminal, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useRealtimeDashboard } from '@/features/realtime/hooks/useRealtimeDashboard';
import { RealtimeStatusBadge } from '@/features/realtime/components/RealtimeStatusBadge';

export default function DeviceRosterPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [data, setData] = useState<DeviceStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStatus = useCallback(async () => {
    try {
      setError(null);
      const status = await deviceApi.getStatus();
      setData(status);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve real-time monitoring agent status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Real-time communication replacing legacy polling interval (Phase 4)
  useRealtimeDashboard({
    onDeviceOnline: () => fetchStatus(),
    onDeviceOffline: () => fetchStatus(),
    onHeartbeat: () => fetchStatus(),
  });

  const formatUptime = (seconds: number) => {
    if (!seconds && seconds !== 0) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const formatLastSeen = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const diffMs = new Date().getTime() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return 'Just now (Active Heartbeat)';
    if (diffSec < 120) return '1 min ago';
    const diffMins = Math.floor(diffSec / 60);
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  };

  const renderStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case DeviceStatus.ONLINE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Online
          </span>
        );
      case DeviceStatus.DEGRADED:
      case DeviceStatus.CRITICAL:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            {status}
          </span>
        );
      case DeviceStatus.OFFLINE:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3 text-slate-500" />
            Offline
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">Agent Onboarding & Heartbeat</h1>
                <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-md">
                  Phase 2A Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Enterprise Monitoring Agent Registry & 30-Second Diagnostic Health Verification</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <RealtimeStatusBadge />

            <button
              onClick={() => fetchStatus()}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              href={isAuthenticated ? '/profile' : '/'}
              className="px-4 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isAuthenticated ? 'Identity Portal' : 'Home Portal'}</span>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Notice Banner reinforcing Phase 2A isolation scope */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-cyan-950/40 border border-blue-500/30 text-xs sm:text-sm text-slate-300 flex items-center gap-3.5">
          <Terminal className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <p>
            <span className="font-semibold text-white">Zero-Trust Agent Verification Domain:</span> Displays authenticated machine enrollment, hardware profile, UUIDs, and live 30s heartbeats. High-volume network packet telemetry collection and predictive AI chart analytics remain isolated until upcoming Phase 2B/3 activation.
          </p>
        </div>

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Registered</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                <Server className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {loading ? '---' : data?.summary.totalRegistered ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" /> Cryptographic tokens provisioned
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Agents Online</span>
              <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 border border-green-500/20">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-green-400">
              {loading ? '---' : data?.summary.totalOnline ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-green-400" /> Active within last 90 seconds
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Agents Offline</span>
              <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                <XCircle className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-slate-400">
              {loading ? '---' : data?.summary.totalOffline ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Missed heartbeat window
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Degraded / Critical</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-400">
              {loading ? '---' : data?.summary.totalDegraded ?? 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-400" /> Resource constraint or diagnostic warning
            </p>
          </div>
        </div>

        {/* Device Directory Roster & Heartbeat Table */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Registered Agents Roster</h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status updates via persistent 30s worker diagnostic heartbeats</p>
            </div>
            <div className="text-xs text-slate-500 font-mono flex items-center gap-2">
              <span>Last Sync: {lastRefreshed.toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                <tr>
                  <th className="py-3.5 px-6">Device Hostname & OS</th>
                  <th className="py-3.5 px-6">Hardware UUID</th>
                  <th className="py-3.5 px-6">Operational Status</th>
                  <th className="py-3.5 px-6">Last Seen</th>
                  <th className="py-3.5 px-6">Live Diagnostic Heartbeat (CPU / RAM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Activity className="w-6 h-6 text-cyan-500 animate-pulse" />
                        <span>Querying Zero-Trust device repository...</span>
                      </div>
                    </td>
                  </tr>
                ) : !data || data.devices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      <div className="max-w-md mx-auto space-y-2">
                        <Server className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="text-sm font-medium text-slate-300">No monitoring agents registered yet.</p>
                        <p className="text-xs text-slate-500">
                          Launch the .NET 8 Worker daemon (`NOS.Agent.exe`) to provision hardware credentials and begin 30-second heartbeat polling.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.devices.map((device) => {
                    const hb = device.lastHeartbeat;
                    return (
                      <tr key={device.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-6">
                          <Link href={`/device/${device.id}`} className="font-bold text-white hover:text-cyan-400 transition-colors flex items-center gap-1.5 text-sm underline-offset-4 hover:underline">
                            <span>{device.hostname}</span>
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">Inspect Telemetry</span>
                          </Link>
                          <div className="text-[11px] text-cyan-400 mt-0.5">
                            {device.deviceName} • {device.os} ({device.architecture})
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Agent v{device.agentVersion}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-400">
                          <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 max-w-[220px] truncate" title={device.uuid}>
                            {device.uuid}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {renderStatusBadge(device.status)}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-200">{formatLastSeen(device.lastSeen)}</div>
                          {device.lastSeen && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {new Date(device.lastSeen).toLocaleTimeString()}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          {hb ? (
                            <div className="space-y-2 max-w-xs">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-slate-300">
                                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>CPU: <strong className="text-white">{hb.cpuUsage.toFixed(1)}%</strong></span>
                                </span>
                                <span className="flex items-center gap-1 text-slate-300">
                                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                                  <span>RAM: <strong className="text-white">{hb.ramUsage.toFixed(1)}%</strong></span>
                                </span>
                              </div>

                              {/* Progress bar gauge for CPU/RAM */}
                              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                                <div
                                  className="bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(0, hb.cpuUsage))}%` }}
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
                                <span>IP: {hb.ipAddress}</span>
                                <Link href={`/device/${device.id}`} className="text-cyan-400 hover:underline">View 30s Telemetry →</Link>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-500 italic text-xs">No heartbeat recorded yet</span>
                              <Link href={`/device/${device.id}`} className="text-[11px] text-cyan-400 hover:underline">View node diagnostic profile →</Link>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
