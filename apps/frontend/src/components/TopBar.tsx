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
      <header className="h-16 border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onHamburgerClick}
            className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition"
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
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-gray-900/80 border border-gray-800 text-xs text-gray-400 hover:text-gray-200 hover:border-gray-700 transition group shadow-inner"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-gray-500 group-hover:text-blue-400" />
              <span>Search devices, telemetry, alerts...</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] text-gray-400 font-mono">
              <Command className="w-3 h-3" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Alerts Bell Link */}
          <Link
            href="/alerts"
            className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition"
            title="View alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-gray-950 animate-pulse" />
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-900 border border-transparent hover:border-gray-800 transition"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shadow">
                {initials}
              </div>
              <span className="text-xs font-medium text-gray-200 hidden sm:block max-w-[100px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 rounded-xl bg-gray-900 border border-gray-800 shadow-2xl p-1.5 z-50 text-xs text-gray-300 space-y-1 animate-in fade-in-50 zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-gray-800">
                    <p className="font-semibold text-white truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {user?.email || "admin@nos.internal"}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition"
                  >
                    <User className="w-4 h-4 text-blue-400" />
                    <span>User Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition"
                  >
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span>Workspace Settings</span>
                  </Link>

                  <Link
                    href="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition"
                  >
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Admin Console</span>
                  </Link>

                  <div className="border-t border-gray-800 my-1 pt-1" />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-red-950/40 text-red-400 hover:text-red-300 transition text-left"
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
