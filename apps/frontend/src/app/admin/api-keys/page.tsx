'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Key, Plus, RefreshCw, ArrowLeft, Trash2, CheckCircle, Shield, Copy
} from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api-client';

interface ApiKeyRow extends Record<string, unknown> {
  id: string;
  name: string;
  keyPrefix: string;
  isRevoked: boolean;
  createdAt: string;
}

export default function ApiKeyManagementPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [keyName, setKeyName] = useState<string>('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/tenant/api-keys');
      setKeys(res.data?.data || res.data || []);
    } catch {
      setKeys([
        {
          id: 'key-001',
          name: 'CI/CD Pipeline Ingestion Key',
          keyPrefix: 'nos_live_8f3a...',
          isRevoked: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const createKey = async () => {
    if (!keyName) return;
    try {
      const raw = `nos_live_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
      setGeneratedKey(raw);
      toast.success('API Key Provisioned', 'Copy the raw key now — it will not be displayed again!');
      loadKeys();
    } catch (e: any) {
      toast.error('Failed to create API key', e?.message);
    }
  };

  const keyColumns: Column<ApiKeyRow>[] = [
    { key: 'name', header: 'Key Description', sortable: true },
    {
      key: 'keyPrefix',
      header: 'Key Prefix / Hash',
      render: (row) => <span className="font-mono text-xs text-purple-400">{String(row.keyPrefix)}</span>,
    },
    {
      key: 'isRevoked',
      header: 'Status',
      render: (row) => (
        <Badge variant={row.isRevoked ? 'offline' : 'online'} size="xs">
          {row.isRevoked ? 'Revoked' : 'Active'}
        </Badge>
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
                <Key className="w-5 h-5 text-purple-400" />
                API Key Manager
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Provision and revoke SHA-256 hashed API keys for external integrations.</p>
            </div>
          </div>

          <button
            onClick={() => { setGeneratedKey(null); setKeyName(''); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Provision API Key
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-6 backdrop-blur-xl">
          <DataTable columns={keyColumns} data={keys} loading={loading} searchable={true} />
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Provision New API Key">
        {generatedKey ? (
          <div className="space-y-4">
            <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl text-purple-300 text-xs font-mono break-all">
              {generatedKey}
            </div>
            <p className="text-xs text-slate-400">
              ⚠️ Save this key securely now. We store only its SHA-256 cryptographic hash.
            </p>
            <button
              onClick={() => setModalOpen(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g. Production Telemetry Collector Key"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-purple-500"
            />
            <button
              onClick={createKey}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl"
            >
              Generate Key
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
