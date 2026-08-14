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
      // Auto-request OTP on page load to show devOtp immediately
      rawApi
        .post("/auth/resend-otp", { email: initialEmail })
        .then((res) => {
          const data = res.data?.data || res.data;
          if (data?.devOtp) {
            setDevOtp(data.devOtp);
            setValue("otp", data.devOtp);
          }
        })
        .catch(() => {});
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#070709] relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-6 relative z-10 backdrop-blur-sm">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 items-center justify-center text-cyan-400 font-bold mb-2">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Email Verification
          </h2>
          <p className="text-xs text-gray-400">
            Enter the 6-digit OTP code sent via SMTP to{" "}
            <span className="text-cyan-400 font-mono">
              {currentEmail || "your email"}
            </span>
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dev Mode OTP Banner — shown when SMTP is not configured */}
        {devOtp && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1">
            <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-widest">
              🔧 Dev Mode — No SMTP configured
            </p>
            <p className="text-amber-300/80 text-[11px]">
              Your OTP has been auto-filled below:
            </p>
            <p className="text-center font-mono text-2xl font-bold tracking-[0.4em] text-amber-300">
              {devOtp}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-gray-300 font-semibold">
              Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-xs transition"
            />
            {errors.email && (
              <p className="text-[11px] text-red-400">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-gray-300 font-semibold">
              6-Digit One-Time Password (OTP)
            </label>
            <input
              type="text"
              maxLength={6}
              {...register("otp")}
              placeholder="••••••"
              className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-cyan-400 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
            />
            {errors.otp && (
              <p className="text-[11px] text-red-400">{errors.otp.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !!successMsg}
            className="w-full py-2.5 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying OTP...</span>
              </>
            ) : (
              <span>Confirm & Verify Account</span>
            )}
          </button>
        </form>

        {/* Resend & Back options */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800/80 text-xs">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={resending || countdown > 0}
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 disabled:text-gray-500 transition-colors cursor-pointer"
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
        <div className="min-h-screen flex items-center justify-center bg-[#070709] text-gray-400 text-xs">
          Loading verification context...
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
