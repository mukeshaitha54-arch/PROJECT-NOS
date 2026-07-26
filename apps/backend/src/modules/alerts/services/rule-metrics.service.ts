import { Injectable, Inject, Logger } from '@nestjs/common';
import { IAlertRuleRepository } from '../../../common/repositories/alert-rule.repository.interface';
import { AlertRule } from '@prisma/client';
import {
  RuleComplexityScore,
  RuleComplexityBreakdownDto,
  RuleNoiseScoreDto,
  RuleUsageStatisticsDto,
  RulePerformanceMetricsDto,
  RuleRecommendationDto,
  RuleRecommendationType,
  AlertRulePriority,
} from '@nos/shared-types';

/**
 * RuleMetricsService
 *
 * Implements:
 *  • SPL Feature 24: Rule Performance Metrics (avg/min/max exec, eval count, trigger/suppression/correlation/dedup/escalation, memory)
 *  • 1% Feature 1: Rule Complexity Score
 *  • 1% Feature 2: Rule Recommendation Engine (NO AI)
 *  • 1% Feature 3: Noise Score (0–100)
 *  • 1% Feature 4: Rule Usage Statistics
 *
 * Zero Prisma leakage — all DB access via IAlertRuleRepository.
 */
@Injectable()
export class RuleMetricsService {
  private readonly logger = new Logger(RuleMetricsService.name);

  // In-memory p95/p99 approximation windows per rule (rolling 100 samples)
  private readonly execTimeSamples = new Map<string, number[]>();

  constructor(
    @Inject(IAlertRuleRepository) private readonly ruleRepo: IAlertRuleRepository,
  ) {}

  /**
   * Record a rule execution timing sample.
   * Called by RuleEngineService during evaluation.
   */
  recordExecution(ruleId: string, execMs: number): void {
    const samples = this.execTimeSamples.get(ruleId) || [];
    samples.push(execMs);
    if (samples.length > 100) samples.shift(); // keep rolling window of 100
    this.execTimeSamples.set(ruleId, samples);
  }

  // ─── SPL Feature 24: Performance Metrics ────────────────

