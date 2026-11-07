"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Monitor,
  Bell,
  Settings,
  Layers,
  HardDrive,
  Shield,
  Users,
  ChevronLeft,
  ChevronRight,
  Activity,
  X,
} from "lucide-react";
import { useRealtime } from "@/realtime/hooks/useRealtime";

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isConnected } = useRealtime();

  const mainNav = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Devices", href: "/devices", icon: Monitor },
    { name: "Fleet", href: "/fleet", icon: Layers },
    { name: "Inventory", href: "/inventory", icon: HardDrive },
    { name: "Alerts", href: "/alerts", icon: Bell },
    { name: "Audit", href: "/audit", icon: Activity },
    { name: "Members", href: "/members", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Admin", href: "/admin", icon: Shield },
  ];

  const isActiveRoute = (href: string) => {
    if (
      href === "/dashboard" &&
      (pathname === "/" || pathname === "/dashboard")
    )
      return true;
    if (
      href === "/devices" &&
      (pathname.startsWith("/devices") || pathname.startsWith("/device"))
    )
      return true;
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-black/20 backdrop-blur-3xl backdrop-saturate-150 border-r border-orange-500/20 text-white select-none shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.3)] bg-gradient-to-b from-white/[0.04] via-transparent to-orange-500/[0.03]">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-orange-500/20 bg-transparent">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 transition-transform duration-150 active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center text-white font-black shadow-md shadow-orange-500/25">
            N
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <span className="font-extrabold text-sm tracking-wider text-white">
                NOS
              </span>
              <span className="text-[10px] block text-orange-400 font-mono font-medium tracking-wide">
                NEURAL OS
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Mobile Close Button */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ease-out active:scale-[0.98] relative ${
                active
                  ? "bg-gradient-to-r from-orange-500/25 to-orange-500/5 text-orange-400 border border-orange-500/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_0_16px_rgba(244,123,54,0.18)]"
                  : "text-zinc-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? item.name : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                  active ? "text-orange-400" : "text-zinc-400"
                }`}
              />
              {!collapsed && <span>{item.name}</span>}
              {active && !collapsed && (
                <span className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.9)]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Socket.IO Real-time Connection Status Footer */}
      <div className="p-3 border-t border-orange-500/20 bg-transparent">
        <div
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition-colors duration-150 ${
            isConnected
              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
              : "bg-rose-500/10 text-rose-300 border border-rose-500/25"
          } ${collapsed ? "justify-center px-0" : ""}`}
        >
          {isConnected ? (
            <div className="relative flex items-center justify-center shrink-0">
              <span className="absolute w-3 h-3 rounded-full bg-emerald-400/40 animate-ping" />
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          )}

          {!collapsed && (
            <div className="truncate flex-1">
              <span className="font-semibold block text-[11px] tracking-wide">
                {isConnected ? "Socket.IO Live" : "Disconnected"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-[width] duration-200 ease-out ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            onClick={onMobileClose}
          />
          <div className="relative w-64 h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
