import { Test, TestingModule } from '@nestjs/testing';
import { RuleSimulationService } from './rule-simulation.service';
import { MaintenanceService } from './maintenance.service';
import { RuleAuditService } from './rule-audit.service';
import { IAlertRuleRepository } from '../../../common/repositories/alert-rule.repository.interface';
import { IAlertRepository } from '../../../common/repositories/alert.repository.interface';
import { ITelemetryRepositoryToken } from '../../../common/repositories/telemetry.repository.interface';
import { RuleComplexityScore, AlertRulePriority, AlertRuleCategory, AlertRuleStatus } from '@nos/shared-types';

describe('RuleSimulationService (Phase 5 Hardening Verification)', () => {
  let service: RuleSimulationService;
  let ruleRepo: jest.Mocked<IAlertRuleRepository>;
  let alertRepo: jest.Mocked<IAlertRepository>;
  let telemetryRepo: jest.Mocked<any>;
  let maintenanceService: jest.Mocked<MaintenanceService>;
  let auditService: jest.Mocked<RuleAuditService>;

  const mockRule: any = {
    id: 'rule-123',
    version: 2,
    name: 'High CPU Usage Threshold',
    metric: 'cpuUsage',
    operator: '>',
    threshold: 80,
    durationSeconds: 30,
    cooldownSeconds: 300,
    timeoutMs: 500,
    enabled: true,
    silentMode: false,
    priority: AlertRulePriority.HIGH,
    category: AlertRuleCategory.PERFORMANCE,
    ruleStatus: AlertRuleStatus.ACTIVE,
  };

  beforeEach(async () => {
    ruleRepo = {
      findById: jest.fn().mockResolvedValue(mockRule),
      findMany: jest.fn().mockResolvedValue([mockRule]),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    alertRepo = {
      findMany: jest.fn().mockResolvedValue([
        [
          { id: 'a1', ruleId: 'rule-123', deviceId: 'dev-01', createdAt: new Date() },
          { id: 'a2', ruleId: 'rule-123', deviceId: 'dev-02', createdAt: new Date() },
        ],
        2,
      ]),
      create: jest.fn(),
    } as any;

    telemetryRepo = {
      findRange: jest.fn().mockResolvedValue({
        items: [
          { deviceId: 'dev-01', cpuUsage: 85, timestamp: new Date(Date.now() - 10000) },
          { deviceId: 'dev-01', cpuUsage: 90, timestamp: new Date(Date.now() - 5000) }, // in cooldown
          { deviceId: 'dev-01', cpuUsage: 70, timestamp: new Date() }, // below threshold
        ],
        total: 3,
      }),
    };

    maintenanceService = {
      isDeviceInMaintenance: jest.fn().mockResolvedValue({ inMaintenance: false, activeWindow: null }),
    } as any;

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RuleSimulationService,
        { provide: IAlertRuleRepository, useValue: ruleRepo },
        { provide: IAlertRepository, useValue: alertRepo },
        { provide: ITelemetryRepositoryToken, useValue: telemetryRepo },
        { provide: MaintenanceService, useValue: maintenanceService },
        { provide: RuleAuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<RuleSimulationService>(RuleSimulationService);
  });

  describe('testRule', () => {
    it('should simulate rule execution without mutating DB or sending notifications', async () => {
      const result = await service.testRule(
        { ruleId: 'rule-123', timeframe: 'LAST_24H' },
        'TestAdmin',
      );

      expect(ruleRepo.findById).toHaveBeenCalledWith('rule-123');
      expect(result.ruleId).toBe('rule-123');
      expect(result.wouldTrigger).toBeGreaterThan(0);
      expect(result.noiseReduction).toBeGreaterThanOrEqual(0);
      expect(alertRepo.create).not.toHaveBeenCalled(); // 0 ORM/DB mutation invariant
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ ruleId: 'rule-123', action: 'SIMULATE' }),
      );
    });
  });

  describe('previewRule', () => {
    it('should compute impact, complexity, risk rating, and noise score before saving', async () => {
      const preview = await service.previewRule({
        metric: 'cpuUsage',
        operator: '>',
        threshold: 85,
        cooldownSeconds: 600,
        dependsOnIds: ['rule-parent'],
      });

      expect(preview.estimatedDevices).toBeGreaterThanOrEqual(1);
      expect(preview.complexityScore).toBeDefined();
      expect(preview.riskRating).toBeGreaterThanOrEqual(0);
      expect(preview.riskRating).toBeLessThanOrEqual(100);
      expect(preview.affectedTags).toContain('CPU');
      expect(alertRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('dryRun', () => {
    it('should execute rules in dry run mode with zero storage and zero notification invariants', async () => {
      const result = await service.dryRun(
        { id: 'rule-123', metric: 'cpuUsage', operator: '>', threshold: 75, cooldownSeconds: 300 },
        'TestAdmin',
      );

      expect(result.stored).toBe(false);
      expect(result.notified).toBe(false);
      expect(result.wouldTriggerCount).toBeGreaterThanOrEqual(0);
      expect(alertRepo.create).not.toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DRY_RUN' }),
      );
    });
  });

  describe('replayHistoricalTelemetry', () => {
    it('should replay historical telemetry against rule conditions with cooldown and maintenance checks', async () => {
      const result = await service.replayHistoricalTelemetry(
        {
          ruleId: 'rule-123',
          from: new Date(Date.now() - 3600000).toISOString(),
          to: new Date().toISOString(),
          deviceIds: ['dev-01'],
        },
        'TestAdmin',
      );

      expect(result.stored).toBe(false);
      expect(result.ruleId).toBe('rule-123');
      expect(telemetryRepo.findRange).toHaveBeenCalledWith(
        expect.objectContaining({ deviceId: 'dev-01' }),
      );
      // First sample (85 > 80) should trigger, second (90) is within 300s cooldown, third (70 < 80) ignored
      expect(result.wouldTriggerCount).toBe(1);
      expect(result.suppressedCount).toBe(1); // 1 suppressed by cooldown
      expect(alertRepo.create).not.toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REPLAY', ruleId: 'rule-123' }),
      );
    });

    it('should suppress would-be triggers if device was in maintenance window during replay', async () => {
      maintenanceService.isDeviceInMaintenance.mockResolvedValueOnce({
        inMaintenance: true,
        activeWindow: { title: 'Emergency Firmware Upgrade' } as any,
      });

      const result = await service.replayHistoricalTelemetry(
        {
          ruleId: 'rule-123',
          from: new Date(Date.now() - 3600000).toISOString(),
          to: new Date().toISOString(),
          deviceIds: ['dev-01'],
        },
        'TestAdmin',
      );

      expect(result.wouldTriggerCount).toBe(0); // All suppressed due to maintenance!
      expect(result.suppressedCount).toBe(2);
      expect(result.timeline[0].suppressReason).toContain('Emergency Firmware Upgrade');
    });
  });
});
