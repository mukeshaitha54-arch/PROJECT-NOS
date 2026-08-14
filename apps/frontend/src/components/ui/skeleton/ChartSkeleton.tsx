import React from 'react';

export function ChartSkeleton() {
  return (
    <div className="w-full h-full min-h-[300px] flex items-end gap-2 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div 
          key={i} 
          className="flex-1 bg-slate-800/50 rounded-t-sm animate-pulse"
          style={{ height: `${Math.max(20, Math.random() * 100)}%` }}
        ></div>
      ))}
    </div>
  );
}
