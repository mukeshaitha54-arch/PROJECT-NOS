"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { SkeletonCard } from "./SkeletonCard";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  timeRangeOptions?: string[];
  loading?: boolean;
  action?: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  timeRange,
  onTimeRangeChange,
  timeRangeOptions = ["1h", "6h", "24h", "7d"],
  loading = false,
  action,
}: ChartCardProps) {
  if (loading) {
    return <SkeletonCard variant="chart" className={className} />;
  }

  return (
    <Card
      className={`bg-gray-900/90 border-gray-800 rounded-xl overflow-hidden shadow-xl ${className}`}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b border-gray-800/60 bg-gray-950/30">
        <div>
          <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {action}
          {timeRange && onTimeRangeChange && (
            <div className="flex items-center bg-gray-800/80 p-0.5 rounded-lg border border-gray-700/60 text-xs">
              {timeRangeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onTimeRangeChange(opt)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    timeRange === opt
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}
