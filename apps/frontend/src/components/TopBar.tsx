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
      <header className="h-16 border-b border-orange-500/20 bg-black/20 backdrop-blur-3xl backdrop-saturate-150 bg-gradient-to-r from-white/[0.04] via-transparent to-orange-500/[0.03] sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4 text-white shadow-lg">
        {/* Left: Mobile hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onHamburgerClick}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
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
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-white/[0.04] border border-orange-500/25 hover:border-orange-500/60 text-xs text-zinc-300 hover:text-white transition-colors group shadow-inner"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-orange-400 transition-colors" />
              <span>Search devices, telemetry, alerts...</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.08] border border-orange-500/20 text-[10px] text-orange-300 font-mono shadow-sm">
              <Command className="w-3 h-3" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Alerts Bell Link */}
          <Link
            href="/alerts"
            className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="View alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-[#0d0e12] animate-pulse" />
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-orange-500/30 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
              <span className="text-xs font-medium text-white hidden sm:block max-w-[100px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#111217]/95 border border-orange-500/30 backdrop-blur-2xl shadow-2xl p-1.5 z-50 text-xs text-white space-y-1 origin-top-right animate-in fade-in-50 zoom-in-95 duration-150 ease-out">
                  <div className="px-3.5 py-2.5 border-b border-orange-500/20">
                    <p className="font-semibold text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                      {user?.email || "admin@nos.internal"}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-orange-500/10 text-zinc-200 hover:text-white transition-colors"
                  >
                    <User className="w-4 h-4 text-orange-400" />
                    <span>User Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-orange-500/10 text-zinc-200 hover:text-white transition-colors"
                  >
                    <Settings className="w-4 h-4 text-amber-400" />
                    <span>Workspace Settings</span>
                  </Link>

                  <Link
                    href="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-orange-500/10 text-zinc-200 hover:text-white transition-colors"
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Admin Console</span>
                  </Link>

                  <div className="border-t border-orange-500/20 my-1 pt-1" />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/20 text-rose-400 transition-colors text-left font-medium"
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
