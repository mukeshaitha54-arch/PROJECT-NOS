'use client';

import { RuleComplexityScore } from '@nos/shared-types';

interface RuleComplexityBadgeProps {
  score: RuleComplexityScore | string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const scoreConfig: Record<string, { label: string; color: string; bg: string; border: string; glow: string }> = {
  [RuleComplexityScore.SIMPLE]: {
    label: 'Simple',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    glow: '0 0 8px rgba(16, 185, 129, 0.25)',
  },
  [RuleComplexityScore.MEDIUM]: {
    label: 'Medium',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    glow: '0 0 8px rgba(245, 158, 11, 0.25)',
  },
  [RuleComplexityScore.COMPLEX]: {
    label: 'Complex',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.35)',
    glow: '0 0 8px rgba(249, 115, 22, 0.25)',
  },
  [RuleComplexityScore.VERY_COMPLEX]: {
    label: 'Very Complex',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.35)',
    glow: '0 0 8px rgba(239, 68, 68, 0.25)',
  },
};

export function RuleComplexityBadge({ score, showLabel = true, size = 'sm' }: RuleComplexityBadgeProps) {
  const cfg = scoreConfig[score] || scoreConfig[RuleComplexityScore.SIMPLE];

  const sizeStyles: Record<string, { padding: string; fontSize: string; dotSize: string }> = {
    sm: { padding: '2px 8px', fontSize: '11px', dotSize: '6px' },
    md: { padding: '4px 12px', fontSize: '12px', dotSize: '7px' },
    lg: { padding: '6px 16px', fontSize: '13px', dotSize: '8px' },
  };
  const sz = sizeStyles[size];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: sz.padding,
        borderRadius: '20px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: sz.fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-mono, monospace)',
        letterSpacing: '0.02em',
        boxShadow: cfg.glow,
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
      title={`Rule Complexity: ${cfg.label}`}
    >
      <span
        style={{
          width: sz.dotSize,
          height: sz.dotSize,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
          boxShadow: `0 0 4px ${cfg.color}`,
        }}
      />
      {showLabel && cfg.label}
    </span>
  );
}
