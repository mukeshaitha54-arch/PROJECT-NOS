import React from 'react';

interface SkeletonProps {
  className?: string;
  lines?: number;
  height?: string;
}

export function Skeleton({ className = '', height = 'h-4' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-800/60 ${height} ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
      <Skeleton className="w-1/3" height="h-5" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={i === rows - 1 ? 'w-2/3' : 'w-full'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b border-slate-800">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="flex-1" height="h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={`flex-1 ${c === 0 ? '' : 'opacity-70'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
