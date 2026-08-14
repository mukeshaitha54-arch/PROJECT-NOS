"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Monitor,
  User,
  Users,
  Building2,
  ShieldAlert,
  Clock,
  Database,
  Activity,
  Key,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { fleetApi, SearchResult } from "@/features/fleet/services/fleet.api";
import { useAuthStore } from "@/features/auth/stores/auth.store";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchSearch = async () => {
      if (query.trim().length < 2 || !user?.organizationId) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await fleetApi.globalSearch(user.organizationId, query);
        setResults(data);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(fetchSearch, 300);
    return () => clearTimeout(debounce);
  }, [query, user]);

  if (!isOpen) return null;

  const handleSelect = (result: SearchResult) => {
    let url = "";
    switch (result.type) {
      case "DEVICE":
        url = `/device/${result.id}`;
        break;
      case "USER":
        url = "/members";
        break;
      case "ALERT":
        url = `/alerts`;
        break;
      case "INVENTORY":
        url = `/inventory`;
        break;
      default:
        url = "/dashboard";
    }
    router.push(url);
    onClose();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "DEVICE":
        return Monitor;
      case "USER":
        return User;
      case "ALERT":
        return ShieldAlert;
      case "INVENTORY":
        return Database;
      default:
        return Search;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] sm:pt-[10vh]">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-gray-900 border border-gray-700 shadow-2xl ring-1 ring-white/10 transition-all mx-4">
        <div className="flex items-center border-b border-gray-800 px-4">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            className="h-14 w-full border-0 bg-transparent px-4 text-white placeholder-gray-400 focus:outline-none sm:text-sm"
            placeholder="Search Devices, Users, Alerts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && (
            <div className="h-4 w-4 rounded-full border-2 border-t-blue-500 border-gray-600 animate-spin mr-3"></div>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {query.length >= 2 && results.length > 0 && (
          <div className="max-h-96 overflow-y-auto p-2">
            <div className="mb-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Search Results
            </div>
            <ul className="space-y-1">
              {results.map((result) => {
                const Icon = getIcon(result.type);
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center px-3 py-3 hover:bg-blue-900/30 rounded-lg text-left group transition-colors"
                    >
                      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-gray-800 group-hover:bg-blue-900/50 text-gray-400 group-hover:text-blue-400 border border-gray-700 group-hover:border-blue-700/50">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="ml-4 flex-auto">
                        <p className="text-sm font-medium text-white group-hover:text-blue-100">
                          {result.title}
                        </p>
                        <p className="text-xs text-gray-400 group-hover:text-blue-300">
                          {result.subtitle}
                        </p>
                      </div>
                      <div className="text-xs font-mono text-gray-500 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Enter ↵
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {query.length >= 2 && results.length === 0 && !isLoading && (
          <div className="py-14 px-6 text-center text-sm sm:px-14">
            <Search className="mx-auto h-6 w-6 text-gray-500" />
            <p className="mt-4 font-semibold text-gray-200">No results found</p>
            <p className="mt-2 text-gray-400">
              We couldn&apos;t find anything matching &quot;{query}&quot;.
            </p>
          </div>
        )}

        {query.length < 2 && (
          <div className="px-4 py-6 text-center sm:px-14">
            <p className="text-sm text-gray-400">
              Try searching for <span className="text-gray-200">PC-1045</span>,{" "}
              <span className="text-gray-200">Sarah</span>, or{" "}
              <span className="text-gray-200">High CPU</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
