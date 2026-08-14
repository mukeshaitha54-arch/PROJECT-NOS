"use client";

import { createContext, useContext } from "react";
import { RealtimeStatus } from "../services/socket.service";
import { SocketEvents, SocketEventEnvelope } from "@nos/shared-types";

export interface SocketContextValue {
  status: RealtimeStatus;
  latencyMs: number;
  socketId?: string;
  joinRoom: (room: string, callback?: (res: any) => void) => void;
  leaveRoom: (room: string) => void;
  subscribe: <T = any>(
    event: SocketEvents | string,
    callback: (envelope: SocketEventEnvelope<T>) => void,
  ) => () => void;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

export const useSocketContext = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a RealtimeProvider");
  }
  return context;
};
