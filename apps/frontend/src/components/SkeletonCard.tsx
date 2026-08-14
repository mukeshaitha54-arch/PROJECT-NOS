"use client";

import React from "react";
import { Card } from "./ui/card";

export type SkeletonVariant = "metric" | "chart" | "table" | "device";

interface SkeletonCardProps {
  variant?: SkeletonVariant;
  className?: string;
  count?: number;
}

export function SkeletonCard({
  variant = "metric",
  className = "",
  count = 1,
}: SkeletonCardProps) {
  const renderSingle = (key: number) => {
    switch (variant) {
      case "metric":
        return (
          <Card
            key={key}
            className={`p-5 bg-gray-900/80 border-gray-800 animate-pulse space-y-3 ${className}`}
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-gray-800 rounded" />
              <div className="h-8 w-8 bg-gray-800 rounded-lg" />
            </div>
            <div className="h-8 w-20 bg-gray-800 rounded" />
            <div className="h-3 w-36 bg-gray-800/60 rounded" />
          </Card>
        );

      case "chart":
        return (
          <Card
            key={key}
            className={`p-5 bg-gray-900/80 border-gray-800 animate-pulse space-y-4 ${className}`}
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="h-5 w-36 bg-gray-800 rounded" />
              <div className="h-6 w-24 bg-gray-800 rounded-lg" />
            </div>
            <div className="h-64 w-full bg-gray-800/40 rounded-xl flex items-end p-4 gap-2">
              <div className="h-1/3 flex-1 bg-gray-800/60 rounded-t" />
              <div className="h-2/3 flex-1 bg-gray-800/60 rounded-t" />
              <div className="h-1/2 flex-1 bg-gray-800/60 rounded-t" />
              <div className="h-3/4 flex-1 bg-gray-800/60 rounded-t" />
              <div className="h-4/5 flex-1 bg-gray-800/60 rounded-t" />
              <div className="h-2/5 flex-1 bg-gray-800/60 rounded-t" />
            </div>
          </Card>
        );

      case "device":
        return (
          <Card
            key={key}
            className={`p-4 bg-gray-900/80 border-gray-800 animate-pulse space-y-3 ${className}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gray-800" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 bg-gray-800 rounded" />
                  <div className="h-3 w-20 bg-gray-800/60 rounded" />
                </div>
              </div>
              <div className="h-5 w-14 bg-gray-800 rounded-full" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-2 w-full bg-gray-800 rounded-full" />
              <div className="h-2 w-full bg-gray-800 rounded-full" />
            </div>
          </Card>
        );

      case "table":
        return (
          <div
            key={key}
            className={`bg-gray-900/80 border border-gray-800 rounded-xl p-4 animate-pulse space-y-4 ${className}`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="h-8 w-48 bg-gray-800 rounded-lg" />
              <div className="h-8 w-24 bg-gray-800 rounded-lg" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((row) => (
                <div
                  key={row}
                  className="flex items-center justify-between py-2 border-b border-gray-800/50"
                >
                  <div className="h-4 w-32 bg-gray-800 rounded" />
                  <div className="h-4 w-20 bg-gray-800 rounded" />
                  <div className="h-4 w-24 bg-gray-800 rounded" />
                  <div className="h-4 w-16 bg-gray-800 rounded" />
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <>{Array.from({ length: count }).map((_, idx) => renderSingle(idx))}</>
  );
}
