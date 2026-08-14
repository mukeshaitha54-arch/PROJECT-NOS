import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/contexts/auth-context";

export type ConnectionState =
  "connecting" | "connected" | "disconnected" | "reconnecting";

export interface RealtimeEvent {
  type: string;
  payload: any;
  receivedAt: Date;
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export function useRealtime() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Maintain a map of event listeners
  const listenersRef = useRef<Record<string, Array<(payload: any) => void>>>(
    {},
  );

  const on = useCallback((event: string, callback: (payload: any) => void) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(
        (cb) => cb !== callback,
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsConnected(false);
      return;
    }

    setConnectionState("connecting");

    // Connect to backend Socket.IO
    const socketInstance = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
    });

    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setIsConnected(true);
      setConnectionState("connected");
      setError(null);
      // Emit device:subscribe with organizationId
      const orgId =
        (user as any)?.organizationId ||
        (user as any)?.tenantId ||
        "default-org";
      socketInstance.emit("device:subscribe", orgId);
    });

    socketInstance.on("disconnect", (reason) => {
      setIsConnected(false);
      setConnectionState(
        reason === "io server disconnect" ? "disconnected" : "reconnecting",
      );
    });

    socketInstance.on("connect_error", (err) => {
      setError(err);
      setConnectionState("reconnecting");
    });

    // Centralized event listener for all events to trigger local callbacks and update lastEvent
    const handleAnyEvent = (event: string, msg: any) => {
      // Some events use SocketEventEnvelope, others are bare payloads
      let data = msg;
      if (msg && typeof msg === "object" && msg.payload !== undefined) {
        data = msg.payload;
        if (!data.deviceId && msg.deviceId) data.deviceId = msg.deviceId;
        if (!data.timestamp && msg.timestamp) data.timestamp = msg.timestamp;
      }
      setLastEvent({ type: event, payload: data, receivedAt: new Date() });
      if (listenersRef.current[event]) {
        listenersRef.current[event].forEach((cb) => cb(data));
      }
    };

    // Register listeners for expected backend events
    const eventsToListen = [
      "device.online",
      "device.offline",
      "device:status:changed",
      "telemetry.received",
      "telemetry:new",
      "alert:triggered",
      "alert.created",
      "device:heartbeat:missed",
      "heartbeat.received",
    ];

    eventsToListen.forEach((event) => {
      socketInstance.on(event, (payload) => handleAnyEvent(event, payload));
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  return {
    socket,
    isConnected,
    connectionState,
    lastEvent,
    error,
    on,
    reconnect: () => socket?.connect(),
  };
}
