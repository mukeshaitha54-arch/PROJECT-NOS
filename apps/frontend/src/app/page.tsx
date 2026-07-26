'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '../features/auth/stores/auth.store';
import { Shield, Lock, ArrowRight, Activity, Terminal, Layers } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Background networking mesh pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Navigation header */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            <span className="font-bold text-lg text-white">N</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">NOS Platform</span>
          <span className="px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
            Phase 2A Active
          </span>
        </div>

        <nav className="flex items-center space-x-4">
          <Link
            href="/device"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-cyan-400 border border-cyan-500/30 transition-colors"
          >
            Monitoring Agents (/device)
          </Link>
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all"
            >
              <span>{user?.firstName}&apos;s Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="px-4 py-2 rounded-xl hover:bg-slate-900 text-sm font-medium text-slate-300 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/auth/register"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all"
              >
                <span>Provision Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Hero section */}
      <main className="relative z-10 max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center space-y-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Phase 1 Complete: Enterprise Zero-Trust Identity Infrastructure
        </div>

        <div className="space-y-6">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-none">
            AI-Powered Network Operations <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              & Security Platform
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400 leading-relaxed">
            Architected for scale with high-throughput monitoring agents, Clean Architecture role-based access governance, and real-time JWT cryptographic sessions.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-semibold text-white shadow-xl shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <span>Go to Identity Profile</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-semibold text-white shadow-xl shadow-cyan-500/25 transition-all cursor-pointer"
              >
                <span>Enterprise Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/auth/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium border border-slate-800 transition-colors"
              >
                Create New Account
              </Link>
            </>
          )}
        </div>

        {/* Feature status cards showing Phase 1 boundary enforcement */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-cyan-500/30 backdrop-blur-xl relative overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white mb-2 flex items-center justify-between">
              <span>Identity & RBAC</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-md">
                Active (Phase 1)
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clean Architecture repository patterns, Argon2id encryption, SMTP OTP email verification, and automatic JWT refresh rotation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl opacity-75">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>Telemetry Dashboard</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                Locked (Phase 2)
              </span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Real-time WebSocket streaming dashboard and predictive health analytics will be activated upon Phase 1 sign-off.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl opacity-75">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-300 mb-2 flex items-center justify-between">
              <span>.NET Agent Core</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                Locked (Phase 2)
              </span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              High-throughput Windows system monitoring agent with mutual TLS authentication waiting for upcoming deployment phase.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 max-w-6xl mx-auto px-6 py-10 border-t border-slate-800/60 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} NOS Platform. Engineered with enterprise Clean Architecture & Zero-Trust security principles.</p>
      </footer>
    </div>
  );
}
