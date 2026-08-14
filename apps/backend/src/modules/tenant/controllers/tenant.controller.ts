import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse as SwaggerResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { TenantContextGuard } from "../../../common/guards/tenant-context.guard";
import { RbacPermissionGuard } from "../../../common/guards/rbac-permission.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { CurrentTenant } from "../../../common/decorators/current-tenant.decorator";
import { RequirePermissions } from "../../../common/decorators/require-permissions.decorator";
import {
  UserRole,
  PermissionFlag,
  ApiResponse,
  OrganizationDto,
  OrganizationStatus,
  OrganizationSettingsDto,
  DepartmentDto,
  TeamDto,
  OrganizationMemberDto,
  OrganizationInvitationDto,
  ApiKeyDto,
  ApiKeyCreateRequestDto,
  AuditSearchRequestDto,
  AuditSearchResultDto,
  PermissionMatrixDto,
  PermissionProfileDto,
  DeviceGroupDto,
  DeviceTransferRequestDto,
  DeviceTransferStatus,
  TenantContext,
  UserSessionDto,
} from "@nos/shared-types";
import { OrganizationService } from "../services/organization.service";
import { UserGovernanceService } from "../services/user-governance.service";
import { ApiKeyService } from "../services/api-key.service";
import { AuditEngineService } from "../services/audit-engine.service";
import { DeviceGovernanceService } from "../services/device-governance.service";
import { RbacEvaluationService } from "../services/rbac-evaluation.service";
import {
  TenantScoresService,
  TenantHealthReport,
} from "../services/tenant-scores.service";

@ApiTags("Tenant & SaaS Enterprise Governance")
@Controller("tenant")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard, RbacPermissionGuard)
@ApiBearerAuth()
export class TenantController {
  constructor(
    private readonly orgService: OrganizationService,
    private readonly userService: UserGovernanceService,
    private readonly apiKeyService: ApiKeyService,
    private readonly auditService: AuditEngineService,
    private readonly deviceGovernanceService: DeviceGovernanceService,
    private readonly rbacService: RbacEvaluationService,
    private readonly scoresService: TenantScoresService,
  ) {}

  // ==================== ORGANIZATION LIFECYCLE ====================

