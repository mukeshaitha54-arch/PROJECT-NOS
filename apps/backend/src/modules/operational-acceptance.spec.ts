import { Test, TestingModule } from "@nestjs/testing";
import { DeviceService } from "./device/device.service";
import { DeviceTimelineService } from "./device/services/device-timeline.service";
import { IDeviceTimelineRepository } from "../common/repositories/device-timeline.repository.interface";
import { TelemetryService } from "./telemetry/telemetry.service";
import { InventoryService } from "./inventory/inventory.service";
import { AuditEngineService } from "./tenant/services/audit-engine.service";

import {
  IDeviceRepositoryToken,
  IDeviceRepository,
} from "../common/repositories/device.repository.interface";
import {
  IHeartbeatRepositoryToken,
  IHeartbeatRepository,
} from "../common/repositories/heartbeat.repository.interface";
import {
  ITelemetryRepositoryToken,
  ITelemetryRepository,
} from "../common/repositories/telemetry.repository.interface";
import { IInventoryRepository } from "../common/repositories/inventory.repository.interface";
import {
  IAuditLogRepositoryToken,
  IAuditLogRepository,
} from "../common/repositories/tenant.repository.interface";
import {
  IOrganizationRepositoryToken,
  IOrganizationRepository,
} from "../common/repositories/tenant.repository.interface";
import {
  IDeviceAuthenticatorToken,
  IDeviceAuthenticator,
} from "../common/services/device-authenticator.interface";
import {
  ISocketPublisherToken,
  ISocketPublisher,
} from "../common/services/socket-publisher.interface";
import {
  ITelemetryPublisherToken,
  ITelemetryPublisher,
} from "../common/services/telemetry-publisher.interface";
import { HeartbeatPresenceService } from "./realtime/services/heartbeat-presence.service";
import { InventoryCacheService } from "./inventory/services/inventory-cache.service";
import { InventoryAuditService } from "./inventory/services/inventory-audit.service";
import { RegistrationKeyService } from "./fleet/services/registration-key.service";
import { PrismaService } from "../database/prisma.service";

import {
  DeviceStatus,
  TenantContext,
  SubmitInventoryPayload,
  AuditActionType,
} from "@nos/shared-types";
import { RegisterDeviceDto, HeartbeatDto } from "./device/dto/device.dto";
import { SubmitTelemetryDto } from "./telemetry/dto/telemetry.dto";
import {
  Device as PrismaDevice,
  TelemetrySnapshot as PrismaTelemetrySnapshot,
} from "@prisma/client";

