import React from "react";
import { AlertTriangle } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center py-16 px-8 text-center overflow-hidden ${className}`}
      role="status"
      aria-label={title}
    >
      {/* Subtle ambient radial light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      {/* Glassy icon container with specular highlight */}
      <div className="relative w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-md flex items-center justify-center mb-4 text-slate-400 group-hover:scale-105 transition-[transform,border-color] duration-200">
        <div className="w-8 h-8 rounded-xl bg-slate-900/60 flex items-center justify-center">
          {icon ?? <AlertTriangle className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-200 tracking-tight mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
