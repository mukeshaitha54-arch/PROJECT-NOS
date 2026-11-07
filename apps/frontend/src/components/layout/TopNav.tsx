"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Bell,
  User,
  LogOut,
  Command as CommandIcon,
} from "lucide-react";
import { CommandPalette } from "./CommandPalette";

export function TopNav() {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 bg-[#0e0f14]/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="flex-1 flex items-center">
          {/* Global Search Bar (Visual trigger for Command Palette) */}
          <div className="max-w-xl w-full relative group">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full flex items-center px-4 py-2 bg-[#15161c]/80 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-xl text-sm text-slate-400 hover:border-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/30 active:scale-[0.99]"
            >
              <Search className="h-4 w-4 mr-3 text-slate-500" />
              <span className="flex-1 text-left text-xs">
                Search devices, users, alerts...
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-mono text-[10px] font-medium text-slate-400">
                <span className="text-xs">Ctrl</span>K
              </kbd>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="text-slate-400 hover:text-white transition-colors relative p-2 rounded-xl hover:bg-white/5">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0e0f14]"></span>
          </button>

          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-600 flex items-center justify-center text-sm font-medium text-white shadow-md shadow-orange-500/20 cursor-pointer">
            <User className="h-4 w-4" />
          </div>
        </div>
      </header>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </>
  );
}