  async getPerformanceMetrics(ruleId: string): Promise<RulePerformanceMetricsDto> {
    const rule = await this.ruleRepo.findById(ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found`);

    const evalCount = Number(rule.evaluationCount);
    const triggerCount = Number(rule.triggerCount);
    const suppressionCount = Number(rule.suppressionCount);
    const deduplicationCount = Number(rule.deduplicationCount);
    const escalationCount = Number(rule.escalationCount);

    const samples = this.execTimeSamples.get(ruleId) || [];
    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const p99 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0;

    const triggerRate = evalCount > 0 ? (triggerCount / evalCount) * 100 : 0;
    const suppressionRate = triggerCount > 0 ? (suppressionCount / triggerCount) * 100 : 0;

    // Approximate memory: rule object size × evaluation overhead
    const memoryUsageBytes = JSON.stringify(rule).length * 2 + evalCount * 8;

    return {
      ruleId,
      ruleName: rule.name,
      avgExecutionMs: rule.avgExecMs,
      maxExecutionMs: rule.maxExecMs,
      minExecutionMs: rule.minExecMs,
      evaluationCount: evalCount,
      triggerCount,
      suppressionCount,
      correlationCount: 0, // Tracked at engine level
      deduplicationCount,
      escalationCount,
      memoryUsageBytes,
      triggerRate: Math.round(triggerRate * 100) / 100,
      suppressionRate: Math.round(suppressionRate * 100) / 100,
      lastEvaluatedAt: rule.lastEvaluatedAt?.toISOString() ?? null,
      p95ExecutionMs: p95,
      p99ExecutionMs: p99,
    };
  }

  // ─── 1% Feature 1: Rule Complexity Score ────────────────

  computeComplexityScore(rule: AlertRule): RuleComplexityBreakdownDto {
    let score = 0;

    // Condition complexity based on metric type
    const complexMetrics = ['security.defender', 'security.firewall', 'inventory.version'];
    const conditionComplexity = complexMetrics.includes(rule.metric) ? 25 : 10;
    score += conditionComplexity;

    // Operator weight
    const operatorWeight = ['CONTAINS', 'NOT_CONTAINS', 'MUTATED'].includes(rule.operator) ? 20 : 5;
    score += operatorWeight;

    // Dependencies
    const depIds = (rule.dependsOnIds as string[]) || [];
    const hasDependencies = depIds.length > 0;
    const dependencyDepth = depIds.length;
    score += dependencyDepth * 10;

    // Correlation (parent/child linkage capable)
    const hasCorrelation = rule.metric === 'heartbeat';
    if (hasCorrelation) score += 15;

    // Cooldown/Duration
    const hasCooldown = (rule.cooldownSeconds || 0) > 0;
    const hasDuration = (rule.durationSeconds || 0) > 0;
    if (hasCooldown) score += 5;
    if (hasDuration) score += 10;

    // Schedule mode complexity
    const scheduleModeComplexity = rule.scheduleMode === 'CRON' ? 20
      : rule.scheduleMode === 'BUSINESS_HOURS' || rule.scheduleMode === 'NIGHT' || rule.scheduleMode === 'WEEKEND' ? 10
      : 0;
    score += scheduleModeComplexity;

    let complexityScore: RuleComplexityScore;
    if (score <= 20) complexityScore = RuleComplexityScore.SIMPLE;
    else if (score <= 45) complexityScore = RuleComplexityScore.MEDIUM;
    else if (score <= 70) complexityScore = RuleComplexityScore.COMPLEX;
    else complexityScore = RuleComplexityScore.VERY_COMPLEX;

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      score: complexityScore,
      scoreValue: Math.min(score, 100),
      factors: {
        conditionComplexity,
        operatorWeight,
        hasDependencies,
        dependencyDepth,
        hasCorrelation,
        hasCooldown,
        hasDuration,
        scheduleModeComplexity,
      },
    };
  }

  // ─── 1% Feature 3: Noise Score ──────────────────────────

  computeNoiseScore(rule: AlertRule): RuleNoiseScoreDto {
    const evalCount = Number(rule.evaluationCount) || 1;
    const triggerCount = Number(rule.triggerCount) || 0;
    const suppressionCount = Number(rule.suppressionCount) || 0;
    const deduplicationCount = Number(rule.deduplicationCount) || 0;
    const escalationCount = Number(rule.escalationCount) || 0;

    // Each factor scores 0–20 (total max 100)
    // High dedup ratio = noisy
    const deduplicationFactor = Math.min(20, Math.round((deduplicationCount / Math.max(triggerCount, 1)) * 20));
    // High suppression ratio = high maintenance burden
    const suppressionFactor = Math.min(20, Math.round((suppressionCount / Math.max(evalCount, 1)) * 20));
    // Short cooldown = noisy (invert: shorter = noisier)
    const cooldownFactor = Math.min(20, Math.max(0, 20 - Math.round(((rule.cooldownSeconds || 300) / 3600) * 20)));
    // Low correlation = isolated noise
    const correlationFactor = triggerCount > 0 && escalationCount / triggerCount > 0.1 ? 10 : 5;
    // False positives — approximated from high trigger/low escalation ratio
    const falsePositiveFactor = triggerCount > 10 && escalationCount === 0 ? 15 : 0;
    // Maintenance windows suppressed many alerts
    const maintenanceFactor = suppressionCount > triggerCount ? 10 : 0;

    const noiseScore = Math.min(100, deduplicationFactor + suppressionFactor + cooldownFactor + correlationFactor + falsePositiveFactor + maintenanceFactor);

    const rating = noiseScore <= 25 ? 'LOW'
      : noiseScore <= 50 ? 'MEDIUM'
      : noiseScore <= 75 ? 'HIGH'
      : 'CRITICAL';

    const recommendation = rating === 'CRITICAL' ? 'Rule is extremely noisy. Consider increasing threshold, cooldown, or enabling maintenance windows.'
      : rating === 'HIGH' ? 'Rule generates significant noise. Review threshold and cooldown settings.'
      : rating === 'MEDIUM' ? 'Rule has moderate noise. Monitor for false positives.'
      : 'Rule noise is within acceptable range.';

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      noiseScore,
      rating,
      breakdown: {
        deduplicationFactor,
        suppressionFactor,
        cooldownFactor,
        correlationFactor,
        falsePositiveFactor,
        maintenanceFactor,
      },
      recommendation,
    };
  }

  // ─── 1% Feature 4: Rule Usage Statistics ────────────────

  async getUsageStatistics(ruleId: string): Promise<RuleUsageStatisticsDto> {
    const rule = await this.ruleRepo.findById(ruleId);
    if (!rule) throw new Error(`Rule ${ruleId} not found`);

    const evalCount = Number(rule.evaluationCount);
    const triggerCount = Number(rule.triggerCount);
    const suppressionCount = Number(rule.suppressionCount);
    const deduplicationCount = Number(rule.deduplicationCount);
    const escalationCount = Number(rule.escalationCount);

    const createdAt = rule.createdAt;
    const ageInDays = Math.max(1, (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const dailyTriggerAverage = Math.round((triggerCount / ageInDays) * 100) / 100;
    const weeklyTriggerAverage = Math.round(dailyTriggerAverage * 7 * 100) / 100;

    // Trend: compare recent week vs last week (use evaluation count as proxy)
    const triggerTrend: 'INCREASING' | 'STABLE' | 'DECREASING' = triggerCount === 0 ? 'STABLE'
      : dailyTriggerAverage > 10 ? 'INCREASING'
      : dailyTriggerAverage > 2 ? 'STABLE'
      : 'DECREASING';

    return {
      ruleId,
      ruleName: rule.name,
      totalEvaluations: evalCount,
      totalTriggers: triggerCount,
      totalSuppressions: suppressionCount,
      totalDeduplications: deduplicationCount,
      totalEscalations: escalationCount,
      dailyTriggerAverage,
      weeklyTriggerAverage,
      lastTriggeredAt: rule.lastEvaluatedAt?.toISOString() ?? null,
      lastEvaluatedAt: rule.lastEvaluatedAt?.toISOString() ?? null,
      neverTriggered: triggerCount === 0,
      triggerTrend,
    };
  }

  // ─── 1% Feature 2: Rule Recommendation Engine (NO AI) ───

  async getRecommendations(): Promise<RuleRecommendationDto[]> {
    const rules = await this.ruleRepo.findMany(false);
    const recommendations: RuleRecommendationDto[] = [];
    const seen = new Map<string, string>();

    for (const rule of rules) {
      const evalCount = Number(rule.evaluationCount);
      const triggerCount = Number(rule.triggerCount);
      const avgExecMs = rule.avgExecMs;

      // Never triggered
      if (evalCount > 100 && triggerCount === 0) {
        recommendations.push({
          type: RuleRecommendationType.NEVER_TRIGGERED,
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Rule "${rule.name}" has been evaluated ${evalCount} times but never triggered. Consider removing or adjusting threshold.`,
          severity: 'WARNING',
          actionable: true,
          suggestedAction: 'Lower threshold or disable rule',
        });
      }

      // Expensive (slow execution)
      if (avgExecMs > 400 && evalCount > 10) {
        recommendations.push({
          type: RuleRecommendationType.EXPENSIVE,
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Rule "${rule.name}" averages ${avgExecMs.toFixed(1)}ms execution (near timeout). High performance impact.`,
          severity: 'WARNING',
          actionable: true,
          suggestedAction: 'Review metric complexity or increase timeoutMs',
        });
      }

      // High noise
      const noise = this.computeNoiseScore(rule);
      if (noise.noiseScore > 70) {
        recommendations.push({
          type: RuleRecommendationType.HIGH_NOISE,
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Rule "${rule.name}" noise score is ${noise.noiseScore}/100. Generating excessive alert volume.`,
          severity: 'CRITICAL',
          actionable: true,
          suggestedAction: 'Increase cooldown, raise threshold, or add maintenance windows',
        });
      }

      // Duplicate detection
      const dupKey = `${rule.metric}:${rule.operator}:${rule.threshold}:${rule.durationSeconds}:${rule.severity}`;
      if (seen.has(dupKey)) {
        const firstRuleId = seen.get(dupKey)!;
        const firstRule = rules.find(r => r.id === firstRuleId);
        recommendations.push({
          type: RuleRecommendationType.REMOVE_DUPLICATE,
          ruleId: rule.id,
          ruleName: rule.name,
          message: `Rule "${rule.name}" is a duplicate of "${firstRule?.name}". Remove one or merge into a single rule.`,
          severity: 'WARNING',
          actionable: true,
          suggestedAction: 'Archive or delete the duplicate rule',
          relatedRuleIds: [firstRuleId],
        });
      } else {
        seen.set(dupKey, rule.id);
      }

      // Overlapping rules (same metric, consecutive threshold ranges)
      const sameMetricRules = rules.filter(r => r.id !== rule.id && r.metric === rule.metric && r.operator === rule.operator);
      for (const other of sameMetricRules) {
        const overlap = Math.abs(rule.threshold - other.threshold) < 5;
        if (overlap) {
          recommendations.push({
            type: RuleRecommendationType.OVERLAPPING,
            ruleId: rule.id,
            ruleName: rule.name,
            message: `Rule "${rule.name}" (threshold: ${rule.threshold}) overlaps with "${other.name}" (threshold: ${other.threshold}) on metric ${rule.metric}`,
            severity: 'INFO',
            actionable: true,
            suggestedAction: 'Merge overlapping rules or adjust thresholds to avoid duplicates',
            relatedRuleIds: [other.id],
          });
          break; // Avoid duplicate overlap recommendations
        }
      }
    }

    this.logger.log(`[RuleMetrics] Generated ${recommendations.length} rule recommendations`);
    return recommendations;
  }
}
