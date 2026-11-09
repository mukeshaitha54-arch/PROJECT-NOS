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
    <div className="min-h-screen w-full flex bg-transparent text-white font-sans items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      <div className="dashboard-glass-card w-full max-w-md space-y-6 relative z-10 bg-black/30 border border-white/[0.1] rounded-3xl p-8 shadow-2xl backdrop-blur-3xl overflow-hidden">
        {/* Specular sheen inside card */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-blue-500/[0.02] pointer-events-none rounded-3xl" />

        <div className="flex items-center justify-center space-x-2 mb-4 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3D8BFF] via-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-blue-500/30">
            N
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white">
            NOS
          </span>
        </div>

        <div className="space-y-2 text-center relative z-10">
          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Reset Password
          </h2>
          <p className="text-sm text-zinc-300">
            Enter your account email to receive a secure password reset OTP
            code.
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
            <span>{successMsg} Redirecting to OTP input...</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 relative z-10"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Corporate Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-[#3D8BFF] pointer-events-none" />
              <input
                type="email"
                {...register("email")}
                placeholder="alex.mercer@nos.internal"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/35 border border-white/[0.1] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#3D8BFF]/60 transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-400">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !!successMsg}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#3D8BFF] to-[#2563EB] hover:from-[#60A5FA] hover:to-[#3D8BFF] text-white font-extrabold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
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

        <div className="pt-6 border-t border-white/[0.08] text-center text-xs text-zinc-400 relative z-10">
          <Link
            href="/auth/login"
            className="flex items-center justify-center gap-1.5 font-bold text-[#3D8BFF] hover:text-blue-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
