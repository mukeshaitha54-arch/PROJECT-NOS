import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { RealtimeGateway as SocketGateway } from "../realtime/realtime.gateway";
import { AuditLogsService as AuditService } from "../audit/audit-logs.service";
import { AlertStatus, AlertSeverity, DeviceStatus } from "@prisma/client";
import * as crypto from "crypto";

export interface TelemetryPayload {
  cpu?: number;
  cpuUsage?: number;
  ram?: number;
  ramUsage?: number;
  memoryUsagePercent?: number;
  disk?: number;
  diskUsagePercent?: number;
  network?: number;
  networkUploadSpeed?: number;
  networkDownloadSpeed?: number;
  timestamp?: string | Date;
  [key: string]: any;
}

@Injectable()
export class AlertRuleEngineService {
  private readonly logger = new Logger(AlertRuleEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: SocketGateway,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Evaluates incoming device telemetry against all active alert rules for the tenant.
   * Supports real-time breach state tracking, alert generation with deduplication,
   * maintenance mode suppression, and auto-resolution.
   */
  async evaluateTelemetry(
    deviceId: string,
    tenantId: string,
    telemetry: TelemetryPayload,
  ): Promise<void> {
    try {
      const targetTenantId = tenantId || "default-org";
      const device = await this.prisma.device.findUnique({
        where: { id: deviceId },
      });
      if (!device) {
        this.logger.warn(
          `Cannot evaluate telemetry for non-existent device ID [${deviceId}].`,
        );
        return;
      }

      const deviceName =
        (device as any).name ||
        device.deviceName ||
        device.hostname ||
        device.id;
      const isUnderMaintenance =
        device.status === (DeviceStatus.MAINTENANCE as any) ||
        (device.status as string) === "MAINTENANCE";

      // a) Fetch all enabled AlertRule WHERE tenantId = input.tenantId (or global)
      const rules = await this.prisma.alertRule.findMany({
        where: {
          enabled: true,
          OR: [
            { tenantId: targetTenantId },
            { tenantId: "default-org" },
            { tenantId: null },
          ],
        },
      });

      const now = new Date();
      const activeAlertStatuses: AlertStatus[] = [
        AlertStatus.NEW,
        AlertStatus.OPEN,
        AlertStatus.ACKNOWLEDGED,
      ];

      for (const rule of rules) {
        // b) For each rule: if rule.deviceIds.length > 0 AND deviceId not in rule.deviceIds, skip
        if (
          rule.deviceIds &&
          rule.deviceIds.length > 0 &&
          !rule.deviceIds.includes(deviceId)
        ) {
          continue;
        }

        // c) Extract telemetry value for rule.metric (e.g., telemetry.cpu). If null/undefined, skip
        const value = this.extractMetricValue(rule.metric, telemetry);
        if (value === null || value === undefined || isNaN(value)) {
          continue;
        }

        // d) Compare value against rule.threshold using rule.operator
        const isBreaching = this.compareThreshold(
          value,
          rule.operator,
          rule.threshold,
        );

        // Fetch current breach state
        const existingBreach = await this.prisma.alertBreachState.findUnique({
          where: {
            deviceId_ruleId: {
              deviceId,
              ruleId: rule.id,
            },
          },
        });

        if (isBreaching) {
          if (!existingBreach) {
            // f) On first breach: create AlertBreachState, set firstBreachAt = now
            await this.prisma.alertBreachState.create({
              data: {
                deviceId,
                ruleId: rule.id,
                firstBreachAt: now,
                lastBreachAt: now,
                consecutiveCount: 1,
              },
            });
            this.logger.debug(
              `[${deviceName}] Initiated new breach state for rule [${rule.name}] (${value} vs threshold ${rule.threshold})`,
            );
          } else {
            // g) On continued breach: increment consecutiveCount, update lastBreachAt
            await this.prisma.alertBreachState.update({
              where: { id: existingBreach.id },
              data: {
                consecutiveCount: { increment: 1 },
                lastBreachAt: now,
              },
            });

            // h) Only CREATE Alert when: (now - firstBreachAt) >= (rule.duration * 60 seconds)
            const requiredDurationSeconds =
              rule.duration && rule.duration > 0
                ? rule.duration * 60
                : rule.durationSeconds || 60;
            const elapsedSeconds =
              (now.getTime() - existingBreach.firstBreachAt.getTime()) / 1000;

            if (elapsedSeconds >= requiredDurationSeconds) {
              // i) Deduplication: Before creating, check if Alert exists for same deviceId + ruleId WHERE status IN active statuses
              const existingAlert = await this.prisma.alert.findFirst({
                where: {
                  deviceId,
                  ruleId: rule.id,
                  status: { in: activeAlertStatuses },
                },
              });

              if (!existingAlert) {
                await this.createAlert({
                  rule,
                  device,
                  deviceName,
                  deviceId,
                  tenantId: targetTenantId,
                  value,
                  isUnderMaintenance,
                  now,
                });
              }
            }
          }
        } else {
          // j) On resolve (value no longer breaches)
          if (existingBreach) {
            await this.prisma.$transaction(async (tx) => {
              await tx.alertBreachState.deleteMany({
                where: {
                  deviceId,
                  ruleId: rule.id,
                },
              });

              const activeAlert = await tx.alert.findFirst({
                where: {
                  deviceId,
                  ruleId: rule.id,
                  status: { in: activeAlertStatuses },
                },
              });

              if (activeAlert) {
                const updatedAlert = await tx.alert.update({
                  where: { id: activeAlert.id },
                  data: {
                    status: AlertStatus.RESOLVED,
                    resolvedAt: now,
                  },
                });

                // Emit Socket.IO event: alert:resolved
                if (this.socketGateway?.server) {
                  this.socketGateway.server
                    .to(`tenant-${targetTenantId}`)
                    .emit("alert:resolved", {
                      alertId: updatedAlert.id,
                      deviceId,
                      ruleId: rule.id,
                      resolvedAt: now.toISOString(),
                    });
                }
              }
            });
            this.logger.debug(
              `[${deviceName}] Resolved breach state for rule [${rule.name}] as value dropped below threshold.`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(
        `Error evaluating telemetry for device [${deviceId}]: ${error instanceof Error ? error.stack : error}`,
      );
    }
  }

  private async createAlert(params: {
    rule: any;
    device: any;
    deviceName: string;
    deviceId: string;
    tenantId: string;
    value: number;
    isUnderMaintenance: boolean;
    now: Date;
  }): Promise<void> {
    const {
      rule,
      deviceName,
      deviceId,
      tenantId,
      value,
      isUnderMaintenance,
      now,
    } = params;

    // Title: "{deviceName}: {rule.name}" (e.g., "WS-001: High CPU Usage")
    const title = `${deviceName}: ${rule.name}`;
    const durationMin =
      rule.duration || Math.round((rule.durationSeconds || 60) / 60) || 1;
    // Message: "{metric} is {value}% (threshold: {threshold}%) for {duration} minutes"
    const message = `${rule.metric} is ${value}% (threshold: ${rule.threshold}%) for ${durationMin} minutes`;
    const fingerprint = crypto
      .createHash("sha256")
      .update(`${deviceId}:${rule.metric}:${rule.id}`)
      .digest("hex");
    const incidentNumber = `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

    // Maintenance Mode Suppression: if device is MAINTENANCE, set status = 'SUPPRESS' and do NOT emit Socket event
    const targetStatus = isUnderMaintenance
      ? (AlertStatus.SUPPRESS as any)
      : AlertStatus.NEW;

    // Insert into Alert table
    const alert = await this.prisma.alert.create({
      data: {
        incidentNumber,
        tenantId,
        deviceId,
        ruleId: rule.id,
        title,
        description: message,
        message,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        severity: rule.severity || AlertSeverity.MEDIUM,
        status: targetStatus,
        fingerprint,
        source: "RuleEngine",
        createdAt: now,
      },
    });

    this.logger.log(
      `Triggered Alert [${alert.incidentNumber}] (${alert.status}) on [${deviceName}]: ${message}`,
    );

    if (!isUnderMaintenance) {
      if (this.socketGateway?.server) {
        this.socketGateway.server
          .to(`tenant-${tenantId}`)
          .emit("alert:triggered", alert);
      }
    }

    // Log to AuditLog: action="ALERT_TRIGGERED", actor="SYSTEM", target=deviceId, details={ruleId, value, threshold}
    if (this.auditService) {
      await this.auditService.log({
        action: "ALERT_TRIGGERED",
        actor: "SYSTEM",
        target: deviceId,
        tenantId,
        details: {
          alertId: alert.id,
          ruleId: rule.id,
          metric: rule.metric,
          value,
          threshold: rule.threshold,
          suppressedByMaintenance: isUnderMaintenance,
        },
      });
    }
  }

  public extractMetricValue(
    metric: string,
    telemetry: TelemetryPayload,
  ): number | null {
    const key = metric.toLowerCase().trim();
    if (key === "cpu" || key === "cpuusage") {
      return telemetry.cpu ?? telemetry.cpuUsage ?? null;
    }
    if (key === "ram" || key === "memory" || key === "memoryusagepercent") {
      return (
        telemetry.ram ??
        telemetry.memoryUsagePercent ??
        telemetry.ramUsage ??
        null
      );
    }
    if (key === "disk" || key === "diskusagepercent") {
      return telemetry.disk ?? telemetry.diskUsagePercent ?? null;
    }
    if (key === "network" || key === "networkspeed") {
      return (
        telemetry.network ??
        telemetry.networkUploadSpeed ??
        telemetry.bytesReceived ??
        null
      );
    }
    if (telemetry[key] !== undefined && telemetry[key] !== null) {
      return Number(telemetry[key]);
    }
    return null;
  }

  public compareThreshold(
    value: number,
    operator: string,
    threshold: number,
  ): boolean {
    const op = operator.toLowerCase().trim();
    switch (op) {
      case "gt":
      case ">":
        return value > threshold;
      case "lt":
      case "<":
        return value < threshold;
      case "eq":
      case "==":
      case "===":
      case "=":
        return value === threshold;
      case "gte":
      case ">=":
        return value >= threshold;
      case "lte":
      case "<=":
        return value <= threshold;
      case "neq":
      case "!=":
      case "!==":
        return value !== threshold;
      default:
        return value > threshold;
    }
  }

  async testRule(ruleId: string, deviceId: string, simulatedValue: number) {
    const rule = await this.prisma.alertRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule) {
      return {
        wouldTrigger: false,
        reason: `Rule ${ruleId} not found.`,
        durationRequired: 0,
        currentDuration: 0,
      };
    }
    const wouldTrigger = this.compareThreshold(
      simulatedValue,
      rule.operator,
      rule.threshold,
    );
    const durationRequired =
      rule.duration || Math.round((rule.durationSeconds || 60) / 60) || 1;
    const reason = wouldTrigger
      ? `Simulated value (${simulatedValue}) breaches threshold (${rule.operator} ${rule.threshold}). Alert would trigger after ${durationRequired} minute(s) of continuous breach.`
      : `Simulated value (${simulatedValue}) does not breach threshold (${rule.operator} ${rule.threshold}).`;

    return {
      success: true,
      wouldTrigger,
      reason,
      durationRequired,
      currentDuration: 0,
    };
  }
}
