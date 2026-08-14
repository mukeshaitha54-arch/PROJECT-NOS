import { Test, TestingModule } from "@nestjs/testing";
import { AlertEngineService } from "./services/alert-engine.service";
import { RuleEngineService } from "./services/rule-engine.service";
import { MaintenanceService } from "./services/maintenance.service";
import { AlertHistoryService } from "./services/alert-history.service";
import { RuleAuditService } from "./services/rule-audit.service";
import { RuleMetricsService } from "./services/rule-metrics.service";
import { NotificationService } from "./notification/notification.service";
import { AlertHealthService } from "./services/alert-health.service";
import { EscalationWorker } from "./queues/escalation.worker";
import { IAlertRepository } from "../../common/repositories/alert.repository.interface";
import { IAlertRuleRepository } from "../../common/repositories/alert-rule.repository.interface";
import { INotificationRepository } from "../../common/repositories/notification.repository.interface";
import { IMaintenanceRepository } from "../../common/repositories/maintenance.repository.interface";
import {
  ISocketPublisher,
  ISocketPublisherToken,
} from "../../common/services/socket-publisher.interface";
import {
  AlertSeverity,
  AlertStatus,
  SocketEvents,
  NotificationProvider,
} from "@nos/shared-types";

describe("Phase 5 - Enterprise Alert & Notification Engine", () => {
  let alertEngine: AlertEngineService;
  let ruleEngine: RuleEngineService;
  let maintenanceService: MaintenanceService;
  let notificationService: NotificationService;
  let escalationWorker: EscalationWorker;
  let mockSocketPublisher: jest.Mocked<ISocketPublisher>;
  let mockAlertRepo: any;
  let mockRuleRepo: any;
  let mockMaintenanceRepo: any;
  let mockNotifRepo: any;

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

    const alertsStore = new Map<string, any>();
    const rulesStore = new Map<string, any>();
    const maintenanceStore = new Map<string, any>();
    const notifStore = new Map<string, any>();

    mockAlertRepo = {
      create: jest.fn().mockImplementation((data: any) => {
        const id = `alert-${Date.now()}-${Math.random()}`;
        const doc = {
          id,
          occurrenceCount: 1,
          firstOccurred: new Date(),
          lastOccurred: new Date(),
          ...data,
        };
        alertsStore.set(doc.fingerprint, doc);
        alertsStore.set(id, doc);
        return doc;
      }),
      findByFingerprint: jest.fn().mockImplementation((fp: string) => {
        return alertsStore.get(fp) || null;
      }),
      findById: jest
        .fn()
        .mockImplementation((id: string) => alertsStore.get(id) || null),
      findMany: jest
        .fn()
        .mockImplementation(() => [
          Array.from(alertsStore.values()),
          alertsStore.size,
        ]),
      incrementOccurrence: jest.fn().mockImplementation((id: string) => {
        const doc = alertsStore.get(id);
        if (doc) {
          doc.occurrenceCount++;
          doc.lastOccurred = new Date();
        }
        return doc;
      }),
      update: jest.fn().mockImplementation((id: string, data: any) => {
        const doc = alertsStore.get(id);
        if (doc) Object.assign(doc, data);
        return doc;
      }),
      addHistory: jest.fn().mockImplementation((data: any) => ({
        id: "hist-1",
        ...data,
        timestamp: new Date(),
      })),
      addComment: jest.fn().mockImplementation((data: any) => ({
        id: "comm-1",
        ...data,
        createdAt: new Date(),
      })),
      findEscalationCandidates: jest.fn().mockImplementation((mins: number) => {
        return Array.from(alertsStore.values()).filter(
          (a) => a.status === "NEW" || a.status === "OPEN",
        );
      }),
      getOverviewStatistics: jest.fn().mockReturnValue({
        totalAlerts: 10,
        openAlerts: 5,
        criticalAlerts: 2,
        warningAlerts: 3,
        acknowledgedAlerts: 2,
        resolvedToday: 3,
        repeatedIncidentCount: 15,
      }),
    };

    mockRuleRepo = {
      findMany: jest
        .fn()
        .mockImplementation(() => Array.from(rulesStore.values())),
      findByName: jest.fn().mockImplementation((name: string) => {
        for (const val of rulesStore.values())
          if (val.name === name) return val;
        return null;
      }),
      create: jest.fn().mockImplementation((data: any) => {
        const id = `rule-${Date.now()}`;
        const doc = { id, version: 1, ...data };
        rulesStore.set(id, doc);
        return doc;
      }),
    };

    mockMaintenanceRepo = {
      findActiveByDevice: jest.fn().mockImplementation((devId: string) => {
        const matches = Array.from(maintenanceStore.values()).filter(
          (m) => m.deviceId === devId || (!m.deviceId && !m.deviceGroupId),
        );
        return matches;
      }),
      create: jest.fn().mockImplementation((data: any) => {
        const id = `maint-${Date.now()}`;
        const doc = { id, enabled: true, ...data };
        maintenanceStore.set(id, doc);
        return doc;
      }),
      findMany: jest.fn().mockReturnValue([]),
    };

    mockNotifRepo = {
      create: jest.fn().mockImplementation((data: any) => ({
        id: `notif-${Date.now()}`,
        ...data,
      })),
      updateStatus: jest
        .fn()
        .mockImplementation((id: string, status: string) => ({ id, status })),
      findDlqLogs: jest.fn().mockResolvedValue([[], 0]),
      findByAlertId: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEngineService,
        RuleEngineService,
        MaintenanceService,
        AlertHistoryService,
        NotificationService,
        AlertHealthService,
        EscalationWorker,
        {
          provide: RuleAuditService,
          useValue: {
            record: jest.fn().mockResolvedValue(undefined),
            logChange: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: RuleMetricsService,
          useValue: { recordExecution: jest.fn(), getMetrics: jest.fn() },
        },
        { provide: IAlertRepository, useValue: mockAlertRepo },
        { provide: IAlertRuleRepository, useValue: mockRuleRepo },
        { provide: INotificationRepository, useValue: mockNotifRepo },
        { provide: IMaintenanceRepository, useValue: mockMaintenanceRepo },
        { provide: ISocketPublisherToken, useValue: mockSocketPublisher },
      ],
    }).compile();

    alertEngine = module.get<AlertEngineService>(AlertEngineService);
    ruleEngine = module.get<RuleEngineService>(RuleEngineService);
    maintenanceService = module.get<MaintenanceService>(MaintenanceService);
    notificationService = module.get<NotificationService>(NotificationService);
    escalationWorker = module.get<EscalationWorker>(EscalationWorker);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("SHA256 Fingerprinting & O(1) Deduplication", () => {
    it("should compute deterministic SHA256 fingerprints", () => {
      const fp1 = alertEngine.computeFingerprint(
        "node-01",
        "cpuUsage",
        "rule-A",
      );
      const fp2 = alertEngine.computeFingerprint(
        "node-01",
        "cpuUsage",
        "rule-A",
      );
      const fp3 = alertEngine.computeFingerprint(
        "node-01",
        "cpuUsage",
        "rule-B",
      );

      expect(fp1).toBe(fp2);
      expect(fp1).not.toBe(fp3);
      expect(fp1.length).toBe(64); // SHA-256 hex length
    });

    it("should deduplicate recurring incidents and increment occurrenceCount", async () => {
      const firstEvent = await alertEngine.processIncident({
        deviceId: "server-prod-01",
        title: "CPU Usage Exceeded",
        description: "CPU reached 95%",
        severity: AlertSeverity.CRITICAL,
        metric: "cpuUsage",
      });

      expect(firstEvent.status).toBe("CREATED");
      expect(firstEvent.alert?.occurrenceCount).toBe(1);
      expect(mockSocketPublisher.emitAlertEvent).toHaveBeenCalledWith(
        SocketEvents.ALERT_CREATED,
        expect.any(Object),
      );

      // Same alert occurs again within short window!
      const secondEvent = await alertEngine.processIncident({
        deviceId: "server-prod-01",
        title: "CPU Usage Exceeded",
        description: "CPU reached 96%",
        severity: AlertSeverity.CRITICAL,
        metric: "cpuUsage",
      });

      expect(secondEvent.status).toBe("DEDUPLICATED");
      expect(secondEvent.alert?.occurrenceCount).toBe(2);
      expect(mockSocketPublisher.emitAlertEvent).toHaveBeenCalledWith(
        SocketEvents.ALERT_UPDATED,
        expect.any(Object),
      );
    });
  });

  describe("Alert Correlation Grouping", () => {
    it("should child CPU & RAM failures to an active Heartbeat Lost parent incident", async () => {
      // Step 1: Heartbeat Lost incident arises on node-core-01
      const parentEvent = await alertEngine.processIncident({
        deviceId: "node-core-01",
        title: "Device Heartbeat Lost",
        description: "No telemetry pulse received for >180s",
        severity: AlertSeverity.CRITICAL,
        metric: "heartbeat",
      });

      expect(parentEvent.status).toBe("CREATED");
      expect(parentEvent.alert?.parentAlertId).toBeNull();

      // Step 2: Consequent system metric alert fires on same node
      const childEvent = await alertEngine.processIncident({
        deviceId: "node-core-01",
        title: "Telemetry Collection Failed",
        description: "Unable to query SNMP metrics",
        severity: AlertSeverity.HIGH,
        metric: "telemetry.snmp",
      });

      expect(childEvent.status).toBe("CREATED");
      expect(childEvent.alert?.parentAlertId).toBe(parentEvent.alert?.id);
    });
  });

  describe("Maintenance Mode Suppression", () => {
    it("should suppress alerts when device is under an active maintenance window", async () => {
      await maintenanceService.createWindow({
        deviceId: "db-node-02",
        title: "Weekly OS Patching & Reboot",
        startTime: new Date(Date.now() - 3600000), // started 1 hour ago
        endTime: new Date(Date.now() + 3600000), // ends 1 hour from now
        reason: "Windows Updates",
      });

      const incident = await alertEngine.processIncident({
        deviceId: "db-node-02",
        title: "High CPU during Windows Update",
        description: "TrustedInstaller consuming 98% CPU",
        severity: AlertSeverity.HIGH,
        metric: "cpuUsage",
      });

      expect(incident.status).toBe("SUPPRESSED");
      expect(incident.alert).toBeNull();
      expect(mockSocketPublisher.emitAlertEvent).not.toHaveBeenCalled();
    });
  });

  describe("Rule Simulator (Test Rule Against Historical Operations)", () => {
    it("should compute simulated triggers, suppression ratios, and estimated cooldown savings", async () => {
      const report = await ruleEngine.simulateRule("cpuUsage", ">", 90, 24);

      expect(report.metric).toBe("cpuUsage");
      expect(report.threshold).toBe(90);
      expect(report.wouldTriggerCount).toBeGreaterThan(0);
      expect(report.suppressedCount).toBeGreaterThan(0);
      expect(report.realAlertsCount).toBeLessThanOrEqual(
        report.wouldTriggerCount,
      );
      expect(report.affectedDevices.length).toBeGreaterThan(0);
    });
  });

  describe("Notification Dispatch & DLQ Management", () => {
    it("should deliver notifications across multi-channel providers and broadcast real-time envelope", async () => {
      const res = await notificationService.dispatchNotification(
        NotificationProvider.SLACK,
        {
          alertId: "alt-001",
          incidentNumber: "INC-700001",
          recipient: "#operations-center",
          title: "Critical Disk Full Warning",
          description: "Root partition at 99%",
          severity: AlertSeverity.CRITICAL,
          metric: "diskUsage",
          value: 99,
          threshold: 95,
          hostname: "storage-cluster-01.nos.local",
          operator: "Storage Admin",
          timestamp: new Date().toISOString(),
        },
      );

      expect(res.status).toBe("SUCCESS");
      expect(mockSocketPublisher.emitAlertEvent).toHaveBeenCalledWith(
        SocketEvents.NOTIFICATION_SENT,
        expect.any(Object),
      );
    });

    it("should format notification templates with variables correctly", () => {
      const formatted = notificationService.renderCustomTemplate(
        "Incident {{incidentNumber}} on {{hostname}}: {{metric}} reached {{value}}",
        {
          incidentNumber: "INC-889922",
          hostname: "web-gw-01",
          metric: "RAM",
          value: "92%",
        },
      );

      expect(formatted).toBe(
        "Incident INC-889922 on web-gw-01: RAM reached 92%",
      );
    });
  });

  describe("Automated SLA Escalation Worker", () => {
    it("should automatically escalate severity to CRITICAL for unaddressed long-standing alerts", async () => {
      // Create an older alert (45 minutes ago)
      const oldAlert = await alertEngine.processIncident({
        deviceId: "legacy-srv-01",
        title: "Service Hung",
        description: "Worker process non-responsive",
        severity: AlertSeverity.MEDIUM,
        metric: "windowsService",
      });
      if (oldAlert.alert) {
        oldAlert.alert.firstOccurred = new Date(Date.now() - 45 * 60_000);
      }

      await escalationWorker.runEscalationCycle();

      expect(mockAlertRepo.update).toHaveBeenCalledWith(oldAlert.alert?.id, {
        severity: AlertSeverity.CRITICAL,
      });
      expect(mockSocketPublisher.emitAlertEvent).toHaveBeenCalledWith(
        SocketEvents.ALERT_ESCALATED,
        expect.any(Object),
      );
    });
  });
});
