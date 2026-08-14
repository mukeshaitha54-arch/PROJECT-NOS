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
      <header className="h-16 flex items-center justify-between px-6 bg-gray-900 border-b border-gray-800">
        <div className="flex-1 flex items-center">
          {/* Global Search Bar (Visual trigger for Command Palette) */}
          <div className="max-w-xl w-full relative group">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="w-full flex items-center px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Search className="h-4 w-4 mr-3 text-gray-500" />
              <span className="flex-1 text-left">
                Search devices, users, alerts...
              </span>
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-gray-700 bg-gray-800 px-1.5 font-mono text-[10px] font-medium text-gray-400 opacity-100">
                <span className="text-xs">Ctrl</span>K
              </kbd>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="text-gray-400 hover:text-white transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-900"></span>
          </button>

          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium text-white border border-gray-700 cursor-pointer">
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
