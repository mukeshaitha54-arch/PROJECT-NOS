"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  forgotPasswordSchema,
  ForgotPasswordFormValues,
} from "../../../features/auth/schemas/auth.schemas";
import { authApi } from "../../../features/auth/services/auth.api";
import {
  Loader2,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await authApi.forgotPassword(data);
      setSuccessMsg(res.message);
      setTimeout(() => {
        const query = new URLSearchParams({
          email: data.email,
          ...(res.devOtp ? { devOtp: res.devOtp } : {}),
        });
        router.push(`/auth/reset-password?${query.toString()}`);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to process request.");
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,rgba(59,130,246,0.12)_0%,transparent_65%)]" />
        <div className="absolute top-20 right-32 w-64 h-64 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute bottom-24 left-20 w-48 h-48 rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10 bg-slate-900/70 border border-white/8 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/20 ring-1 ring-white/20">
            N
          </div>
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            NOS
          </span>
        </div>

        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Reset Password
          </h2>
          <p className="text-sm text-slate-400">
            Enter your account email to receive a secure password reset OTP
            code.
          </p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg} Redirecting to OTP input...</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Corporate Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
              <input
                type="email"
                {...register("email")}
                placeholder="alex.mercer@nos.internal"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-400">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !!successMsg}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Requesting OTP...</span>
              </>
            ) : (
              <span>Send Password Reset OTP</span>
            )}
          </button>
        </form>

        <div className="pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-1.5 font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
