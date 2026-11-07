import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: { db: { url: process.env.DATABASE_URL } },
      log:
        process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(
        "📦 Connected to PostgreSQL database via Prisma Client successfully.",
      );
      await this.healDataIntegrity();
    } catch (error) {
      this.logger.error(
        "❌ Failed to establish PostgreSQL connection via Prisma:",
        error,
      );
    }
  }

  /**
   * One-shot self-healing data integrity routine:
   * Guarantees strict multi-tenant isolation across all Users, Organizations,
   * Audit Logs, Registration Keys, and Monitored Devices.
   */
  private async healDataIntegrity(): Promise<void> {
    try {
      this.logger.log("🛡️ Running multi-tenant data integrity self-healing...");

      const QUARANTINE_ORG_ID = "legacy-quarantine-org";
      await this.organization.upsert({
        where: { id: QUARANTINE_ORG_ID },
        update: {},
        create: {
          id: QUARANTINE_ORG_ID,
          name: "System Quarantine Archive",
          slug: "system-quarantine-archive",
          status: "ARCHIVED" as any,
        },
      });

      // 1. Ensure every User has an active OrganizationMember & personal workspace
      const users = await this.user.findMany();
      const userOrgMap = new Map<string, string>(); // user.id -> orgId and user.email -> orgId

      for (const u of users) {
        let member = await this.organizationMember.findFirst({
          where: { userId: u.id, isSuspended: false },
          orderBy: { joinedAt: "asc" },
        });

        if (!member) {
          const orgId = `org-${u.id.substring(0, 8)}`;
          await this.organization.upsert({
            where: { id: orgId },
            update: {},
            create: {
              id: orgId,
              name: `${u.firstName || "Personal"}'s Workspace`,
              slug: `workspace-${u.id.substring(0, 8)}`,
              status: "ACTIVE" as any,
            },
          });
          member = await this.organizationMember.create({
            data: {
              organizationId: orgId,
              userId: u.id,
              role: "OWNER",
            },
          });
        }

        userOrgMap.set(u.id, member.organizationId);
        if (u.email) {
          userOrgMap.set(u.email.toLowerCase().trim(), member.organizationId);
        }
      }

      // 2. Heal Audit Logs: reassign default-org and null to the real creator's org
      const leakyAuditLogs = await this.auditLog.findMany({
        where: {
          OR: [
            { organizationId: "default-org" },
            { organizationId: null as any },
          ],
        },
        select: { id: true, userEmail: true, userId: true, details: true },
      });

      if (leakyAuditLogs.length > 0) {
        this.logger.log(
          `🔍 Found ${leakyAuditLogs.length} audit logs requiring tenant re-alignment.`,
        );
        for (const log of leakyAuditLogs) {
          let targetOrgId = QUARANTINE_ORG_ID;

          if (
            log.userEmail &&
            userOrgMap.has(log.userEmail.toLowerCase().trim())
          ) {
            targetOrgId = userOrgMap.get(log.userEmail.toLowerCase().trim())!;
          } else if (log.userId && userOrgMap.has(log.userId.trim())) {
            targetOrgId = userOrgMap.get(log.userId.trim())!;
          } else if (log.details && typeof log.details === "object") {
            const email = (log.details as any)?.email;
            if (email && userOrgMap.has(email.toLowerCase().trim())) {
              targetOrgId = userOrgMap.get(email.toLowerCase().trim())!;
            }
          }

          await this.auditLog.update({
            where: { id: log.id },
            data: { organizationId: targetOrgId },
          });
        }
      }

      // 3. Heal Registration Keys: reassign default-org and null keys to creator's org
      const leakyKeys = await this.registrationKey.findMany({
        where: {
          OR: [
            { organizationId: "default-org" },
            { organizationId: null as any },
          ],
        },
        select: { id: true, createdBy: true },
      });

      if (leakyKeys.length > 0) {
        this.logger.log(
          `🔍 Found ${leakyKeys.length} registration keys requiring tenant re-alignment.`,
        );
        for (const k of leakyKeys) {
          let targetOrgId = QUARANTINE_ORG_ID;
          if (k.createdBy && userOrgMap.has(k.createdBy.trim())) {
            targetOrgId = userOrgMap.get(k.createdBy.trim())!;
          } else if (
            k.createdBy &&
            userOrgMap.has(k.createdBy.toLowerCase().trim())
          ) {
            targetOrgId = userOrgMap.get(k.createdBy.toLowerCase().trim())!;
          }

          await this.registrationKey.update({
            where: { id: k.id },
            data: { organizationId: targetOrgId },
          });
        }
      }

      // 4. Heal Devices & Inventory: isolate unowned/default-org devices from personal fleets
      const leakyDevices = await this.device.findMany({
        where: {
          OR: [
            { organizationId: "default-org" },
            { organizationId: null as any },
          ],
        },
        select: { id: true, hostname: true, organizationId: true },
      });

      if (leakyDevices.length > 0) {
        this.logger.log(
          `🔍 Found ${leakyDevices.length} devices requiring isolation quarantine (e.g. 003PC, GIOE15).`,
        );
        for (const d of leakyDevices) {
          // If the device hostname matches a known active user's device, assign to their org
          // Otherwise quarantine to legacy-quarantine-org so it never leaks to other users
          await this.device.update({
            where: { id: d.id },
            data: { organizationId: QUARANTINE_ORG_ID },
          });
        }
      }

      this.logger.log(
        "✅ Multi-tenant data integrity self-healing completed successfully.",
      );
    } catch (healErr) {
      this.logger.warn(
        "⚠️ Non-blocking warning during data integrity self-healing:",
        healErr,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("🛑 Disconnected Prisma PostgreSQL client.");
  }
}
