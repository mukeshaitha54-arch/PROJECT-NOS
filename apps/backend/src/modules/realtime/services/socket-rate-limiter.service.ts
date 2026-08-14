import { Injectable, Logger } from "@nestjs/common";

interface RateLimitRecord {
  timestamps: number[];
}

@Injectable()
export class SocketRateLimiterService {
  private readonly logger = new Logger(SocketRateLimiterService.name);
  // Key: `${clientId}:${action}`
  private readonly limits = new Map<string, RateLimitRecord>();
  private readonly CLEANUP_INTERVAL_MS = 60000; // 1 min cleanup

  constructor() {
    // Memory leak prevention (SPL Feature 15) - Self-cleaning garbage collection
    const timer = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL_MS);
    if (timer && typeof timer.unref === "function") {
      timer.unref();
    }
  }

  /**
   * Evaluates rate limits for socket event flood protection (SPL Feature 12).
   * @returns true if allowed, false if rejected due to rate limit spam.
   */
  public checkLimit(
    clientId: string,
    action: "join" | "heartbeat" | "reconnect" | "auth" | "message",
    maxRequests = 30,
    windowSeconds = 60,
  ): boolean {
    const key = `${clientId}:${action}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    let record = this.limits.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.limits.set(key, record);
    }

    // Filter out timestamps older than current window
    record.timestamps = record.timestamps.filter((ts) => now - ts <= windowMs);

    if (record.timestamps.length >= maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for socket [${clientId}] on action [${action}] (${record.timestamps.length}/${maxRequests} per ${windowSeconds}s)`,
      );
      return false;
    }

    record.timestamps.push(now);
    return true;
  }

  public clearClient(clientId: string): void {
    for (const key of this.limits.keys()) {
      if (key.startsWith(`${clientId}:`)) {
        this.limits.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const maxWindowMs = 300000; // 5 min max retention
    for (const [key, record] of this.limits.entries()) {
      record.timestamps = record.timestamps.filter(
        (ts) => now - ts <= maxWindowMs,
      );
      if (record.timestamps.length === 0) {
        this.limits.delete(key);
      }
    }
  }
}
