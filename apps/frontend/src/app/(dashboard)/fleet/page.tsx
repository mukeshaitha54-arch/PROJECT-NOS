'use client';

import React from 'react';
import { Building2, Building, Users, Server, AlertTriangle, XCircle, CheckCircle, ChevronDown, Monitor } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fleetApi } from '@/features/fleet/services/fleet.api';
import { useAuthStore } from '@/features/auth/stores/auth.store';

const HealthPills = ({ healthy, warning, offline }: { healthy: number, warning: number, offline: number }) => (
  <div className="flex items-center space-x-3">
    <div className="flex items-center space-x-1">
      <CheckCircle className="h-4 w-4 text-green-500" />
      <span className="text-sm font-medium text-gray-300">{healthy}</span>
    </div>
    <div className="flex items-center space-x-1">
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
      <span className="text-sm font-medium text-gray-300">{warning}</span>
    </div>
    <div className="flex items-center space-x-1">
      <XCircle className="h-4 w-4 text-red-500" />
      <span className="text-sm font-medium text-gray-300">{offline}</span>
    </div>
  </div>
);

const getIconForType = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'organization': return Building2;
    case 'branch': return Building;
    case 'department': return Users;
    case 'team': return Server;
    default: return Building;
  }
};

const TreeNode = ({ node, level = 0 }: { node: any, level?: number }) => {
  const Icon = getIconForType(node.type);
  const paddingLeft = level * 32 + 'px';

  return (
    <div className="w-full">
      <div 
        className="flex items-center justify-between py-4 px-4 hover:bg-gray-800/50 border-b border-gray-800/50 transition-colors"
        style={{ paddingLeft: `calc(1rem + ${paddingLeft})` }}
      >
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 text-gray-500" />
          <span className="font-semibold text-gray-200">{node.name}</span>
          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full uppercase tracking-wider">{node.type}</span>
        </div>
        
        <div className="flex items-center space-x-8">
          <div className="text-sm text-gray-400">
            <span className="font-medium text-white">{node.totalDevices}</span> Devices
          </div>
          <HealthPills healthy={node.health.healthy} warning={node.health.warning} offline={node.health.offline} />
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div className="flex flex-col w-full">
          {node.children.map((child: any, idx: number) => (
            <TreeNode key={idx} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function FleetDashboardPage() {
  const [fleetData, setFleetData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const user = useAuthStore((state) => state.user);

  React.useEffect(() => {
    const fetchHierarchy = async () => {
      if (!user?.organizationId) return;
      setLoading(true);
      try {
        const data = await fleetApi.getHierarchy(user.organizationId);
        setFleetData(data);
      } catch (err) {
        console.error('Failed to load hierarchy', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHierarchy();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500"></div>
      </div>
    );
  }

  if (!fleetData) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-gray-400">
        No hierarchy data available.
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Fleet Hierarchy</h1>
          <p className="text-gray-400 mt-1">Manage organizations, branches, and teams</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Total Devices</h3>
            <Monitor className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{fleetData.totalDevices}</span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Healthy</h3>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{fleetData.health?.healthy || 0}</span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Warning</h3>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{fleetData.health?.warning || 0}</span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400">Offline</h3>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{fleetData.health?.offline || 0}</span>
          </div>
        </div>
      </div>

      {/* Hierarchy Tree */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
        <div className="border-b border-gray-800 px-6 py-4 bg-gray-800/20">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Organizational Structure</h2>
        </div>
        <div className="flex flex-col">
          <TreeNode node={fleetData} />
        </div>
      </div>
    </div>
  );
}
