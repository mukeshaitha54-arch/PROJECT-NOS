import React from "react";

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 shadow-xl flex flex-col justify-between h-32"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-slate-800/50 rounded animate-pulse"></div>
            <div className="h-8 w-8 bg-slate-800/50 rounded-lg animate-pulse"></div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div className="h-8 w-16 bg-slate-800/50 rounded animate-pulse"></div>
            <div className="h-4 w-20 bg-slate-800/50 rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
