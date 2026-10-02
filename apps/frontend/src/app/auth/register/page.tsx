"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { rawApi } from "@/lib/api-client";

export default function AuthRegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength calculation
  const strengthInfo = useMemo(() => {
    if (!password) return { label: "", percent: 0, color: "bg-gray-700" };
    if (password.length < 8) {
      return {
        label: "Weak",
        percent: 25,
        color: "bg-red-500",
        text: "text-red-400",
      };
    }
    const hasNumber = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);

    if (hasNumber && hasSymbol) {
      return {
        label: "Strong",
        percent: 100,
        color: "bg-emerald-500",
        text: "text-emerald-400",
      };
    }
    if (hasNumber || hasSymbol) {
      return {
        label: "Good",
        percent: 75,
        color: "bg-blue-500",
        text: "text-blue-400",
      };
    }
    return {
      label: "Fair",
      percent: 50,
      color: "bg-amber-500",
      text: "text-amber-400",
    };
  }, [password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill out all required fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!termsAgreed) {
      setError("You must agree to the Terms of Use.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "Admin";

      await rawApi.post("/auth/register", {
        email,
        password,
        firstName,
        lastName,
      });

      // Forward directly to OTP verification page
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message;
      if (status === 409 || msg?.toLowerCase().includes("already exists")) {
        setError(
          "An account with this email address already exists. Please Sign In below.",
        );
      } else {
        setError(msg || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  return (
    <div className="min-h-screen w-full flex bg-slate-950 relative overflow-hidden">
      {/* ── Animated background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(139,92,246,0.10)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(59,130,246,0.08)_0%,transparent_55%)]" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139,92,246,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="absolute top-16 left-32 w-72 h-72 rounded-full bg-violet-600/6 blur-3xl" />
        <div className="absolute bottom-20 right-24 w-52 h-52 rounded-full bg-blue-600/6 blur-3xl" />

        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-px h-48 bg-gradient-to-b from-violet-500/30 to-transparent" />
        <div className="absolute top-0 left-0 h-px w-48 bg-gradient-to-r from-violet-500/30 to-transparent" />
        <div className="absolute bottom-0 right-0 w-px h-48 bg-gradient-to-t from-blue-500/20 to-transparent" />
        <div className="absolute bottom-0 right-0 h-px w-48 bg-gradient-to-l from-blue-500/20 to-transparent" />
      </div>

      {/* ── Form panel (left on register so brand is right) ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-violet-500/30">
              N
            </div>
            <span className="text-white font-black text-lg tracking-tight">
              NOS
            </span>
          </div>

          {/* Card */}
          <div className="bg-slate-900/70 border border-white/8 rounded-3xl p-8 shadow-2xl shadow-black/60 backdrop-blur-xl space-y-5">
            {/* Header */}
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Create account
              </h2>
              <p className="text-slate-400 text-sm">
                Join the NOS fleet monitoring platform
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-slate-950 focus:ring-1 focus:ring-violet-500/20 text-sm transition-all duration-200"
                  />
                </div>
              </div>

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
                    placeholder="alex@nos.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-slate-950 focus:ring-1 focus:ring-violet-500/20 text-sm transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950/80 border border-white/8 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:bg-slate-950 focus:ring-1 focus:ring-violet-500/20 text-sm transition-all duration-200"
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

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-500 font-medium">
                        Strength
                      </span>
                      <span className={`font-bold ${strengthInfo.text}`}>
                        {strengthInfo.label}
                      </span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${strengthInfo.color}`}
                        style={{ width: `${strengthInfo.percent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950/80 border text-white placeholder-slate-600 focus:outline-none text-sm transition-all duration-200 ${
                      passwordsMismatch
                        ? "border-red-500/50 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20"
                        : passwordsMatch
                          ? "border-emerald-500/50 focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/20"
                          : "border-white/8 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20"
                    }`}
                  />
                  {/* Match indicator icon */}
                  {passwordsMatch && (
                    <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  )}
                  {passwordsMismatch && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-red-400 text-sm font-bold">
                      ✕
                    </span>
                  )}
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded bg-slate-950 border-slate-700 text-violet-600 focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-slate-400 cursor-pointer leading-relaxed"
                >
                  I agree to the{" "}
                  <span className="text-violet-400 hover:text-violet-300 transition-colors font-semibold">
                    Terms of Use &amp; Privacy Governance
                  </span>
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
                className="w-full py-3 h-12 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-black rounded-xl shadow-lg shadow-violet-500/25 text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enrolling Account...
                  </>
                ) : (
                  <>
                    Create Account &amp; Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center pt-2 border-t border-white/6 text-xs text-slate-500">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-violet-400 font-bold hover:text-violet-300 transition-colors"
              >
                Sign In →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative">
        {/* NOS wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-violet-500/30">
            N
          </div>
          <div>
            <span className="text-white font-black text-lg tracking-tight">
              NOS
            </span>
            <div className="text-[10px] text-violet-400 font-bold tracking-widest uppercase leading-none">
              SENTINEL
            </div>
          </div>
        </div>

        {/* Central brand copy */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-violet-400 text-xs font-bold tracking-widest uppercase">
              Enroll your fleet today
            </span>
          </div>
          <h1 className="text-5xl font-black text-white leading-[0.95] tracking-tight">
            ZERO
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-blue-400">
              BLINDSPOTS.
            </span>
            <br />
            EVER.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Deploy your first agent in under 5 minutes. Encrypted SQLite outbox
            ensures every metric is captured — even during network outages.
          </p>

          {/* Feature list */}
          <div className="space-y-2.5">
            {[
              "S.M.A.R.T. predictive hardware failure detection",
              "Non-destructive Pause & Resume telemetry",
              "Sub-second WebSocket fleet dashboard",
              "Per-device SHA-256 token isolation",
            ].map((feat) => (
              <div
                key={feat}
                className="flex items-center gap-2.5 text-xs text-slate-400"
              >
                <div className="w-4 h-4 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-violet-400" />
                </div>
                {feat}
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
    </div>
  );
}
