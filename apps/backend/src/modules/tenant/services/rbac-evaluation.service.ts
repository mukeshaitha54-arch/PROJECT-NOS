import { Injectable, Inject } from "@nestjs/common";
import {
  UserRole,
  PermissionFlag,
  PermissionMatrixDto,
  PermissionProfileDto,
} from "@nos/shared-types";
import {
  IDeviceGovernanceRepository,
  IDeviceGovernanceRepositoryToken,
} from "../../../common/repositories/tenant.repository.interface";

@Injectable()
export class RbacEvaluationService {
  constructor(
    @Inject(IDeviceGovernanceRepositoryToken)
    private readonly governanceRepository: IDeviceGovernanceRepository,
  ) {}

  private getDefaultRolePermissions(role: UserRole | string): PermissionFlag[] {
    const all = Object.values(PermissionFlag);

    switch (role) {
      case UserRole.OWNER:
      case UserRole.SUPER_ADMIN:
        return all;

      case UserRole.ADMIN:
      case UserRole.MANAGER:
        return all.filter((f) => f !== PermissionFlag.ROLE_BUILDER_MANAGE);

      case UserRole.OPERATOR:
        return [
          PermissionFlag.DEVICE_MANAGEMENT,
          PermissionFlag.INVENTORY_READ_WRITE,
          PermissionFlag.TELEMETRY_READ,
          PermissionFlag.ALERTS_MANAGE,
          PermissionFlag.RULES_MANAGE,
          PermissionFlag.MAINTENANCE_MANAGE,
        ];

      case UserRole.ANALYST:
        return [
          PermissionFlag.INVENTORY_READ_WRITE,
          PermissionFlag.TELEMETRY_READ,
          PermissionFlag.ALERTS_MANAGE,
          PermissionFlag.RULES_MANAGE,
        ];

      case UserRole.AUDITOR:
        return [PermissionFlag.TELEMETRY_READ, PermissionFlag.AUDIT_READ];

      case UserRole.VIEWER:
      case UserRole.USER:
      default:
        return [PermissionFlag.TELEMETRY_READ];
    }
  }

  async hasPermission(
    organizationId: string,
    role: UserRole | string,
    requiredPermission: PermissionFlag,
    customRoleId?: string,
    abacContext?: Record<string, any>,
  ): Promise<boolean> {
    if (role === UserRole.OWNER || role === UserRole.SUPER_ADMIN) {
      return true;
    }

    let permissions = this.getDefaultRolePermissions(role);

    if (role === UserRole.CUSTOM_ROLE && customRoleId) {
      const profiles =
        await this.governanceRepository.listPermissionProfiles(organizationId);
      const profile = profiles.find((p) => p.id === customRoleId);
      if (profile) {
        permissions = profile.permissions;
        if (profile.abacConditions && abacContext) {
          // ABAC readiness: Validate attribute conditions such as ipRange or workhours
          if (
            profile.abacConditions.requiredDepartmentId &&
            abacContext.departmentId !==
              profile.abacConditions.requiredDepartmentId
          ) {
            return false;
          }
        }
      }
    }

    return permissions.includes(requiredPermission);
  }

  async getPermissionMatrix(
    organizationId: string,
  ): Promise<PermissionMatrixDto> {
    const defaultRoles: (UserRole | string)[] = [
      UserRole.OWNER,
      UserRole.SUPER_ADMIN,
      UserRole.ADMIN,
      UserRole.MANAGER,
      UserRole.OPERATOR,
      UserRole.ANALYST,
      UserRole.VIEWER,
      UserRole.AUDITOR,
      UserRole.CUSTOM_ROLE,
    ];

    const roles = defaultRoles.map((r) => ({
      role: r,
      permissions: this.getDefaultRolePermissions(r),
    }));

    const allPermissions = [
      {
        flag: PermissionFlag.DEVICE_MANAGEMENT,
        category: "Devices",
        label: "Manage Devices",
        description: "Register, edit, and command nodes",
      },
      {
        flag: PermissionFlag.INVENTORY_READ_WRITE,
        category: "Inventory",
        label: "Inventory Access",
        description: "Read and update hardware/OS inventory",
      },
      {
        flag: PermissionFlag.TELEMETRY_READ,
        category: "Telemetry",
        label: "Read Telemetry",
        description: "View raw metric streams and heartbeats",
      },
      {
        flag: PermissionFlag.ALERTS_MANAGE,
        category: "Alerting",
        label: "Manage Alerts",
        description: "Acknowledge, escalate, and resolve alerts",
      },
      {
        flag: PermissionFlag.RULES_MANAGE,
        category: "Alerting",
        label: "Rule Studio Admin",
        description: "Author and simulate rule thresholds",
      },
      {
        flag: PermissionFlag.MAINTENANCE_MANAGE,
        category: "Operations",
        label: "Maintenance Windows",
        description: "Schedule and enforce outage windows",
      },
      {
        flag: PermissionFlag.USERS_MANAGE,
        category: "Governance",
        label: "User Governance",
        description: "Invite, suspend, and assign users",
      },
      {
        flag: PermissionFlag.TEAMS_MANAGE,
        category: "Governance",
        label: "Teams & Departments",
        description: "Organize teams and lead hierarchies",
      },
      {
        flag: PermissionFlag.SETTINGS_MANAGE,
        category: "Tenant",
        label: "Organization Settings",
        description: "Configure retention, timezone, and policies",
      },
      {
        flag: PermissionFlag.API_KEYS_MANAGE,
        category: "Tenant",
        label: "API Keys",
        description: "Generate and rotate enterprise API keys",
      },
      {
        flag: PermissionFlag.AUDIT_READ,
        category: "Audit & Compliance",
        label: "Read Audit Logs",
        description: "Search universal audit logs and export reports",
      },
      {
        flag: PermissionFlag.ROLE_BUILDER_MANAGE,
        category: "RBAC",
        label: "Custom Role Builder",
        description: "Design custom roles with granular ABAC flags",
      },
    ];

    return { roles, allPermissions };
  }
}
