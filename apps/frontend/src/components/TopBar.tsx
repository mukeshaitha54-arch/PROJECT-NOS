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
      <header className="h-16 border-b border-[#eadfd5] bg-[#ffffff]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onHamburgerClick}
            className="md:hidden p-2 rounded-xl text-[#75685f] hover:text-[#211a16] hover:bg-[#fff7f0] transition-colors"
            aria-label="Open mobile menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {title && (
            <h2 className="text-base sm:text-lg font-bold text-[#211a16] tracking-tight hidden sm:block">
              {title}
            </h2>
          )}
        </div>

        {/* Center: Global Search Trigger */}
        <div className="flex-1 max-w-md mx-2 sm:mx-4">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#fffdfa] border border-[#eadfd5] text-xs text-[#75685f] hover:text-[#211a16] hover:border-[#f47b36] transition-colors group shadow-sm"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#9b8a7f] group-hover:text-[#f47b36] transition-colors" />
              <span>Search devices, telemetry, alerts...</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#fff7f0] border border-[#eadfd5] text-[10px] text-[#75685f] font-mono shadow-sm">
              <Command className="w-3 h-3" /> K
            </kbd>
          </button>
        </div>

        {/* Right: Notifications & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Alerts Bell Link */}
          <Link
            href="/alerts"
            className="relative p-2 rounded-xl text-[#75685f] hover:text-[#211a16] hover:bg-[#fff7f0] transition-colors"
            title="View alerts"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#f47b36] ring-2 ring-[#ffffff] animate-pulse" />
          </Link>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#fff7f0] border border-transparent hover:border-[#eadfd5] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[#f47b36] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {initials}
              </div>
              <span className="text-xs font-medium text-[#211a16] hidden sm:block max-w-[100px] truncate">
                {displayName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#75685f] hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#ffffff] border border-[#eadfd5] shadow-xl p-1.5 z-50 text-xs text-[#211a16] space-y-1 origin-top-right animate-in fade-in-50 zoom-in-95 duration-150 ease-out">
                  <div className="px-3.5 py-2.5 border-b border-[#eadfd5]">
                    <p className="font-semibold text-[#211a16] truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-[#75685f] font-mono truncate mt-0.5">
                      {user?.email || "admin@nos.internal"}
                    </p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#fff7f0] text-[#211a16] transition-colors"
                  >
                    <User className="w-4 h-4 text-[#f47b36]" />
                    <span>User Profile</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#fff7f0] text-[#211a16] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#ca5724]" />
                    <span>Workspace Settings</span>
                  </Link>

                  <Link
                    href="/admin"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#fff7f0] text-[#211a16] transition-colors"
                  >
                    <Shield className="w-4 h-4 text-[#166534]" />
                    <span>Admin Console</span>
                  </Link>

                  <div className="border-t border-[#eadfd5] my-1 pt-1" />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-left"
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
