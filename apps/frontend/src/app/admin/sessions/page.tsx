'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, RefreshCw, ArrowLeft, Trash2, Shield, Laptop, Monitor
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';

interface SessionRow extends Record<string, unknown> {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
  lastActiveAt: string;
}

export default function ActiveSessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/tenant/sessions');
      setSessions(res.data?.data || res.data || []);
    } catch (err: any) {
      toast.error('Failed to load sessions', err.response?.data?.message || err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const revokeSession = async (id: string) => {
    try {
      await apiClient.delete(`/tenant/sessions/${id}`);
      toast.success('Session Revoked', `Active JWT session [${id}] has been terminated.`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast.error('Failed to revoke session', err.response?.data?.message || err.message);
    }
  };

  const sessionColumns: Column<SessionRow>[] = [
    {
      key: 'ipAddress',
      header: 'IP Address',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-emerald-400">{String(row.ipAddress)}</span>,
    },
    { key: 'userAgent', header: 'Client Agent / Browser', sortable: true },
    {
      key: 'isActive',
      header: 'Session State',
      render: (row) => (
        <Badge variant={row.isActive ? 'online' : 'offline'} size="xs">
          {row.isActive ? 'Active' : 'Expired'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Revoke',
      render: (row) => (
        <button
          onClick={() => revokeSession(String(row.id))}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-950/40 border border-red-500/30 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Admin
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400" />
                Active Sessions Manager
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Monitor and instantly terminate active JWT refresh sessions across all nodes.</p>
            </div>
          </div>

          <button
            onClick={loadSessions}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl">
          <DataTable columns={sessionColumns} data={sessions} loading={loading} searchable={true} />
        </div>
      </div>
    </div>
  );
}
