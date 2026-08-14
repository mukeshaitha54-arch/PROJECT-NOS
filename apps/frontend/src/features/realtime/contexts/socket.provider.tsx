"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { SocketContext, SocketContextValue } from "./socket.context";
import { realtimeClient, RealtimeStatus } from "../services/socket.service";
import { useAuthStore } from "../../auth/stores/auth.store";
import { SocketEvents, SocketEventEnvelope } from "@nos/shared-types";

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<RealtimeStatus>("OFFLINE");
  const [latencyMs, setLatencyMs] = useState<number>(0);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      realtimeClient.disconnect();
      setStatus("OFFLINE");
      setLatencyMs(0);
      return;
    }

    // Connect automatically when authenticated JWT exists
    realtimeClient.connect(accessToken);

    const unsubscribe = realtimeClient.subscribeStatus(
      (newStatus, newLatency) => {
        setStatus(newStatus);
        setLatencyMs(newLatency);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, accessToken]);

  const joinRoom = useCallback((room: string, cb?: (res: any) => void) => {
    realtimeClient.joinRoom(room, cb);
  }, []);

  const leaveRoom = useCallback((room: string) => {
    realtimeClient.leaveRoom(room);
  }, []);

  const subscribe = useCallback(
    <T = any,>(
      event: SocketEvents | string,
      callback: (envelope: SocketEventEnvelope<T>) => void,
    ) => {
      return realtimeClient.on<T>(event, callback);
    },
    [],
  );

  const contextValue: SocketContextValue = useMemo(() => {
    const current = realtimeClient.getStatus();
    return {
      status,
      latencyMs,
      socketId: current.socketId,
      joinRoom,
      leaveRoom,
      subscribe,
    };
  }, [status, latencyMs, joinRoom, leaveRoom, subscribe]);

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};
