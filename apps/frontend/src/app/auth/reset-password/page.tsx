'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, ResetPasswordFormValues } from '../../../features/auth/schemas/auth.schemas';
import { authApi } from '../../../features/auth/services/auth.api';
import { Loader2, KeyRound, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: initialEmail, otp: '', newPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await authApi.resetPassword(data);
      setSuccessMsg(res.message);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Password reset failed. Please verify the OTP code.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center lg:text-left">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Set New Password</h2>
        <p className="text-sm text-slate-400">
          Enter your 6-digit verification code and configure your new secure account password.
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
          <span>{successMsg} Redirecting to login...</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Email Address</label>
          <input
            type="email"
            {...register('email')}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">6-Digit OTP Code</label>
          <input
            type="text"
            maxLength={6}
            {...register('otp')}
            placeholder="123456"
            className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
          {errors.otp && <p className="text-xs text-red-400">{errors.otp.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">New Password</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500 pointer-events-none" />
            <input
              type="password"
              {...register('newPassword')}
              placeholder="Min 8 chars, 1 uppercase, 1 symbol"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
          {errors.newPassword && <p className="text-xs text-red-400">{errors.newPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !!successMsg}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Resetting Password...</span>
            </>
          ) : (
            <span>Update Password & Unlock Account</span>
          )}
        </button>
      </form>

      <div className="pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
        <Link href="/auth/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          Return to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-500">Loading reset context...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
