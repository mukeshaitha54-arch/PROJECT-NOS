import { io, Socket } from "socket.io-client";
import { SocketEvents, SocketEventEnvelope } from "@nos/shared-types";
import { clientEnv } from "../../../config/env";

export type RealtimeStatus =
  "LIVE" | "RECONNECTING" | "OFFLINE" | "UNAUTHORIZED";
export type StatusListener = (
  status: RealtimeStatus,
  latencyMs: number,
) => void;

class RealtimeSocketClient {
  private socket: Socket | null = null;
  private status: RealtimeStatus = "OFFLINE";
  private latencyMs = 0;
  private statusListeners: Set<StatusListener> = new Set();
  private pingTimer: any = null;
  private currentToken: string | null = null;

  /**
   * Initializes enterprise Socket.IO connection with Zero Trust token attachment
   * and automatic reconnection backoff (SPL Feature 8 & 19).
   */
  public connect(token: string): void {
    if (this.socket && this.socket.connected && this.currentToken === token) {
      return;
    }
    this.currentToken = token;
    this.disconnect();

    const apiUrl = clientEnv.apiBaseUrl;
    const baseUrl =
      apiUrl.replace(/\/api\/v1\/?$/, "") || "http://localhost:4000";
    const namespace = process.env.NEXT_PUBLIC_SOCKET_NAMESPACE || "/realtime";

    this.socket = io(`${baseUrl}${namespace}`, {
      auth: { token: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      transports: ["websocket", "polling"],
    });

    this.setupListeners();
    this.startPingLoop();
  }

  public disconnect(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.updateStatus("OFFLINE");
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status, this.latencyMs);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public on<T = any>(
    event: SocketEvents | string,
    callback: (envelope: SocketEventEnvelope<T>) => void,
  ): () => void {
    if (!this.socket) {
      return () => {};
    }
    const handler = (data: any) => {
      callback(data as SocketEventEnvelope<T>);
    };
    this.socket.on(event, handler);
    return () => {
      this.socket?.off(event, handler);
    };
  }

  public joinRoom(room: string, callback?: (res: any) => void): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("joinRoom", room, (res: any) => {
        if (callback) callback(res);
      });
    }
  }

  public leaveRoom(room: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit("leaveRoom", room);
    }
  }

  public getStatus(): {
    status: RealtimeStatus;
    latencyMs: number;
    socketId: string | undefined;
  } {
    return {
      status: this.status,
      latencyMs: this.latencyMs,
      socketId: this.socket?.id,
    };
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      this.updateStatus("LIVE");
      this.sendPing();
    });

    this.socket.on("disconnect", (reason) => {
      if (
        reason === "io server disconnect" ||
        reason === "io client disconnect"
      ) {
        this.updateStatus("OFFLINE");
      } else {
        this.updateStatus("RECONNECTING");
      }
    });

    this.socket.on("connect_error", (err: any) => {
      if (
        err?.message?.toLowerCase().includes("unauthorized") ||
        err?.message?.toLowerCase().includes("token")
      ) {
        this.updateStatus("UNAUTHORIZED");
        this.socket?.disconnect();
      } else {
        this.updateStatus("RECONNECTING");
      }
    });

    this.socket.io.on("reconnect", () => {
      this.updateStatus("LIVE");
    });

    this.socket.on("unauthorized", () => {
      this.updateStatus("UNAUTHORIZED");
      this.socket?.disconnect();
    });
  }

  private startPingLoop(): void {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.sendPing();
      }
    }, 10000);
  }

  private sendPing(): void {
    if (!this.socket || !this.socket.connected) return;
    const start = Date.now();
    this.socket.emit("ping", start, (response?: { pong?: number }) => {
      if (response && typeof response === "object") {
        const rtt = Math.max(1, Date.now() - start);
        this.latencyMs = rtt;
        this.notifyListeners();
      }
    });
  }

  private updateStatus(newStatus: RealtimeStatus): void {
    this.status = newStatus;
    if (newStatus !== "LIVE") {
      this.latencyMs = 0;
    }
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const l of this.statusListeners) {
      l(this.status, this.latencyMs);
    }
  }
}

// Singleton client instance preserving memory cleanly across React re-renders (SPL Feature 15)
export const realtimeClient = new RealtimeSocketClient();
