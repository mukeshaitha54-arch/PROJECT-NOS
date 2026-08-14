"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { authApi } from "@/features/auth/services/auth.api";
import {
  changePasswordSchema,
  ChangePasswordFormValues,
} from "@/features/auth/schemas/auth.schemas";
import {
  Shield,
  User as UserIcon,
  LogOut,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Server,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, clearSession } = useAuthStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Clean up local store regardless of server response
    } finally {
      clearSession();
      router.push("/auth/login");
    }
  };

  const onSubmitChangePassword = async (data: ChangePasswordFormValues) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setSuccessMsg(
        "Password successfully updated. All other active sessions have been revoked.",
      );
      reset();
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          "Failed to update password. Please check your current password.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 sm:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header navigation */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
              N
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                NOS Platform
              </h1>
              <p className="text-xs text-slate-400">
                Personal Operations & Identity Control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/devices"
              className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-semibold text-cyan-400 border border-cyan-500/30 transition-colors flex items-center gap-1.5"
            >
              <span>Devices (/devices)</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors"
            >
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              {isLoggingOut ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Notice: Open Source Personal Platform Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border border-cyan-500/30 text-xs sm:text-sm text-cyan-200 flex items-center gap-3">
          <Server className="w-5 h-5 flex-shrink-0 text-cyan-400" />
          <div>
            <span className="font-semibold text-white">
              Open-Source Personal Workspace Platform Active.
            </span>{" "}
            Security sessions are operating with JWT tokens, automated rotation,
            workspace permissions, and real-time telemetry streaming.
          </div>
        </div>

        {/* Profile details and password management grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* User Details Card */}
          <div className="md:col-span-1 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <UserIcon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  {user.email}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">RBAC Role</span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Email Status</span>
                  <span className="text-green-400 flex items-center gap-1 font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Account ID</span>
                  <span className="font-mono text-slate-500 truncate max-w-[140px]">
                    {user.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed pt-4 border-t border-slate-800/80">
              Session protected by short-lived JWT access tokens with Argon2id
              encrypted refresh rotation.
            </div>
          </div>

          {/* Change Password Card */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl space-y-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Security & Password Management
                </h3>
                <p className="text-xs text-slate-400">
                  Update your account credentials and revoke outstanding tokens.
                </p>
              </div>
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
                <span>{successMsg}</span>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmitChangePassword)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Current Password
                </label>
                <input
                  type="password"
                  {...register("currentPassword")}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                {errors.currentPassword && (
                  <p className="text-xs text-red-400">
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    {...register("newPassword")}
                    placeholder="Min 8 chars, uppercase & symbol"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                  {errors.newPassword && (
                    <p className="text-xs text-red-400">
                      {errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    {...register("confirmPassword")}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-400">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Update Enterprise Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
