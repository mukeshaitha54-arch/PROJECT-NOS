import React, { createContext, useContext, ReactNode } from "react";
import {
  useRealtime,
  ConnectionState,
  RealtimeEvent,
} from "../hooks/useRealtime";
import { Socket } from "socket.io-client";

interface RealtimeContextValue {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  lastEvent: RealtimeEvent | null;
  error: Error | null;
  on: (event: string, callback: (payload: any) => void) => () => void;
  reconnect: () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const realtime = useRealtime();

  return (
    <RealtimeContext.Provider value={realtime}>
      {realtime.connectionState === "reconnecting" && (
        <div className="fixed top-0 left-0 w-full z-50 bg-[#C8A96E] text-black text-xs font-bold py-1 px-4 text-center shadow-lg transition-all">
          Reconnecting to live server...
        </div>
      )}
      {realtime.connectionState === "disconnected" && (
        <div className="fixed top-0 left-0 w-full z-50 bg-red-500 text-white text-xs font-bold py-1 px-4 text-center shadow-lg transition-all">
          Live connection lost. Data may be stale.
        </div>
      )}
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeContext() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error(
      "useRealtimeContext must be used within a RealtimeProvider",
    );
  }
  return context;
}
