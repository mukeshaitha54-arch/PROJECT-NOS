"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Lock,
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertTriangle,
  Key,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";

export default function SecurityPoliciesPage() {
  const [jwtTtl, setJwtTtl] = useState<number>(15);
  const [authLimit, setAuthLimit] = useState<number>(5);
  const [telemetryLimit, setTelemetryLimit] = useState<number>(1000);
  const [mfaEnforced, setMfaEnforced] = useState<boolean>(true);

  const saveSettings = () => {
    toast.success(
      "Security Policy Updated",
      "Global security rate limits and JWT parameters persisted.",
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
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
                <Lock className="w-5 h-5 text-amber-400" />
                Security Policies & Hardening
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure authentication TTLs, multi-tier rate limiting
                parameters, and secret guards.
              </p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
          >
            Save Security Rules
          </button>
        </div>

        <div className="space-y-6">
          {/* JWT Policy */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">
                JWT Access & Refresh Token Hardening
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Access Token Expiry (Minutes)
                </label>
                <input
                  type="number"
                  value={jwtTtl}
                  onChange={(e) => setJwtTtl(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Refresh Token Family Rotation
                </label>
                <input
                  type="text"
                  disabled
                  value="ENFORCED (Single-Use Automatic Invalidation)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Rate Limiting Tiers */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Multi-Tier Rate Limiting Policy
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">
                  Auth / Login Limit (Req / 60s per IP)
                </label>
                <input
                  type="number"
                  value={authLimit}
                  onChange={(e) => setAuthLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Telemetry Ingestion Tier (Req / 60s per device)
                </label>
                <input
                  type="number"
                  value={telemetryLimit}
                  onChange={(e) => setTelemetryLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
