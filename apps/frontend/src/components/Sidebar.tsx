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
  Wifi,
  WifiOff,
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
    <div className="flex flex-col h-full bg-gray-950 border-r border-gray-800/80 text-gray-300 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800/80 bg-gray-950/80">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
            N
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <span className="font-extrabold text-sm tracking-wider text-white">
                NOS
              </span>
              <span className="text-[10px] block text-blue-400 font-mono font-medium">
                NEURAL OS
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition"
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
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActiveRoute(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all relative ${
                active
                  ? "bg-blue-600/15 text-blue-400 border-l-4 border-blue-500"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-900 border-l-4 border-transparent"
              } ${collapsed ? "justify-center px-0" : ""}`}
              title={collapsed ? item.name : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? "text-blue-400" : "text-gray-400"
                }`}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Socket.IO Real-time Connection Status Footer */}
      <div className="p-3 border-t border-gray-800/80 bg-gray-950/60">
        <div
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs ${
            isConnected
              ? "bg-emerald-950/30 text-emerald-400 border border-emerald-800/40"
              : "bg-red-950/30 text-red-400 border border-red-800/40"
          } ${collapsed ? "justify-center px-0" : ""}`}
        >
          {isConnected ? (
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
          )}

          {!collapsed && (
            <div className="truncate flex-1">
              <span className="font-semibold block text-[11px]">
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
        className={`hidden md:block shrink-0 transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
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
