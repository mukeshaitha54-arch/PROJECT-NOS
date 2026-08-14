export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Device {
  id: string;
  uuid: string;
  hostname: string;
  deviceName: string | null;
  name?: string;
  os: string;
  osVersion: string;
  status: string;
  lastSeen: string;
  ipAddress: string | null;
  registeredAt: string;
  claimStatus?: string;
}

export interface Alert {
  id: string;
  incidentNumber: string;
  deviceId: string;
  ruleId: string;
  title: string;
  description: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED" | "CLOSED";
  metric: string;
  value: number;
  threshold: number;
  createdAt: string;
  acknowledgedBy: string | null;
  resolvedAt: string | null;
}

export interface TelemetryPoint {
  deviceId: string;
  cpuUsage: number;
  ramUsage: number;
  diskUsagePercent: number;
  networkUploadSpeed: number;
  networkDownloadSpeed: number;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    online?: number;
    offline?: number;
  };
}
