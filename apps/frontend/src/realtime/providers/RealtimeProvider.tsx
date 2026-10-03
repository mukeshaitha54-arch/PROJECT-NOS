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

import { toast } from "sonner";

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const realtime = useRealtime();

  const seenOnlineRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!realtime.lastEvent) return;

    const { type, payload } = realtime.lastEvent;
    const deviceId = payload?.deviceId;

    switch (type) {
      case "alert.created":
      case "alert:triggered":
        toast.warning(
          `Alert on ${payload.hostname || payload.deviceId || "Node"}: ${payload.ruleId || payload.message || "Threshold breached"}`,
          {
            id: `alert-${payload.alertId || payload.ruleId || payload.deviceId}`,
          },
        );
        break;
      case "device.registered":
        toast.info(
          `New device registered: ${payload.hostname || payload.deviceId}`,
          {
            id: `device-reg-${payload.deviceId}`,
          },
        );
        break;
    }
  }, [realtime.lastEvent]);

  return (
    <RealtimeContext.Provider value={realtime}>
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
