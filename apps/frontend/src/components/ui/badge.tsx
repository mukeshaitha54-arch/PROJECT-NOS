import React from 'react';

type BadgeVariant =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'online'
  | 'offline'
  | 'degraded'
  | 'maintenance'
  | 'retired'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  critical:    'bg-red-500/15    text-red-400    border-red-500/30    ring-red-500/20',
  high:        'bg-orange-500/15 text-orange-400 border-orange-500/30 ring-orange-500/20',
  medium:      'bg-amber-500/15  text-amber-400  border-amber-500/30  ring-amber-500/20',
  low:         'bg-slate-500/15  text-slate-400  border-slate-500/30  ring-slate-500/20',
  online:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-emerald-500/20',
  offline:     'bg-red-500/15    text-red-400    border-red-500/30    ring-red-500/20',
  degraded:    'bg-amber-500/15  text-amber-400  border-amber-500/30  ring-amber-500/20',
  maintenance: 'bg-blue-500/15   text-blue-400   border-blue-500/30   ring-blue-500/20',
  retired:     'bg-slate-600/15  text-slate-500  border-slate-600/30  ring-slate-600/20',
  success:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 ring-emerald-500/20',
  warning:     'bg-amber-500/15  text-amber-400  border-amber-500/30  ring-amber-500/20',
  info:        'bg-cyan-500/15   text-cyan-400   border-cyan-500/30   ring-cyan-500/20',
  neutral:     'bg-slate-700/40  text-slate-400  border-slate-600/40  ring-slate-600/20',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

const SIZE_CLASSES = {
  xs: 'px-1.5 py-0.5 text-[10px] font-semibold tracking-wider',
  sm: 'px-2 py-0.5 text-xs font-semibold tracking-wide',
  md: 'px-2.5 py-1 text-xs font-semibold tracking-wide',
};

export function Badge({
  variant = 'neutral',
  children,
  className = '',
  dot = false,
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border uppercase
        ${SIZE_CLASSES[size]}
        ${VARIANT_CLASSES[variant]}
        ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            variant === 'online' ? 'bg-emerald-400 animate-pulse' :
            variant === 'offline' ? 'bg-red-400' :
            variant === 'degraded' ? 'bg-amber-400 animate-pulse' :
            'bg-current opacity-80'
          }`}
        />
      )}
      {children}
    </span>
  );
}

/** Map common status strings to badge variants */
export function statusToBadgeVariant(status: string): BadgeVariant {
  const s = status?.toUpperCase();
  if (s === 'ONLINE') return 'online';
  if (s === 'OFFLINE') return 'offline';
  if (s === 'DEGRADED') return 'degraded';
  if (s === 'MAINTENANCE') return 'maintenance';
  if (s === 'RETIRED') return 'retired';
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MEDIUM') return 'medium';
  if (s === 'LOW') return 'low';
  if (s === 'ACTIVE' || s === 'RUNNING') return 'success';
  if (s === 'STOPPED' || s === 'FAILED') return 'critical';
  if (s === 'WARNING') return 'warning';
  return 'neutral';
}
