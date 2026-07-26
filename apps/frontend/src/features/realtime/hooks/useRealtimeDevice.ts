'use client';

import { useEffect, useRef } from 'react';
import { useSocketContext } from '../contexts/socket.context';
import {
  SocketEvents,
  getDeviceRoom,
  SocketEventEnvelope,
  RealtimeHeartbeatEvent,
  RealtimeTelemetryEvent,
  RealtimeInventoryEvent,
} from '@nos/shared-types';

export interface DeviceRealtimeHandlers {
  onHeartbeat?: (event: RealtimeHeartbeatEvent, envelope: SocketEventEnvelope) => void;
  onTelemetry?: (event: RealtimeTelemetryEvent, envelope: SocketEventEnvelope) => void;
  onInventory?: (event: RealtimeInventoryEvent, envelope: SocketEventEnvelope) => void;
  onStatusChange?: (status: 'ONLINE' | 'OFFLINE', reason?: string, envelope?: SocketEventEnvelope) => void;
}

/**
 * Dedicated node subscription hook.
 * Joins room device:{id}, handles live telemetry updates, and cleans up on unmount.
 */
export const useRealtimeDevice = (deviceId?: string, handlers: DeviceRealtimeHandlers = {}) => {
  const { status, joinRoom, leaveRoom, subscribe } = useSocketContext();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!deviceId || status !== 'LIVE') return;
    const room = getDeviceRoom(deviceId);
    joinRoom(room);

    return () => {
      leaveRoom(room);
    };
  }, [deviceId, status, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!deviceId) return;
    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(
      subscribe(SocketEvents.HEARTBEAT_RECEIVED, (env) => {
        if (env.payload?.deviceId === deviceId) {
          handlersRef.current.onHeartbeat?.(env.payload as RealtimeHeartbeatEvent, env);
        }
      }),
    );

    unsubscribers.push(
      subscribe(SocketEvents.TELEMETRY_RECEIVED, (env) => {
        if (env.payload?.deviceId === deviceId || (env.payload as any)?.id === deviceId) {
          handlersRef.current.onTelemetry?.(env.payload as RealtimeTelemetryEvent, env);
        }
      }),
    );

    unsubscribers.push(
      subscribe(SocketEvents.INVENTORY_UPDATED, (env) => {
        if (env.payload?.deviceId === deviceId) {
          handlersRef.current.onInventory?.(env.payload as RealtimeInventoryEvent, env);
        }
      }),
    );

    unsubscribers.push(
      subscribe(SocketEvents.DEVICE_ONLINE, (env) => {
        if (env.payload?.deviceId === deviceId) {
          handlersRef.current.onStatusChange?.('ONLINE', undefined, env);
        }
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.DEVICE_OFFLINE, (env) => {
        if (env.payload?.deviceId === deviceId) {
          handlersRef.current.onStatusChange?.('OFFLINE', env.payload?.reason || 'DISCONNECTED', env);
        }
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [deviceId, subscribe]);
};
