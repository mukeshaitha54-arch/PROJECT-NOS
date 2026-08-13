'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';
import { useGlobalStore } from '../store/global-store';
import { useQueryClient } from '@tanstack/react-query';
import { TelemetryPoint, Alert } from '../types/api';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const queryClient = useQueryClient();
  
  const { 
    setConnectionStatus, 
    updateDevicePresence, 
    appendTelemetry, 
    prependAlert, 
    updateAlertStatus 
  } = useGlobalStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    setConnectionStatus('connecting');
    const socketInstance = io({
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnectionStatus('connected');
      // Assume tenantId is 'default-org' for now if not present on user object
      const tenantId = (user as any)?.tenantId || 'default-org';
      socketInstance.emit('join:tenant', tenantId);
    });

    socketInstance.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    // We can use io's built-in io.on("reconnect") or handle via connect event.
    // connect event fires on reconnects as well. But let's explicitly refetch.
    socketInstance.on('connect', () => {
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    socketInstance.on('device:presence:updated', (data: { deviceId: string; status: string; lastSeen: string }) => {
      updateDevicePresence(data.deviceId, data.status, data.lastSeen);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    });

    socketInstance.on('device:telemetry:new', (data: { deviceId: string; telemetry: TelemetryPoint }) => {
      appendTelemetry(data.deviceId, data.telemetry);
    });

    socketInstance.on('alert:triggered', (alert: Alert) => {
      console.log('New alert triggered:', alert);
      prependAlert(alert);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    socketInstance.on('alert:resolved', (data: { alertId: string; deviceId: string; ruleId: string; resolvedAt: string }) => {
      updateAlertStatus(data.alertId, 'RESOLVED');
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    });

    return () => {
      socketInstance.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [isAuthenticated, user, setConnectionStatus, updateDevicePresence, appendTelemetry, prependAlert, updateAlertStatus, queryClient]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
