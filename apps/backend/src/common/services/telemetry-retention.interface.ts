/**
 * Lifecycle retention policy abstraction for telemetry datasets.
 * Prepares enterprise automated pruning and storage tier normalization without modifying domain controllers.
 */
export interface ITelemetryRetentionPolicy {
  enforcePolicy(retentionDays: number): Promise<{ deletedCount: number }>;
}

export const ITelemetryRetentionPolicyToken = Symbol('ITelemetryRetentionPolicy');
