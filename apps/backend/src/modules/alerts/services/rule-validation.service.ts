import { Injectable, Inject, Logger } from '@nestjs/common';
import { IAlertRuleRepository } from '../../../common/repositories/alert-rule.repository.interface';
import { AlertRule } from '@prisma/client';
import {
  RuleValidationResultDto,
  RuleValidationError,
  AlertRulePriority,
} from '@nos/shared-types';

/** All supported metric names for validation */
const VALID_METRICS = new Set([
  'cpuUsage', 'ramUsage', 'diskUsage', 'memoryUsagePercent',
  'diskUsagePercent', 'diskReadSpeed', 'diskWriteSpeed',
  'networkUploadSpeed', 'networkDownloadSpeed', 'activeConnections',
  'runningProcesses', 'systemUptime', 'heartbeat',
  'cpuTemperature', 'cpuFrequency',
  'security.defender', 'security.firewall', 'security.bitlocker',
  'inventory.version',
  'bytesSent', 'bytesReceived',
]);

const VALID_OPERATORS = new Set(['>', '>=', '<', '<=', '==', '!=', 'MUTATED', 'CONTAINS', 'NOT_CONTAINS']);

/**
 * RuleValidationService — SPL Feature 17
 *
 * Validates:
 *  • Duplicate rules (same metric+operator+threshold+duration+severity)
 *  • Conflicting rules (same conditions, different severities)
 *  • Invalid thresholds (CPU/RAM/Disk must be 0–100)
 *  • Invalid metrics (not in known metric registry)
 *  • Impossible conditions (e.g. threshold < 0 for CPU)
 *  • Circular dependencies (via DFS)
 *
 * Zero Prisma leakage — all DB access via IAlertRuleRepository.
 */
@Injectable()
export class RuleValidationService {
  private readonly logger = new Logger(RuleValidationService.name);

  constructor(
    @Inject(IAlertRuleRepository) private readonly ruleRepo: IAlertRuleRepository,
  ) {}

