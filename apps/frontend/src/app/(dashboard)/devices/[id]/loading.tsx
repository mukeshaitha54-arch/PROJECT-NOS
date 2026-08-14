import React from "react";
import { SkeletonCard } from "@/components/SkeletonCard";

export default function DeviceDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-5">
        <div className="flex items-center gap-4">
          <div className="h-9 w-32 bg-gray-800 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-48 bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-72 bg-gray-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-8 w-28 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* Tabs Skeleton */}
      <div className="h-10 w-80 bg-gray-800/60 rounded-lg animate-pulse" />

      {/* 4 Mini Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard variant="metric" count={4} />
      </div>

      {/* 2 Big Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard variant="chart" count={2} />
      </div>
    </div>
  );
}
