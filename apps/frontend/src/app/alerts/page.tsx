'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { alertApi, AlertQueryParams } from '../../features/alerts/services/alert-api.service';
import { AlertStatisticsDto, AlertSeverity, AlertStatus, AlertAgingBuckets } from '@nos/shared-types';
import { useRealtimeAlerts } from '../../features/realtime/hooks/useRealtimeAlerts';
import { RealtimeStatusBadge } from '../../features/realtime/components/RealtimeStatusBadge';
import {
  ShieldAlert, AlertTriangle, CheckCircle, Clock, Filter, Search,
  RefreshCw, Play, RotateCcw, ChevronRight, Server, Flame, Activity, CheckSquare, Square, Bell, Lock
} from 'lucide-react';

export default function EnterpriseAlertsCommandCenterPage() {
  const [activeTab, setActiveTab] = useState<'INCIDENTS' | 'SIMULATOR' | 'DLQ'>('INCIDENTS');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<AlertStatisticsDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<string>('ALL_ACTIVE');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(15);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState<boolean>(false);

  // Rule Simulator state
  const [simMetric, setSimMetric] = useState<string>('cpuUsage');
  const [simOperator, setSimOperator] = useState<string>('>');
  const [simThreshold, setSimThreshold] = useState<number>(90);
  const [simReport, setSimReport] = useState<any>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // DLQ state
  const [dlqLogs, setDlqLogs] = useState<any[]>([]);
  const [dlqLoading, setDlqLoading] = useState<boolean>(false);

  // Real-time socket integration (instant live toast updates without polling)
  useRealtimeAlerts({
    onAlertCreated: (payload) => {
      loadIncidentsAndStats();
    },
    onAlertUpdated: (payload) => {
      loadIncidentsAndStats();
    },
    onAlertAcknowledged: (payload) => {
      loadIncidentsAndStats();
    },
    onAlertResolved: (payload) => {
      loadIncidentsAndStats();
    },
    onAlertEscalated: (payload) => {
      loadIncidentsAndStats();
    },
  });

  const loadIncidentsAndStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query: AlertQueryParams = { page, limit, search, status: statusFilter, severity: severityFilter, category: categoryFilter };
      
      if (quickFilter === 'UNACKNOWLEDGED') query.status = 'NEW';
      if (quickFilter === 'CRITICALS') query.severity = 'CRITICAL';

      const [alertsRes, statsRes] = await Promise.all([
        alertApi.getAlerts(query),
        alertApi.getStatistics(),
      ]);

      setAlerts(alertsRes.alerts || []);
      setTotalPages(alertsRes.totalPages || 1);
      setTotalRecords(alertsRes.total || 0);
      setStatistics(statsRes);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve operational incident telemetry from control plane.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, severityFilter, categoryFilter, quickFilter]);

  const loadDlqLogs = useCallback(async () => {
    try {
      setDlqLoading(true);
      const res = await alertApi.getDlqLogs();
      setDlqLogs(res.logs || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch DLQ logs.');
    } finally {
      setDlqLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'INCIDENTS') loadIncidentsAndStats();
    else if (activeTab === 'DLQ') loadDlqLogs();
  }, [activeTab, loadIncidentsAndStats, loadDlqLogs]);

  const toggleSelectAll = () => {
    if (selectedIds.length === alerts.length) setSelectedIds([]);
    else setSelectedIds(alerts.map((a) => a.id));
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((item) => item !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const executeBulkAction = async (action: 'ACKNOWLEDGE' | 'RESOLVE' | 'SUPPRESS' | 'DELETE') => {
    if (selectedIds.length === 0) return;
    try {
      setBulkProcessing(true);
      await alertApi.bulkOperation(selectedIds, action);
      setSelectedIds([]);
      await loadIncidentsAndStats();
    } catch (err: any) {
      alert(`Bulk action failed: ${err.message}`);
    } finally {
      setBulkProcessing(false);
    }
  };

  const runSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSimLoading(true);
      const res = await alertApi.simulateRule(simMetric, simOperator, simThreshold, 24);
      setSimReport(res);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimLoading(false);
    }
  };

  const handleRetryDlq = async (id: string) => {
    try {
      await alertApi.retryDlq(id);
      await loadDlqLogs();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-600 shadow-sm shadow-rose-900/50 animate-pulse"><Flame className="w-3 h-3 mr-1 text-rose-400" /> CRITICAL</span>;
      case 'HIGH':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-600"><AlertTriangle className="w-3 h-3 mr-1 text-amber-400" /> HIGH</span>;
      case 'MEDIUM':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-yellow-950/80 text-yellow-300 border border-yellow-600/60"><Activity className="w-3 h-3 mr-1 text-yellow-400" /> MEDIUM</span>;
      case 'LOW':
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-600/60">LOW</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">INFO</span>;
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'NEW':
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-sky-900/70 text-sky-200 border border-sky-600/60">OPEN</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-900/70 text-emerald-200 border border-emerald-600/60">ACKNOWLEDGED</span>;
      case 'SNOOZED':
      case 'SUPPRESSED':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700">SNOOZED</span>;
      case 'RESOLVED':
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">RESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300">{st}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6 md:p-8 space-y-8 font-sans selection:bg-rose-500/30">
      {/* Top Header & Live Socket Connection Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 shadow-lg shadow-rose-950/50">
              <ShieldAlert className="w-7 h-7 text-rose-500" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-rose-300 bg-clip-text text-transparent">
                Enterprise Operations Command Center
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-1 flex items-center gap-2">
                Phase 5 Alert & Notification Engine • O(1) SHA256 Fingerprint Deduplication • Multi-Channel DLQ & Automated SLA Escalations
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
          <RealtimeStatusBadge />
          <div className="hidden sm:block text-right">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Real-Time Sync</span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">{lastUpdated || 'Connecting...'}</span>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'INCIDENTS') loadIncidentsAndStats();
              else if (activeTab === 'DLQ') loadDlqLogs();
            }}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            title="Refresh Operations Center"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('INCIDENTS')}
          className={`px-5 py-2.5 rounded-t-xl font-semibold text-sm transition-all flex items-center space-x-2 border-t border-x ${
            activeTab === 'INCIDENTS'
              ? 'bg-slate-800/90 text-rose-400 border-slate-700 shadow-sm shadow-slate-900'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Incident Operations Fleet</span>
        </button>
        <button
          onClick={() => setActiveTab('SIMULATOR')}
          className={`px-5 py-2.5 rounded-t-xl font-semibold text-sm transition-all flex items-center space-x-2 border-t border-x ${
            activeTab === 'SIMULATOR'
              ? 'bg-slate-800/90 text-amber-400 border-slate-700 shadow-sm shadow-slate-900'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Rule Simulator & 24h Sandbox</span>
        </button>
        <button
          onClick={() => setActiveTab('DLQ')}
          className={`px-5 py-2.5 rounded-t-xl font-semibold text-sm transition-all flex items-center space-x-2 border-t border-x ${
            activeTab === 'DLQ'
              ? 'bg-slate-800/90 text-indigo-400 border-slate-700 shadow-sm shadow-slate-900'
              : 'bg-slate-900/40 text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Dead Letter Queue & Notification Logs</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/50 border-l-4 border-rose-600 rounded-lg flex items-center space-x-3 text-rose-200 text-sm animate-fadeIn">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: INCIDENT OPERATIONS FLEET */}
      {activeTab === 'INCIDENTS' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Typography Metrics Badges (Zero-Chart Policy) */}
          {statistics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Active Incidents</span>
                  <Activity className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="mt-2 text-3xl font-extrabold text-white tracking-tight">{statistics.byStatus?.NEW || 0 + (statistics.byStatus?.OPEN || 0)}</p>
                <div className="mt-3 flex items-center text-xs text-slate-400 font-medium">
                  <span>Open & Unassigned SLA Candidates</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-rose-950/40 border border-rose-800/50 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-rose-700 transition-all">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-rose-300 uppercase">Critical Priority</span>
                  <Flame className="w-5 h-5 text-rose-400 animate-pulse group-hover:scale-110 transition-transform" />
                </div>
                <p className="mt-2 text-3xl font-extrabold text-rose-300 tracking-tight">{statistics.bySeverity?.CRITICAL || 0}</p>
                <div className="mt-3 flex items-center text-xs text-rose-400/80 font-medium">
                  <span>Immediate Level 2 Admin Intervention</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-800/40 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-amber-700 transition-all">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-amber-300 uppercase">Warning / High</span>
                  <AlertTriangle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="mt-2 text-3xl font-extrabold text-amber-300 tracking-tight">{(statistics.bySeverity?.HIGH || 0) + (statistics.bySeverity?.MEDIUM || 0)}</p>
                <div className="mt-3 flex items-center text-xs text-amber-400/80 font-medium">
                  <span>Assigned L1 Operators Queue</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Acknowledged</span>
                  <CheckCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="mt-2 text-3xl font-extrabold text-white tracking-tight">{statistics.byStatus?.ACKNOWLEDGED || 0}</p>
                <div className="mt-3 flex items-center text-xs text-slate-400 font-medium">
                  <span>Active Operator Triage In Progress</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-indigo-700 transition-all">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-wider text-indigo-300 uppercase">Snoozed & Suppressed</span>
                  <Clock className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                </div>
                <p className="mt-2 text-3xl font-extrabold text-indigo-300 tracking-tight">{statistics.byStatus?.SNOOZED || 0 + (statistics.byStatus?.SUPPRESSED || 0)}</p>
                <div className="mt-3 flex items-center text-xs text-indigo-400/80 font-medium">
                  <span>Maintenance Window & Business Hours</span>
                </div>
              </div>
            </div>
          )}

          {/* Live Aging Buckets Breakdown (Structured Typography - Zero-Chart Policy) */}
          {statistics && statistics.agingBuckets && (
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>Live Incident Aging Breakdown & SLA Matrix (Zero-Chart Analytics)</span>
                  </h2>
                  <p className="text-xs text-slate-400">Real-time unaddressed duration buckets across enterprise operations fleet.</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
                  Automated Escalation Worker: Active (10m / 20m / 40m SLAs)
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">0 – 5 min</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-2xl font-black text-emerald-400 font-mono">{statistics.agingBuckets.bucket0to5m}</span>
                    <span className="text-[10px] text-slate-500 font-medium">Within SLA</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">5 – 15 min</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-2xl font-black text-yellow-400 font-mono">{statistics.agingBuckets.bucket5to15m}</span>
                    <span className="text-[10px] text-yellow-500 font-semibold">&gt;10m: Assign L1</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">15 – 60 min</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-2xl font-black text-amber-400 font-mono">{statistics.agingBuckets.bucket15to60m}</span>
                    <span className="text-[10px] text-amber-500 font-semibold">&gt;20m: Admin Pool</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">1 – 4 hours</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-2xl font-black text-rose-400 font-mono">{statistics.agingBuckets.bucket1to4h}</span>
                    <span className="text-[10px] text-rose-500 font-semibold">&gt;40m: CRITICAL</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">4 – 24 hours</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-2xl font-black text-rose-500 font-mono">{statistics.agingBuckets.bucket4to24h}</span>
                    <span className="text-[10px] text-rose-600 font-bold">SLA Violation</span>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">24+ hours</span>
                  <div className="flex items-baseline justify-between mt-1.5">
                    <span className="text-2xl font-black text-slate-400 font-mono">{statistics.agingBuckets.bucket24hPlus}</span>
                    <span className="text-[10px] text-slate-500 font-medium">Stale / Snoozed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Bulk Operations Center */}
          <div className="space-y-4">
            <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg">
              {/* Quick Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-rose-400" /> Saved Filters:
                </span>
                {[
                  { id: 'ALL_ACTIVE', label: 'All Active Fleet' },
                  { id: 'CRITICALS', label: 'SLA Criticals' },
                  { id: 'UNACKNOWLEDGED', label: 'Unacknowledged (Needs Action)' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setQuickFilter(pill.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      quickFilter === pill.id
                        ? 'bg-rose-600/90 text-white shadow-md shadow-rose-950'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 hover:text-white border border-slate-700/60'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Search and Dropdown Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className="relative flex-1 xl:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search INC-, Hostname, or rule..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  />
                </div>

                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW">NEW</option>
                  <option value="OPEN">OPEN</option>
                  <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
                  <option value="SNOOZED">SNOOZED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>
            </div>

            {/* Interactive Bulk Action Strip */}
            {selectedIds.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border-2 border-rose-600 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center space-x-3">
                  <CheckSquare className="w-6 h-6 text-rose-400 animate-bounce" />
                  <div>
                    <span className="text-sm font-extrabold text-white">
                      {selectedIds.length} Incident{selectedIds.length > 1 ? 's' : ''} Selected for Bulk Operation
                    </span>
                    <p className="text-xs text-rose-300">Operations executed here are recorded directly to the compliance audit log.</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => executeBulkAction('ACKNOWLEDGE')}
                    disabled={bulkProcessing}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all"
                  >
                    Acknowledge Selected
                  </button>
                  <button
                    onClick={() => executeBulkAction('RESOLVE')}
                    disabled={bulkProcessing}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg transition-all"
                  >
                    Resolve Selected
                  </button>
                  <button
                    onClick={() => executeBulkAction('SUPPRESS')}
                    disabled={bulkProcessing}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg transition-all"
                  >
                    Suppress / Maintenance
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Enterprise Incidents Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-4 px-4 text-center w-12">
                      <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                        {selectedIds.length === alerts.length && alerts.length > 0 ? <CheckSquare className="w-4 h-4 text-rose-400" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="py-4 px-4">Incident ID</th>
                    <th className="py-4 px-4">Severity</th>
                    <th className="py-4 px-4">Anomalous Event Title & Metric</th>
                    <th className="py-4 px-4">Target Node</th>
                    <th className="py-4 px-4">O(1) SHA256 Hash & Dedup</th>
                    <th className="py-4 px-4">Risk Score</th>
                    <th className="py-4 px-4">SLA Status & Pool</th>
                    <th className="py-4 px-4 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {loading && alerts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-500 mb-3" />
                        Querying Enterprise Incident Operations Engine...
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-slate-500 font-semibold">
                        No operational alert incidents match your filter criteria. Fleet is operating optimally.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((a) => (
                      <tr key={a.id} className={`hover:bg-slate-800/50 transition-colors group ${selectedIds.includes(a.id) ? 'bg-rose-950/20' : ''}`}>
                        <td className="py-3 px-4 text-center">
                          <button onClick={() => toggleSelectRow(a.id)}>
                            {selectedIds.includes(a.id) ? <CheckSquare className="w-4 h-4 text-rose-400" /> : <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono font-extrabold text-white">
                          <Link href={`/alerts/${a.id}`} className="hover:text-rose-400 transition-colors inline-flex items-center gap-1 group/link">
                            <span>{a.incidentNumber || 'INC-100000'}</span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover/link:text-rose-400 group-hover/link:translate-x-0.5 transition-all" />
                          </Link>
                          {a.parentAlertId && (
                            <span className="block text-[9px] text-indigo-400 font-sans font-medium mt-0.5">
                              ↳ Child Incident
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">{getSeverityBadge(a.severity)}</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-100 block text-sm">{a.title}</span>
                          <span className="text-slate-400 text-[11px] font-mono mt-0.5 block line-clamp-1">{a.description}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300 font-semibold">
                          <Link href={`/device/${a.deviceId}`} className="hover:underline flex items-center gap-1">
                            <Server className="w-3 h-3 text-slate-500" />
                            <span>{a.deviceId}</span>
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-400" title={`SHA256: ${a.fingerprint || 'N/A'}`}>
                              {a.fingerprint ? `fp: ${a.fingerprint.slice(0, 8)}...` : 'no-fp'}
                            </span>
                            {a.occurrenceCount && a.occurrenceCount > 1 && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 font-bold font-mono text-[11px] animate-pulse">
                                x{a.occurrenceCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full ${
                                  a.riskScore >= 80 ? 'bg-rose-500' : a.riskScore >= 50 ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, a.riskScore || 20)}%` }}
                              ></div>
                            </div>
                            <span className="font-mono font-bold text-xs">{a.riskScore || 25}/100</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {getStatusBadge(a.status)}
                            <span className="block text-[10px] text-slate-400 font-medium">
                              Pool: <span className="font-mono text-slate-300">{a.assignedUserId || 'Standby Operators'}</span>
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <Link
                            href={`/alerts/${a.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all shadow"
                          >
                            Triage & SLA
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RULE SIMULATOR & 24H SANDBOX */}
      {activeTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
          {/* Simulator Configuration Panel */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
            <div>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-400" />
                <span>Enterprise Rule Simulator</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Test custom threshold logic against the last 24 hours of historical operational telemetry before activating in production.
              </p>
            </div>

            <form onSubmit={runSimulator} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Target Telemetry Metric</label>
                <select
                  value={simMetric}
                  onChange={(e) => setSimMetric(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="cpuUsage">CPU Utilization Percentage</option>
                  <option value="memoryUsage">RAM Memory Utilization</option>
                  <option value="diskUsage">Disk Volume Capacity</option>
                  <option value="heartbeat">Device Heartbeat Latency (ms)</option>
                  <option value="networkDrop">Network Packet Drop Ratio</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Comparison Operator</label>
                <select
                  value={simOperator}
                  onChange={(e) => setSimOperator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value=">">GREATER THAN (&gt;)</option>
                  <option value="<">LESS THAN (&lt;)</option>
                  <option value="==">EQUALS (==)</option>
                  <option value="!=">NOT EQUALS (!=)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Threshold Trigger Value</label>
                <input
                  type="number"
                  value={simThreshold}
                  onChange={(e) => setSimThreshold(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={simLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-xl hover:shadow-amber-900/30 transition-all flex items-center justify-center space-x-2"
                >
                  {simLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                  <span>Execute 24h Telemetry Simulation</span>
                </button>
              </div>
            </form>
          </div>

          {/* Simulation Output Report */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-white">Simulation Analysis & Cooldown Impact Report</h3>
              <p className="text-xs text-slate-400 mt-0.5">Estimated production blast radius calculated over 14,400+ historical telemetry points.</p>
            </div>

            {simReport ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Would Trigger</span>
                    <span className="text-3xl font-extrabold font-mono text-amber-400 mt-2 block">{simReport.wouldTriggerCount}</span>
                    <span className="text-[11px] text-slate-500 mt-1 block">Gross anomaly events detected</span>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Suppressed by Dedup</span>
                    <span className="text-3xl font-extrabold font-mono text-emerald-400 mt-2 block">{simReport.suppressedCount}</span>
                    <span className="text-[11px] text-emerald-500/80 mt-1 block">Saved via O(1) fingerprinting</span>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Net Real Alerts</span>
                    <span className="text-3xl font-extrabold font-mono text-rose-400 mt-2 block">{simReport.realAlertsCount}</span>
                    <span className="text-[11px] text-rose-400/80 mt-1 block">Effective production volume</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Affected Node Infrastructure ({simReport.affectedDevices?.length || 0})</h4>
                  <div className="flex flex-wrap gap-2">
                    {simReport.affectedDevices?.map((dev: any) => (
                      <span key={dev.deviceId || dev} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-sky-300">
                        {dev.hostname || dev.deviceId || dev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all">
                    Deploy as Production Alert Rule
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-500">
                <Play className="w-12 h-12 mx-auto mb-3 text-slate-700 opacity-60" />
                <p className="font-semibold text-sm">Configure threshold metrics on the left and click execute to view simulated production impacts.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DEAD LETTER QUEUE (DLQ) & DISPATCH LOGS */}
      {activeTab === 'DLQ' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-400" />
                  <span>Dead Letter Queue (DLQ) & Notification Delivery Receipts</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Inspect multi-channel email, Slack, and Discord dispatch logs and manually re-attempt failed deliveries.</p>
              </div>
              <button
                onClick={loadDlqLogs}
                disabled={dlqLoading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dlqLoading ? 'animate-spin' : ''}`} />
                <span>Refresh DLQ</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/80">
                    <th className="py-3 px-4">Receipt ID</th>
                    <th className="py-3 px-4">Target Provider</th>
                    <th className="py-3 px-4">Recipient Channel / Email</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4">Retry Count</th>
                    <th className="py-3 px-4">Last Error Response</th>
                    <th className="py-3 px-4 text-right">DLQ Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs">
                  {dlqLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 font-semibold">
                        Dead Letter Queue is clean! All enterprise multi-channel notifications delivered successfully with 0 failures.
                      </td>
                    </tr>
                  ) : (
                    dlqLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white">{log.id}</td>
                        <td className="py-3 px-4 font-extrabold text-sky-400 uppercase">{log.provider}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">{log.recipient}</td>
                        <td className="py-3 px-4">
                          {log.status === 'SUCCESS' ? (
                            <span className="text-emerald-400 font-bold">DELIVERED</span>
                          ) : (
                            <span className="text-rose-400 font-bold bg-rose-950/50 px-2 py-1 rounded">FAILED (DLQ)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{log.retryCount}/3</td>
                        <td className="py-3 px-4 text-rose-300 font-mono text-xs">{log.errorMessage || 'Connection timed out'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleRetryDlq(log.id)}
                            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow"
                          >
                            Re-attempt Delivery
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
