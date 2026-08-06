import { SocketEventEnvelope } from '@nos/shared-types';

export const ISocketPublisherToken = Symbol('ISocketPublisher');

export interface ISocketPublisher {
  emitDeviceConnected(deviceId: string, payload: any, correlationId?: string): Promise<void>;
  emitDeviceDisconnected(deviceId: string, payload: any, correlationId?: string): Promise<void>;
  emitDeviceOnline(deviceId: string, payload: any, correlationId?: string): Promise<void>;
  emitDeviceOffline(deviceId: string, payload: any, correlationId?: string): Promise<void>;
  emitHeartbeatReceived(deviceId: string, payload: any, correlationId?: string): Promise<void>;
  emitTelemetryReceived(deviceId: string, payload: any, correlationId?: string): Promise<void>;
  emitInventoryUpdated(deviceId: string, payload: any, correlationId?: string): Promise<void>;
  emitDashboardUpdated(payload: any, correlationId?: string): Promise<void>;
  emitSystemStatusChanged(payload: any, correlationId?: string): Promise<void>;
  emitAlertEvent(event: string, payload: any, correlationId?: string): Promise<void>;
  emitTenantEvent(organizationId: string, event: string, payload: any, correlationId?: string): Promise<void>;
}
