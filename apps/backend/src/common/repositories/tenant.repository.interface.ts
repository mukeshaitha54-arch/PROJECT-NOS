import {
  OrganizationDto,
  OrganizationStatus,
  DepartmentDto,
  TeamDto,
  OrganizationMemberDto,
  OrganizationInvitationDto,
  ApiKeyDto,
  ApiKeyCreateRequestDto,
  UserSessionDto,
  UserActivityDto,
  AuditLogDto,
  AuditSearchRequestDto,
  AuditSearchResultDto,
  DeviceOwnershipDto,
  DeviceGroupDto,
  DeviceTransferRequestDto,
  PermissionProfileDto,
  RoleTemplateDto,
  OrganizationQuotaDto,
  OrganizationSettingsDto,
  UserRole,
} from "@nos/shared-types";

export const IOrganizationRepositoryToken = Symbol("IOrganizationRepository");
export const ITeamRepositoryToken = Symbol("ITeamRepository");
export const IApiKeyRepositoryToken = Symbol("IApiKeyRepository");
export const IUserSessionRepositoryToken = Symbol("IUserSessionRepository");
export const IAuditLogRepositoryToken = Symbol("IAuditLogRepository");
export const IDeviceGovernanceRepositoryToken = Symbol(
  "IDeviceGovernanceRepository",
);

export interface IOrganizationRepository {
  findById(id: string): Promise<OrganizationDto | null>;
  findBySlug(slug: string): Promise<OrganizationDto | null>;
  create(data: {
    name: string;
    slug: string;
    status?: OrganizationStatus;
    settings?: Partial<OrganizationSettingsDto>;
    quota?: Partial<OrganizationQuotaDto>;
  }): Promise<OrganizationDto>;
  updateStatus(
    id: string,
    status: OrganizationStatus,
  ): Promise<OrganizationDto>;
  updateSettings(
    id: string,
    settings: OrganizationSettingsDto,
  ): Promise<OrganizationDto>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<OrganizationDto>;
  listAll(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: OrganizationDto[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getQuota(organizationId: string): Promise<OrganizationQuotaDto | null>;
  updateQuota(
    organizationId: string,
    quota: Partial<OrganizationQuotaDto>,
  ): Promise<OrganizationQuotaDto>;
}

export interface ITeamRepository {
  createDepartment(
    organizationId: string,
    name: string,
    description?: string,
    headUserId?: string,
  ): Promise<DepartmentDto>;
  listDepartments(organizationId: string): Promise<DepartmentDto[]>;
  createTeam(
    organizationId: string,
    name: string,
    departmentId?: string,
    description?: string,
    leadUserId?: string,
  ): Promise<TeamDto>;
  listTeams(organizationId: string): Promise<TeamDto[]>;
  addMember(
    organizationId: string,
    userId: string,
    role: UserRole,
    teamIds?: string[],
    departmentIds?: string[],
    customRoleId?: string,
  ): Promise<OrganizationMemberDto>;
  updateMemberRole(
    organizationId: string,
    userId: string,
    role: UserRole,
    customRoleId?: string,
  ): Promise<OrganizationMemberDto>;
  removeMember(organizationId: string, userId: string): Promise<void>;
  listMembers(
    organizationId: string,
    params?: { search?: string; role?: string; page?: number; limit?: number },
  ): Promise<{ items: OrganizationMemberDto[]; total: number }>;
  findMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberDto | null>;
  createInvitation(
    organizationId: string,
    email: string,
    role: UserRole,
    invitedByUserId: string,
    tokenHash: string,
    expiresAt: Date,
    teamIds?: string[],
    departmentIds?: string[],
  ): Promise<OrganizationInvitationDto>;
  listInvitations(organizationId: string): Promise<OrganizationInvitationDto[]>;
  revokeInvitation(organizationId: string, id: string): Promise<void>;
}

export interface IApiKeyRepository {
  create(
    organizationId: string,
    createdByUserId: string,
    data: ApiKeyCreateRequestDto,
    keyPrefix: string,
    tokenHash: string,
  ): Promise<ApiKeyDto>;
  findByTokenHash(tokenHash: string): Promise<ApiKeyDto | null>;
  listByOrganization(
    organizationId: string,
    params?: { page?: number; limit?: number; search?: string },
  ): Promise<{ items: ApiKeyDto[]; total: number }>;
  revoke(organizationId: string, id: string): Promise<void>;
  recordUsage(id: string): Promise<void>;
}

export interface IUserSessionRepository {
  create(data: {
    userId: string;
    organizationId: string;
    tokenHash: string;
    ipAddress: string;
    browser: string;
    os: string;
    expiresAt: Date;
    riskScore?: number;
  }): Promise<UserSessionDto>;
  listActiveSessions(
    organizationId: string,
    userId?: string,
  ): Promise<UserSessionDto[]>;
  revokeSession(id: string, organizationId: string): Promise<void>;
  revokeAllUserSessions(userId: string, organizationId?: string): Promise<void>;
  recordActivity(
    data: Omit<UserActivityDto, "id" | "timestamp">,
  ): Promise<void>;
  listUserActivities(
    organizationId: string,
    userId?: string,
    limit?: number,
  ): Promise<UserActivityDto[]>;
}

export interface IAuditLogRepository {
  record(data: Omit<AuditLogDto, "id" | "timestamp">): Promise<AuditLogDto>;
  search(request: AuditSearchRequestDto): Promise<AuditSearchResultDto>;
}

export interface IDeviceGovernanceRepository {
  assignOwnership(
    deviceId: string,
    organizationId: string,
    data: Partial<DeviceOwnershipDto>,
  ): Promise<DeviceOwnershipDto>;
  getOwnership(
    deviceId: string,
    organizationId: string,
  ): Promise<DeviceOwnershipDto | null>;
  createDeviceGroup(
    organizationId: string,
    name: string,
    groupType: string,
    description?: string,
    filterCriteria?: Record<string, any>,
    deviceIds?: string[],
  ): Promise<DeviceGroupDto>;
  listDeviceGroups(organizationId: string): Promise<DeviceGroupDto[]>;
  createTransferRequest(
    deviceId: string,
    fromOrgId: string,
    toOrgId: string,
    requestedBy: string,
    reason: string,
  ): Promise<DeviceTransferRequestDto>;
  resolveTransferRequest(
    id: string,
    status: string,
    approvedByUserId?: string,
  ): Promise<DeviceTransferRequestDto>;
  listTransferRequests(
    organizationId: string,
    type: "INCOMING" | "OUTGOING",
  ): Promise<DeviceTransferRequestDto[]>;
  listPermissionProfiles(
    organizationId: string,
  ): Promise<PermissionProfileDto[]>;
  createPermissionProfile(
    organizationId: string,
    name: string,
    permissions: string[],
    description?: string,
    abacConditions?: Record<string, any>,
  ): Promise<PermissionProfileDto>;
  listRoleTemplates(): Promise<RoleTemplateDto[]>;
}
