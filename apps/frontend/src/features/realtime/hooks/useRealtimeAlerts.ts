'use client';

import { useEffect, useRef } from 'react';
import { useSocketContext } from '../contexts/socket.context';
import {
  SocketEvents,
  SocketRooms,
  SocketEventEnvelope,
} from '@nos/shared-types';

export interface AlertsRealtimeHandlers {
  onAlertCreated?: (payload: any, envelope: SocketEventEnvelope) => void;
  onAlertUpdated?: (payload: any, envelope: SocketEventEnvelope) => void;
  onAlertAcknowledged?: (payload: any, envelope: SocketEventEnvelope) => void;
  onAlertResolved?: (payload: any, envelope: SocketEventEnvelope) => void;
  onAlertEscalated?: (payload: any, envelope: SocketEventEnvelope) => void;
  onAlertSuppressed?: (payload: any, envelope: SocketEventEnvelope) => void;
  onNotificationSent?: (payload: any, envelope: SocketEventEnvelope) => void;
}

/**
 * Custom enterprise real-time hook for subscribing to instantaneous Alert & Notification incidents.
 * Enforces automatic room subscription and clean unmount disposal.
 */
export const useRealtimeAlerts = (handlers: AlertsRealtimeHandlers) => {
  const { status, joinRoom, subscribe } = useSocketContext();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (status === 'LIVE') {
      joinRoom(SocketRooms.DASHBOARD);
      joinRoom(SocketRooms.OPERATORS);
      joinRoom(SocketRooms.ADMINS);
    }
  }, [status, joinRoom]);

  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    unsubscribers.push(
      subscribe(SocketEvents.ALERT_CREATED, (env) => {
        handlersRef.current.onAlertCreated?.(env.payload, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.ALERT_UPDATED, (env) => {
        handlersRef.current.onAlertUpdated?.(env.payload, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.ALERT_ACKNOWLEDGED, (env) => {
        handlersRef.current.onAlertAcknowledged?.(env.payload, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.ALERT_RESOLVED, (env) => {
        handlersRef.current.onAlertResolved?.(env.payload, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.ALERT_ESCALATED, (env) => {
        handlersRef.current.onAlertEscalated?.(env.payload, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.ALERT_SUPPRESSED, (env) => {
        handlersRef.current.onAlertSuppressed?.(env.payload, env);
      }),
    );
    unsubscribers.push(
      subscribe(SocketEvents.NOTIFICATION_SENT, (env) => {
        handlersRef.current.onNotificationSent?.(env.payload, env);
      }),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [subscribe]);

  return { socketStatus: status };
};
