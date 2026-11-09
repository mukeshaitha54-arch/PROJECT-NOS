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
  const { register } = useAuth();

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
    if (!password) return { label: "", percent: 0, color: "bg-zinc-700" };
    if (password.length < 8) {
      return {
        label: "Weak",
        percent: 25,
        color: "bg-rose-500",
        text: "text-rose-400",
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
        color: "bg-amber-500",
        text: "text-amber-400",
      };
    }
    return {
      label: "Fair",
      percent: 50,
      color: "bg-blue-500",
      text: "text-[#3D8BFF]",
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
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.message ||
        "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch =
    confirmPassword && password && confirmPassword === password;
  const passwordsMismatch =
    confirmPassword && password && confirmPassword !== password;

  return (
    <div className="min-h-screen w-full flex bg-transparent relative overflow-hidden">
      {/* ── Form panel (left on register so brand is right) ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3D8BFF] via-[#2563EB] to-[#1D4ED8] flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/30">
              N
            </div>
            <div>
              <span className="text-white font-extrabold text-xl tracking-tight block">
                NOS
              </span>
              <span className="text-[10px] text-[#3D8BFF] font-mono tracking-widest uppercase block leading-none">
                NEURAL OS
              </span>
            </div>
          </div>

          {/* Card in Transparent Frosted Glass */}
          <div className="dashboard-glass-card bg-black/30 border border-white/[0.1] rounded-3xl p-8 shadow-2xl backdrop-blur-3xl space-y-5 relative overflow-hidden">
            {/* Specular sheen inside card */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-blue-500/[0.02] pointer-events-none rounded-3xl" />

            {/* Header */}
            <div className="space-y-1 relative z-10">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Create account
              </h2>
              <p className="text-zinc-300 text-sm">
                Join the NOS fleet monitoring platform
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="space-y-4 relative z-10">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-widest mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D8BFF]" />
                  <input
                    type="text"
                    required
                    placeholder="Alex Morgan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/35 border border-white/[0.1] text-white placeholder-zinc-500 focus:outline-none focus:border-[#3D8BFF]/60 focus:bg-black/50 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D8BFF]" />
                  <input
                    type="email"
                    required
                    placeholder="alex@nos.local"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/35 border border-white/[0.1] text-white placeholder-zinc-500 focus:outline-none focus:border-[#3D8BFF]/60 focus:bg-black/50 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D8BFF]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-black/35 border border-white/[0.1] text-white placeholder-zinc-500 focus:outline-none focus:border-[#3D8BFF]/60 focus:bg-black/50 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
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
                {/* Strength Meter */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                        style={{ width: `${strengthInfo.percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-zinc-400">Password strength:</span>
                      <span className={`font-bold ${strengthInfo.text}`}>
                        {strengthInfo.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase tracking-widest mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#3D8BFF]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-10 py-3 rounded-xl bg-black/35 border text-white placeholder-zinc-500 focus:outline-none focus:bg-black/50 focus:ring-2 text-sm transition-all duration-200 ${
                      passwordsMismatch
                        ? "border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/20"
                        : passwordsMatch
                          ? "border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/20"
                          : "border-white/[0.1] focus:border-[#3D8BFF]/60 focus:ring-blue-500/20"
                    }`}
                  />
                  {/* Match indicator icon */}
                  {passwordsMatch && (
                    <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  )}
                  {passwordsMismatch && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-400 text-sm font-bold">
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
                  className="mt-0.5 w-4 h-4 rounded bg-black/40 border-white/[0.2] text-[#3D8BFF] focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0 accent-[#3D8BFF]"
                />
                <label
                  htmlFor="terms"
                  className="text-xs text-zinc-300 cursor-pointer leading-relaxed"
                >
                  I agree to the{" "}
                  <span className="text-[#3D8BFF] hover:text-blue-300 transition-colors font-semibold">
                    Terms of Use &amp; Privacy Governance
                  </span>
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
                className="w-full py-3 h-12 bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] text-white font-extrabold rounded-xl shadow-lg shadow-blue-500/30 text-sm transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-blue-500/45 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:scale-100"
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
            <div className="text-center pt-2 border-t border-white/[0.08] text-xs text-zinc-400 relative z-10">
              Already have an account?{" "}
              <Link
                href="/auth/login"
                className="text-[#3D8BFF] font-bold hover:text-blue-300 transition-colors"
              >
                Sign In →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right brand panel (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative z-10">
        {/* NOS wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3D8BFF] via-[#2563EB] to-[#1D4ED8] flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/30">
            N
          </div>
          <div>
            <span className="text-white font-extrabold text-xl tracking-tight">
              NOS
            </span>
            <div className="text-[10px] text-[#3D8BFF] font-mono font-medium tracking-widest uppercase leading-none">
              NEURAL OS
            </div>
          </div>
        </div>

        {/* Central brand copy */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-3.5 py-1 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#3D8BFF] animate-pulse shadow-[0_0_8px_rgba(61,139,255,0.8)]" />
            <span className="text-[#3D8BFF] text-xs font-bold tracking-widest uppercase">
              Enroll your fleet today
            </span>
          </div>
          <h1 className="text-5xl font-black text-white leading-[0.95] tracking-tight">
            ZERO
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] via-[#3D8BFF] to-[#2563EB]">
              BLINDSPOTS.
            </span>
            <br />
            EVER.
          </h1>
          <p className="text-zinc-300 text-sm leading-relaxed max-w-sm">
            Deploy your first agent in under 5 minutes. Encrypted SQLite outbox
            ensures every metric is captured — even during network outages.
          </p>

          {/* Feature list in frosted glass */}
          <div className="space-y-2.5">
            {[
              "S.M.A.R.T. predictive hardware failure detection",
              "Non-destructive Pause & Resume telemetry",
              "Sub-second WebSocket fleet dashboard",
              "Per-device SHA-256 token isolation",
            ].map((feat) => (
              <div
                key={feat}
                className="flex items-center gap-3 text-xs text-zinc-300"
              >
                <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-[#3D8BFF]" />
                </div>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom back-to-home */}
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 hover:text-[#3D8BFF] text-xs font-medium transition-colors group"
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
