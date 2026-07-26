import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

@Injectable()
export class InventoryCacheService {
  private readonly logger = new Logger(InventoryCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5-minute mandatory TTL

  constructor() {
    // Periodically clean expired items every minute without blocking the event loop
    setInterval(() => this.cleanup(), 60000).unref();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL_MS): void {
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  invalidate(keyPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(keyPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}