  @Get("organization/:id")
  @ApiOperation({
    summary: "Get organization details and real-time quota usage",
  })
  async getOrganization(
    @Param("id") id: string,
  ): Promise<ApiResponse<OrganizationDto>> {
    const data = await this.orgService.getById(id);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("organization")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Create new enterprise organization tenant" })
  async createOrganization(
    @Body() body: any,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<OrganizationDto>> {
    const data = await this.orgService.create(body, tenant);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Put("organization/:id/status")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary: "Update organization status (ACTIVE, SUSPENDED, ARCHIVED)",
  })
  async updateStatus(
    @Param("id") id: string,
    @Body() body: { status: OrganizationStatus; reason?: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<OrganizationDto>> {
    const data = await this.orgService.updateStatus(
      id,
      body.status,
      tenant,
      body.reason,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Put("organization/:id/settings")
  @RequirePermissions(PermissionFlag.SETTINGS_MANAGE)
  @ApiOperation({
    summary: "Update organization security and general settings",
  })
  async updateSettings(
    @Param("id") id: string,
    @Body() body: OrganizationSettingsDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<OrganizationDto>> {
    const data = await this.orgService.updateSettings(id, body, tenant);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete("organization/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Soft delete enterprise organization tenant" })
  async softDelete(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<void>> {
    await this.orgService.softDelete(
      id,
      tenant,
      body?.reason || "Deleted by admin",
    );
    return { success: true, timestamp: new Date().toISOString() };
  }

  @Post("organization/:id/restore")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({ summary: "Restore soft-deleted enterprise organization" })
  async restoreOrganization(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<OrganizationDto>> {
    const data = await this.orgService.restore(
      id,
      tenant,
      body?.reason || "Restored by admin",
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get("organization/:id/health-score")
  @RequirePermissions(PermissionFlag.SETTINGS_MANAGE)
  @ApiOperation({
    summary:
      "Retrieve comprehensive real-time Organization Health Score report",
  })
  async getHealthScore(
    @Param("id") id: string,
  ): Promise<ApiResponse<TenantHealthReport>> {
    const data = await this.scoresService.evaluateHealth(id);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== DEPARTMENTS & TEAMS ====================

  @Post("departments")
  @RequirePermissions(PermissionFlag.TEAMS_MANAGE)
  @ApiOperation({ summary: "Create department under current tenant" })
  async createDepartment(
    @Body() body: { name: string; description?: string; headUserId?: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<DepartmentDto>> {
    const data = await this.userService.createDepartment(
      tenant.organizationId,
      body.name,
      body.description,
      body.headUserId,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get("departments")
  @RequirePermissions(PermissionFlag.TEAMS_MANAGE, PermissionFlag.USERS_MANAGE)
  @ApiOperation({ summary: "List all departments in current organization" })
  async listDepartments(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<DepartmentDto[]>> {
    const data = await this.userService.listDepartments(tenant.organizationId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("teams")
  @RequirePermissions(PermissionFlag.TEAMS_MANAGE)
  @ApiOperation({ summary: "Create team within department" })
  async createTeam(
    @Body()
    body: {
      name: string;
      departmentId?: string;
      description?: string;
      leadUserId?: string;
    },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<TeamDto>> {
    const data = await this.userService.createTeam(
      tenant.organizationId,
      body.name,
      body.departmentId,
      body.description,
      body.leadUserId,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get("teams")
  @RequirePermissions(PermissionFlag.TEAMS_MANAGE, PermissionFlag.USERS_MANAGE)
  @ApiOperation({ summary: "List all teams in organization" })
  async listTeams(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<TeamDto[]>> {
    const data = await this.userService.listTeams(tenant.organizationId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== MEMBERS, INVITATIONS & BULK CSV IMPORT ====================

  @Get("members")
  @RequirePermissions(PermissionFlag.USERS_MANAGE)
  @ApiOperation({
    summary: "List organization members with role filtering and pagination",
  })
  async listMembers(
    @Query() query: any,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<{ items: OrganizationMemberDto[]; total: number }>> {
    const data = await this.userService.listMembers(
      tenant.organizationId,
      query,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("members/invite")
  @RequirePermissions(PermissionFlag.USERS_MANAGE)
  @ApiOperation({
    summary: "Invite new member via email with quota validation",
  })
  async inviteMember(
    @Body()
    body: {
      email: string;
      role: UserRole;
      teamIds?: string[];
      departmentIds?: string[];
    },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<
    ApiResponse<{ invitation: OrganizationInvitationDto; inviteLink: string }>
  > {
    const data = await this.userService.inviteUser(
      tenant.organizationId,
      body.email,
      body.role,
      tenant,
      body.teamIds,
      body.departmentIds,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("members/import-csv")
  @RequirePermissions(PermissionFlag.USERS_MANAGE)
  @ApiOperation({ summary: "Bulk invite users from CSV formatted payload" })
  async importCsv(
    @Body() body: { csvContent: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<{ total: number; success: number; errors: any[] }>> {
    const data = await this.userService.importUsersFromCsv(
      tenant.organizationId,
      body.csvContent,
      tenant,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete("members/:userId")
  @RequirePermissions(PermissionFlag.USERS_MANAGE)
  @ApiOperation({ summary: "Remove user member and revoke active sessions" })
  async removeMember(
    @Param("userId") userId: string,
    @Body() body: { reason?: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<void>> {
    await this.userService.removeMember(
      tenant.organizationId,
      userId,
      tenant,
      body?.reason,
    );
    return { success: true, timestamp: new Date().toISOString() };
  }

  @Post("impersonate")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER)
  @ApiOperation({
    summary:
      "Impersonate organization user with mandatory justification audit trail",
  })
  async impersonate(
    @Body() body: { targetUserId: string; reason: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<
    ApiResponse<{
      impersonationToken: string;
      targetUserId: string;
      expiresAt: string;
    }>
  > {
    const data = await this.userService.impersonateUser(
      tenant.organizationId,
      body.targetUserId,
      body.reason,
      tenant,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== ENTERPRISE API KEYS ====================

  @Get("api-keys")
  @RequirePermissions(PermissionFlag.API_KEYS_MANAGE)
  @ApiOperation({ summary: "List active organization API keys" })
  async listApiKeys(
    @Query() query: any,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<{ items: ApiKeyDto[]; total: number }>> {
    const data = await this.apiKeyService.list(tenant.organizationId, query);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("api-keys")
  @RequirePermissions(PermissionFlag.API_KEYS_MANAGE)
  @ApiOperation({
    summary: "Generate secure enterprise API key with scoped authorization",
  })
  async createApiKey(
    @Body() body: ApiKeyCreateRequestDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<{ apiKey: ApiKeyDto; plainKey: string }>> {
    const data = await this.apiKeyService.generate(
      tenant.organizationId,
      tenant.userId || "system",
      body,
      tenant,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete("api-keys/:id")
  @RequirePermissions(PermissionFlag.API_KEYS_MANAGE)
  @ApiOperation({ summary: "Revoke enterprise API key" })
  async revokeApiKey(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<void>> {
    await this.apiKeyService.revoke(
      tenant.organizationId,
      id,
      tenant,
      body?.reason,
    );
    return { success: true, timestamp: new Date().toISOString() };
  }

  // ==================== UNIVERSAL AUDIT LOG SEARCH ====================

  @Post("audit/search")
  @RequirePermissions(PermissionFlag.AUDIT_READ)
  @ApiOperation({
    summary: "Search and export universal structured audit logs",
  })
  async searchAudit(
    @Body() body: AuditSearchRequestDto,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<AuditSearchResultDto>> {
    const data = await this.auditService.search({
      ...body,
      organizationId: tenant.organizationId,
    });
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== ACTIVE SESSIONS ====================

  @Get("sessions")
  @RequirePermissions(PermissionFlag.USERS_MANAGE)
  @ApiOperation({ summary: "List active user sessions for the organization" })
  async listSessions(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<UserSessionDto[]>> {
    const data = await this.userService.listActiveSessions(
      tenant.organizationId,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete("sessions/:id")
  @RequirePermissions(PermissionFlag.USERS_MANAGE)
  @ApiOperation({ summary: "Revoke active user session" })
  async revokeSession(
    @Param("id") id: string,
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<void>> {
    await this.userService.revokeSession(
      tenant.organizationId,
      id,
      tenant,
      "Admin revoked session via dashboard",
    );
    return { success: true, timestamp: new Date().toISOString() };
  }

  // ==================== RBAC MATRIX & CUSTOM ROLE BUILDER ====================

  @Get("rbac/matrix")
  @RequirePermissions(
    PermissionFlag.ROLE_BUILDER_MANAGE,
    PermissionFlag.USERS_MANAGE,
  )
  @ApiOperation({
    summary: "Get full interactive RBAC & ABAC permission matrix",
  })
  async getRbacMatrix(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<PermissionMatrixDto>> {
    const data = await this.rbacService.getPermissionMatrix(
      tenant.organizationId,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post("rbac/profiles")
  @RequirePermissions(PermissionFlag.ROLE_BUILDER_MANAGE)
  @ApiOperation({
    summary: "Create custom permission profile with ABAC attribute rules",
  })
  async createPermissionProfile(
    @Body()
    body: {
      name: string;
      permissions: string[];
      description?: string;
      abacConditions?: any;
    },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<PermissionProfileDto>> {
    const data = await this.deviceGovernanceService.createPermissionProfile(
      tenant.organizationId,
      body.name,
      body.permissions,
      body.description,
      body.abacConditions,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get("rbac/profiles")
  @RequirePermissions(
    PermissionFlag.ROLE_BUILDER_MANAGE,
    PermissionFlag.USERS_MANAGE,
  )
  @ApiOperation({
    summary: "List custom permission profiles and role templates",
  })
  async listPermissionProfiles(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<PermissionProfileDto[]>> {
    const data = await this.deviceGovernanceService.listPermissionProfiles(
      tenant.organizationId,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== DEVICE GOVERNANCE & SMART GROUPS ====================

  @Post("device-groups")
  @RequirePermissions(PermissionFlag.DEVICE_MANAGEMENT)
  @ApiOperation({
    summary:
      "Create Static or Dynamic Smart Device Group with automated filters",
  })
  async createDeviceGroup(
    @Body()
    body: {
      name: string;
      groupType: string;
      description?: string;
      filterCriteria?: any;
      deviceIds?: string[];
    },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<DeviceGroupDto>> {
    const data = await this.deviceGovernanceService.createDeviceGroup(
      tenant.organizationId,
      body.name,
      body.groupType,
      tenant,
      body.description,
      body.filterCriteria,
      body.deviceIds,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get("device-groups")
  @RequirePermissions(
    PermissionFlag.DEVICE_MANAGEMENT,
    PermissionFlag.TELEMETRY_READ,
  )
  @ApiOperation({ summary: "List device groups under current tenant" })
  async listDeviceGroups(
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<DeviceGroupDto[]>> {
    const data = await this.deviceGovernanceService.listDeviceGroups(
      tenant.organizationId,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== DEVICE TRANSFER WIZARD WORKFLOW ====================

  @Post("device-transfers")
  @RequirePermissions(PermissionFlag.DEVICE_MANAGEMENT)
  @ApiOperation({
    summary:
      "Initiate approval-based device transfer request between organizations",
  })
  async createTransferRequest(
    @Body()
    body: { deviceId: string; toOrganizationId: string; reason: string },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<DeviceTransferRequestDto>> {
    const data = await this.deviceGovernanceService.createTransferRequest(
      body.deviceId,
      tenant.organizationId,
      body.toOrganizationId,
      body.reason,
      tenant,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Put("device-transfers/:id/resolve")
  @Roles(UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({
    summary: "Approve or reject incoming device transfer request",
  })
  async resolveTransferRequest(
    @Param("id") id: string,
    @Body() body: { status: DeviceTransferStatus },
    @CurrentTenant() tenant: TenantContext,
  ): Promise<ApiResponse<DeviceTransferRequestDto>> {
    const data = await this.deviceGovernanceService.resolveTransferRequest(
      id,
      body.status,
      tenant,
    );
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
