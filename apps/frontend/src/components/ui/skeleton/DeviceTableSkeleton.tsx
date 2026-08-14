import React from "react";

export function DeviceTableSkeleton() {
  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-4">
        <div className="h-10 bg-slate-800/50 rounded-xl animate-pulse w-full max-w-md"></div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 bg-slate-800/50 rounded-xl animate-pulse"></div>
          <div className="h-8 w-24 bg-slate-800/50 rounded-xl animate-pulse"></div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              {Array.from({ length: 7 }).map((_, i) => (
                <th key={i} className="py-4 px-6">
                  <div className="h-4 w-20 bg-slate-800/50 rounded animate-pulse"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="py-4 px-6">
                    <div className="h-5 bg-slate-800/50 rounded animate-pulse w-full"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
