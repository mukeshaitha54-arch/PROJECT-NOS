"use client";

import React, { useState } from "react";
import {
  Tag,
  Plus,
  Search,
  Filter,
  Server,
  ShieldAlert,
  XCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SmartGroupsPage() {
  const [groups] = useState([
    {
      id: 1,
      name: "Windows Servers",
      description: "All servers running Windows OS",
      rule: 'os == "Windows" AND type == "Server"',
      matchCount: 142,
      icon: Server,
    },
    {
      id: 2,
      name: "BitLocker Disabled",
      description: "Devices without full disk encryption",
      rule: "security.bitlocker == false",
      matchCount: 8,
      icon: ShieldAlert,
      alert: true,
    },
    {
      id: 3,
      name: "TPM Missing",
      description: "Devices failing hardware requirements",
      rule: "hardware.tpm == null",
      matchCount: 3,
      icon: ShieldAlert,
      alert: true,
    },
    {
      id: 4,
      name: "Offline > 7 Days",
      description: "Stale device records",
      rule: 'status == "OFFLINE" AND lastSeen > 7d',
      matchCount: 12,
      icon: XCircle,
      alert: true,
    },
    {
      id: 5,
      name: "Finance Department",
      description: "All Finance assets",
      rule: 'department == "Finance"',
      matchCount: 45,
      icon: Tag,
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-orange-500" /> Smart Groups
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Dynamically group devices based on metadata, telemetry, and security
            posture rules.
          </p>
        </div>
        <Button className="bg-gradient-to-r from-orange-500 via-amber-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 shadow-md shadow-orange-500/20 active:scale-[0.97]">
          <Plus className="w-4 h-4 mr-2" /> Create Smart Group
        </Button>
      </div>

      <div className="bg-[#111217]/70 border border-white/[0.08] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/[0.08] flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/[0.03]/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="search"
              placeholder="Search smart groups..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-orange-500/20 text-sm text-gray-200 focus:border-orange-500/60 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className="border-orange-500/20 text-gray-300 w-full sm:w-auto shrink-0 active:scale-[0.97]"
            >
              <Filter className="w-4 h-4 mr-2" /> Filters
            </Button>
            <Button
              variant="outline"
              className="border-orange-500/20 text-gray-300 w-full sm:w-auto shrink-0 active:scale-[0.97]"
            >
              <FileText className="w-4 h-4 mr-2" /> Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {groups.map((g) => {
            const Icon = g.icon;
            return (
              <div
                key={g.id}
                className="bg-[#15161c]/60 border border-white/[0.08] rounded-xl p-5 hover:bg-[#1a1b24] transition-colors group cursor-pointer relative overflow-hidden active:scale-[0.98]"
              >
                {g.alert && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
                )}
                {!g.alert && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500"></div>
                )}

                <div className="flex justify-between items-start mb-4 mt-2">
                  <div
                    className={`p-2 rounded-lg ${g.alert ? "bg-rose-500/20 text-rose-400" : "bg-orange-500/20 text-orange-400"}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white font-mono">
                      {g.matchCount}
                    </div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
                      Matches
                    </div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-orange-400 transition-colors">
                  {g.name}
                </h3>
                <p className="text-sm text-gray-400 mb-4 line-clamp-1">
                  {g.description}
                </p>

                <div className="bg-white/[0.03] rounded-lg p-3 border border-orange-500/20">
                  <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">
                    Evaluation Rule
                  </div>
                  <code className="text-xs text-green-400 font-mono break-all">
                    {g.rule}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
