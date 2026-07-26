'use client';

import { QueueDashboardDto, RuleHealthQueueInfo } from '@nos/shared-types';

interface RuleUsagePanelProps {
  dashboard: QueueDashboardDto;
  onRetryJob?: (queueName: string, jobId: string) => void;
  onPurge?: (queueName: string) => void;
  canPurge?: boolean;
}

const QUEUE_ICONS: Record<string, string> = {
  AlertProcessingQueue: '🔔',
  NotificationQueue: '📬',
  RetryQueue: '↻',
  DeadLetterQueue: '💀',
};

function QueueCard({
  queue,
  onPurge,
  canPurge,
}: {
  queue: RuleHealthQueueInfo;
  onPurge?: () => void;
  canPurge?: boolean;
}) {
  const hasFailures = queue.failed > 0;
  const isBacklogged = queue.waiting > 50;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${hasFailures ? 'rgba(239,68,68,0.25)' : isBacklogged ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '12px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {/* Queue Name */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '16px' }}>{QUEUE_ICONS[queue.name] || '📋'}</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>
            {queue.name.replace('Queue', '').replace(/([A-Z])/g, ' $1').trim()}
          </span>
        </div>
        {hasFailures && canPurge && onPurge && (
          <button
            onClick={onPurge}
            title="Purge failed jobs (Admin only)"
            style={{
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#ef4444',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Purge
          </button>
        )}
      </div>

      {/* Counts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
        {[
          { label: 'Wait', value: queue.waiting, color: queue.waiting > 50 ? '#f59e0b' : '#94a3b8' },
          { label: 'Active', value: queue.active, color: queue.active > 0 ? '#22d3ee' : '#94a3b8' },
          { label: 'Done', value: queue.completed, color: '#10b981' },
          { label: 'Failed', value: queue.failed, color: queue.failed > 0 ? '#ef4444' : '#94a3b8' },
          { label: 'Delay', value: queue.delayed, color: '#a78bfa' },
        ].map(m => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: m.color, fontFamily: 'monospace', lineHeight: 1 }}>
              {m.value}
            </div>
            <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {m.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RuleUsagePanel({ dashboard, onPurge, canPurge = false }: RuleUsagePanelProps) {
  const STATUS_COLOR = {
    HEALTHY: '#10b981',
    DEGRADED: '#f59e0b',
    CRITICAL: '#ef4444',
  };

  const statusColor = STATUS_COLOR[dashboard.healthStatus] || '#94a3b8';

  const queues = [
    dashboard.alertQueue,
    dashboard.notificationQueue,
    dashboard.retryQueue,
    dashboard.deadLetterQueue,
  ];

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Queue Dashboard</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
            {dashboard.totalWaiting} waiting · {dashboard.totalActive} active · {dashboard.totalFailed} failed
          </div>
        </div>
        <span style={{
          padding: '4px 12px',
          borderRadius: '20px',
          background: `${statusColor}15`,
          border: `1px solid ${statusColor}35`,
          color: statusColor,
          fontSize: '11px',
          fontWeight: 700,
        }}>
          {dashboard.healthStatus}
        </span>
      </div>

      {/* Queue Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {queues.map(q => (
          <QueueCard
            key={q.name}
            queue={q}
            onPurge={onPurge ? () => onPurge(q.name) : undefined}
            canPurge={canPurge}
          />
        ))}
      </div>

      {/* Redis Health */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: dashboard.redis.connected ? '#10b981' : '#ef4444',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>
            Redis {dashboard.redis.connected ? 'Connected' : 'Offline'}
          </span>
        </div>
        {dashboard.redis.connected && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {[
              { label: 'Memory', value: `${(dashboard.redis.memoryUsageBytes / 1024 / 1024).toFixed(1)}MB` },
              { label: 'Latency', value: `${dashboard.redis.latencyMs}ms` },
              { label: 'Clients', value: String(dashboard.redis.connectedClients) },
              { label: 'Uptime', value: `${Math.round(dashboard.redis.uptimeSeconds / 3600)}h` },
            ].map(m => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{m.value}</div>
                <div style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', marginTop: '2px' }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ fontSize: '10px', color: '#475569', textAlign: 'right' }}>
        Updated {new Date(dashboard.lastUpdatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}
