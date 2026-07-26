import { TelemetrySnapshot as TelemetrySnapshotDto } from '@nos/shared-types';

/**
 * Event streaming publisher abstraction for Phase 2B.
 * Prepared for upcoming Redis Streams, BullMQ, or Kafka pipeline integration.
 */
export interface ITelemetryPublisher {
  publish(snapshot: TelemetrySnapshotDto): Promise<void>;
}

export const ITelemetryPublisherToken = Symbol('ITelemetryPublisher');
