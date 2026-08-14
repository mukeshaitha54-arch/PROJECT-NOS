import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden">
      {/* Left Column - Enterprise NOS Brand Presentation */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

        <div className="relative z-10 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            <span className="font-bold text-lg text-white tracking-wider">
              N
            </span>
          </div>
          <Link
            href="/"
            className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent"
          >
            NOS Platform
          </Link>
          <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full">
            Enterprise
          </span>
        </div>

        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Zero-Trust Identity Infrastructure
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
            Secure Unified Network Operations.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Enterprise authentication, role-based governance, and real-time
            cryptographically secured sessions designed for high-availability
            organizations.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 pt-6">
          <p>© {new Date().getFullYear()} NOS Platform. Production Release.</p>
          <div className="flex space-x-6">
            <span className="hover:text-slate-400 transition-colors cursor-pointer">
              Security Protocol
            </span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">
              Compliance
            </span>
          </div>
        </div>
      </div>

      {/* Right Column - Dynamic Authentication Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto bg-slate-950">
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="lg:hidden flex items-center justify-center space-x-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
              N
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              NOS Platform
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
