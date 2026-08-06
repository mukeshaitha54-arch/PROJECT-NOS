import { Injectable, Inject, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  DepartmentDto,
  TeamDto,
  OrganizationMemberDto,
  OrganizationInvitationDto,
  UserSessionDto,
  UserActivityDto,
  UserRole,
  AuditActionType,
  TenantContext,
  ErrorCode,
} from '@nos/shared-types';
import {
  ITeamRepository,
  ITeamRepositoryToken,
  IUserSessionRepository,
  IUserSessionRepositoryToken,
} from '../../../common/repositories/tenant.repository.interface';
import { QuotaEngineService } from './quota-engine.service';
import { AuditEngineService } from './audit-engine.service';

@Injectable()
export class UserGovernanceService {
  constructor(
    @Inject(ITeamRepositoryToken) private readonly teamRepository: ITeamRepository,
    @Inject(IUserSessionRepositoryToken) private readonly sessionRepository: IUserSessionRepository,
    private readonly quotaService: QuotaEngineService,
    private readonly auditService: AuditEngineService,
  ) {}

  // Departments & Teams
  async createDepartment(organizationId: string, name: string, description?: string, headUserId?: string): Promise<DepartmentDto> {
    return this.teamRepository.createDepartment(organizationId, name, description, headUserId);
  }

  async listDepartments(organizationId: string): Promise<DepartmentDto[]> {
    return this.teamRepository.listDepartments(organizationId);
  }

  async createTeam(organizationId: string, name: string, departmentId?: string, description?: string, leadUserId?: string): Promise<TeamDto> {
    return this.teamRepository.createTeam(organizationId, name, departmentId, description, leadUserId);
  }

  async listTeams(organizationId: string): Promise<TeamDto[]> {
    return this.teamRepository.listTeams(organizationId);
  }

  // Member Governance
  async addMember(
    organizationId: string,
    userId: string,
    role: UserRole,
    context: TenantContext,
    teamIds?: string[],
    departmentIds?: string[],
    customRoleId?: string,
  ): Promise<OrganizationMemberDto> {
    await this.quotaService.checkQuotaConsumption(organizationId, 'USERS');

    const member = await this.teamRepository.addMember(organizationId, userId, role, teamIds, departmentIds, customRoleId);
    await this.auditService.logEvent(
      context,
      AuditActionType.PERMISSION_CHANGE,
      'MEMBER',
      member.id,
      `Assigned user [${userId}] to role [${role}] in organization [${organizationId}]`,
      { role, teamIds, departmentIds, customRoleId },
    );

    return member;
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: UserRole,
    context: TenantContext,
    customRoleId?: string,
  ): Promise<OrganizationMemberDto> {
    const member = await this.teamRepository.updateMemberRole(organizationId, userId, role, customRoleId);
    await this.auditService.logEvent(
      context,
      AuditActionType.PERMISSION_CHANGE,
      'MEMBER',
      member.id,
      `Updated member [${userId}] role to [${role}] in org [${organizationId}]`,
      { role, customRoleId },
    );
    return member;
  }

  async removeMember(organizationId: string, userId: string, context: TenantContext, reason?: string): Promise<void> {
    await this.teamRepository.removeMember(organizationId, userId);
    await this.sessionRepository.revokeAllUserSessions(userId, organizationId);

    await this.auditService.logEvent(
      context,
      AuditActionType.USER_REMOVED,
      'MEMBER',
      userId,
      reason || `Removed user [${userId}] from organization [${organizationId}] and revoked sessions`,
    );
  }

  async listMembers(organizationId: string, params?: { search?: string; role?: string; page?: number; limit?: number }) {
    return this.teamRepository.listMembers(organizationId, params);
  }

