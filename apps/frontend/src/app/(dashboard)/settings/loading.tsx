import React from "react";
import { SkeletonCard } from "@/components/SkeletonCard";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="space-y-2">
        <div className="h-7 w-64 bg-gray-800 rounded animate-pulse" />
        <div className="h-4 w-96 bg-gray-800/60 rounded animate-pulse" />
      </div>

      <div className="space-y-6">
        <SkeletonCard variant="table" count={3} />
      </div>
    </div>
  );
}
