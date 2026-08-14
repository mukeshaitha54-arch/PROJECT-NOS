import { Injectable, Inject, Logger } from "@nestjs/common";
import { IAlertRuleRepository } from "../../../common/repositories/alert-rule.repository.interface";
import { AlertQueueService } from "../queues/queue.service";
import {
  RuleHealthDto,
  RuleHealthQueueInfo,
  QueueDashboardDto,
} from "@nos/shared-types";

/**
 * RuleHealthService — SPL Feature 23
 *
 * GET /api/v1/alerts/rules/health
 *
 * Returns:
 *  • Active / Disabled / Archived rule counts
 *  • Conflicting / Duplicate rule counts
 *  • Average evaluation time
 *  • Slow / Fast rules
 *  • Queue health (Alert, Notification, Retry, DLQ)
 *  • Redis health (memory, latency, connections, uptime)
 *
 * Zero Prisma leakage — all DB access via IAlertRuleRepository.
 */
@Injectable()
export class RuleHealthService {
  private readonly logger = new Logger(RuleHealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @Inject(IAlertRuleRepository)
    private readonly ruleRepo: IAlertRuleRepository,
    private readonly queueService: AlertQueueService,
  ) {}

  async checkRuleHealth(): Promise<RuleHealthDto> {
    const [allRules, conflicts, duplicates] = await Promise.all([
      this.ruleRepo.findMany(false),
      this.ruleRepo.findConflicting(),
      this.ruleRepo.findDuplicates(),
    ]);

    const activeRules = allRules.filter(
      (r) => r.ruleStatus === "ACTIVE" && r.enabled,
    ).length;
    const disabledRules = allRules.filter(
      (r) => !r.enabled && r.ruleStatus !== "ARCHIVED",
    ).length;
    const archivedRules = allRules.filter(
      (r) => r.ruleStatus === "ARCHIVED",
    ).length;

    // Compute average evaluation time across all rules
    const rulesWithEvals = allRules.filter(
      (r) => Number(r.evaluationCount) > 0,
    );
    const avgEvaluationMs =
      rulesWithEvals.length > 0
        ? rulesWithEvals.reduce((sum, r) => sum + r.avgExecMs, 0) /
          rulesWithEvals.length
        : 0;

    // Slow rules: avg exec > 300ms
    const slowRules = allRules
      .filter((r) => r.avgExecMs > 300 && Number(r.evaluationCount) > 5)
      .sort((a, b) => b.avgExecMs - a.avgExecMs)
      .slice(0, 10)
      .map((r) => ({ id: r.id, name: r.name, avgExecMs: r.avgExecMs }));

    // Fast rules: avg exec < 50ms and has evaluations
    const fastRules = allRules
      .filter(
        (r) =>
          r.avgExecMs > 0 && r.avgExecMs < 50 && Number(r.evaluationCount) > 5,
      )
      .sort((a, b) => a.avgExecMs - b.avgExecMs)
      .slice(0, 5)
      .map((r) => ({ id: r.id, name: r.name, avgExecMs: r.avgExecMs }));

    const queues = await this.queueService.getQueueStats();
    const redisHealth = await this.queueService.getRedisHealth();

    const hasConflicts = conflicts.length > 0;
    const hasDuplicates = duplicates.length > 0;
    const hasSlowRules = slowRules.length > 0;
    const redisDown = !redisHealth.connected;

    const overallStatus =
      redisDown || (hasConflicts && hasDuplicates)
        ? "CRITICAL"
        : hasConflicts || hasDuplicates || hasSlowRules
          ? "DEGRADED"
          : "HEALTHY";

    this.logger.log(
      `[RuleHealth] Status: ${overallStatus} | Active: ${activeRules} | Conflicts: ${conflicts.length} | Duplicates: ${duplicates.length}`,
    );

    return {
      activeRules,
      disabledRules,
      archivedRules,
      conflictingRules: conflicts.length,
      duplicateRules: duplicates.length,
      avgEvaluationMs: Math.round(avgEvaluationMs * 100) / 100,
      slowRules,
      fastRules,
      queues,
      redis: redisHealth,
      overallStatus,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async getQueueDashboard(): Promise<QueueDashboardDto> {
    const queues = await this.queueService.getQueueStats();
    const redisHealth = await this.queueService.getRedisHealth();

    const alertQueue = queues.find(
      (q) => q.name === "AlertProcessingQueue",
    ) || {
      name: "AlertProcessingQueue",
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
    const notificationQueue = queues.find(
      (q) => q.name === "NotificationQueue",
    ) || {
      name: "NotificationQueue",
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
    const retryQueue = queues.find((q) => q.name === "RetryQueue") || {
      name: "RetryQueue",
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
    const deadLetterQueue = queues.find(
      (q) => q.name === "DeadLetterQueue",
    ) || {
      name: "DeadLetterQueue",
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };

    const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);
    const totalActive = queues.reduce((s, q) => s + q.active, 0);
    const totalFailed = queues.reduce((s, q) => s + q.failed, 0);

    const healthStatus =
      !redisHealth.connected || totalFailed > 50
        ? "CRITICAL"
        : totalFailed > 10 || totalWaiting > 100
          ? "DEGRADED"
          : "HEALTHY";

    return {
      alertQueue,
      notificationQueue,
      retryQueue,
      deadLetterQueue,
      redis: {
        connected: redisHealth.connected,
        memoryUsageBytes: redisHealth.memoryUsageBytes,
        latencyMs: redisHealth.latencyMs,
        connectedClients: redisHealth.connectedClients,
        uptimeSeconds: redisHealth.uptime,
        version: "7.x",
      },
      totalWaiting,
      totalActive,
      totalFailed,
      healthStatus,
      lastUpdatedAt: new Date().toISOString(),
    };
  }
}
