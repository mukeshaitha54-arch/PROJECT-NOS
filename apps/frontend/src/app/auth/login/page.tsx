"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function AuthLoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all credentials.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login({ email, password });
      router.push("/dashboard");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message;
      const code =
        err?.response?.data?.error?.details?.code ||
        err?.response?.data?.error?.code ||
        err?.response?.data?.code;

      if (
        msg?.toLowerCase().includes("verified") ||
        code === "EMAIL_NOT_VERIFIED"
      ) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        setError(msg || "Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 relative overflow-hidden">
      {/* ── Animated background layer ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial glow centre */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(59,130,246,0.12)_0%,transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(139,92,246,0.08)_0%,transparent_55%)]" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59,130,246,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Floating orbs */}
        <div className="absolute top-20 right-32 w-64 h-64 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute bottom-24 left-20 w-48 h-48 rounded-full bg-violet-600/8 blur-3xl" />

        {/* Subtle corner accent lines */}
        <div className="absolute top-0 right-0 w-px h-48 bg-gradient-to-b from-blue-500/30 to-transparent" />
        <div className="absolute top-0 right-0 h-px w-48 bg-gradient-to-l from-blue-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-px h-48 bg-gradient-to-t from-violet-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 h-px w-48 bg-gradient-to-r from-violet-500/20 to-transparent" />
      </div>

      {/* ── Left brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative">
        {/* NOS wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-500/30">
            N
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight">
              NOS
            </span>
            <div className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase leading-none">
              SENTINEL
            </div>
          </div>
        </div>

        {/* Central brand copy */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">
              All systems nominal
            </span>
          </div>
          <h1 className="text-5xl font-black text-white leading-[0.95] tracking-tight">
            FLEET
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
              CONTROL
            </span>
            <br />
            AWAITS.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Real-time telemetry. Predictive hardware intelligence.
            Zero-blindspot fleet monitoring across every Windows node.
          </p>

          {/* Mini stat row */}
          <div className="flex gap-6 pt-2">
            {[
              { v: "30s", l: "Telemetry cycle" },
              { v: "0", l: "Data loss events" },
              { v: "< 1s", l: "Pause latency" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl font-black text-white">{s.v}</div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom back-to-home */}
        <Link
          href="/"
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-xs font-medium transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">
            ←
          </span>
          Back to overview
        </Link>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-blue-500/30">
              N
            </div>
            <span className="text-white font-black text-lg tracking-tight">
              NOS
            </span>
          </div>

          {/* Card */}
          <div className="bg-slate-900/70 border border-white/8 rounded-3xl p-8 shadow-2xl shadow-black/60 backdrop-blur-xl space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Welcome back
              </h2>
              <p className="text-slate-400 text-sm">
                Sign in to your fleet command console
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="demo@nos.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-slate-950 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950/80 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-slate-950 focus:ring-1 focus:ring-blue-500/20 text-sm transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex items-center">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                </div>
                <label
                  htmlFor="remember"
                  className="text-xs text-slate-400 cursor-pointer select-none"
                >
                  Remember this computer
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 text-xs">
                  <span className="mt-0.5 text-red-400 text-base leading-none">
                    ⚠
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 h-12 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-black rounded-xl shadow-lg shadow-blue-500/25 text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Register link */}
            <div className="text-center pt-2 border-t border-white/6 text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-blue-400 font-bold hover:text-blue-300 transition-colors"
              >
                Create one →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
