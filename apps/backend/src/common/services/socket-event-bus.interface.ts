import { SocketEventEnvelope } from '@nos/shared-types';

export const ISocketEventBusToken = Symbol('ISocketEventBus');

export type EventBusCallback = (room: string, event: string, envelope: SocketEventEnvelope) => void;

/**
 * Distributed Event Bus Interface (SPL Feature 14)
 * Decouples real-time gateway broadcast from single-node limitation.
 * Currently backed by LocalSocketEventBus, easily swapable for Redis/NATS later.
 */
export interface ISocketEventBus {
  publish(room: string, event: string, envelope: SocketEventEnvelope): Promise<void>;
  subscribe(callback: EventBusCallback): void;
  unsubscribe(callback: EventBusCallback): void;
}
