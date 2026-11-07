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
    <div className="min-h-screen w-full flex bg-transparent relative overflow-hidden">
      {/* ── Left brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative z-10">
        {/* NOS wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-orange-500/30">
            N
          </div>
          <div>
            <span className="text-white font-extrabold text-xl tracking-tight">
              NOS
            </span>
            <div className="text-[10px] text-orange-400 font-mono font-medium tracking-widest uppercase leading-none">
              NEURAL OS
            </div>
          </div>
        </div>

        {/* Central brand copy */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3.5 py-1 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">
              All systems nominal
            </span>
          </div>
          <h1 className="text-5xl font-black text-white leading-[0.95] tracking-tight">
            FLEET
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-rose-500">
              CONTROL
            </span>
            <br />
            AWAITS.
          </h1>
          <p className="text-zinc-300 text-sm leading-relaxed max-w-sm">
            Real-time telemetry. Predictive hardware intelligence.
            Zero-blindspot fleet monitoring across every Windows node.
          </p>

          {/* Mini stat row in frosted glass */}
          <div className="flex gap-4 pt-2">
            {[
              { v: "30s", l: "Telemetry cycle" },
              { v: "0", l: "Data loss events" },
              { v: "< 1s", l: "Pause latency" },
            ].map((s) => (
              <div
                key={s.l}
                className="dashboard-glass-card rounded-2xl px-4 py-3 bg-black/25 backdrop-blur-xl border border-orange-500/20 shadow-md"
              >
                <div className="text-xl font-black text-white font-mono drop-shadow-sm">
                  {s.v}
                </div>
                <div className="text-[10px] text-zinc-400 font-medium leading-tight mt-0.5">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom back-to-home */}
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-orange-400 text-xs font-medium transition-colors group"
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-orange-500/30">
              N
            </div>
            <div>
              <span className="text-white font-extrabold text-xl tracking-tight block">
                NOS
              </span>
              <span className="text-[10px] text-orange-400 font-mono tracking-widest uppercase block leading-none">
                NEURAL OS
              </span>
            </div>
          </div>

          {/* Card in Transparent Frosted Glass */}
          <div className="dashboard-glass-card bg-black/30 border border-orange-500/25 rounded-3xl p-8 shadow-2xl backdrop-blur-3xl space-y-6 relative overflow-hidden">
            {/* Specular sheen inside card */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-orange-500/[0.02] pointer-events-none rounded-3xl" />

            {/* Header */}
            <div className="space-y-1 relative z-10">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Welcome back
              </h2>
              <p className="text-zinc-300 text-sm">
                Sign in to your fleet command console
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4 relative z-10">
              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                  <input
                    type="email"
                    required
                    placeholder="demo@nos.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/35 border border-orange-500/20 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 focus:bg-black/50 focus:ring-2 focus:ring-orange-500/20 text-sm transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors font-semibold"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-black/35 border border-orange-500/20 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 focus:bg-black/50 focus:ring-2 focus:ring-orange-500/20 text-sm transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
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
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-black/40 border-orange-500/30 text-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-orange-500"
                />
                <label
                  htmlFor="remember"
                  className="text-xs text-zinc-300 cursor-pointer select-none"
                >
                  Remember this computer
                </label>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs backdrop-blur-sm">
                  <span className="mt-0.5 text-rose-400 text-base leading-none">
                    ⚠
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 h-12 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-extrabold rounded-xl shadow-lg shadow-orange-500/30 text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-orange-500/45 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
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
            <div className="text-center pt-2 border-t border-white/[0.08] text-xs text-zinc-400 relative z-10">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/register"
                className="text-orange-400 font-bold hover:text-orange-300 transition-colors"
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
