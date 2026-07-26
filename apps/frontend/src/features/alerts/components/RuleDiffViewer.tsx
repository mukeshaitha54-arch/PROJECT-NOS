'use client';

import { RuleDiffDto, RuleFieldDiff } from '@nos/shared-types';

interface RuleDiffViewerProps {
  diff: RuleDiffDto;
  compact?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  threshold: 'Threshold',
  severity: 'Severity',
  cooldownSeconds: 'Cooldown (s)',
  durationSeconds: 'Duration (s)',
  metric: 'Metric',
  operator: 'Operator',
  enabled: 'Enabled',
  priority: 'Priority',
  scheduleMode: 'Schedule Mode',
  timeoutMs: 'Timeout (ms)',
  silentMode: 'Silent Mode',
  businessHoursOnly: 'Business Hours Only',
  name: 'Name',
  description: 'Description',
};

function DiffRow({ diff }: { diff: RuleFieldDiff }) {
  if (!diff.changed) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '140px 1fr 1fr',
      gap: '8px',
      padding: '8px 12px',
      borderRadius: '8px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      alignItems: 'center',
    }}>
      {/* Field Name */}
      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
        {FIELD_LABELS[diff.field] || diff.field}
      </span>

      {/* Old Value */}
      <div style={{
        padding: '3px 8px',
        borderRadius: '6px',
        background: 'rgba(239, 68, 68, 0.08)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ef4444',
        textDecoration: 'line-through',
        opacity: 0.8,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {diff.oldValue !== null && diff.oldValue !== undefined ? String(diff.oldValue) : '—'}
      </div>

      {/* New Value */}
      <div style={{
        padding: '3px 8px',
        borderRadius: '6px',
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#10b981',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {diff.newValue !== null && diff.newValue !== undefined ? String(diff.newValue) : '—'}
      </div>
    </div>
  );
}

export function RuleDiffViewer({ diff, compact = false }: RuleDiffViewerProps) {
  const changedDiffs = diff.diffs.filter(d => d.changed);
  const unchangedCount = diff.diffs.length - changedDiffs.length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      background: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>
            Rule Diff: {diff.ruleName}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            v{diff.fromVersion} → v{diff.toVersion} · {diff.changedBy}
            {diff.fromTimestamp && (
              <span> · {new Date(diff.fromTimestamp).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {diff.totalChanges > 0 ? (
            <span style={{
              padding: '3px 10px',
              borderRadius: '12px',
              background: 'rgba(249, 115, 22, 0.12)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              color: '#f97316',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {diff.totalChanges} Change{diff.totalChanges !== 1 ? 's' : ''}
            </span>
          ) : (
            <span style={{
              padding: '3px 10px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              No Changes
            </span>
          )}
        </div>
      </div>

      {/* Column Headers */}
      {changedDiffs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 1fr',
          gap: '8px',
          padding: '0 12px',
        }}>
          <span style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Field
          </span>
          <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ← Previous
          </span>
          <span style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Current →
          </span>
        </div>
      )}

      {/* Diff Rows */}
      {changedDiffs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {changedDiffs.map(d => <DiffRow key={d.field} diff={d} />)}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: '#475569',
          fontSize: '13px',
        }}>
          No differences found between v{diff.fromVersion} and v{diff.toVersion}
        </div>
      )}

      {/* Footer */}
      {!compact && unchangedCount > 0 && (
        <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center' }}>
          +{unchangedCount} unchanged field{unchangedCount !== 1 ? 's' : ''} not shown
        </div>
      )}
    </div>
  );
}
