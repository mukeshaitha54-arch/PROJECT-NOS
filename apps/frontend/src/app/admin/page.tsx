'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield, Users, Key, Monitor, Lock, Activity, Server, Settings,
  AlertTriangle, CheckCircle, ChevronRight, HardDrive, Database, Globe
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/features/auth/stores/auth.store';

export default function EnterpriseAdminConsolePage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'OWNER';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">Enterprise Control Plane & Administration</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Organization governance, user provisioning, API key rotation, active sessions, and security posture policies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isSuperAdmin ? 'critical' : 'info'} size="md">
              {isSuperAdmin ? 'PLATFORM SUPER ADMIN' : 'ORGANIZATION ADMIN'}
            </Badge>
          </div>
        </div>

        {/* Q2 Scope Warning Card */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-slate-200">
                {isSuperAdmin
                  ? 'Platform Super Admin Scope — Cross-Tenant Liveliness & Infrastructure Enabled'
                  : 'Organization Admin Scope — Scoped strictly to your Organization. 0% Cross-Tenant Leakage Guaranteed.'}
              </p>
            </div>
          </div>
        </div>

        {/* Administration Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            href="/admin/users"
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">User Governance</h3>
            <p className="text-xs text-slate-400 mt-1">Manage team members, roles, permissions, and email verification status.</p>
            <div className="mt-4 flex items-center text-xs font-semibold text-cyan-400 gap-1">
              Manage Users <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/admin/api-keys"
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Key className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition">API Key Manager</h3>
            <p className="text-xs text-slate-400 mt-1">Provision and revoke SHA-256 hashed API keys for programmatic automation.</p>
            <div className="mt-4 flex items-center text-xs font-semibold text-purple-400 gap-1">
              Manage Keys <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/admin/sessions"
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">Active Sessions</h3>
            <p className="text-xs text-slate-400 mt-1">Inspect active JWT sessions across devices with instant revocation capability.</p>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 gap-1">
              View Sessions <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/admin/security"
            className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">Security Policies</h3>
            <p className="text-xs text-slate-400 mt-1">Enforce password strength rules, session timeouts, and rate limits.</p>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 gap-1">
              View Security <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
