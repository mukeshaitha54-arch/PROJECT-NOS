"use client";

import React, { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  verifyEmailSchema,
  VerifyEmailFormValues,
} from "../../../features/auth/schemas/auth.schemas";
import { authApi } from "../../../features/auth/services/auth.api";
import { rawApi } from "@/lib/api-client";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: initialEmail, otp: "" },
  });

  const currentEmail = watch("email");

  useEffect(() => {
    if (initialEmail) {
      setValue("email", initialEmail);
    }
  }, [initialEmail, setValue]);

  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const onSubmit = async (data: VerifyEmailFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await rawApi.post("/auth/verify-email", data);
      const resData = res.data?.data || res.data;
      setSuccessMsg(resData.message || "Email verified successfully!");

      if (typeof window !== "undefined" && resData.accessToken) {
        localStorage.setItem("nos_access_token", resData.accessToken);
        if (resData.refreshToken) {
          localStorage.setItem("nos_refresh_token", resData.refreshToken);
        }
      }

      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Verification failed. Incorrect or expired OTP.",
      );
    }
  };

  const handleResendOtp = async () => {
    if (!currentEmail) {
      setErrorMsg("Please provide your email address first.");
      return;
    }
    setErrorMsg(null);
    try {
      setResending(true);
      const res = await rawApi.post("/auth/resend-otp", {
        email: currentEmail,
      });
      const data = res.data?.data || res.data;
      setSuccessMsg(data?.message || "A new 6-digit code has been dispatched.");
      setCountdown(60);
      if (data?.devOtp) {
        setDevOtp(data.devOtp);
        setValue("otp", data.devOtp);
      }
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to resend code. Please try again in a few moments.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-transparent relative overflow-hidden">
      <div className="dashboard-glass-card w-full max-w-md bg-black/30 border border-orange-500/25 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 backdrop-blur-3xl overflow-hidden">
        {/* Specular sheen inside card */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-orange-500/[0.02] pointer-events-none rounded-3xl" />

        {/* Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/30 items-center justify-center text-orange-400 font-bold mb-2 shadow-lg shadow-orange-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Email Verification
          </h2>
          <p className="text-xs text-zinc-300">
            Enter the 6-digit OTP code sent via SMTP to{" "}
            <span className="text-orange-400 font-mono font-semibold">
              {currentEmail || "your email"}
            </span>
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs relative z-10 backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs relative z-10 backdrop-blur-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dev Mode OTP Banner */}
        {devOtp && (
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-1 relative z-10">
            <p className="text-orange-400 text-[10px] font-bold uppercase tracking-widest">
              🔧 Dev Mode — OTP Generated
            </p>
            <p className="text-orange-200/90 text-[11px]">
              Your OTP has been auto-filled below:
            </p>
            <p className="text-center font-mono text-2xl font-black tracking-[0.4em] text-orange-400">
              {devOtp}
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 text-xs relative z-10"
        >
          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
              Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-4 py-3 rounded-xl bg-black/35 border border-orange-500/20 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 text-xs transition"
            />
            {errors.email && (
              <p className="text-[11px] text-rose-400">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-zinc-300 font-bold uppercase tracking-wider text-[11px]">
              6-Digit One-Time Password (OTP)
            </label>
            <input
              type="text"
              maxLength={6}
              {...register("otp")}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg px-4 py-3 rounded-xl bg-black/35 border border-orange-500/20 text-orange-400 placeholder-zinc-600 focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition"
            />
            {errors.otp && (
              <p className="text-[11px] text-rose-400">{errors.otp.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !!successMsg}
            className="w-full py-3 h-12 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-extrabold shadow-lg shadow-orange-500/30 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying OTP...</span>
              </>
            ) : (
              <span>Confirm &amp; Verify Account</span>
            )}
          </button>
        </form>

        {/* Resend & Back options */}
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.08] text-xs relative z-10">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resending || countdown > 0}
            className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 disabled:text-zinc-500 transition-colors cursor-pointer font-semibold"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`}
            />
            {countdown > 0 ? `Resend code (${countdown}s)` : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-transparent text-zinc-400 text-xs">
          Loading verification context...
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