  // Invitations & Bulk CSV Import
  async inviteUser(
    organizationId: string,
    email: string,
    role: UserRole,
    context: TenantContext,
    teamIds?: string[],
    departmentIds?: string[],
  ): Promise<{ invitation: OrganizationInvitationDto; inviteLink: string }> {
    await this.quotaService.checkQuotaConsumption(organizationId, 'USERS');

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await this.teamRepository.createInvitation(
      organizationId,
      email,
      role,
      context.userId || 'system',
      tokenHash,
      expiresAt,
      teamIds,
      departmentIds,
    );

    const inviteLink = `https://app.nos.enterprises/accept-invite?token=${token}`;

    await this.auditService.logEvent(
      context,
      AuditActionType.USER_INVITED,
      'INVITE',
      invitation.id,
      `Invited user [${email}] with role [${role}]`,
      { email, role },
    );

    return { invitation, inviteLink };
  }

  async listInvitations(organizationId: string): Promise<OrganizationInvitationDto[]> {
    return this.teamRepository.listInvitations(organizationId);
  }

  async revokeInvitation(organizationId: string, id: string, context: TenantContext): Promise<void> {
    await this.teamRepository.revokeInvitation(organizationId, id);
    await this.auditService.logEvent(context, AuditActionType.USER_REMOVED, 'INVITE', id, 'Revoked user invitation');
  }

  async importUsersFromCsv(
    organizationId: string,
    csvContent: string,
    context: TenantContext,
  ): Promise<{ total: number; success: number; errors: Array<{ row: number; email: string; error: string }> }> {
    const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
    const errors: Array<{ row: number; email: string; error: string }> = [];
    let success = 0;

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      const email = parts[0];
      const roleStr = (parts[1] || 'OPERATOR').toUpperCase() as UserRole;

      if (!email || !email.includes('@')) {
        errors.push({ row: i + 1, email, error: 'Invalid email address syntax' });
        continue;
      }

      try {
        await this.inviteUser(organizationId, email, roleStr, context);
        success++;
      } catch (err: any) {
        errors.push({ row: i + 1, email, error: err?.message || 'Quota exceeded or import error' });
      }
    }

    return { total: lines.length, success, errors };
  }

  // Session & Security Governance
  async listActiveSessions(organizationId: string, userId?: string): Promise<UserSessionDto[]> {
    return this.sessionRepository.listActiveSessions(organizationId, userId);
  }

  async revokeSession(organizationId: string, sessionId: string, context: TenantContext, reason?: string): Promise<void> {
    await this.sessionRepository.revokeSession(sessionId, organizationId);
    await this.auditService.logEvent(context, AuditActionType.SESSION_REVOKE, 'SESSION', sessionId, reason || 'Revoked active session');
  }

  async revokeAllUserSessions(organizationId: string, targetUserId: string, context: TenantContext, reason?: string): Promise<void> {
    await this.sessionRepository.revokeAllUserSessions(targetUserId, organizationId);
    await this.auditService.logEvent(context, AuditActionType.SESSION_REVOKE, 'USER_SESSIONS', targetUserId, reason || 'Force logout from all devices');
  }

  async recordActivity(organizationId: string, userId: string, action: string, ipAddress: string, browser: string, resourceType?: string, resourceId?: string): Promise<void> {
    await this.sessionRepository.recordActivity({ organizationId, userId, action, ipAddress, browser, resourceType, resourceId });
  }

  async listUserActivities(organizationId: string, userId?: string, limit = 50): Promise<UserActivityDto[]> {
    return this.sessionRepository.listUserActivities(organizationId, userId, limit);
  }

  // Enterprise Impersonation (Mandatory Audit Logging)
  async impersonateUser(
    organizationId: string,
    targetUserId: string,
    reason: string,
    context: TenantContext,
  ): Promise<{ impersonationToken: string; targetUserId: string; expiresAt: string }> {
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException({ code: ErrorCode.VALIDATION_ERROR, message: 'Mandatory justification reason required for impersonation.' });
    }

    // Must record mandatory audit trace BEFORE issuing impersonation session
    await this.auditService.logEvent(
      context,
      AuditActionType.USER_IMPERSONATION,
      'IMPERSONATION',
      targetUserId,
      `IMPERSONATION TRACE: User [${context.userId}] initiated impersonation of [${targetUserId}]. Justification: ${reason}`,
      { targetUserId, reason },
    );

    const token = `imp_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min duration limit

    return { impersonationToken: token, targetUserId, expiresAt };
  }
}