  /**
   * Full validation of a rule payload before creation or update.
   * Returns structured errors and warnings. Invalid rules should be rejected.
   */
  async validate(
    ruleData: {
      name: string;
      metric: string;
      operator: string;
      threshold: number;
      durationSeconds?: number;
      severity?: string;
      cooldownSeconds?: number;
      dependsOnIds?: string[];
      enabled?: boolean;
    },
    excludeRuleId?: string, // For updates — exclude self from duplicate check
  ): Promise<RuleValidationResultDto> {
    const errors: RuleValidationError[] = [];
    const warnings: RuleValidationError[] = [];
    let duplicateOf: string | null = null;
    const conflictsWith: string[] = [];
    const circularDependencies: string[][] = [];
    const invalidMetrics: string[] = [];
    const impossibleConditions: string[] = [];

    // ─── 1. Metric Validation ────────────────────────────
    if (!ruleData.metric || !VALID_METRICS.has(ruleData.metric)) {
      invalidMetrics.push(ruleData.metric);
      errors.push({
        code: 'INVALID_METRIC',
        field: 'metric',
        message: `Metric "${ruleData.metric}" is not a recognized telemetry metric. Valid metrics: ${[...VALID_METRICS].join(', ')}`,
      });
    }

    // ─── 2. Operator Validation ───────────────────────────
    if (!ruleData.operator || !VALID_OPERATORS.has(ruleData.operator)) {
      errors.push({
        code: 'INVALID_OPERATOR',
        field: 'operator',
        message: `Operator "${ruleData.operator}" is invalid. Valid operators: ${[...VALID_OPERATORS].join(', ')}`,
      });
    }

    // ─── 3. Impossible Condition Check ───────────────────
    const percentageMetrics = ['cpuUsage', 'ramUsage', 'diskUsage', 'memoryUsagePercent', 'diskUsagePercent'];
    if (percentageMetrics.includes(ruleData.metric)) {
      if (ruleData.threshold < 0 || ruleData.threshold > 100) {
        impossibleConditions.push(`${ruleData.metric} threshold must be 0–100 (received ${ruleData.threshold})`);
        errors.push({
          code: 'IMPOSSIBLE_THRESHOLD',
          field: 'threshold',
          message: `Threshold ${ruleData.threshold} is impossible for metric "${ruleData.metric}" (must be 0–100%)`,
        });
      }
      // Warn on degenerate thresholds
      if (ruleData.threshold >= 100 && ruleData.operator === '>') {
        impossibleConditions.push(`${ruleData.metric} > 100 will never trigger`);
        errors.push({
          code: 'IMPOSSIBLE_CONDITION',
          field: 'threshold',
          message: `Condition "${ruleData.metric} > 100" can never be satisfied (max is 100%)`,
        });
      }
    }

    if ((ruleData.threshold ?? 0) < 0 && !percentageMetrics.includes(ruleData.metric)) {
      warnings.push({
        code: 'NEGATIVE_THRESHOLD',
        field: 'threshold',
        message: `Threshold ${ruleData.threshold} is negative — verify this is intentional for metric "${ruleData.metric}"`,
      });
    }

    // ─── 4. Duration / Cooldown Sanity ───────────────────
    if ((ruleData.durationSeconds ?? 0) < 0) {
      errors.push({
        code: 'INVALID_DURATION',
        field: 'durationSeconds',
        message: `durationSeconds cannot be negative`,
      });
    }
    if ((ruleData.cooldownSeconds ?? 300) < 0) {
      errors.push({
        code: 'INVALID_COOLDOWN',
        field: 'cooldownSeconds',
        message: `cooldownSeconds cannot be negative`,
      });
    }
    if ((ruleData.cooldownSeconds ?? 300) < (ruleData.durationSeconds ?? 0)) {
      warnings.push({
        code: 'COOLDOWN_SHORTER_THAN_DURATION',
        field: 'cooldownSeconds',
        message: `Cooldown (${ruleData.cooldownSeconds}s) is shorter than duration (${ruleData.durationSeconds}s) — may cause alert storms`,
      });
    }

    // ─── 5. Load existing rules for cross-validation ─────
    const allRules = await this.ruleRepo.findMany(false);
    const existingRules = allRules.filter(r => r.id !== excludeRuleId);

    // ─── 6. Duplicate Detection ───────────────────────────
    const dupKey = `${ruleData.metric}:${ruleData.operator}:${ruleData.threshold}:${ruleData.durationSeconds ?? 0}:${ruleData.severity ?? 'MEDIUM'}`;
    for (const existing of existingRules) {
      const existKey = `${existing.metric}:${existing.operator}:${existing.threshold}:${existing.durationSeconds}:${existing.severity}`;
      if (dupKey === existKey) {
        duplicateOf = existing.id;
        errors.push({
          code: 'DUPLICATE_RULE',
          field: 'metric',
          message: `Rule "${ruleData.name}" is a duplicate of existing rule "${existing.name}" (identical conditions)`,
          conflictingRuleId: existing.id,
          conflictingRuleName: existing.name,
        });
        break;
      }
    }

    // ─── 7. Conflict Detection ────────────────────────────
    // Rules with same metric+operator+threshold but different severity = conflict
    for (const existing of existingRules) {
      if (
        existing.metric === ruleData.metric &&
        existing.operator === ruleData.operator &&
        existing.threshold === ruleData.threshold &&
        existing.severity !== (ruleData.severity ?? 'MEDIUM')
      ) {
        conflictsWith.push(existing.id);
        warnings.push({
          code: 'CONFLICTING_RULE',
          field: 'severity',
          message: `Rule "${ruleData.name}" has same conditions as "${existing.name}" but different severity (${ruleData.severity} vs ${existing.severity})`,
          conflictingRuleId: existing.id,
          conflictingRuleName: existing.name,
        });
      }
    }

    // ─── 8. Circular Dependency Detection ─────────────────
    if (ruleData.dependsOnIds && ruleData.dependsOnIds.length > 0) {
      const ruleMap = new Map<string, string[]>();
      for (const r of existingRules) {
        ruleMap.set(r.id, (r.dependsOnIds as string[]) || []);
      }

      const visited = new Set<string>();
      const detectCycle = (nodeId: string, path: string[]): boolean => {
        if (visited.has(nodeId)) {
          const cycleStart = path.indexOf(nodeId);
          if (cycleStart !== -1) {
            circularDependencies.push([...path.slice(cycleStart), nodeId]);
          }
          return true;
        }
        visited.add(nodeId);
        const deps = ruleMap.get(nodeId) || [];
        for (const dep of deps) {
          detectCycle(dep, [...path, nodeId]);
        }
        return false;
      };

      for (const depId of ruleData.dependsOnIds) {
        detectCycle(depId, ['new-rule']);
      }

      if (circularDependencies.length > 0) {
        errors.push({
          code: 'CIRCULAR_DEPENDENCY',
          field: 'dependsOnIds',
          message: `Circular dependency detected in rule dependency chain`,
        });
      }
    }

    // ─── 9. Name uniqueness ────────────────────────────────
    const nameMatch = existingRules.find(r => r.name.toLowerCase() === ruleData.name.toLowerCase());
    if (nameMatch && nameMatch.id !== excludeRuleId) {
      errors.push({
        code: 'DUPLICATE_NAME',
        field: 'name',
        message: `Rule name "${ruleData.name}" is already in use by rule "${nameMatch.name}"`,
        conflictingRuleId: nameMatch.id,
        conflictingRuleName: nameMatch.name,
      });
    }

    const valid = errors.length === 0;
    this.logger.log(
      `[RuleValidation] Rule "${ruleData.name}": ${valid ? 'VALID' : `INVALID (${errors.length} errors, ${warnings.length} warnings)`}`,
    );

    return {
      valid,
      errors,
      warnings,
      duplicateOf,
      conflictsWith: conflictsWith.length > 0 ? conflictsWith : null,
      circularDependencies: circularDependencies.length > 0 ? circularDependencies : undefined,
      invalidMetrics: invalidMetrics.length > 0 ? invalidMetrics : undefined,
      impossibleConditions: impossibleConditions.length > 0 ? impossibleConditions : undefined,
    };
  }
}
