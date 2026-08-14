import React from "react";
import { SkeletonCard } from "@/components/SkeletonCard";

export default function DevicesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-80 bg-gray-800/60 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-gray-800 rounded-lg animate-pulse" />
      </div>

      <div className="h-14 w-full bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />

      <SkeletonCard variant="table" />
    </div>
  );
}
