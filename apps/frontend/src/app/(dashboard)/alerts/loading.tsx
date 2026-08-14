import React from "react";
import { SkeletonCard } from "@/components/SkeletonCard";

export default function AlertsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-96 bg-gray-800/60 rounded animate-pulse" />
        </div>
        <div className="h-8 w-24 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      <div className="h-14 w-full bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gray-800" />
              <div className="h-4 w-48 bg-gray-800 rounded" />
            </div>
            <div className="h-3 w-72 bg-gray-800/60 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
