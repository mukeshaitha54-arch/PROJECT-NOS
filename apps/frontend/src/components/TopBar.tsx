"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Shield,
  Command,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { CommandPalette } from "./layout/CommandPalette";

interface TopBarProps {
  onHamburgerClick?: () => void;
  title?: string;
}

export function TopBar({ onHamburgerClick, title }: TopBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Local fallback
      localStorage.removeItem("nos_access_token");
      localStorage.removeItem("nos_refresh_token");
      router.push("/auth/login");
    }
  };

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email?.split("@")[0] || "Administrator";

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="h-16 border-b border-white/[0.08] bg-[#0d0e12]/80 backdrop-blur-2xl sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]">
        {/* Left: Mobile hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onHamburgerClick}
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-[background-color,color,transform] duration-140 active:scale-[0.95]"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {title && (
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight hidden sm:block">
              {title}
            </h2>
          )}
        </div>

        {/* Center: Global Search Trigger */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-gray-400 hover:text-gray-200 hover:border-orange-500/40 transition-[border-color,background-color,color,transform] duration-140 active:scale-[0.99] group shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-500 group-hover:text-orange-400 transition-colors duration-140" />
              <span>Search devices, telemetry, alerts...</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/[0.08] text-[10px] text-gray-400 font-mono shadow-sm">
              <Command className="w-3 h-3" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Alerts Bell Link */}
          <Link
            href="/alerts"
            className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-[background-color,color,transform] duration-140 active:scale-[0.95]"
            title="View alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0d0e12] animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-[background-color,border-color,transform] duration-140 active:scale-[0.97]"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-orange-500 via-rose-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),0_2px_8px_rgba(255,85,0,0.4)]">
                {initials}
              </div>
              <span className="text-xs font-medium text-gray-200 hidden sm:block max-w-[100px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:block transition-transform duration-140" />
            </button>

            {/* Dropdown Menu - Origin-aware top-right scaling with Emil glass specs */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#121318]/95 backdrop-blur-2xl border border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_48px_-8px_rgba(0,0,0,0.85)] p-1.5 z-50 text-xs text-gray-300 space-y-1 origin-top-right animate-in fade-in-50 zoom-in-95 duration-150 ease-out">
                  <div className="px-3.5 py-2.5 border-b border-white/[0.08]">
                    <p className="font-semibold text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                      {user?.email || "admin@nos.internal"}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-gray-300 hover:text-white transition-[background-color,color,transform] duration-140 active:scale-[0.98]"
                  >
                    <User className="w-4 h-4 text-blue-400" />
                    <span>User Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-gray-300 hover:text-white transition-[background-color,color,transform] duration-140 active:scale-[0.98]"
                  >
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span>Workspace Settings</span>
                  </Link>

                  <Link
                    href="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.06] text-gray-300 hover:text-white transition-[background-color,color,transform] duration-140 active:scale-[0.98]"
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Admin Console</span>
                  </Link>

                  <div className="border-t border-white/[0.08] my-1 pt-1" />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-[background-color,color,transform] duration-140 active:scale-[0.98] text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}
