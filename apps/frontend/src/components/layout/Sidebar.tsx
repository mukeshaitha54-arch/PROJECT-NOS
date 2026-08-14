"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Server,
  ShieldAlert,
  Database,
  Settings,
  Users,
  Network,
  Activity,
  Key,
  ShieldCheck,
  Tag,
} from "lucide-react";

const mainLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fleet", label: "Fleet", icon: Network },
  { href: "/device", label: "Devices", icon: Server },
  { href: "/inventory", label: "Inventory", icon: Database },
  { href: "/alerts", label: "Alerts", icon: ShieldAlert },
  { href: "/audit", label: "Audit", icon: Activity },
  { href: "/smart-groups", label: "Smart Groups", icon: Tag },
];

const organizationLinks = [
  { href: "/members", label: "Members", icon: Users },
  {
    href: "/settings/registration-keys",
    label: "Registration Keys",
    icon: Key,
  },
];

const adminLinks = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  const renderLinks = (links: any[], title: string) => (
    <div className="mb-6">
      <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive =
            pathname === link.href ||
            (link.href !== "/dashboard" && pathname?.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-blue-900/50 text-blue-400"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col w-64 bg-gray-900 border-r border-gray-800 h-screen overflow-y-auto">
      <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-800">
        <Network className="h-8 w-8 text-blue-500" />
        <span className="ml-3 text-xl font-bold text-white">NOS Platform</span>
      </div>
      <div className="flex-1 py-4 px-3">
        {renderLinks(mainLinks, "Operations")}
        {renderLinks(organizationLinks, "Tenant & Access")}
        {renderLinks(adminLinks, "System")}
      </div>
    </div>
  );
}
