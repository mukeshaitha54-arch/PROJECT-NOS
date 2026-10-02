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
      case "device.online":
        if (deviceId && !seenOnlineRef.current.has(deviceId)) {
          seenOnlineRef.current.add(deviceId);
          toast.success(`Device ${deviceId} is now ONLINE`, {
            id: `device-online-${deviceId}`,
          });
        }
        break;
      case "device.offline":
        if (deviceId) {
          seenOnlineRef.current.delete(deviceId);
          toast.error(`Device ${deviceId} is OFFLINE`, {
            id: `device-offline-${deviceId}`,
          });
        }
        break;
      case "alert.created":
      case "alert:triggered":
        toast.warning(
          `New Alert on ${payload.deviceId}: ${payload.ruleId || payload.message || "Threshold breached"}`,
          {
            id: `alert-${payload.alertId || payload.ruleId || payload.deviceId}`,
          },
        );
        break;
      case "device.registered":
        toast.info(`New device registered: ${payload.deviceId}`, {
          id: `device-reg-${payload.deviceId}`,
        });
        break;
    }
  }, [realtime.lastEvent]);

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
