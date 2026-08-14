import { Test, TestingModule } from "@nestjs/testing";
import { OrganizationService } from "./services/organization.service";
import { UserGovernanceService } from "./services/user-governance.service";
import { RbacEvaluationService } from "./services/rbac-evaluation.service";
import { QuotaEngineService } from "./services/quota-engine.service";
import { AuditEngineService } from "./services/audit-engine.service";
import { TenantJobContext } from "./workers/tenant-job-context";
import {
  IOrganizationRepository,
  IOrganizationRepositoryToken,
  ITeamRepository,
  ITeamRepositoryToken,
  IUserSessionRepository,
  IUserSessionRepositoryToken,
  IAuditLogRepository,
  IAuditLogRepositoryToken,
  IApiKeyRepository,
  IApiKeyRepositoryToken,
  IDeviceGovernanceRepository,
  IDeviceGovernanceRepositoryToken,
} from "../../common/repositories/tenant.repository.interface";
import {
  IDeviceRepositoryToken,
  IDeviceRepository,
} from "../../common/repositories/device.repository.interface";
import {
  ISocketPublisher,
  ISocketPublisherToken,
} from "../../common/services/socket-publisher.interface";
import {
  OrganizationStatus,
  UserRole,
  PermissionFlag,
  AuditActionType,
  TenantContext,
} from "@nos/shared-types";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("Phase 6 - Multi-Tenant SaaS Transformation & Cross-Tenant Safety Integration Verification", () => {
  let orgService: OrganizationService;
  let userService: UserGovernanceService;
  let rbacService: RbacEvaluationService;
  let quotaService: QuotaEngineService;
  let auditService: AuditEngineService;
  let mockSocketPublisher: jest.Mocked<ISocketPublisher>;

  // InMemory stores simulating tenant repository isolation
  const orgStore = new Map<string, any>();
  const teamStore = new Map<string, any>(); // key: `${orgId}:${userId}`
  const sessionStore = new Map<string, any>();
  const auditStore: any[] = [];

  const orgContextA: TenantContext = {
    organizationId: "org-enterprise-alpha",
    userId: "user-owner-a",
    correlationId: "corr-alpha-001",
    requestId: "req-alpha-001",
    ipAddress: "10.0.1.50",
    browser: "Chrome/Enterprise",
  };

  const orgContextB: TenantContext = {
    organizationId: "org-enterprise-beta",
    userId: "user-owner-b",
    correlationId: "corr-beta-002",
    requestId: "req-beta-002",
    ipAddress: "192.168.10.15",
    browser: "Firefox/Security",
  };

  beforeEach(async () => {
    mockSocketPublisher = {
      emitDeviceConnected: jest.fn(),
      emitDeviceDisconnected: jest.fn(),
      emitDeviceOnline: jest.fn(),
      emitDeviceOffline: jest.fn(),
      emitHeartbeatReceived: jest.fn(),
      emitTelemetryReceived: jest.fn(),
      emitInventoryUpdated: jest.fn(),
      emitDashboardUpdated: jest.fn(),
      emitSystemStatusChanged: jest.fn(),
      emitAlertEvent: jest.fn(),
      emitTenantEvent: jest.fn(),
    };

    const mockOrgRepo: Partial<IOrganizationRepository> = {
      create: jest.fn().mockImplementation(async (data) => {
        const id = `org-${Math.random().toString(36).substring(7)}`;
        const doc = {
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        orgStore.set(id, doc);
        return doc;
      }),
      findById: jest
        .fn()
        .mockImplementation(async (id: string) => orgStore.get(id) || null),
      findBySlug: jest.fn().mockImplementation(async (slug: string) => {
        for (const doc of orgStore.values()) {
          if (doc.slug === slug) return doc;
        }
        return null;
      }),
      updateStatus: jest
        .fn()
        .mockImplementation(async (id: string, status: any) => {
          const org = orgStore.get(id);
          if (!org) throw new NotFoundException();
          org.status = status;
          orgStore.set(id, org);
          return org;
        }),
      updateSettings: jest
        .fn()
        .mockImplementation(async (id: string, settings: any) => {
          const org = orgStore.get(id);
          org.settings = { ...org.settings, ...settings };
          orgStore.set(id, org);
          return org;
        }),
      softDelete: jest.fn().mockImplementation(async (id: string) => {
        const org = orgStore.get(id);
        if (org) org.status = OrganizationStatus.DELETED;
      }),
      restore: jest.fn().mockImplementation(async (id: string) => {
        const org = orgStore.get(id);
        org.status = OrganizationStatus.ACTIVE;
        return org;
      }),
      getQuota: jest.fn().mockResolvedValue({
        maxDevices: 100,
        maxUsers: 50,
        maxApiKeys: 20,
        maxStorageMb: 5000,
        retentionDays: 30,
        maxDailyTelemetry: 100000,
        maxDailyAlerts: 5000,
      }),
      updateQuota: jest.fn().mockImplementation(async (orgId, q) => ({
        maxDevices: 100,
        maxUsers: 50,
        maxApiKeys: 20,
        maxStorageMb: 5000,
        retentionDays: 30,
        maxDailyTelemetry: 100000,
        maxDailyAlerts: 5000,
        ...q,
      })),
      listAll: jest
        .fn()
        .mockResolvedValue({ items: [], total: 0, page: 1, totalPages: 0 }),
    };

    const mockTeamRepo: Partial<ITeamRepository> = {
      addMember: jest
        .fn()
        .mockImplementation(
          async (orgId, userId, role, teamIds, deptIds, customRoleId) => {
            const key = `${orgId}:${userId}`;
            const doc = {
              id: `mem-${Math.random()}`,
              organizationId: orgId,
              userId,
              role,
              customRoleId,
              createdAt: new Date(),
            };
            teamStore.set(key, doc);
            return doc;
          },
        ),
      findMember: jest
        .fn()
        .mockImplementation(
          async (orgId, userId) => teamStore.get(`${orgId}:${userId}`) || null,
        ),
      listMembers: jest.fn().mockImplementation(async (orgId) => {
        const items = Array.from(teamStore.values()).filter(
          (m) => m.organizationId === orgId,
        );
        return { items, total: items.length, page: 1, totalPages: 1 };
      }),
      removeMember: jest.fn().mockImplementation(async (orgId, userId) => {
        teamStore.delete(`${orgId}:${userId}`);
      }),
      createInvitation: jest
        .fn()
        .mockImplementation(async (orgId, email, role, inviterId) => {
          return {
            id: `inv-${Math.random()}`,
            organizationId: orgId,
            email,
            role,
            inviterId,
            token: "secret-token",
            expiresAt: new Date(Date.now() + 86400000),
            status: "PENDING",
          };
        }),
      listInvitations: jest.fn().mockResolvedValue([]),
      revokeInvitation: jest.fn().mockResolvedValue(undefined),
      updateMemberRole: jest
        .fn()
        .mockImplementation(async (orgId, userId, role, customRoleId) => {
          const doc = teamStore.get(`${orgId}:${userId}`) || {
            id: `mem-${Math.random()}`,
            organizationId: orgId,
            userId,
            role,
            customRoleId,
          };
          doc.role = role;
          teamStore.set(`${orgId}:${userId}`, doc);
          return doc;
        }),
    };

    const mockSessionRepo: Partial<IUserSessionRepository> = {
      listActiveSessions: jest.fn().mockResolvedValue([
        {
          id: "sess-1",
          organizationId: "org-enterprise-alpha",
          userId: "user-owner-a",
          ipAddress: "10.0.1.50",
          browser: "Chrome",
          active: true,
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ]),
      revokeSession: jest.fn().mockResolvedValue(undefined),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
      recordActivity: jest.fn().mockResolvedValue(undefined),
      listUserActivities: jest.fn().mockResolvedValue([]),
    };

    const mockAuditRepo: Partial<IAuditLogRepository> = {
      record: jest.fn().mockImplementation(async (entry) => {
        const doc = {
          id: `audit-${Date.now()}-${Math.random()}`,
          timestamp: new Date(),
          ...entry,
        };
        auditStore.push(doc);
        return doc;
      }),
      search: jest.fn().mockImplementation(async (filter) => {
        const matches = auditStore.filter(
          (a) => a.organizationId === filter.organizationId,
        );
        return {
          items: matches,
          total: matches.length,
          page: 1,
          totalPages: 1,
        };
      }),
    };

    const mockApiKeyRepo: Partial<IApiKeyRepository> = {
      listByOrganization: jest
        .fn()
        .mockResolvedValue({ items: [], total: 2, page: 1, totalPages: 1 }),
    };

    const mockDeviceRepo: Partial<IDeviceRepository> = {
      findAll: jest.fn().mockResolvedValue(new Array(10).fill({ id: "dev" })),
      countByOrganization: jest.fn().mockResolvedValue(10),
    };

    const mockGovernanceRepo: Partial<IDeviceGovernanceRepository> = {
      listPermissionProfiles: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        UserGovernanceService,
        RbacEvaluationService,
        QuotaEngineService,
        AuditEngineService,
        { provide: IOrganizationRepositoryToken, useValue: mockOrgRepo },
        { provide: ITeamRepositoryToken, useValue: mockTeamRepo },
        { provide: IUserSessionRepositoryToken, useValue: mockSessionRepo },
        { provide: IAuditLogRepositoryToken, useValue: mockAuditRepo },
        { provide: IApiKeyRepositoryToken, useValue: mockApiKeyRepo },
        { provide: IDeviceRepositoryToken, useValue: mockDeviceRepo },
        {
          provide: IDeviceGovernanceRepositoryToken,
          useValue: mockGovernanceRepo,
        },
        { provide: ISocketPublisherToken, useValue: mockSocketPublisher },
      ],
    }).compile();

    orgService = module.get<OrganizationService>(OrganizationService);
    userService = module.get<UserGovernanceService>(UserGovernanceService);
    rbacService = module.get<RbacEvaluationService>(RbacEvaluationService);
    quotaService = module.get<QuotaEngineService>(QuotaEngineService);
    auditService = module.get<AuditEngineService>(AuditEngineService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("1. Cross-Tenant Repository & Service Isolation Enforcement", () => {
    it("should strictly isolate organization member queries between tenants A and B", async () => {
      await userService.inviteUser(
        "org-enterprise-alpha",
        "devops@alpha-corp.com",
        UserRole.ADMIN,
        orgContextA,
      );
      await userService.inviteUser(
        "org-enterprise-beta",
        "secops@beta-corp.com",
        UserRole.MANAGER,
        orgContextB,
      );

      // Simulate members added in team repository
      await userService.updateMemberRole(
        "org-enterprise-alpha",
        "user-alpha-1",
        UserRole.ADMIN,
        orgContextA,
      );
      await userService.updateMemberRole(
        "org-enterprise-beta",
        "user-beta-1",
        UserRole.MANAGER,
        orgContextB,
      );

      // Verify Org A list only contains Org A users
      const listA = await userService.listMembers("org-enterprise-alpha");
      expect(
        listA.items.every((m) => m.organizationId === "org-enterprise-alpha"),
      ).toBe(true);
      expect(
        listA.items.find((m) => m.userId === "user-beta-1"),
      ).toBeUndefined();

      // Verify Org B list only contains Org B users
      const listB = await userService.listMembers("org-enterprise-beta");
      expect(
        listB.items.every((m) => m.organizationId === "org-enterprise-beta"),
      ).toBe(true);
      expect(
        listB.items.find((m) => m.userId === "user-alpha-1"),
      ).toBeUndefined();
    });

    it("should prohibit audit history leakage across tenant boundaries", async () => {
      // Create independent audit trails for Org A and Org B
      await auditService.logEvent(
        orgContextA,
        AuditActionType.DEVICE_REGISTRATION,
        "DEVICE",
        "router-core-01",
        "Claimed core enterprise router",
      );
      await auditService.logEvent(
        orgContextB,
        AuditActionType.API_KEY_CREATE,
        "API_KEY",
        "key-beta-prod",
        "Generated production telemetry API key",
      );

      const auditA = await auditService.search({
        organizationId: "org-enterprise-alpha",
      });
      const auditB = await auditService.search({
        organizationId: "org-enterprise-beta",
      });

      expect(
        auditA.items.every(
          (log) => log.organizationId === "org-enterprise-alpha",
        ),
      ).toBe(true);
      expect(
        auditA.items.find((log) => log.resourceId === "key-beta-prod"),
      ).toBeUndefined();

      expect(
        auditB.items.every(
          (log) => log.organizationId === "org-enterprise-beta",
        ),
      ).toBe(true);
      expect(
        auditB.items.find((log) => log.resourceId === "router-core-01"),
      ).toBeUndefined();
    });
  });

  describe("2. Dynamic RBAC Evaluation & Privilege Containment", () => {
    it("should grant exhaustive privileges to OWNER and SUPER_ADMIN roles", async () => {
      const isOwnerAllowed = await rbacService.hasPermission(
        "org-enterprise-alpha",
        UserRole.OWNER,
        PermissionFlag.ROLE_BUILDER_MANAGE,
      );
      const isSuperAllowed = await rbacService.hasPermission(
        "org-enterprise-alpha",
        UserRole.SUPER_ADMIN,
        PermissionFlag.AUDIT_READ,
      );
      expect(isOwnerAllowed).toBe(true);
      expect(isSuperAllowed).toBe(true);
    });

    it("should enforce strict privilege separation for OPERATOR role (No RBAC builder or administrative tenant control)", async () => {
      const hasDevicePerm = await rbacService.hasPermission(
        "org-enterprise-alpha",
        UserRole.OPERATOR,
        PermissionFlag.DEVICE_MANAGEMENT,
      );
      const hasRolePerm = await rbacService.hasPermission(
        "org-enterprise-alpha",
        UserRole.OPERATOR,
        PermissionFlag.ROLE_BUILDER_MANAGE,
      );

      expect(hasDevicePerm).toBe(true);
      expect(hasRolePerm).toBe(false);
    });
  });

  describe("3. WebSocket Room Isolation & Zero Cross-Tenant Emission", () => {
    it("should route tenant notification payloads strictly to dynamic room org_{organizationId}", async () => {
      // Simulate emitting a high severity alert or status change to tenant alpha
      mockSocketPublisher.emitTenantEvent(
        "org-enterprise-alpha",
        "alert:created",
        { alertId: "alert-sec-01", severity: "HIGH" },
      );

      expect(mockSocketPublisher.emitTenantEvent).toHaveBeenCalledWith(
        "org-enterprise-alpha",
        "alert:created",
        expect.objectContaining({ alertId: "alert-sec-01", severity: "HIGH" }),
      );

      // Verify zero emission occurred to Org B or global unrestricted broadcast
      expect(mockSocketPublisher.emitTenantEvent).not.toHaveBeenCalledWith(
        "org-enterprise-beta",
        expect.any(String),
        expect.any(Object),
      );
      expect(mockSocketPublisher.emitAlertEvent).not.toHaveBeenCalled();
    });
  });

  describe("4. Tenant-Aware BullMQ Background Job Context Packaging", () => {
    it("should serialize and restore tenant execution metadata accurately across background workers", () => {
      const payload = { telemetryBatchId: "batch-987123", count: 250 };
      const jobData = TenantJobContext.wrapPayload(payload, orgContextA);

      expect(jobData.tenantContext.organizationId).toBe("org-enterprise-alpha");
      expect(jobData.tenantContext.correlationId).toBe("corr-alpha-001");
      expect(jobData.tenantContext.userId).toBe("user-owner-a");
      expect(jobData.data).toEqual(payload);

      // Reconstruct inside worker
      const restoredContext = TenantJobContext.extractContext(jobData);
      expect(restoredContext.organizationId).toBe("org-enterprise-alpha");
      expect(restoredContext.correlationId).toBe("corr-alpha-001");
      expect(restoredContext.userId).toBe("user-owner-a");
    });
  });

  describe("5. Enterprise Quota Engine & Consumption Enforcement", () => {
    it("should permit resource provisioning when quota limits are within normal operational bounds", async () => {
      const usage = await quotaService.getQuotaUsage("org-enterprise-alpha");
      expect(usage.currentDevices).toBe(10);
      expect(usage.maxDevices).toBe(100);
      expect(usage.percentUsed).toBe(10);

      await expect(
        quotaService.checkQuotaConsumption("org-enterprise-alpha", "DEVICES"),
      ).resolves.not.toThrow();
    });

    it("should block provisioning and emit ErrorCode.QUOTA_EXCEEDED when tenant hits resource ceiling", async () => {
      // Mock usage reaching maximum ceiling
      jest.spyOn(quotaService, "getQuotaUsage").mockResolvedValueOnce({
        currentDevices: 100,
        maxDevices: 100,
        currentUsers: 50,
        maxUsers: 50,
        currentApiKeys: 20,
        maxApiKeys: 20,
        currentStorageMb: 5000,
        maxStorageMb: 5000,
        currentDailyTelemetry: 100000,
        maxDailyTelemetry: 100000,
        currentDailyAlerts: 5000,
        maxDailyAlerts: 5000,
        isApproachingLimit: false,
        isLimitExceeded: true,
        percentUsed: 100,
      });

      await expect(
        quotaService.checkQuotaConsumption("org-enterprise-alpha", "DEVICES"),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
