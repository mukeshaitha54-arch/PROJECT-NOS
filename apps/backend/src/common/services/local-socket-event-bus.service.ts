import { Injectable, Logger } from '@nestjs/common';
import { ISocketEventBus, EventBusCallback } from './socket-event-bus.interface';
import { SocketEventEnvelope } from '@nos/shared-types';

@Injectable()
export class LocalSocketEventBusService implements ISocketEventBus {
  private readonly logger = new Logger(LocalSocketEventBusService.name);
  private readonly subscribers: Set<EventBusCallback> = new Set();

  async publish(room: string, event: string, envelope: SocketEventEnvelope): Promise<void> {
    for (const callback of this.subscribers) {
      try {
        callback(room, event, envelope);
      } catch (error: any) {
        this.logger.error(`Error delivering event [${event}] to bus subscriber: ${error.message}`, error.stack);
      }
    }
  }

  subscribe(callback: EventBusCallback): void {
    this.subscribers.add(callback);
  }

  unsubscribe(callback: EventBusCallback): void {
    this.subscribers.delete(callback);
  }
}
