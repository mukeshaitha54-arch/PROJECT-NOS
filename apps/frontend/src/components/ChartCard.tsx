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
      className={`glass-card rounded-2xl overflow-hidden relative border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-8px_rgba(0,0,0,0.6)] ${className}`}
    >
      <CardHeader className="p-5 pb-3 flex flex-row items-center justify-between border-b border-white/[0.06] bg-white/[0.02]">
        <div>
          <CardTitle className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {action}
          {timeRange && onTimeRangeChange && (
            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] text-xs">
              {timeRangeOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => onTimeRangeChange(opt)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium tracking-tight active:scale-[0.96] transition-[background-color,color,transform,box-shadow] duration-140 ease-out ${
                    timeRange === opt
                      ? "bg-blue-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_8px_-2px_rgba(59,130,246,0.5)]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}
