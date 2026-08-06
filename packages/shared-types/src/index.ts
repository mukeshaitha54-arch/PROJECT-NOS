/**
 * Global Standard API Response Structure
 * Embraced across Fastify endpoints and Next.js query clients.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiErrorPayload;
  meta?: PaginationMeta;
  timestamp: string;
  requestId?: string;
}

export interface ApiErrorPayload {
  code: string | number;
  message: string;
  details?: string[] | Record<string, any>;
  path?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standardized Enterprise Error Code Enumerations
 */
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_OTP = 'INVALID_OTP',
  OTP_EXPIRED = 'OTP_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/**
 * Role-Based Access Control (RBAC) Hierarchy Enums
 */
export enum UserRole {
  OWNER = 'OWNER',
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
  AUDITOR = 'AUDITOR',
  CUSTOM_ROLE = 'CUSTOM_ROLE',
  USER = 'USER', // Backward compatibility preservation
}

/**
 * Domain User Entity Abstraction
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  organizationId?: string;
}

/**
 * Authentication DTO Payload Contracts
 */
export interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface TokenResponsePayload {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

/**
 * System Operational Status
 */
export enum SystemStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  CRITICAL = 'CRITICAL',
  OFFLINE = 'OFFLINE',
  MAINTENANCE = 'MAINTENANCE',
}

/**
 * Node Entity Foundation (Placeholder before Telemetry features)
 */
export interface NodeIdentifier {
  id: string;
  hostname: string;
  ipAddress: string;
  status: SystemStatus;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ==========================================
 * PHASE 2A: DEVICE REGISTRATION & HEARTBEAT
 * ==========================================
 */

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  DEGRADED = 'DEGRADED',
  CRITICAL = 'CRITICAL',
  MAINTENANCE = 'MAINTENANCE',
}

export interface Device {
  id: string;
  uuid: string;
  hostname: string;
  deviceName: string;
  os: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  status: DeviceStatus;
  lastSeen: string | null;
  registeredAt: string;
  organizationId?: string | null;
  claimStatus?: 'UNASSIGNED' | 'ASSIGNED';
  createdAt: string;
  updatedAt: string;
}

export interface Heartbeat {
  id: string;
  deviceId: string;
  cpuUsage: number;
  ramUsage: number;
  uptime: number;
  ipAddress: string;
  timestamp: string;
  agentVersion?: string | null;
  lastTelemetryId?: string | null;
}

export interface RegisterDevicePayload {
  uuid: string;
  hostname: string;
  deviceName: string;
  os: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  registrationKey?: string;
  organizationId?: string;
}

export interface RegisterDeviceResponse {
  deviceId: string;
  registrationToken: string;
  device: Device;
}

export interface HeartbeatPayload {
  deviceId?: string; // Opt-in if transmitted in body, or extracted from device token
  cpuUsage: number;
  ramUsage: number;
  uptime: number;
  ipAddress: string;
  timestamp: string;
  hostname?: string;
  os?: string;
  agentVersion?: string;
  lastTelemetryId?: string;
}

export interface HeartbeatResponse {
  success: boolean;
  status: DeviceStatus;
  lastSeen: string;
  heartbeatId: string;
}

export interface DeviceStatusResponse {
  devices: (Device & { lastHeartbeat?: Heartbeat | null })[];
  summary: DeviceSummaryStats;
  timestamp: string;
}

export interface DeviceSummaryStats {
  totalRegistered: number;
  totalOnline: number;
  totalOffline: number;
  totalDegraded: number;
}

/**
 * =========================================================
 * PHASE 2B: COMPLETE TELEMETRY COLLECTION CONTRACTS
 * =========================================================
 */

export interface TelemetrySnapshot {
  id: string;
  deviceId: string;
  cpuUsage: number;             // 0 - 100%
  cpuTemperature: number;       // degrees Celsius
  cpuFrequency: number;         // MHz / GHz
  logicalProcessors: number;
  physicalProcessors: number;
  memoryUsed: number;           // bytes or MB
  memoryFree: number;           // bytes or MB
  memoryTotal: number;          // bytes or MB
  memoryUsagePercent: number;   // 0 - 100%
  diskReadSpeed: number;        // bytes/sec
  diskWriteSpeed: number;       // bytes/sec
  diskUsagePercent: number;     // 0 - 100%
  diskFree: number;             // bytes or MB/GB
  diskTotal: number;            // bytes or MB/GB
  networkUploadSpeed: number;   // bytes/sec (>= 0)
  networkDownloadSpeed: number; // bytes/sec (>= 0)
  bytesSent: number;            // total bytes transmitted
  bytesReceived: number;        // total bytes received
  activeConnections: number;
  runningProcesses: number;
  systemUptime: number;         // seconds
  bootTime: string;             // ISO 8601 UTC string
  ipAddress: string;
  macAddress: string;
  timestamp: string;            // ISO 8601 UTC string
  runningServices?: string[] | null;
  gateway?: string | null;
  dns?: string[] | null;
}

export interface SubmitTelemetryPayload {
  deviceId?: string;
  cpuUsage: number;
  cpuTemperature: number;
  cpuFrequency: number;
  logicalProcessors: number;
  physicalProcessors: number;
  memoryUsed: number;
  memoryFree: number;
  memoryTotal: number;
  memoryUsagePercent: number;
  diskReadSpeed: number;
  diskWriteSpeed: number;
  diskUsagePercent: number;
  diskFree: number;
  diskTotal: number;
  networkUploadSpeed: number;
  networkDownloadSpeed: number;
  bytesSent: number;
  bytesReceived: number;
  activeConnections: number;
  runningProcesses: number;
  systemUptime: number;
  bootTime: string;
  ipAddress: string;
  macAddress: string;
  timestamp?: string;
  runningServices?: string[];
  gateway?: string;
  dns?: string[];
}

export interface SubmitTelemetryResponse {
  success: boolean;
  snapshotId: string;
  timestamp: string;
  message: string;
}

