'use client';

import { RuleTestResultDto } from '@nos/shared-types';

interface RuleSimulationResultsProps {
  result: RuleTestResultDto;
  type?: 'TEST' | 'REPLAY' | 'DRY_RUN';
}

function MetricRow({ label, value, accent = '#94a3b8', mono = false }: {
  label: string;
  value: string | number;
  accent?: string;
  mono?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 12px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <span style={{ fontSize: '12px', color: '#64748b' }}>{label}</span>
      <span style={{
        fontSize: '13px',
        fontWeight: 700,
        color: accent,
        fontFamily: mono ? 'monospace' : 'inherit',
      }}>
        {value}
      </span>
    </div>
  );
}

export function RuleSimulationResults({ result, type = 'TEST' }: RuleSimulationResultsProps) {
  const typeLabels = {
    TEST: { title: 'Simulation Test Results', icon: '🧪', color: '#60a5fa' },
    REPLAY: { title: 'Historical Replay Results', icon: '⟳', color: '#a78bfa' },
    DRY_RUN: { title: 'Dry Run Results', icon: '🔬', color: '#22d3ee' },
  };
  const cfg = typeLabels[type];

  const noiseReduction = result.noiseReduction;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      background: 'rgba(15, 23, 42, 0.85)',
      border: `1px solid ${cfg.color}25`,
      borderRadius: '16px',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: cfg.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{cfg.icon}</span>
            {cfg.title}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
            Rule: <span style={{ color: '#94a3b8' }}>{result.ruleName}</span>
            {result.fromDate && (
              <> · <span style={{ color: '#94a3b8' }}>{new Date(result.fromDate).toLocaleDateString()} → {new Date(result.toDate).toLocaleDateString()}</span></>
            )}
          </div>
        </div>
        <div style={{
          display: 'flex',
          gap: '4px',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '11px',
          color: '#64748b',
        }}>
          ⏱ {result.simulationDurationMs}ms
        </div>
      </div>

      {/* Zero-storage banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'rgba(16, 185, 129, 0.06)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#10b981',
        fontWeight: 600,
      }}>
        ✓ Simulation only — no alerts stored · no notifications sent · no state modified
      </div>

      {/* Primary Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <MetricRow label="Would Trigger" value={result.wouldTrigger} accent="#f97316" />
        <MetricRow label="Suppressed" value={result.suppressed} accent="#f59e0b" />
        <MetricRow label="Correlated" value={result.correlated} accent="#a78bfa" />
        <MetricRow label="Deduplicated" value={result.deduplicated} accent="#22d3ee" />
        <MetricRow label="Escalated" value={result.escalated} accent="#ef4444" />
        <MetricRow label="Noise Reduction" value={`${noiseReduction}%`} accent="#10b981" />
      </div>

      {/* Notification Estimates */}
      <div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Estimated Notifications
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <MetricRow label="Notifications" value={result.estimatedNotifications} accent="#60a5fa" />
          <MetricRow label="Emails" value={result.estimatedEmails} accent="#34d399" />
          <MetricRow label="Socket Events" value={result.estimatedSocketEvents} accent="#fb923c" />
          <MetricRow label="Queue Jobs" value={result.estimatedQueueJobs} accent="#c084fc" />
        </div>
      </div>

      {/* Affected Devices */}
      {result.affectedDevices?.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
            Affected Device IDs ({result.affectedDevices.length})
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {result.affectedDevices.slice(0, 8).map(id => (
              <span key={id} style={{
                padding: '2px 8px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '10px',
                color: '#64748b',
                fontFamily: 'monospace',
              }}>
                {id.slice(0, 8)}…
              </span>
            ))}
            {result.affectedDevices.length > 8 && (
              <span style={{ fontSize: '11px', color: '#475569', alignSelf: 'center' }}>
                +{result.affectedDevices.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
