"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  resetPasswordSchema,
  ResetPasswordFormValues,
} from "../../../features/auth/schemas/auth.schemas";
import { authApi } from "../../../features/auth/services/auth.api";
import {
  Loader2,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowLeft,
} from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const devOtp = searchParams.get("devOtp") || "";

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: initialEmail, otp: devOtp, newPassword: "" },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await authApi.resetPassword(data);
      setSuccessMsg(res.message);
      setTimeout(() => router.push("/auth/login"), 2500);
    } catch (err: any) {
      setErrorMsg(
        err?.message || "Password reset failed. Please verify the OTP code.",
      );
    }
  };

  return (
    <div className="dashboard-glass-card w-full max-w-md space-y-6 relative z-10 bg-black/30 border border-orange-500/25 rounded-3xl p-8 shadow-2xl backdrop-blur-3xl overflow-hidden">
      {/* Specular sheen inside card */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-orange-500/[0.02] pointer-events-none rounded-3xl" />

      <div className="flex items-center justify-center space-x-2 mb-4 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-orange-500/30">
          N
        </div>
        <span className="text-2xl font-extrabold tracking-tight text-white">
          NOS
        </span>
      </div>

      <div className="space-y-2 text-center relative z-10">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-2 text-orange-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Set New Password
        </h2>
        <p className="text-sm text-zinc-300">
          Enter your 6-digit verification code and configure your new secure
          account password.
        </p>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm relative z-10 backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm relative z-10 backdrop-blur-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{successMsg} Redirecting to login...</span>
        </div>
      )}

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
        className="space-y-4 relative z-10"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Email Address
          </label>
          <input
            type="email"
            {...register("email")}
            className="w-full px-4 py-3 rounded-xl bg-black/35 border border-orange-500/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/60 transition-all"
          />
          {errors.email && (
            <p className="text-xs text-rose-400">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            6-Digit OTP Code
          </label>
          <input
            type="text"
            maxLength={6}
            {...register("otp")}
            placeholder="123456"
            className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg px-4 py-3 rounded-xl bg-black/35 border border-orange-500/20 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/60 transition-all"
          />
          {errors.otp && (
            <p className="text-xs text-rose-400">{errors.otp.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            New Password
          </label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-orange-400 pointer-events-none" />
            <input
              type="password"
              {...register("newPassword")}
              placeholder="Min 8 chars, 1 uppercase, 1 symbol"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/35 border border-orange-500/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/60 transition-all"
            />
          </div>
          {errors.newPassword && (
            <p className="text-xs text-rose-400">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !!successMsg}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white font-extrabold shadow-lg shadow-orange-500/30 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Resetting Password...</span>
            </>
          ) : (
            <span>Update Password &amp; Unlock Account</span>
          )}
        </button>
      </form>

      <div className="pt-6 border-t border-white/[0.08] text-center text-xs text-zinc-400 relative z-10">
        <Link
          href="/auth/login"
          className="flex items-center justify-center gap-1.5 font-bold text-orange-400 hover:text-orange-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex bg-transparent text-white font-sans items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      <Suspense
        fallback={
          <div className="dashboard-glass-card w-full max-w-md p-8 bg-black/30 border border-orange-500/20 rounded-3xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