export interface TelemetryHistoryQuery {
  from?: string;  // ISO 8601 UTC start date
  to?: string;    // ISO 8601 UTC end date
  limit?: number; // max records per page (default 50)
  page?: number;  // 1-indexed page number
}

export interface PaginatedTelemetryResponse {
  snapshots: TelemetrySnapshot[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * ARCHITECTURAL RESERvation: Future Hardware & Security Metrics
 * Reserved for upcoming enterprise phases without immediate implementation or DB schema coupling.
 */
export interface ReservedHardwareMetrics {
  // GPU Acceleration Telemetry
  gpuUsage?: number;
  gpuTemperature?: number;
  gpuMemoryUsed?: number;
  gpuMemoryTotal?: number;
  
  // Power & Battery Telemetry
  batteryPercentage?: number;
  batteryChargingStatus?: 'CHARGING' | 'DISCHARGING' | 'FULL' | 'NOT_PRESENT';
  
  // Virtualization & Hypervisor Sensing
  virtualizationActive?: boolean;
  hypervisorPresent?: boolean;
  hypervisorVendor?: string;
  
  // Enterprise Hardware Security & Compliance
  secureBootEnabled?: boolean;
  tpmPresent?: boolean;
  chassisIntrusionSensorTriggered?: boolean;
}

/**
 * ==========================================================
 * PHASE 2C + 2D: OPERATIONAL MONITORING LAYER CONTRACTS
 * ==========================================================
 */

export interface DashboardOverviewResponse {
  totalDevices: number;
  online: number;
  offline: number;
  critical: number;
  warning: number;
  degraded: number;
  maintenance: number;
  lastUpdated: string;
}

export interface DashboardDeviceRow {
  id: string;
  uuid: string;
  hostname: string;
  status: DeviceStatus;
  cpu: number;
  ram: number;
  disk: number;
  network: {
    uploadSpeed: number;
    downloadSpeed: number;
    ipAddress: string;
    activeConnections: number;
  };
  lastSeen: string | null;
  os: string;
  osVersion: string;
  agentVersion: string;
}

export interface DashboardDevicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  os?: string;
}

export interface PaginatedDashboardDevicesResponse {
  devices: DashboardDeviceRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardDeviceDetailResponse {
  device: Device;
  currentSnapshot: TelemetrySnapshot | null;
  latestHeartbeat: Heartbeat | null;
  currentCpu: number;
  currentRam: number;
  currentDisk: number;
  currentNetwork: {
    uploadSpeed: number;
    downloadSpeed: number;
    bytesSent: number;
    bytesReceived: number;
    activeConnections: number;
    ipAddress: string;
    macAddress: string;
  };
  deviceStatus: DeviceStatus;
  uptime: number;
  systemStatus: string;
  lastUpdated: string;
}

export interface DashboardHistoryQuery {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

/**
 * ==========================================================
 * PHASE 3: DEVICE INVENTORY & ASSET DISCOVERY ENGINE CONTRACTS
 * ==========================================================
 */

export interface MemoryModuleDto {
  id?: string;
  slot: string;
  capacityBytes: number;
  speedMHz: number;
  manufacturer: string;
  partNumber: string;
  serialNumber: string;
}

export interface DiskDriveDto {
  id?: string;
  driveName: string;
  model: string;
  serialNumber: string;
  mediaType: string; // e.g. NVMe, SSD, HDD
  sizeBytes: number;
  fileSystem: string;
  isSystemDrive: boolean;
}

export interface GpuDto {
  id?: string;
  name: string;
  manufacturer: string;
  driverVersion: string;
  vRamBytes: number;
  resolution: string;
}

export interface NetworkAdapterDto {
  id?: string;
  name: string;
  description?: string;
  macAddress: string;
  ipv4: string;
  ipv6: string;
  gateway: string;
  dns: string;
  speedMbps: number;
  isWireless: boolean;
  isPhysical: boolean;
  isOperational: boolean;
}

export interface InstalledSoftwareDto {
  id?: string;
  name: string;
  publisher: string;
  version: string;
  installDate: string;
  installLocation?: string;
}

export interface WindowsServiceDto {
  id?: string;
  serviceName: string;
  displayName: string;
  status: string; // e.g. Running, Stopped, Paused
  startType: string; // e.g. Automatic, Manual, Disabled
  account: string;
}

export interface StartupApplicationDto {
  id?: string;
  name: string;
  command: string;
  location: string;
  user: string;
}

export interface SecurityInventoryDto {
  id?: string;
  windowsDefenderEnabled: boolean;
  firewallEnabled: boolean;
  bitLockerEnabled: boolean;
  bitLockerDrive?: string;
  secureBootEnabled: boolean;
  tpmEnabled: boolean;
  tpmVersion?: string;
}

export interface DeviceCapabilitiesDto {
  id?: string;
  supportsGPU: boolean;
  supportsBattery: boolean;
  supportsTPM: boolean;
  supportsVirtualization: boolean;
  supportsDocker: boolean;
  supportsWSL: boolean;
  supportsWiFi: boolean;
  supportsEthernet: boolean;
  virtualMachineDetection: boolean;
  vmVendor?: string;
}

export interface DeviceInventoryDto {
  id: string;
  deviceId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  motherboard: string;
  biosVendor: string;
  biosVersion: string;
  biosReleaseDate?: string;
  cpuModel: string;
  cpuVendor: string;
  physicalCores: number;
  logicalCores: number;
  hostname: string;
  domain: string;
  workgroup: string;
  osEdition: string;
  osBuild: string;
  architecture: string;
  assetFingerprint: string;
  inventoryVersion: number;
  schemaVersion: string;
  lastScanAt: string;
  createdAt: string;
  updatedAt: string;
  memoryModules?: MemoryModuleDto[];
  diskDrives?: DiskDriveDto[];
  gpus?: GpuDto[];
  networkAdapters?: NetworkAdapterDto[];
  installedSoftware?: InstalledSoftwareDto[];
  windowsServices?: WindowsServiceDto[];
  startupApplications?: StartupApplicationDto[];
  security?: SecurityInventoryDto | null;
  capabilities?: DeviceCapabilitiesDto | null;
}

export interface InventoryAuditLogDto {
  id: string;
  deviceId: string;
  action: 'Inventory Created' | 'Inventory Updated' | 'Inventory Refreshed';
  changeDetails: string;
  timestamp: string;
}

export interface SubmitInventoryPayload {
  deviceId?: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  motherboard: string;
  biosVendor: string;
  biosVersion: string;
  biosReleaseDate?: string;
  cpuModel: string;
  cpuVendor: string;
  physicalCores: number;
  logicalCores: number;
  hostname: string;
  domain?: string;
  workgroup?: string;
  osEdition: string;
  osBuild: string;
  architecture: string;
  agentVersion?: string;
  schemaVersion?: string;
  memoryModules: MemoryModuleDto[];
  diskDrives: DiskDriveDto[];
  gpus: GpuDto[];
  networkAdapters: NetworkAdapterDto[];
  installedSoftware: InstalledSoftwareDto[];
  windowsServices: WindowsServiceDto[];
  startupApplications: StartupApplicationDto[];
  security: SecurityInventoryDto;
  capabilities: DeviceCapabilitiesDto;
}

export interface InventoryHealthResponse {
  deviceId?: string;
  inventoryVersion: number;
  inventorySchemaVersion: string;
  agentVersion: string;
  lastScan: string;
  inventoryAgeSeconds: number;
  status: 'HEALTHY' | 'STALE' | 'NOT_INITIALIZED';
}

export interface CompleteInventoryResponse {
  inventory: DeviceInventoryDto;
  recentAuditLogs?: InventoryAuditLogDto[];
}

export interface HardwareInventoryResponse {
  deviceId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  motherboard: string;
  biosVendor: string;
  biosVersion: string;
  cpuModel: string;
  cpuVendor: string;
  physicalCores: number;
  logicalCores: number;
  assetFingerprint: string;
  memoryModules: MemoryModuleDto[];
  diskDrives: DiskDriveDto[];
  gpus: GpuDto[];
}

export interface SoftwareInventoryResponse {
  deviceId: string;
  installedSoftware: InstalledSoftwareDto[];
  windowsServices: WindowsServiceDto[];
  startupApplications: StartupApplicationDto[];
  totalSoftware: number;
  totalServices: number;
  totalStartup: number;
}

export interface NetworkInventoryResponse {
  deviceId: string;
  networkAdapters: NetworkAdapterDto[];
  totalAdapters: number;
}

export interface SecurityInventoryResponse {
  deviceId: string;
  security: SecurityInventoryDto | null;
  capabilities: DeviceCapabilitiesDto | null;
}

/**
 * =========================================================
 * PHASE 4: ENTERPRISE REAL-TIME COMMUNICATION CONTRACTS
 * =========================================================
 */

export enum SocketEvents {
  DEVICE_CONNECTED = 'device.connected',
  DEVICE_DISCONNECTED = 'device.disconnected',
  DEVICE_ONLINE = 'device.online',
  DEVICE_OFFLINE = 'device.offline',
  HEARTBEAT_RECEIVED = 'heartbeat.received',
  TELEMETRY_RECEIVED = 'telemetry.received',
  INVENTORY_UPDATED = 'inventory.updated',
  DASHBOARD_UPDATED = 'dashboard.updated',
  SYSTEM_STATUS_CHANGED = 'system.status.changed',
  // Phase 5: Alert & Notification Events
  ALERT_CREATED = 'alert.created',
  ALERT_UPDATED = 'alert.updated',
  ALERT_ACKNOWLEDGED = 'alert.acknowledged',
  ALERT_RESOLVED = 'alert.resolved',
  ALERT_CLOSED = 'alert.closed',
  ALERT_SUPPRESSED = 'alert.suppressed',
  ALERT_ESCALATED = 'alert.escalated',
  NOTIFICATION_SENT = 'notification.sent',
}

export enum SocketRooms {
  DASHBOARD = 'dashboard',
  ADMINS = 'admins',
  OPERATORS = 'operators',
}

export const DEVICE_ROOM_PREFIX = 'device:';
export const getDeviceRoom = (deviceId: string) => `${DEVICE_ROOM_PREFIX}${deviceId}`;

/**
 * SPL FEATURE 1: Socket Versioning & SPL FEATURE 2: Correlation ID
 * Every socket event payload is enveloped in this structure to prevent breaking changes
 * and trace cross-layer executions.
 */
export interface SocketEventEnvelope<T = any> {
  eventId?: string;
  eventType?: string;
  version: number;
  event: string;
  timestamp: string;
  organizationId?: string;
  deviceId?: string;
  correlationId?: string;
  payload: T;
}

export interface SocketHealthResponse {
  connectedClients: number;
  rooms: number;
  namespaces: number;
  reconnectCount: number;
  disconnectCount: number;
  averageSessionTime: number; // in seconds
  droppedEvents: number;
  memoryUsage: number; // bytes
  latency: number; // ms
  gatewayUptime: number; // seconds
  authenticationFailures: number;
}

export interface SocketPresenceDto {
  socketId: string;
  userId?: string;
  deviceId?: string;
  role?: string;
  ipAddress?: string;
  onlineSince: string;
  lastActivity: string;
}

export interface SocketConnectionMetrics {
  connectedClients: number;
  reconnectCount: number;
  disconnectCount: number;
  averageSessionTimeMs: number;
  totalAuthFailures: number;
  droppedEvents: number;
}

export interface RealtimeDashboardEvent {
  overview: DashboardOverviewResponse;
  reason?: string;
  timestamp?: string;
}

export interface RealtimeTelemetryEvent {
  deviceId: string;
  snapshot: TelemetrySnapshot;
  alertState?: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface RealtimeInventoryEvent {
  deviceId: string;
  inventoryVersion: number;
  timestamp: string;
  mutationDetected: boolean;
}

export interface RealtimeHeartbeatEvent {
  deviceId: string;
  cpuUsage: number;
  ramUsage: number;
  uptime: number;
  ipAddress: string;
  timestamp: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
}

/**
 * =========================================================
 * PHASE 5: ENTERPRISE ALERT & NOTIFICATION ENGINE CONTRACTS
 * =========================================================
 */

export enum AlertSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  NEW = 'NEW',
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  SUPPRESSED = 'SUPPRESSED',
  EXPIRED = 'EXPIRED',
  SNOOZED = 'SNOOZED',
}

export enum AlertCategory {
  CPU = 'CPU',
  RAM = 'RAM',
  DISK = 'DISK',
  TEMPERATURE = 'TEMPERATURE',
  NETWORK = 'NETWORK',
  HEARTBEAT = 'HEARTBEAT',
  INVENTORY = 'INVENTORY',
  SECURITY = 'SECURITY',
  WINDOWS_SERVICE = 'WINDOWS_SERVICE',
  STARTUP_APP = 'STARTUP_APP',
  SYSTEM = 'SYSTEM',
  CORRELATION = 'CORRELATION',
}

export enum NotificationProvider {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  DISCORD = 'DISCORD',
  TEAMS = 'TEAMS',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
}

export enum AlertOperatorRole {
  OPERATOR = 'OPERATOR',
  SENIOR = 'SENIOR',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
  ON_CALL = 'ON_CALL',
}

export enum AlertConfidence {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum AlertRuleOperator {
  GREATER_THAN = '>',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN = '<',
  LESS_THAN_OR_EQUAL = '<=',
  EQUAL = '==',
  NOT_EQUAL = '!=',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  MUTATED = 'MUTATED',
}

export interface AlertDto {
  id: string;
  incidentNumber: string; // e.g., INC-000001
  deviceId: string;
  ruleId?: string | null;
  parentAlertId?: string | null; // For Correlation Groups
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  source: string;
  occurrenceCount: number;
  fingerprint: string; // SHA256(deviceId + metric + ruleId)
  riskScore: number; // 0-100 calculated risk
  confidenceScore: AlertConfidence;
  recoveryTimerSeconds?: number | null;
  tags?: string[];
  runbookUrl?: string | null;
  firstOccurred: string;
  lastOccurred: string;
  acknowledgedAt?: string | null;
  resolvedAt?: string | null;
  suppressedUntil?: string | null;
  snoozedUntil?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  createdAt: string;
  updatedAt: string;
  deviceName?: string;
  hostname?: string;
  ipAddress?: string;
  childAlertCount?: number;
  childAlerts?: AlertDto[];
}

export interface AlertRuleDto {
  id: string;
  version: number;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  durationSeconds: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownSeconds: number;
  tags?: string[];
  templateName?: string | null;
  silentMode?: boolean;
  businessHoursOnly?: boolean;
  createdBy?: string | null;
  modifiedBy?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistoryDto {
  id: string;
  alertId: string;
  action: string;
  performedBy: string;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  browser?: string | null;
  correlationId?: string | null;
  comment?: string | null;
  timestamp: string;
}

export interface AlertCommentDto {
  id: string;
  alertId: string;
  userId: string;
  userName: string;
  comment: string;
  isPrivate: boolean; // True for internal Operator Notes
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLogDto {
  id: string;
  alertId: string;
  provider: NotificationProvider;
  recipient: string;
  status: 'SUCCESS' | 'FAILED' | 'QUEUED' | 'RETRYING' | 'DLQ';
  response?: string | null;
  retryCount: number;
  isDlq: boolean;
  sentAt: string;
}

export interface MaintenanceWindowDto {
  id: string;
  deviceId?: string | null;
  deviceGroupId?: string | null;
  title: string;
  startTime: string;
  endTime: string;
  reason: string;
  type: 'SCHEDULED' | 'EMERGENCY' | 'RECURRING';
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AlertOverviewDto {
  totalAlerts: number;
  openAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  acknowledgedAlerts: number;
  resolvedToday: number;
  fleetAlertScore: number; // 0-100 overall fleet risk
  alertHeatLevel: 'HOT' | 'WARM' | 'COLD';
  repeatedIncidentCount: number; // e.g., occurred 73 times this month
  lastUpdated: string;
}

export interface AlertAgingBuckets {
  bucket0to5m: number;
  bucket5to15m: number;
  bucket15to60m: number;
  bucket1to4h: number;
  bucket4to24h: number;
  bucket24hPlus: number;
}

export interface AlertStatisticsDto {
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  agingBuckets: AlertAgingBuckets;
  topRules: { ruleId: string; ruleName: string; count: number }[];
  topDevices: { deviceId: string; hostname: string; count: number }[];
  averageResponseMinutes: number;
  averageResolveMinutes: number;
  slaViolations: number;
}

export interface AlertTimelineDto {
  items: AlertHistoryDto[];
  total: number;
}

export interface AlertHealthResponse {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  redisConnected: boolean;
  bullmqWorkersActive: boolean;
  activeQueuedCount: number;
  dlqCount: number;
  lastProcessedAt?: string | null;
  uptime: number;
}

export interface RuleSimulationReportDto {
  ruleId?: string;
  metric: string;
  operator: string;
  threshold: number;
  timeframeHours: number;
  wouldTriggerCount: number;
  suppressedCount: number;
  realAlertsCount: number;
  affectedDevices: string[];
  estimatedCooldownSaves: number;
}

export interface BulkAlertOperationRequest {
  alertIds: string[];
  action: 'ACKNOWLEDGE' | 'RESOLVE' | 'SUPPRESS' | 'DELETE' | 'ASSIGN' | 'TAG' | 'SNOOZE';
  payload?: {
    userId?: string;
    tag?: string;
    snoozeMinutes?: number;
    reason?: string;
  };
}

export interface RealtimeAlertEvent {
  alert: AlertDto;
  eventType: 'CREATED' | 'UPDATED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED' | 'ESCALATED';
  timestamp: string;
}



// =========================================================
// PHASE 5 FINAL HARDENING: Rule Engine Enterprise Types
// SPL Features 16–24 + 1% Enterprise Features 1–5
// =========================================================

// ─── Enums ────────────────────────────────────────────────

export enum AlertRulePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertRuleCategory {
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  AVAILABILITY = 'AVAILABILITY',
  INVENTORY = 'INVENTORY',
  COMPLIANCE = 'COMPLIANCE',
  MAINTENANCE = 'MAINTENANCE',
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
}

export enum AlertRuleScheduleMode {
  ALWAYS = 'ALWAYS',
  BUSINESS_HOURS = 'BUSINESS_HOURS',
  NIGHT = 'NIGHT',
  WEEKEND = 'WEEKEND',
  CRON = 'CRON',
}

export enum AlertRuleStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  ARCHIVED = 'ARCHIVED',
}

export enum RuleComplexityScore {
  SIMPLE = 'SIMPLE',
  MEDIUM = 'MEDIUM',
  COMPLEX = 'COMPLEX',
  VERY_COMPLEX = 'VERY_COMPLEX',
}

export enum RuleRecommendationType {
  MERGE = 'MERGE',
  REMOVE_DUPLICATE = 'REMOVE_DUPLICATE',
  NEVER_TRIGGERED = 'NEVER_TRIGGERED',
  EXPENSIVE = 'EXPENSIVE',
  HIGH_NOISE = 'HIGH_NOISE',
  OVERLAPPING = 'OVERLAPPING',
}

// ─── Enhanced AlertRuleDto (backward-compatible) ──────────

export interface AlertRuleEnhancedDto {
  id: string;
  version: number;
  name: string;
  description?: string | null;
  metric: string;
  operator: string;
  threshold: number;
  durationSeconds: number;
  severity: AlertSeverity;
  priority: AlertRulePriority;
  category: AlertRuleCategory;
  ruleStatus: AlertRuleStatus;
  enabled: boolean;
  cooldownSeconds: number;
  timeoutMs: number;
  scheduleMode: AlertRuleScheduleMode;
  cronExpression?: string | null;
  tags?: string[];
  templateName?: string | null;
  silentMode?: boolean;
  businessHoursOnly?: boolean;
  dependsOnIds?: string[];
  evaluationCount: number;
  triggerCount: number;
  suppressionCount: number;
  deduplicationCount: number;
  escalationCount: number;
  avgExecMs: number;
  maxExecMs: number;
  minExecMs: number;
  lastEvaluatedAt?: string | null;
  complexityScore: RuleComplexityScore;
  noiseScore: number;
  createdBy?: string | null;
  modifiedBy?: string | null;
  owner?: string | null;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── SPL FEATURE 16: Rule Test ────────────────────────────

export type RuleTestTimeframe = 'LAST_HOUR' | 'LAST_6H' | 'LAST_24H' | 'LAST_7D' | 'CUSTOM';

export interface RuleTestRequestDto {
  ruleId: string;
  timeframe: RuleTestTimeframe;
  from?: string;   // ISO string, required if timeframe === 'CUSTOM'
  to?: string;     // ISO string, required if timeframe === 'CUSTOM'
}

export interface RuleTestResultDto {
  ruleId: string;
  ruleName: string;
  timeframe: RuleTestTimeframe;
  fromDate: string;
  toDate: string;
  // Simulation only — nothing is created/stored
  wouldTrigger: number;
  suppressed: number;
  correlated: number;
  deduplicated: number;
  escalated: number;
  estimatedNotifications: number;
  estimatedEmails: number;
  estimatedSocketEvents: number;
  estimatedQueueJobs: number;
  affectedDevices: string[];
  estimatedCooldownSaves: number;
  noiseReduction: number;       // % of firings suppressed
  simulationDurationMs: number;
}

// ─── SPL FEATURE 17: Rule Validation ──────────────────────

export interface RuleValidationError {
  code: string;
  field?: string;
  message: string;
  conflictingRuleId?: string;
  conflictingRuleName?: string;
}

export interface RuleValidationResultDto {
  valid: boolean;
  errors: RuleValidationError[];
  warnings: RuleValidationError[];
  duplicateOf?: string | null;        // ruleId if duplicate detected
  conflictsWith?: string[] | null;    // ruleIds this conflicts with
  circularDependencies?: string[][];  // chains of circular deps
  invalidMetrics?: string[];
  impossibleConditions?: string[];
}

// ─── SPL FEATURE 18: Rule Preview ─────────────────────────

export interface RulePreviewDto {
  estimatedDevices: number;
  estimatedAlertVolume: number;     // per day
  estimatedSuppression: number;     // percentage
  estimatedCorrelation: number;     // count
  estimatedCooldownSaves: number;
  estimatedImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskRating: number;               // 0–100
  complexityScore: RuleComplexityScore;
  noiseScore: number;
  affectedTags: string[];
  estimatedDailyAlerts: number;
  estimatedWeeklyAlerts: number;
}

// ─── SPL FEATURE 19: Dry Run ──────────────────────────────

export interface DryRunLogEntry {
  deviceId: string;
  metric: string;
  value: number;
  wouldTrigger: boolean;
  reason: string;
  timestamp: string;
}

export interface DryRunResultDto {
  ruleId?: string;
  ruleName?: string;
  stored: false;      // Always false — dry run never stores
  notified: false;    // Always false — dry run never notifies
  wouldTriggerCount: number;
  suppressedCount: number;
  deduplications: number;
  logs: DryRunLogEntry[];
  executionTimeMs: number;
  evaluatedDevices: number;
  samplesProcessed: number;
}

// ─── SPL FEATURE 20: Rule Diff ────────────────────────────

export interface RuleFieldDiff {
  field: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  changed: boolean;
}

export interface RuleDiffDto {
  ruleId: string;
  ruleName: string;
  fromVersion: number;
  toVersion: number;
  fromTimestamp: string;
  toTimestamp: string;
  diffs: RuleFieldDiff[];
  changedBy: string;
  changeReason?: string | null;
  totalChanges: number;
}

// ─── SPL FEATURE 21: Rollback Preview ─────────────────────

export interface RollbackPreviewDto {
  ruleId: string;
  ruleName: string;
  currentVersion: number;
  targetVersion: number;
  currentState: AlertRuleEnhancedDto;
  targetState: AlertRuleEnhancedDto;
  differences: RuleFieldDiff[];
  warnings: string[];
  estimatedImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isRollbackSafe: boolean;
}

// ─── SPL FEATURE 22: Replay Historical Telemetry ──────────

export interface ReplayRequestDto {
  ruleId: string;
  from: string;   // ISO string
  to: string;     // ISO string
  deviceIds?: string[];   // Optional filter — if empty, all devices
}

export interface ReplayResultDto {
  ruleId: string;
  ruleName: string;
  from: string;
  to: string;
  stored: false;      // Always false — simulation only
  devicesReplayed: number;
  samplesReplayed: number;
  wouldTriggerCount: number;
  suppressedCount: number;
  correlatedCount: number;
  deduplicatedCount: number;
  estimatedAlertVolume: number;
  executionTimeMs: number;
  timeline: ReplayTimelineEntry[];
}

export interface ReplayTimelineEntry {
  timestamp: string;
  deviceId: string;
  metric: string;
  value: number;
  wouldTrigger: boolean;
  suppressReason?: string;
}

// ─── SPL FEATURE 23: Rule Health ──────────────────────────

export interface RuleHealthQueueInfo {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface RuleHealthDto {
  activeRules: number;
  disabledRules: number;
  archivedRules: number;
  conflictingRules: number;
  duplicateRules: number;
  avgEvaluationMs: number;
  slowRules: Array<{ id: string; name: string; avgExecMs: number }>;
  fastRules: Array<{ id: string; name: string; avgExecMs: number }>;
  queues: RuleHealthQueueInfo[];
  redis: {
    connected: boolean;
    memoryUsageBytes: number;
    latencyMs: number;
    connectedClients: number;
    uptime: number;
  };
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  lastCheckedAt: string;
}

// ─── SPL FEATURE 24: Rule Performance Metrics ─────────────

export interface RulePerformanceMetricsDto {
  ruleId: string;
  ruleName: string;
  avgExecutionMs: number;
  maxExecutionMs: number;
  minExecutionMs: number;
  evaluationCount: number;
  triggerCount: number;
  suppressionCount: number;
  correlationCount: number;
  deduplicationCount: number;
  escalationCount: number;
  memoryUsageBytes: number;
  triggerRate: number;          // triggers / evaluations %
  suppressionRate: number;      // suppressions / triggers %
  lastEvaluatedAt?: string | null;
  p95ExecutionMs: number;
  p99ExecutionMs: number;
}

// ─── 1% FEATURE 1: Rule Complexity Score ─────────────────

export interface RuleComplexityBreakdownDto {
  ruleId: string;
  ruleName: string;
  score: RuleComplexityScore;
  scoreValue: number;           // 0–100 numeric
  factors: {
    conditionComplexity: number;
    operatorWeight: number;
    hasDependencies: boolean;
    dependencyDepth: number;
    hasCorrelation: boolean;
    hasCooldown: boolean;
    hasDuration: boolean;
    scheduleModeComplexity: number;
  };
}

// ─── 1% FEATURE 2: Rule Recommendation Engine ────────────

export interface RuleRecommendationDto {
  type: RuleRecommendationType;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  actionable: boolean;
  suggestedAction?: string;
  relatedRuleIds?: string[];
}

// ─── 1% FEATURE 3: Noise Score ───────────────────────────

export interface RuleNoiseScoreDto {
  ruleId: string;
  ruleName: string;
  noiseScore: number;           // 0–100 (100 = extremely noisy)
  rating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  breakdown: {
    deduplicationFactor: number;
    suppressionFactor: number;
    cooldownFactor: number;
    correlationFactor: number;
    falsePositiveFactor: number;
    maintenanceFactor: number;
  };
  recommendation: string;
}

// ─── 1% FEATURE 4: Rule Usage Statistics ─────────────────

export interface RuleUsageStatisticsDto {
  ruleId: string;
  ruleName: string;
  totalEvaluations: number;
  totalTriggers: number;
  totalSuppressions: number;
  totalDeduplications: number;
  totalEscalations: number;
  dailyTriggerAverage: number;
  weeklyTriggerAverage: number;
  lastTriggeredAt?: string | null;
  lastEvaluatedAt?: string | null;
  neverTriggered: boolean;
  triggerTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
}

// ─── 1% FEATURE 5: Enterprise Rule Audit ─────────────────

export interface RuleAuditEntryDto {
  id: string;
  ruleId: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  version: number;
  performedBy: string;
  reason?: string | null;
  correlationId?: string | null;
  ipAddress?: string | null;
  browser?: string | null;
  timestamp: string;
}

// ─── Rule Dependency Graph ─────────────────────────────────

export interface RuleDependencyNode {
  ruleId: string;
  ruleName: string;
  priority: AlertRulePriority;
  category: AlertRuleCategory;
  dependsOn: string[];           // parent rule IDs
  dependents: string[];          // child rule IDs
  depth: number;
  hasCircularDep: boolean;
}

export interface RuleDependencyGraphDto {
  nodes: RuleDependencyNode[];
  edges: Array<{ from: string; to: string }>;
  circularPaths: string[][];
  maxDepth: number;
  totalNodes: number;
  totalEdges: number;
}

// ─── Rule Export / Import ─────────────────────────────────

export interface RuleExportDto {
  exportedAt: string;
  exportedBy: string;
  version: string;              // schema version e.g. "1.0.0"
  totalRules: number;
  rules: AlertRuleEnhancedDto[];
}

export interface RuleImportResultDto {
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{ ruleName: string; reason: string }>;
  warnings: Array<{ ruleName: string; message: string }>;
}

// ─── Rule Search ──────────────────────────────────────────

export interface RuleSearchQueryDto {
  name?: string;
  metric?: string;
  severity?: AlertSeverity;
  category?: AlertRuleCategory;
  tags?: string[];
  enabled?: boolean;
  owner?: string;
  version?: number;
  ruleStatus?: AlertRuleStatus;
  priority?: AlertRulePriority;
  skip?: number;
  take?: number;
}

// ─── Queue Dashboard ──────────────────────────────────────

export interface QueueDashboardDto {
  alertQueue: RuleHealthQueueInfo;
  notificationQueue: RuleHealthQueueInfo;
  retryQueue: RuleHealthQueueInfo;
  deadLetterQueue: RuleHealthQueueInfo;
  redis: {
    connected: boolean;
    memoryUsageBytes: number;
    latencyMs: number;
    connectedClients: number;
    uptimeSeconds: number;
    version: string;
  };
  totalWaiting: number;
  totalActive: number;
  totalFailed: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  lastUpdatedAt: string;
}

// ==========================================
// PHASE 6: ENTERPRISE MULTI-TENANT SAAS PLATFORM TRANSFORMATION
// ==========================================

// ─── SPL Feature: Tenant Context Propagation ─────────────────

export interface TenantContext {
  organizationId: string;
  correlationId: string;
  requestId: string;
  userId?: string;
  role?: string;
  ipAddress?: string;
  browser?: string;
}

export interface TenantAwarePayload<T = any> {
  context: TenantContext;
  data: T;
}

// ─── Organization & Tenant Entities ──────────────────────────

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED', // Soft delete state
}

export interface OrganizationSettingsDto {
  timezone: string;
  language: string;
  retentionDays: number;
  notificationDefaults: {
    emailEnabled: boolean;
    webhookEnabled: boolean;
    silentHoursStart?: string;
    silentHoursEnd?: string;
  };
  maintenanceDefaults: {
    defaultDurationMinutes: number;
    requireApproval: boolean;
    autoNotify: boolean;
  };
  securityPolicies: {
    enforceMfa: boolean;
    sessionTimeoutMinutes: number;
    maxFailedLoginAttempts: number;
    allowedIpRanges?: string[];
  };
  passwordPolicies: {
    minLength: number;
    requireUppercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
    expiryDays: number;
  };
}

export interface OrganizationQuotaDto {
  maxDevices: number;
  maxUsers: number;
  maxApiKeys: number;
  maxStorageMb: number;
  maxDailyTelemetry: number;
  maxDailyAlerts: number;
}

export interface OrganizationQuotaUsageDto extends OrganizationQuotaDto {
  currentDevices: number;
  currentUsers: number;
  currentApiKeys: number;
  currentStorageMb: number;
  currentDailyTelemetry: number;
  currentDailyAlerts: number;
  isApproachingLimit: boolean;
  isLimitExceeded: boolean;
  percentUsed: number;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  settings: OrganizationSettingsDto;
  quota: OrganizationQuotaDto;
  quotaUsage?: OrganizationQuotaUsageDto;
}

// ─── Teams, Departments & Membership ─────────────────────────

export interface DepartmentDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  headUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamDto {
  id: string;
  organizationId: string;
  departmentId?: string;
  name: string;
  description?: string;
  leadUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export interface OrganizationInvitationDto {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  teamIds: string[];
  departmentIds: string[];
  invitedByUserId: string;
  status: InvitationStatus;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
}

export interface OrganizationMemberDto {
  id: string;
  organizationId: string;
  userId: string;
  role: UserRole;
  customRoleId?: string;
  teamIds: string[];
  departmentIds: string[];
  joinedAt: string;
  isSuspended: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    lastLoginAt?: string;
  };
}

// ─── RBAC & ABAC Permissions ─────────────────────────────────

export enum PermissionFlag {
  DEVICE_MANAGEMENT = 'DEVICE_MANAGEMENT',
  INVENTORY_READ_WRITE = 'INVENTORY_READ_WRITE',
  TELEMETRY_READ = 'TELEMETRY_READ',
  ALERTS_MANAGE = 'ALERTS_MANAGE',
  RULES_MANAGE = 'RULES_MANAGE',
  MAINTENANCE_MANAGE = 'MAINTENANCE_MANAGE',
  USERS_MANAGE = 'USERS_MANAGE',
  TEAMS_MANAGE = 'TEAMS_MANAGE',
  SETTINGS_MANAGE = 'SETTINGS_MANAGE',
  API_KEYS_MANAGE = 'API_KEYS_MANAGE',
  AUDIT_READ = 'AUDIT_READ',
  ROLE_BUILDER_MANAGE = 'ROLE_BUILDER_MANAGE',
}

export interface PermissionProfileDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  permissions: PermissionFlag[];
  abacConditions?: Record<string, any>;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleTemplateDto {
  id: string;
  name: string;
  baseRole: UserRole;
  defaultPermissions: PermissionFlag[];
  description: string;
}

export interface PermissionMatrixDto {
  roles: { role: UserRole | string; permissions: PermissionFlag[] }[];
  allPermissions: { flag: PermissionFlag; category: string; label: string; description: string }[];
}

// ─── Device Ownership & Governance ───────────────────────────

export enum DeviceGroupType {
  STATIC = 'STATIC',
  DYNAMIC = 'DYNAMIC',
  SMART = 'SMART',
}

export interface DeviceGroupDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  groupType: DeviceGroupType;
  filterCriteria?: {
    os?: string[];
    status?: string[];
    tags?: string[];
    ipRange?: string;
    customRule?: string;
  };
  deviceCount?: number;
  deviceIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DeviceOwnershipDto {
  id: string;
  deviceId: string;
  organizationId: string;
  ownerUserId?: string | null;
  assignedTeamId?: string | null;
  assignedDepartmentId?: string | null;
  assignedOperatorId?: string | null;
  groupIds: string[];
  assignedAt: string;
  updatedAt: string;
}

export enum DeviceTransferStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export interface DeviceTransferRequestDto {
  id: string;
  deviceId: string;
  fromOrganizationId: string;
  toOrganizationId: string;
  requestedByUserId: string;
  approvedByUserId?: string | null;
  status: DeviceTransferStatus;
  reason: string;
  createdAt: string;
  resolvedAt?: string | null;
}

// ─── User Session & Governance ───────────────────────────────

export interface UserSessionDto {
  id: string;
  userId: string;
  organizationId: string;
  tokenHash: string;
  ipAddress: string;
  browser: string;
  os: string;
  isActive: boolean;
  isRevoked: boolean;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
  riskScore?: number;
}

export interface UserActivityDto {
  id: string;
  userId: string;
  organizationId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress: string;
  browser: string;
  timestamp: string;
}

export interface UserImpersonationDto {
  impersonatingUserId: string;
  targetUserId: string;
  organizationId: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
  auditCorrelationId: string;
}

// ─── API Key Governance ──────────────────────────────────────

export enum ApiKeyScope {
  DEVICES_READ = 'DEVICES_READ',
  DEVICES_WRITE = 'DEVICES_WRITE',
  TELEMETRY_INGEST = 'TELEMETRY_INGEST',
  ALERTS_READ = 'ALERTS_READ',
  ALERTS_WRITE = 'ALERTS_WRITE',
  INVENTORY_READ = 'INVENTORY_READ',
  AUDIT_READ = 'AUDIT_READ',
  WEBHOOKS_MANAGE = 'WEBHOOKS_MANAGE',
}

export interface ApiKeyDto {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string; // First 8 characters for identification
  tokenHash?: string;
  scopes: ApiKeyScope[];
  allowedIps?: string[];
  expiresAt: string;
  lastUsedAt?: string | null;
  usageCount: number;
  createdByUserId: string;
  isRevoked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKeyCreateRequestDto {
  name: string;
  scopes: ApiKeyScope[];
  allowedIps?: string[];
  expiryDays: number;
}

// ─── Universal Audit System ──────────────────────────────────

export enum AuditActionType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  DEVICE_REGISTRATION = 'DEVICE_REGISTRATION',
  DEVICE_TRANSFER = 'DEVICE_TRANSFER',
  INVENTORY_UPDATE = 'INVENTORY_UPDATE',
  TELEMETRY_INGEST = 'TELEMETRY_INGEST',
  RULE_CREATE = 'RULE_CREATE',
  RULE_UPDATE = 'RULE_UPDATE',
  RULE_DELETE = 'RULE_DELETE',
  ALERT_TRIGGER = 'ALERT_TRIGGER',
  ALERT_ACKNOWLEDGE = 'ALERT_ACKNOWLEDGE',
  MAINTENANCE_SCHEDULE = 'MAINTENANCE_SCHEDULE',
  ORG_SETTINGS_UPDATE = 'ORG_SETTINGS_UPDATE',
  USER_INVITED = 'USER_INVITED',
  USER_REMOVED = 'USER_REMOVED',
  USER_IMPERSONATION = 'USER_IMPERSONATION',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  API_KEY_CREATE = 'API_KEY_CREATE',
  API_KEY_REVOKE = 'API_KEY_REVOKE',
  SESSION_REVOKE = 'SESSION_REVOKE',
  ORG_LIFECYCLE_CHANGE = 'ORG_LIFECYCLE_CHANGE',
}

export interface AuditLogDto {
  id: string;
  organizationId: string;
  userId?: string | null;
  userEmail?: string | null;
  action: AuditActionType | string;
  resourceType?: string | null;
  resourceId?: string | null;
  reason?: string | null;
  ipAddress: string;
  browser: string;
  correlationId: string;
  details?: Record<string, any>;
  timestamp: string;
}

export interface AuditSearchRequestDto {
  organizationId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditSearchResultDto {
  items: AuditLogDto[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

// ─── 1% Special Enterprise Scores & Dashboards ───────────────

export interface OrganizationHealthScoreDto {
  organizationId: string;
  overallHealthScore: number; // 0 - 100
  deviceAvailabilityPercent: number;
  openCriticalAlertsCount: number;
  queueHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  storageQuotaPercent: number;
  timestamp: string;
}

export interface OrganizationRiskScoreDto {
  organizationId: string;
  riskScore: number; // 0 - 100 (Higher is riskier)
  unverifiedUsersCount: number;
  staleApiKeysCount: number;
  failedLogins24h: number;
  devicesOutsideMaintenance: number;
  impersonationCount24h: number;
  timestamp: string;
}

export interface SecurityScoreDto {
  organizationId: string;
  securityScore: number; // 0 - 100
  mfaEnforcementEnabled: boolean;
  strictPasswordPolicy: boolean;
  ipWhiteListingActive: boolean;
  expiredInvitationsCount: number;
  openSessionAnomalies: number;
  timestamp: string;
}

export interface ComplianceScoreDto {
  organizationId: string;
  complianceScore: number; // 0 - 100
  auditLoggingCoveragePercent: number; // 100% in our design
  retentionCompliance: boolean;
  segregationOfDutiesVerified: boolean;
  zeroOrmLeakageVerified: boolean;
  tenantIsolationVerified: boolean;
  timestamp: string;
}

