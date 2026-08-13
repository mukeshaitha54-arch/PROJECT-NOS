'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Copy, Download, RefreshCw, XCircle, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fleetApi } from '@/fleet/services/fleet.api';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { GenerateKeyModal } from './components/GenerateKeyModal';

export default function RegistrationKeysPage() {
  const { user } = useAuthStore();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const loadKeys = useCallback(async () => {
    if (!user?.organizationId) return;
    try {
      setLoading(true);
      const data = await fleetApi.getRegistrationKeys(user.organizationId);
      setKeys(data);
    } catch (err) {
      console.error('Failed to load registration keys', err);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const handleGenerate = () => {
    setIsModalOpen(true);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this registration key? It cannot be undone.')) return;
    try {
      await fleetApi.revokeRegistrationKey(id, 'Admin manually revoked');
      loadKeys();
    } catch (err) {
      console.error('Failed to revoke key', err);
    }
  };

  const filteredKeys = keys.filter(k => 
    k.keyPrefix?.toLowerCase().includes(search.toLowerCase()) || 
    k.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-blue-500" /> Registration Keys
          </h1>
          <p className="text-sm text-gray-400 mt-1">Manage agent enrollment tokens and their usage analytics.</p>
        </div>
        <Button onClick={handleGenerate} disabled={!user?.organizationId} className="bg-blue-600 hover:bg-blue-500">
          <Plus className="w-4 h-4 mr-2" /> Generate New Key
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-950/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search keys..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-gray-200 focus:border-blue-500 outline-none"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto border-gray-700 text-gray-300">
            <Filter className="w-4 h-4 mr-2" /> Filters
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-800/50 text-gray-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Name / Prefix</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Usage (Analytics)</th>
                <th className="px-6 py-4">Created By</th>
                <th className="px-6 py-4">Expires</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading registration keys...</td>
                </tr>
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No registration keys found.</td>
                </tr>
              ) : filteredKeys.map(k => (
                <tr key={k.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{k.displayName || 'Registration Key'}</div>
                    <div className="font-mono text-xs text-blue-400 mt-1">{k.keyPrefix}********</div>
                  </td>
                  <td className="px-6 py-4">
                    {k.status === 'ACTIVE' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">Active</span>
                    ) : k.status === 'REVOKED' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">Revoked</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">{k.status}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden w-24">
                        <div 
                          className={`h-full rounded-full ${k.currentUses >= k.maxUses ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, (k.currentUses / k.maxUses) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono">{k.currentUses}/{k.maxUses}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{k.createdByUser?.firstName} {k.createdByUser?.lastName}</td>
                  <td className="px-6 py-4">{new Date(k.expiresAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = 'http://localhost:4000/api/v1/device/download';
                          link.setAttribute('download', 'NOS_Agent_Installer.exe');
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition" 
                        title="Download Installer"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {k.status === 'ACTIVE' && (
                        <button 
                          onClick={() => handleRevoke(k.id)} 
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition" 
                          title="Revoke Key"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <GenerateKeyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        organizationId={user?.organizationId || ''} 
        onSuccess={loadKeys} 
      />
    </div>
  );
}
