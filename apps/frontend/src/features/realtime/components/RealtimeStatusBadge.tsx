'use client';

import React from 'react';
import { useSocket } from '../hooks/useSocket';

export const RealtimeStatusBadge: React.FC = () => {
  const { status, latencyMs } = useSocket();

  const getBadgeStyles = () => {
    switch (status) {
      case 'LIVE':
        return {
          bgColor: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dotColor: 'bg-emerald-500 animate-pulse',
          label: 'Socket Live',
        };
      case 'RECONNECTING':
        return {
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dotColor: 'bg-amber-500 animate-bounce',
          label: 'Reconnecting...',
        };
      case 'UNAUTHORIZED':
        return {
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dotColor: 'bg-rose-500',
          label: 'Unauthorized Socket',
        };
      case 'OFFLINE':
      default:
        return {
          bgColor: 'bg-slate-700/30 border-slate-600/30 text-slate-400',
          dotColor: 'bg-slate-500',
          label: 'Socket Offline',
        };
    }
  };

  const { bgColor, dotColor, label } = getBadgeStyles();

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-mono tracking-wider transition-colors duration-200 ${bgColor}`}>
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="font-semibold">{label}</span>
      {status === 'LIVE' && latencyMs > 0 && (
        <span className="text-slate-400 border-l border-emerald-500/20 pl-2">
          {latencyMs}ms
        </span>
      )}
    </div>
  );
};
