'use client';

import { useEffect, useRef } from 'react';
import { useSocketContext } from '../contexts/socket.context';
import {
  SocketEvents,
  SocketRooms,
  SocketEventEnvelope,
  RealtimeDashboardEvent,
  RealtimeHeartbeatEvent,
  RealtimeTelemetryEvent,
} from '@nos/shared-types';

export interface DashboardRealtimeHandlers {
  onDashboardUpdate?: (event: RealtimeDashboardEvent, envelope: SocketEventEnvelope) => void;
  onDeviceOnline?: (payload: any, envelope: SocketEventEnvelope) => void;
  onDeviceOffline?: (payload: any, envelope: SocketEventEnvelope) => void;
  onHeartbeat?: (event: RealtimeHeartbeatEvent, envelope: SocketEventEnvelope) => void;
  onTelemetry?: (event: RealtimeTelemetryEvent, envelope: SocketEventEnvelope) => void;
}

/**
 * Custom hook to subscribe a component to real-time operations dashboard events
 * with strict unmount listener cleanup (SPL Feature 15 & 17).
 */
export const useRealtimeDashboard = (handlers: DashboardRealtimeHandlers) => {
  const { status, joinRoom, leaveRoom, subscribe } = useSocketContext();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (status === 'LIVE') {
      joinRoom(SocketRooms.DASHBOARD);
    }
  }, [status, joinRoom]);

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(
      subscribe(SocketEvents.DASHBOARD_UPDATED, (env) => {
        handlersRef.current.onDashboardUpdate?.(env.payload as RealtimeDashboardEvent, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.DEVICE_ONLINE, (env) => {
        handlersRef.current.onDeviceOnline?.(env.payload, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.DEVICE_OFFLINE, (env) => {
        handlersRef.current.onDeviceOffline?.(env.payload, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.HEARTBEAT_RECEIVED, (env) => {
        handlersRef.current.onHeartbeat?.(env.payload as RealtimeHeartbeatEvent, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.TELEMETRY_RECEIVED, (env) => {
        handlersRef.current.onTelemetry?.(env.payload as RealtimeTelemetryEvent, env);
      }),
    );

    return () => {
      // Memory Leak Prevention (SPL Feature 15): Strip all subscriptions when component unmounts
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [subscribe]);
};
