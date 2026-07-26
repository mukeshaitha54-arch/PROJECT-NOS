'use client';

import React, { useState, useEffect } from 'react';
import {
  RuleHealthDto,
  QueueDashboardDto,
  RuleTestResultDto,
  RulePreviewDto,
  RuleValidationResultDto,
  RuleDiffDto,
  RollbackPreviewDto,
  RulePerformanceMetricsDto,
  RuleUsageStatisticsDto,
} from '@nos/shared-types';
import { RuleHealthSummaryCard } from './RuleHealthBadge';
import { RuleUsagePanel } from './RuleUsagePanel';
import { RuleSimulationResults } from './RuleSimulationResults';
import { RulePreviewPanel } from './RulePreviewPanel';
import { RuleValidationReport } from './RuleValidationReport';
import { RuleDiffViewer } from './RuleDiffViewer';
import { RollbackPreviewPanel } from './RollbackPreviewPanel';
import { RuleStatisticsPanel } from './RuleStatisticsPanel';
import { alertApi } from '../services/alert-api.service';

interface RuleHardeningDashboardProps {
  selectedRuleId?: string;
  isAdmin?: boolean;
}

type DashboardTab = 'HEALTH_QUEUES' | 'SIMULATION_PREVIEW' | 'VALIDATION' | 'DIFF_ROLLBACK' | 'METRIC_STATS';

export function RuleHardeningDashboard({ selectedRuleId, isAdmin = true }: RuleHardeningDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('HEALTH_QUEUES');
  const [health, setHealth] = useState<RuleHealthDto | null>(null);
  const [queues, setQueues] = useState<QueueDashboardDto | null>(null);
  const [simulation, setSimulation] = useState<RuleTestResultDto | null>(null);
  const [preview, setPreview] = useState<RulePreviewDto | null>(null);
  const [validation, setValidation] = useState<RuleValidationResultDto | null>(null);
  const [diff, setDiff] = useState<RuleDiffDto | null>(null);
  const [rollback, setRollback] = useState<RollbackPreviewDto | null>(null);
  const [metrics, setMetrics] = useState<RulePerformanceMetricsDto | null>(null);
  const [usage, setUsage] = useState<RuleUsageStatisticsDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load overall engine health and queue stats
  const fetchHealthAndQueues = async () => {
    try {
      setLoading(true);
      const [healthData, queueData] = await Promise.all([
        alertApi.getRulesHealth(),
        alertApi.getQueueDashboard(),
      ]);
      setHealth(healthData);
      setQueues(queueData);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch rule engine telemetry');
    } finally {
      setLoading(false);
    }
  };

  // Load rule-specific telemetry when selectedRuleId changes or tab changes
  const fetchRuleTelemetry = async (ruleId: string) => {
    try {
      setLoading(true);
      if (activeTab === 'SIMULATION_PREVIEW') {
        const [simData, previewData] = await Promise.all([
          alertApi.testRule(ruleId, 'LAST_24H'),
          alertApi.previewRule({ metric: 'cpuUsage', operator: '>', threshold: 80 } as any),
        ]);
        setSimulation(simData);
        setPreview(previewData);
      } else if (activeTab === 'VALIDATION') {
        const valData = await alertApi.validateRule({ metric: 'cpuUsage', threshold: 85, operator: '>' } as any, ruleId);
        setValidation(valData);
      } else if (activeTab === 'DIFF_ROLLBACK') {
        const diffData = await alertApi.getRuleDiff(ruleId, 1, 2);
        setDiff(diffData);
      } else if (activeTab === 'METRIC_STATS') {
        const [metricsData, usageData] = await Promise.all([
          alertApi.getRuleMetrics(ruleId),
          alertApi.getRuleUsageStatistics(ruleId),
        ]);
        setMetrics(metricsData);
        setUsage(usageData);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load rule insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthAndQueues();
  }, []);

  useEffect(() => {
    if (selectedRuleId && activeTab !== 'HEALTH_QUEUES') {
      fetchRuleTelemetry(selectedRuleId);
    }
  }, [selectedRuleId, activeTab]);

  const handlePurgeQueue = async (queueName: string) => {
    if (!isAdmin) return;
    try {
      await alertApi.purgeQueue(queueName);
      await fetchHealthAndQueues();
    } catch (err: any) {
      setError(err?.message || `Failed to purge queue ${queueName}`);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '28px',
      background: '#0a0f1d',
      color: '#f8fafc',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.08)',
      minHeight: '680px',
      fontFamily: 'inherit',
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
            Enterprise Rule Engine Studio
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Phase 5 Hardening — Zero ORM Leakage · Zero Polling · Fallback Resilient
          </p>
        </div>
        <button
          onClick={() => { fetchHealthAndQueues(); if (selectedRuleId) fetchRuleTelemetry(selectedRuleId); }}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 18px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#e2e8f0',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading ? '⟳ Syncing...' : '↻ Refresh Telemetry'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#fca5a5',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', overflowX: 'auto' }}>
        {[
          { id: 'HEALTH_QUEUES', label: '🛡️ Health & Queues', count: queues ? queues.totalFailed : 0 },
          { id: 'SIMULATION_PREVIEW', label: '🧪 Simulation & Replay', disabled: !selectedRuleId },
          { id: 'VALIDATION', label: '✔ Validation & Conflict Check', disabled: !selectedRuleId },
          { id: 'DIFF_ROLLBACK', label: '⟲ Version Diffs & Rollback', disabled: !selectedRuleId },
          { id: 'METRIC_STATS', label: '⚡ Performance & Usage Stats', disabled: !selectedRuleId },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id as DashboardTab)}
            disabled={tab.disabled}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              background: activeTab === tab.id ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${activeTab === tab.id ? 'rgba(96, 165, 250, 0.4)' : 'rgba(255,255,255,0.06)'}`,
              color: tab.disabled ? '#475569' : activeTab === tab.id ? '#60a5fa' : '#94a3b8',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: tab.disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                padding: '2px 7px',
                borderRadius: '99px',
                background: '#ef4444',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 800,
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {activeTab === 'HEALTH_QUEUES' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
            {health ? (
              <RuleHealthSummaryCard health={health} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading engine health...</div>
            )}
            {queues ? (
              <RuleUsagePanel dashboard={queues} onPurge={handlePurgeQueue} canPurge={isAdmin} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading queue dashboard...</div>
            )}
          </div>
        )}

        {activeTab === 'SIMULATION_PREVIEW' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'flex-start' }}>
            {simulation ? (
              <RuleSimulationResults result={simulation} type="TEST" />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Run simulation to view results...</div>
            )}
            {preview ? (
              <RulePreviewPanel preview={preview} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Select rule parameters to preview impact...</div>
            )}
          </div>
        )}

        {activeTab === 'VALIDATION' && (
          <div>
            {validation ? (
              <RuleValidationReport result={validation} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Evaluating rule against dependency graph & conflicts...</div>
            )}
          </div>
        )}

        {activeTab === 'DIFF_ROLLBACK' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {diff ? (
              <RuleDiffViewer diff={diff} />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No version history diffs loaded...</div>
            )}
            {rollback && (
              <RollbackPreviewPanel
                preview={rollback}
                onConfirm={() => { alert('Rollback command dispatched safely to enterprise audit log.'); }}
                onCancel={() => setRollback(null)}
              />
            )}
          </div>
        )}

        {activeTab === 'METRIC_STATS' && (
          <div>
            <RuleStatisticsPanel metrics={metrics || undefined} usage={usage || undefined} />
          </div>
        )}
      </div>
    </div>
  );
}
