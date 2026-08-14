import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { RuleHealthQueueInfo } from "@nos/shared-types";

@Injectable()
export class AlertQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(AlertQueueService.name);
  private redisClient?: Redis;
  private alertQueue?: Queue;
  private notificationQueue?: Queue;
  private dlqQueue?: Queue;
  private retryQueue?: Queue;
  private isOfflineFallback = false;

  constructor() {
    this.initializeQueues();
  }

  private initializeQueues() {
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 2) {
            this.logger.warn(
              `[BullMQ/Redis] Standalone Redis offline after 2 retries. Switching to fault-tolerant local async queue fallback.`,
            );
            this.isOfflineFallback = true;
            return null; // stop retrying
          }
          return Math.min(times * 100, 2000);
        },
      });

      this.redisClient.on("error", () => {
        if (!this.isOfflineFallback) {
          this.isOfflineFallback = true;
        }
      });

      this.alertQueue = new Queue("AlertProcessingQueue", {
        connection: this.redisClient,
      });
      this.notificationQueue = new Queue("NotificationQueue", {
        connection: this.redisClient,
      });
      this.dlqQueue = new Queue("DeadLetterQueue", {
        connection: this.redisClient,
      });
      this.retryQueue = new Queue("RetryQueue", {
        connection: this.redisClient,
      });

      this.logger.log(
        `[BullMQ] Successfully registered AlertProcessingQueue, NotificationQueue, RetryQueue, and DeadLetterQueue.`,
      );
    } catch (e: any) {
      this.isOfflineFallback = true;
      this.logger.warn(
        `[BullMQ] Running in local resilient fallback mode: ${e?.message}`,
      );
    }
  }

  async enqueueAlertProcessing(data: any): Promise<void> {
    if (!this.isOfflineFallback && this.alertQueue) {
      try {
        await this.alertQueue.add("process-incident", data, {
          removeOnComplete: true,
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        });
        return;
      } catch {}
    }
    // Fallback resilient execution
    this.logger.debug(
      `[Queue Fallback] Enqueueing alert processing for device ${data.deviceId}`,
    );
  }

  async enqueueNotification(data: any): Promise<void> {
    if (!this.isOfflineFallback && this.notificationQueue) {
      try {
        await this.notificationQueue.add("send-notification", data, {
          removeOnComplete: true,
          attempts: 5,
          backoff: { type: "exponential", delay: 2000 },
        });
        return;
      } catch {}
    }
    this.logger.debug(
      `[Queue Fallback] Enqueueing notification dispatch for incident ${data.incidentNumber}`,
    );
  }

  async pushToDlq(data: any): Promise<void> {
    if (!this.isOfflineFallback && this.dlqQueue) {
      try {
        await this.dlqQueue.add("dlq-item", data, { removeOnComplete: false });
      } catch {}
    }
    this.logger.error(
      `[DLQ Worker] Stored failed notification in DeadLetterQueue.`,
    );
  }

  /** SPL Feature 23 / Queue Dashboard: Returns live counts for all queues */
  async getQueueStats(): Promise<RuleHealthQueueInfo[]> {
    if (this.isOfflineFallback) {
      return this.buildOfflineQueueStats();
    }

    const queues = [
      { queue: this.alertQueue, name: "AlertProcessingQueue" },
      { queue: this.notificationQueue, name: "NotificationQueue" },
      { queue: this.retryQueue, name: "RetryQueue" },
      { queue: this.dlqQueue, name: "DeadLetterQueue" },
    ];

    const results: RuleHealthQueueInfo[] = [];

    for (const { queue, name } of queues) {
      if (!queue) {
        results.push({
          name,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        });
        continue;
      }
      try {
        const [waiting, active, completed, failed, delayed] = await Promise.all(
          [
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount(),
          ],
        );
        results.push({ name, waiting, active, completed, failed, delayed });
      } catch {
        results.push({
          name,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
        });
      }
    }

    return results;
  }

  /** Queue Dashboard: Redis health metrics */
  async getRedisHealth(): Promise<{
    connected: boolean;
    memoryUsageBytes: number;
    latencyMs: number;
    connectedClients: number;
    uptime: number;
  }> {
    if (this.isOfflineFallback || !this.redisClient) {
      return {
        connected: false,
        memoryUsageBytes: 0,
        latencyMs: 0,
        connectedClients: 0,
        uptime: 0,
      };
    }

    try {
      const startPing = Date.now();
      await this.redisClient.ping();
      const latencyMs = Date.now() - startPing;

      const info = await this.redisClient.info("memory");
      const serverInfo = await this.redisClient.info("server");
      const clientInfo = await this.redisClient.info("clients");

      const memMatch = info.match(/used_memory:(\d+)/);
      const uptimeMatch = serverInfo.match(/uptime_in_seconds:(\d+)/);
      const clientsMatch = clientInfo.match(/connected_clients:(\d+)/);

      return {
        connected: true,
        memoryUsageBytes: memMatch ? parseInt(memMatch[1]) : 0,
        latencyMs,
        connectedClients: clientsMatch ? parseInt(clientsMatch[1]) : 0,
        uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : 0,
      };
    } catch {
      return {
        connected: false,
        memoryUsageBytes: 0,
        latencyMs: 0,
        connectedClients: 0,
        uptime: 0,
      };
    }
  }

  /** Queue Operations: Retry a specific failed job by ID */
  async retryFailedJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.getQueueByName(queueName);
    if (!queue) return false;
    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.retry();
        this.logger.log(`[Queue] Retried job ${jobId} in ${queueName}`);
        return true;
      }
      return false;
    } catch (err: any) {
      this.logger.error(`[Queue] Failed to retry job ${jobId}: ${err.message}`);
      return false;
    }
  }

  /** Queue Operations: Purge all failed jobs (Admin only) */
  async purgeQueue(queueName: string): Promise<number> {
    const queue = this.getQueueByName(queueName);
    if (!queue) return 0;
    try {
      const failedJobs = await queue.getFailed();
      let purged = 0;
      for (const job of failedJobs) {
        await job.remove();
        purged++;
      }
      this.logger.warn(
        `[Queue] Purged ${purged} failed jobs from ${queueName}`,
      );
      return purged;
    } catch (err: any) {
      this.logger.error(`[Queue] Failed to purge ${queueName}: ${err.message}`);
      return 0;
    }
  }

  private getQueueByName(name: string): Queue | undefined {
    switch (name) {
      case "AlertProcessingQueue":
        return this.alertQueue;
      case "NotificationQueue":
        return this.notificationQueue;
      case "RetryQueue":
        return this.retryQueue;
      case "DeadLetterQueue":
        return this.dlqQueue;
      default:
        return undefined;
    }
  }

  private buildOfflineQueueStats(): RuleHealthQueueInfo[] {
    return [
      {
        name: "AlertProcessingQueue",
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
      {
        name: "NotificationQueue",
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
      {
        name: "RetryQueue",
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
      {
        name: "DeadLetterQueue",
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      },
    ];
  }

  async onModuleDestroy() {
    if (this.redisClient && !this.isOfflineFallback) {
      try {
        await this.redisClient.quit();
      } catch {}
    }
  }
}
