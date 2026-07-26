'use client';

import { RuleHealthDto } from '@nos/shared-types';

interface RuleHealthBadgeProps {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  redisConnected?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG = {
  HEALTHY: {
    label: 'Healthy',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
    glow: '0 0 10px rgba(16, 185, 129, 0.3)',
    icon: '●',
    pulse: '#10b981',
  },
  DEGRADED: {
    label: 'Degraded',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    glow: '0 0 10px rgba(245, 158, 11, 0.3)',
    icon: '◐',
    pulse: '#f59e0b',
  },
  CRITICAL: {
    label: 'Critical',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
    glow: '0 0 10px rgba(239, 68, 68, 0.3)',
    icon: '⊗',
    pulse: '#ef4444',
  },
};

export function RuleHealthBadge({ status, redisConnected = true, compact = false }: RuleHealthBadgeProps) {
  const cfg = STATUS_CONFIG[status];

  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 10px',
          borderRadius: '20px',
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          color: cfg.color,
          fontSize: '11px',
          fontWeight: 700,
          boxShadow: cfg.glow,
          letterSpacing: '0.04em',
          userSelect: 'none',
        }}
        title={`Rule Engine Health: ${cfg.label}`}
      >
        <span style={{ fontSize: '8px', color: cfg.color, animation: status === 'HEALTHY' ? 'pulse 2s infinite' : 'none' }}>
          ●
        </span>
        {cfg.label}
      </span>
    );
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      padding: '8px 16px',
      borderRadius: '12px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      boxShadow: cfg.glow,
    }}>
      <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: cfg.color,
        boxShadow: `0 0 6px ${cfg.color}`,
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>
          Rule Engine: {cfg.label}
        </div>
        {!redisConnected && (
          <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
            ⚠ Redis Offline — Fallback Mode Active
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Full Health Summary Card ─────────────────────────────

interface RuleHealthSummaryProps {
  health: RuleHealthDto;
}

export function RuleHealthSummaryCard({ health }: RuleHealthSummaryProps) {
  const metrics = [
    { label: 'Active Rules', value: health.activeRules, color: '#10b981' },
    { label: 'Disabled', value: health.disabledRules, color: '#64748b' },
    { label: 'Archived', value: health.archivedRules, color: '#475569' },
    { label: 'Conflicting', value: health.conflictingRules, color: health.conflictingRules > 0 ? '#f59e0b' : '#64748b' },
    { label: 'Duplicates', value: health.duplicateRules, color: health.duplicateRules > 0 ? '#ef4444' : '#64748b' },
    { label: 'Avg Eval', value: `${health.avgEvaluationMs.toFixed(1)}ms`, color: health.avgEvaluationMs > 300 ? '#f97316' : '#10b981' },
  ];

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Rule Engine Health</span>
        <RuleHealthBadge status={health.overallStatus} redisConnected={health.redis?.connected} compact />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <span style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: m.color, fontFamily: 'monospace' }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Redis Health */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '8px',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: health.redis?.connected ? '#10b981' : '#ef4444',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Redis: {health.redis?.connected ? (
            <>Connected · {health.redis.latencyMs}ms latency · {(health.redis.memoryUsageBytes / 1024 / 1024).toFixed(1)}MB</>
          ) : 'Offline — Fallback Mode'}
        </span>
      </div>

      {/* Slow Rules Warning */}
      {health.slowRules?.length > 0 && (
        <div style={{
          padding: '10px 12px',
          background: 'rgba(249, 115, 22, 0.06)',
          border: '1px solid rgba(249, 115, 22, 0.2)',
          borderRadius: '8px',
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#f97316', marginBottom: '6px' }}>
            ⚠ {health.slowRules.length} Slow Rule{health.slowRules.length !== 1 ? 's' : ''} Detected
          </div>
          {health.slowRules.slice(0, 3).map(r => (
            <div key={r.id} style={{ fontSize: '11px', color: '#94a3b8', paddingLeft: '8px' }}>
              • {r.name} — {r.avgExecMs.toFixed(1)}ms avg
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: '10px', color: '#475569', textAlign: 'right' }}>
        Checked at {new Date(health.lastCheckedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