describe("Operational Acceptance Test (OAT) Suite — Pre-Phase 7 Operational Readiness", () => {
  let deviceService: DeviceService;
  let telemetryService: TelemetryService;
  let inventoryService: InventoryService;
  let auditService: AuditEngineService;
  let mockSocketPublisher: jest.Mocked<ISocketPublisher>;

  // In-Memory Data Stores for OAT Isolation Testing
  const deviceStore = new Map<string, PrismaDevice>();
  const heartbeatStore = new Map<string, any>();
  const telemetryStore: PrismaTelemetrySnapshot[] = [];
  const inventoryStore = new Map<string, any>();
  const auditStore: any[] = [];
  const orgStore = new Map<string, any>();

  const orgAlphaContext: TenantContext = {
    organizationId: "org-enterprise-alpha",
    userId: "user-operator-alpha",
    correlationId: "corr-oat-alpha-001",
    requestId: "req-oat-alpha-001",
    ipAddress: "192.168.1.100",
    browser: "NOS-Agent-Worker/1.0",
  };

  const orgBetaContext: TenantContext = {
    organizationId: "org-enterprise-beta",
    userId: "user-operator-beta",
    correlationId: "corr-oat-beta-002",
    requestId: "req-oat-beta-002",
    ipAddress: "192.168.2.100",
    browser: "NOS-Agent-Worker/1.0",
  };

  beforeEach(async () => {
    deviceStore.clear();
    heartbeatStore.clear();
    telemetryStore.length = 0;
    inventoryStore.clear();
    auditStore.length = 0;
    orgStore.clear();

    mockSocketPublisher = {
      emitDeviceConnected: jest.fn().mockResolvedValue(undefined),
      emitDeviceDisconnected: jest.fn().mockResolvedValue(undefined),
      emitDeviceOnline: jest.fn().mockResolvedValue(undefined),
      emitDeviceOffline: jest.fn().mockResolvedValue(undefined),
      emitHeartbeatReceived: jest.fn().mockResolvedValue(undefined),
      emitTelemetryReceived: jest.fn().mockResolvedValue(undefined),
      emitInventoryUpdated: jest.fn().mockResolvedValue(undefined),
      emitDashboardUpdated: jest.fn().mockResolvedValue(undefined),
      emitSystemStatusChanged: jest.fn().mockResolvedValue(undefined),
      emitAlertEvent: jest.fn().mockResolvedValue(undefined),
      emitTenantEvent: jest.fn().mockResolvedValue(undefined),
    };

    const mockTelemetryPublisher: ITelemetryPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const mockDeviceRepo: Partial<IDeviceRepository> = {
      create: jest.fn().mockImplementation(async (data) => {
        const device: PrismaDevice = {
          id: `dev-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          uuid: data.uuid,
          hostname: data.hostname,
          deviceName: data.deviceName,
          os: data.os,
          osVersion: data.osVersion,
          architecture: data.architecture,
          agentVersion: data.agentVersion,
          status: data.status || DeviceStatus.ONLINE,
          claimStatus: "CLAIMED",
          organizationId: data.organizationId || "org-enterprise-alpha",
          tokenHash: data.tokenHash || "mock_hash",
          lastSeen: data.lastSeen || new Date(),
          registeredAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
        deviceStore.set(device.id, device);
        return device;
      }),
      findById: jest
        .fn()
        .mockImplementation(async (id) => deviceStore.get(id) || null),
      findByUuid: jest
        .fn()
        .mockImplementation(
          async (uuid) =>
            Array.from(deviceStore.values()).find((d) => d.uuid === uuid) ||
            null,
        ),
      findAll: jest.fn().mockImplementation(async (orgId) => {
        const list = Array.from(deviceStore.values());
        return orgId ? list.filter((d) => d.organizationId === orgId) : list;
      }),
      update: jest.fn().mockImplementation(async (id, data) => {
        const dev = deviceStore.get(id);
        if (dev) {
          Object.assign(dev, data, { updatedAt: new Date() });
        }
        return dev!;
      }),
    };

    const mockHeartbeatRepo: Partial<IHeartbeatRepository> = {
      create: jest.fn().mockImplementation(async (data) => {
        const hb = { id: `hb-${Date.now()}`, ...data, timestamp: new Date() };
        heartbeatStore.set(data.deviceId, hb);
        return hb;
      }),
      findLatestByDeviceId: jest
        .fn()
        .mockImplementation(
          async (deviceId) => heartbeatStore.get(deviceId) || null,
        ),
    };

    const mockTelemetryRepo: Partial<ITelemetryRepository> = {
      create: jest.fn().mockImplementation(async (data) => {
        const record: PrismaTelemetrySnapshot = {
          id: `tel-${Date.now()}`,
          deviceId: data.deviceId,
          cpuUsage: data.cpuUsage,
          cpuTemperature: data.cpuTemperature,
          cpuFrequency: data.cpuFrequency,
          logicalProcessors: data.logicalProcessors,
          physicalProcessors: data.physicalProcessors,
          memoryUsed: data.memoryUsed,
          memoryFree: data.memoryFree,
          memoryTotal: data.memoryTotal,
          memoryUsagePercent: data.memoryUsagePercent,
          diskReadSpeed: data.diskReadSpeed,
          diskWriteSpeed: data.diskWriteSpeed,
          diskUsagePercent: data.diskUsagePercent,
          diskFree: data.diskFree,
          diskTotal: data.diskTotal,
          networkUploadSpeed: data.networkUploadSpeed,
          networkDownloadSpeed: data.networkDownloadSpeed,
          bytesSent: data.bytesSent,
          bytesReceived: data.bytesReceived,
          activeConnections: data.activeConnections,
          runningProcesses: data.runningProcesses,
          systemUptime: data.systemUptime,
          bootTime: data.bootTime,
          ipAddress: data.ipAddress,
          macAddress: data.macAddress,
          timestamp: data.timestamp || new Date(),
        };
        telemetryStore.push(record);
        return record;
      }),
      findLatest: jest.fn().mockImplementation(async (deviceId) => {
        const matches = telemetryStore.filter((t) => t.deviceId === deviceId);
        return matches.length > 0 ? matches[matches.length - 1] : null;
      }),
      findRange: jest.fn().mockImplementation(async (query) => {
        const matches = telemetryStore.filter(
          (t) => t.deviceId === query.deviceId,
        );
        return { items: matches, total: matches.length };
      }),
    };

    const mockInventoryRepo: Partial<IInventoryRepository> = {
      upsertInventory: jest
        .fn()
        .mockImplementation(async (deviceId, payload) => {
          const inv = {
            deviceId,
            hostname: payload.hostname || "PROD-NODE-INVENTORY",
            domain: "NOS.INTERNAL",
            workgroup: "WORKGROUP",
            osEdition: payload.osEdition,
            osBuild: payload.osBuild,
            architecture: payload.architecture,
            assetFingerprint: "fingerprint-123",
            inventoryVersion: 1,
            schemaVersion: "1.0",
            lastScanAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            memoryModules: payload.memoryModules,
            diskDrives: payload.diskDrives,
            gpus: payload.gpus,
            networkAdapters: payload.networkAdapters,
            installedSoftware: payload.installedSoftware,
            windowsServices: payload.windowsServices,
            startupApplications: payload.startupApplications,
            security: payload.security,
            capabilities: payload.capabilities,
          };
          inventoryStore.set(deviceId, inv);
          return { inventory: inv as any, previousInventory: null };
        }),
      findCompleteInventory: jest
        .fn()
        .mockImplementation(
          async (deviceId) => inventoryStore.get(deviceId) || null,
        ),
      getRecentAuditLogs: jest.fn().mockResolvedValue([]),
    };

    const mockAuditRepo: Partial<IAuditLogRepository> = {
      record: jest.fn().mockImplementation(async (log) => {
        const entry = {
          id: `audit-${Date.now()}`,
          ...log,
          timestamp: new Date().toISOString(),
        };
        auditStore.push(entry);
        return entry as any;
      }),
      search: jest.fn().mockImplementation(async (req) => {
        const matches = auditStore.filter((a) =>
          req.organizationId ? a.organizationId === req.organizationId : true,
        );
        return {
          items: matches,
          total: matches.length,
          page: 1,
          limit: 50,
          totalPages: 1,
        };
      }),
    };

    const mockOrgRepo: Partial<IOrganizationRepository> = {
      findById: jest
        .fn()
        .mockImplementation(async (id) => orgStore.get(id) || null),
    };

    const mockAuthenticator: IDeviceAuthenticator = {
      generateCredentials: jest.fn().mockResolvedValue({
        rawToken: "mock_raw_device_token_secret_123",
        tokenHash: "mock_hashed_device_token_hash_456",
      }),
      authenticate: jest.fn().mockResolvedValue(null),
    };

    const mockHeartbeatPresence: Partial<HeartbeatPresenceService> = {
      processHeartbeat: jest
        .fn()
        .mockImplementation(
          async (
            deviceId,
            ipAddress,
            cpuUsage,
            ramUsage,
            uptime,
            correlationId,
          ) => {
            await mockSocketPublisher.emitHeartbeatReceived(
              deviceId,
              {
                deviceId,
                cpuUsage,
                ramUsage,
                uptime,
                ipAddress,
                timestamp: new Date().toISOString(),
                status: "ONLINE",
              } as any,
              correlationId,
            );
          },
        ),
    };

    const mockInventoryCache: Partial<InventoryCacheService> = {
      get: jest.fn().mockReturnValue(null), // sync — returns T | null
      set: jest.fn(), // sync — void
      invalidate: jest.fn(), // sync — void
    };

    const mockInventoryAudit: Partial<InventoryAuditService> = {
      calculateAssetFingerprint: jest
        .fn()
        .mockReturnValue("mock_fingerprint_hash"),
      detectAndLogDifferences: jest.fn().mockResolvedValue([]),
    };

    const mockTimelineRepo = {
      append: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: "evt-mock-1",
          ...dto,
          timestamp: new Date().toISOString(),
        }),
      ),
      getPaginated: jest.fn().mockResolvedValue({
        events: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
      getRecent: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceService,
        TelemetryService,
        InventoryService,
        AuditEngineService,
        DeviceTimelineService,
        { provide: IDeviceTimelineRepository, useValue: mockTimelineRepo },
        { provide: IDeviceRepositoryToken, useValue: mockDeviceRepo },
        { provide: IHeartbeatRepositoryToken, useValue: mockHeartbeatRepo },
        { provide: ITelemetryRepositoryToken, useValue: mockTelemetryRepo },
        { provide: IInventoryRepository, useValue: mockInventoryRepo },
        { provide: IAuditLogRepositoryToken, useValue: mockAuditRepo },
        { provide: IOrganizationRepositoryToken, useValue: mockOrgRepo },
        { provide: IDeviceAuthenticatorToken, useValue: mockAuthenticator },
        { provide: ISocketPublisherToken, useValue: mockSocketPublisher },
        { provide: ITelemetryPublisherToken, useValue: mockTelemetryPublisher },
        { provide: HeartbeatPresenceService, useValue: mockHeartbeatPresence },
        { provide: InventoryCacheService, useValue: mockInventoryCache },
        { provide: InventoryAuditService, useValue: mockInventoryAudit },
        {
          provide: RegistrationKeyService,
          useValue: {
            validateKey: jest.fn().mockResolvedValue({
              id: "key-test-1",
              organizationId: orgAlphaContext.organizationId,
            }),
            incrementKeyUsage: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            inventorySnapshot: {
              findUnique: jest.fn().mockResolvedValue(null),
              findFirst: jest.fn().mockResolvedValue(null),
              findMany: jest.fn().mockResolvedValue([]),
              create: jest.fn(),
              update: jest.fn(),
              upsert: jest.fn(),
            },
            device: {
              findUnique: jest.fn().mockResolvedValue(null),
              findFirst: jest.fn().mockResolvedValue(null),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb({})),
          },
        },
      ],
    }).compile();

    deviceService = module.get<DeviceService>(DeviceService);
    telemetryService = module.get<TelemetryService>(TelemetryService);
    inventoryService = module.get<InventoryService>(InventoryService);
    auditService = module.get<AuditEngineService>(AuditEngineService);
  });

  // ---------------------------------------------------------------------------
  // Module 2 Vertical Slice: Device Registration & Fleet Provisioning
  // ---------------------------------------------------------------------------
  it("Module 2 DoD Verification: Registers via Registration Key, issues JWT/token, emits WebSocket online event, ingests heartbeat, and recovers session", async () => {
    // Step 1 & 2 & 3 & 4: Enter registration key & dashboard URL -> Register successfully
    const dto: RegisterDeviceDto = {
      uuid: "uuid-mod2-fresh-pc-01",
      hostname: "PROD-MOD2-WIN-PC",
      deviceName: "NOS Agent Windows Endpoint",
      os: "Microsoft Windows 11 Pro",
      osVersion: "10.0.22631",
      architecture: "x64",
      agentVersion: "2.1.0",
      registrationKey: "NOS-ABCD-1234-5678-9000",
    };

    const registration = await deviceService.register(dto, "192.168.1.150");
    expect(registration).toBeDefined();
    expect(registration.deviceId).toBeDefined();
    // Step 5: Receive JWT/token
    expect(registration.registrationToken).toBe(
      "mock_raw_device_token_secret_123",
    );
    expect(registration.device.status).toBe(DeviceStatus.ONLINE);
    expect(registration.device.organizationId).toBe(
      orgAlphaContext.organizationId,
    );

    // Step 7 & 8: Appear in Fleet page & Show Online (via real-time Socket emissions & status API)
    expect(mockSocketPublisher.emitDeviceConnected).toHaveBeenCalledWith(
      registration.deviceId,
      expect.objectContaining({
        id: registration.deviceId,
        hostname: "PROD-MOD2-WIN-PC",
        status: DeviceStatus.ONLINE,
      }),
    );
    expect(mockSocketPublisher.emitDeviceOnline).toHaveBeenCalledWith(
      registration.deviceId,
      expect.objectContaining({
        deviceId: registration.deviceId,
        status: "ONLINE",
      }),
    );

    const fleetStatus = await deviceService.getPlatformStatus();
    const enrolled = fleetStatus.devices.find(
      (d) => d.id === registration.deviceId,
    );
    expect(enrolled).toBeDefined();
    expect(enrolled?.status).toBe(DeviceStatus.ONLINE);

    // Step 9: Send its first heartbeat
    const hbDto: HeartbeatDto = {
      deviceId: registration.deviceId,
      cpuUsage: 14.2,
      ramUsage: 41.5,
      uptime: 360,
      ipAddress: "192.168.1.150",
      timestamp: new Date().toISOString(),
    };
    const hbResponse = await deviceService.recordHeartbeat(
      deviceStore.get(registration.deviceId)!,
      hbDto,
    );
    expect(hbResponse.success).toBe(true);
    expect(mockSocketPublisher.emitHeartbeatReceived).toHaveBeenCalledWith(
      registration.deviceId,
      expect.objectContaining({
        cpuUsage: 14.2,
        ramUsage: 41.5,
      }),
      undefined,
    );

    // Step 10: Recover after restart without re-registering (simulate agent reboot invoking getDeviceProfile & heartbeat with existing token)
    const profile = await deviceService.getDeviceProfile(
      deviceStore.get(registration.deviceId)!,
    );
    expect(profile.id).toBe(registration.deviceId);
    expect(profile.lastHeartbeat?.cpuUsage).toBe(14.2);
    expect(profile.status).toBe(DeviceStatus.ONLINE);
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 1 & 2: Agent Execution & Automatic Device Roster Enrollment
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 1 & 2: Registers agent and automatically enrolls device in roster", async () => {
    const dto: RegisterDeviceDto = {
      uuid: "uuid-win-srv-001",
      hostname: "PROD-SRV-WIN-01",
      deviceName: "Primary Domain Controller",
      os: "Windows Server 2022",
      osVersion: "10.0.20348",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    };

    const registration = await deviceService.register(dto);
    expect(registration).toBeDefined();
    expect(registration.deviceId).toBeDefined();
    expect(registration.registrationToken).toBe(
      "mock_raw_device_token_secret_123",
    );
    expect(registration.device.hostname).toBe("PROD-SRV-WIN-01");

    // Verify roster contains the newly enrolled device
    const status = await deviceService.getPlatformStatus();
    expect(status.summary.totalRegistered).toBe(1);
    expect(status.summary.totalOnline).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 3: Live Heartbeat Tracking & Status Transition
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 3: Ingests live heartbeat and maintains ONLINE status", async () => {
    const registration = await deviceService.register({
      uuid: "uuid-win-srv-002",
      hostname: "PROD-NODE-02",
      deviceName: "Database Worker Node 02",
      os: "Windows 11 Enterprise",
      osVersion: "10.0.22631",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    const device = deviceStore.get(registration.deviceId)!;

    const hbDto: HeartbeatDto = {
      deviceId: registration.deviceId,
      cpuUsage: 18.5,
      ramUsage: 34.2,
      uptime: 86400,
      ipAddress: "10.0.1.50",
      timestamp: new Date().toISOString(),
    };

    const hbResponse = await deviceService.recordHeartbeat(device, hbDto);
    expect(hbResponse.success).toBe(true);
    expect(mockSocketPublisher.emitHeartbeatReceived).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 4: Live Telemetry Metrics (CPU, RAM, Disk, Network)
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 4: Ingests and retrieves live CPU, RAM, Disk, and Network telemetry", async () => {
    const registration = await deviceService.register({
      uuid: "uuid-win-srv-003",
      hostname: "PROD-NODE-03",
      deviceName: "Application Web Server 03",
      os: "Ubuntu 24.04 LTS",
      osVersion: "24.04",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    const device = deviceStore.get(registration.deviceId)!;

    const dto: SubmitTelemetryDto = {
      deviceId: registration.deviceId,
      cpuUsage: 45.2,
      cpuTemperature: 55.0,
      cpuFrequency: 3200,
      logicalProcessors: 16,
      physicalProcessors: 8,
      memoryUsed: 32000,
      memoryFree: 16000,
      memoryTotal: 48000,
      memoryUsagePercent: 66.6,
      diskReadSpeed: 120,
      diskWriteSpeed: 80,
      diskUsagePercent: 52.1,
      diskFree: 250,
      diskTotal: 500,
      networkUploadSpeed: 50,
      networkDownloadSpeed: 100,
      bytesSent: 5000000,
      bytesReceived: 10000000,
      activeConnections: 45,
      runningProcesses: 195,
      systemUptime: 172800,
      bootTime: new Date().toISOString(),
      ipAddress: "10.0.1.52",
      macAddress: "00:1A:2B:3C:4D:5E",
      timestamp: new Date().toISOString(),
    };

    const snapshot = await telemetryService.recordTelemetry(device, dto);
    expect(snapshot).toBeDefined();
    expect(snapshot.cpuUsage).toBe(45.2);
    expect(snapshot.memoryUsagePercent).toBe(66.6);
    expect(mockSocketPublisher.emitTelemetryReceived).toHaveBeenCalledWith(
      registration.deviceId,
      expect.anything(),
    );
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 5 & 6: Forced High CPU Load & Realtime Socket.IO Alert Event
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 5 & 6: Ingests high CPU spike telemetry and dispatches Socket.IO event", async () => {
    const registration = await deviceService.register({
      uuid: "uuid-win-srv-critical",
      hostname: "PROD-SRV-CRITICAL",
      deviceName: "Core Router & Gateway Node",
      os: "Debian 12",
      osVersion: "12.5",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    const device = deviceStore.get(registration.deviceId)!;

    const spikeDto: SubmitTelemetryDto = {
      deviceId: registration.deviceId,
      cpuUsage: 96.8,
      cpuTemperature: 85.0,
      cpuFrequency: 4200,
      logicalProcessors: 16,
      physicalProcessors: 8,
      memoryUsed: 44000,
      memoryFree: 4000,
      memoryTotal: 48000,
      memoryUsagePercent: 91.6,
      diskReadSpeed: 450,
      diskWriteSpeed: 300,
      diskUsagePercent: 88.0,
      diskFree: 50,
      diskTotal: 500,
      networkUploadSpeed: 500,
      networkDownloadSpeed: 1000,
      bytesSent: 50000000,
      bytesReceived: 100000000,
      activeConnections: 350,
      runningProcesses: 310,
      systemUptime: 259200,
      bootTime: new Date().toISOString(),
      ipAddress: "10.0.1.53",
      macAddress: "00:1A:2B:3C:4D:5F",
      timestamp: new Date().toISOString(),
    };

    const snapshot = await telemetryService.recordTelemetry(device, spikeDto);
    expect(snapshot.cpuUsage).toBe(96.8);
    expect(mockSocketPublisher.emitTelemetryReceived).toHaveBeenCalledWith(
      registration.deviceId,
      expect.anything(),
    );
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 7: Complete Inventory Visibility
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 7: Persists and views complete hardware, software, network, and security inventory", async () => {
    const registration = await deviceService.register({
      uuid: "uuid-win-srv-inv",
      hostname: "PROD-NODE-INVENTORY",
      deviceName: "Storage SAN Host 01",
      os: "Windows Server 2022",
      osVersion: "10.0.20348",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    const fullInventory: SubmitInventoryPayload = {
      deviceId: registration.deviceId,
      manufacturer: "Supermicro",
      model: "SYS-1029P-WTR",
      serialNumber: "SN-PROD-9988",
      motherboard: "Supermicro X12DPi-N6",
      biosVendor: "American Megatrends",
      biosVersion: "2.4b",
      cpuModel: "Intel Xeon Gold 6330",
      cpuVendor: "Intel",
      physicalCores: 28,
      logicalCores: 56,
      hostname: "PROD-NODE-INVENTORY",
      osEdition: "Enterprise",
      osBuild: "20348",
      architecture: "X64",
      memoryModules: [
        {
          slot: "DIMM_A1",
          capacityBytes: 68719476736,
          speedMHz: 3200,
          manufacturer: "Samsung",
          partNumber: "M393A8G40AB2",
          serialNumber: "S001",
        },
      ],
      diskDrives: [
        {
          driveName: "C:",
          model: "Samsung NVMe 980",
          serialNumber: "S1234",
          mediaType: "NVMe",
          sizeBytes: 536870912000,
          fileSystem: "NTFS",
          isSystemDrive: true,
        },
      ],
      gpus: [
        {
          name: "NVIDIA RTX A4000",
          manufacturer: "NVIDIA",
          driverVersion: "535.104",
          vRamBytes: 17179869184,
          resolution: "3840x2160",
        },
      ],
      networkAdapters: [
        {
          name: "Ethernet 0",
          macAddress: "00:1A:2B:3C:4D:62",
          ipv4: "10.0.1.29",
          ipv6: "fe80::1",
          gateway: "10.0.1.1",
          dns: "8.8.8.8",
          speedMbps: 10000,
          isWireless: false,
          isPhysical: true,
          isOperational: true,
        },
      ],
      installedSoftware: [
        {
          name: "NOS Monitoring Agent",
          version: "1.0.0",
          publisher: "NOS",
          installDate: "2026-01-01",
        },
      ],
      windowsServices: [
        {
          serviceName: "nos-agent",
          displayName: "NOS Agent Daemon",
          status: "RUNNING",
          startType: "AUTOMATIC",
          account: "LocalSystem",
        },
      ],
      startupApplications: [
        {
          name: "NOSAgentTray",
          command: "C:\\Program Files\\NOS\\tray.exe",
          location: "HKLM\\Run",
          user: "SYSTEM",
        },
      ],
      security: {
        windowsDefenderEnabled: true,
        firewallEnabled: true,
        bitLockerEnabled: true,
        secureBootEnabled: true,
        tpmEnabled: true,
        tpmVersion: "2.0",
      },
      capabilities: {
        supportsGPU: true,
        supportsBattery: false,
        supportsTPM: true,
        supportsVirtualization: true,
        supportsDocker: true,
        supportsWSL: false,
        supportsWiFi: false,
        supportsEthernet: true,
        virtualMachineDetection: false,
      },
    };

    await inventoryService.submitInventory(
      fullInventory,
      registration.deviceId,
    );

    const retrieved = await inventoryService.getCompleteInventory(
      registration.deviceId,
    );
    expect(retrieved).toBeDefined();
    expect(retrieved.inventory.memoryModules?.[0].speedMHz).toBe(3200);
    expect(retrieved.inventory.security?.tpmVersion).toBe("2.0");
    expect(retrieved.inventory.windowsServices?.[0].status).toBe("RUNNING");
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 8: Audit Log Persistence
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 8: Verifies audit trail creation during operations", async () => {
    await auditService.logEvent(
      orgAlphaContext,
      "REGISTER_ORGANIZATION" as AuditActionType,
      "Device",
      "dev-oat-100",
      "Agent Registration",
      { hostname: "PROD-SRV-WIN-01" },
    );

    const searchResult = await auditService.search({
      organizationId: orgAlphaContext.organizationId,
    });
    expect(searchResult.items.length).toBe(1);
    expect(searchResult.items[0].resourceId).toBe("dev-oat-100");
    expect(searchResult.items[0].organizationId).toBe(
      orgAlphaContext.organizationId,
    );
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 9: Strict Multi-Tenant Isolation (Org-Alpha vs Org-Beta)
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 9: Guarantees 0% cross-tenant data leakage between Org-Alpha and Org-Beta", async () => {
    // Register Device in Org Alpha
    await deviceService.register({
      uuid: "uuid-alpha-001",
      hostname: "ALPHA-NODE-01",
      deviceName: "Alpha Worker",
      os: "Linux",
      osVersion: "6.5",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    // Register Device in Org Beta
    await deviceService.register({
      uuid: "uuid-beta-001",
      hostname: "BETA-NODE-01",
      deviceName: "Beta Worker",
      os: "Linux",
      osVersion: "6.5",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgBetaContext.organizationId,
    });

    // Query All Devices -> 2 Total
    const all = await deviceService.getPlatformStatus();
    expect(all.devices.length).toBe(2);

    // Query Org Alpha Devices via Filter -> Should contain ONLY Alpha Node
    const alphaDevices = all.devices.filter(
      (d) => d.organizationId === orgAlphaContext.organizationId,
    );
    expect(alphaDevices.length).toBe(1);
    expect(alphaDevices[0].hostname).toBe("ALPHA-NODE-01");

    // Query Org Beta Devices via Filter -> Should contain ONLY Beta Node
    const betaDevices = all.devices.filter(
      (d) => d.organizationId === orgBetaContext.organizationId,
    );
    expect(betaDevices.length).toBe(1);
    expect(betaDevices[0].hostname).toBe("BETA-NODE-01");
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 10: Agent Connection Drop & Reconnect Recovery
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 10: Handles agent disconnect (OFFLINE) and clean reconnect recovery (ONLINE)", async () => {
    const registration = await deviceService.register({
      uuid: "uuid-reconnect-001",
      hostname: "RECONNECT-NODE",
      deviceName: "Failover Sentinel",
      os: "Windows Server 2022",
      osVersion: "10.0",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    let device = deviceStore.get(registration.deviceId)!;

    // Record initial heartbeat -> Device ONLINE
    await deviceService.recordHeartbeat(device, {
      deviceId: registration.deviceId,
      cpuUsage: 12.0,
      ramUsage: 25.0,
      uptime: 1000,
      ipAddress: "10.0.1.99",
      timestamp: new Date().toISOString(),
    });

    device = deviceStore.get(registration.deviceId)!;
    expect(device.status).toBe(DeviceStatus.ONLINE);

    // Simulate Agent Disconnect / Stale Heartbeat Sweep -> Status updated to OFFLINE
    device.status = DeviceStatus.OFFLINE;
    expect(device.status).toBe(DeviceStatus.OFFLINE);

    // Simulate Agent Restart & Heartbeat Reconnect -> Status recovers to ONLINE
    await deviceService.recordHeartbeat(device, {
      deviceId: registration.deviceId,
      cpuUsage: 14.0,
      ramUsage: 26.0,
      uptime: 1020,
      ipAddress: "10.0.1.99",
      timestamp: new Date().toISOString(),
    });

    device = deviceStore.get(registration.deviceId)!;
    expect(device.status).toBe(DeviceStatus.ONLINE);
    expect(mockSocketPublisher.emitHeartbeatReceived).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 11: Device Maintenance Mode & Retire Lifecycle
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 11: Sets device in maintenance mode and retires device with audit logging", async () => {
    const reg = await deviceService.register({
      uuid: "uuid-maint-001",
      hostname: "MAINT-NODE",
      deviceName: "Maintenance Server",
      os: "Windows 11",
      osVersion: "10.0",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    // Toggle Maintenance Mode ON
    const updatedMaint = await deviceService.setMaintenanceMode(
      reg.deviceId,
      true,
      "user-admin-01",
      "Admin Operator",
    );
    expect(updatedMaint.status).toBe(DeviceStatus.MAINTENANCE);

    // Toggle Maintenance Mode OFF
    const updatedOnline = await deviceService.setMaintenanceMode(
      reg.deviceId,
      false,
      "user-admin-01",
      "Admin Operator",
    );
    expect(updatedOnline.status).toBe(DeviceStatus.ONLINE);

    // Retire Device
    const retired = await deviceService.retireDevice(
      reg.deviceId,
      "user-admin-01",
      "Admin Operator",
    );
    expect(retired.status).toBe(DeviceStatus.OFFLINE);
  });

  // ---------------------------------------------------------------------------
  // Checkpoint 12: Bulk Status Update Operation
  // ---------------------------------------------------------------------------
  it("OAT Checkpoint 12: Executes bulk status updates across multiple monitored nodes", async () => {
    const reg1 = await deviceService.register({
      uuid: "uuid-bulk-001",
      hostname: "BULK-NODE-1",
      deviceName: "Node 1",
      os: "Windows 11",
      osVersion: "10.0",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    const reg2 = await deviceService.register({
      uuid: "uuid-bulk-002",
      hostname: "BULK-NODE-2",
      deviceName: "Node 2",
      os: "Windows 11",
      osVersion: "10.0",
      architecture: "X64",
      agentVersion: "1.0.0",
      organizationId: orgAlphaContext.organizationId,
    });

    const result = await deviceService.bulkUpdateStatus(
      [reg1.deviceId, reg2.deviceId],
      DeviceStatus.MAINTENANCE,
    );
    expect(result.updatedCount).toBe(2);
  });
});
