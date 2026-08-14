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

export default function RegisterPage() {
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#070709] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-5 relative z-10 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20 mb-1">
            N
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Create Account
          </h2>
          <p className="text-xs text-gray-400">
            Join the NOS Personal Monitoring Platform
          </p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
          {/* Full Name */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                required
                placeholder="Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs transition"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                required
                placeholder="alex@nos.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
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
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-400">Password Strength:</span>
                  <span className={`font-semibold ${strengthInfo.text}`}>
                    {strengthInfo.label}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                    style={{ width: `${strengthInfo.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-xs transition"
              />
            </div>
          </div>

          {/* Terms Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2 text-gray-400 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-gray-950 border-gray-800 text-blue-600 focus:ring-0"
              />
              <span>
                I agree to the{" "}
                <span className="text-blue-400 hover:underline">
                  Terms of Use & Privacy Governance
                </span>
              </span>
            </label>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/60 text-red-300 text-xs animate-in fade-in-50">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 h-10 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 text-xs transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Enrolling
                Account...
              </>
            ) : (
              <>
                Create Account & Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center pt-2 border-t border-gray-800/80 text-xs text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 font-semibold hover:underline"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
