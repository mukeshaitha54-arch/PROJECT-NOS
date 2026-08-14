import React from "react";
import { SkeletonCard } from "@/components/SkeletonCard";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-96 bg-gray-800/60 rounded animate-pulse" />
        </div>
        <div className="h-8 w-28 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard variant="metric" count={4} />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SkeletonCard variant="chart" className="lg:col-span-2" />
        <SkeletonCard variant="chart" />
      </div>

      {/* Table Skeleton */}
      <SkeletonCard variant="table" />
    </div>
  );
}
