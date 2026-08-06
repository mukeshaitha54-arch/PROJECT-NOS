import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionFlag, ErrorCode, UserRole } from '@nos/shared-types';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { RbacEvaluationService } from '../../modules/tenant/services/rbac-evaluation.service';
import { ITeamRepository, ITeamRepositoryToken } from '../repositories/tenant.repository.interface';

@Injectable()
export class RbacPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacEvaluationService,
    @Inject(ITeamRepositoryToken) private readonly teamRepository: ITeamRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionFlag[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request?.user;
    if (!user) {
      throw new ForbiddenException({ code: ErrorCode.UNAUTHORIZED, message: 'Authentication required for permission evaluation.' });
    }

    // SUPER_ADMIN bypasses all granular checks globally
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const tenantContext = request.tenantContext;
    const orgId = tenantContext?.organizationId || 'default-org';

    let roleToEvaluate = user.role;
    let customRoleId: string | undefined = undefined;

    if (orgId !== 'default-org') {
      const member = await this.teamRepository.findMember(orgId, user.id);
      if (member) {
        roleToEvaluate = member.role;
        customRoleId = member.customRoleId;
      }
    }

    // Organization OWNER bypasses granular permissions for their organization
    if (roleToEvaluate === UserRole.OWNER) {
      return true;
    }

    for (const flag of requiredPermissions) {
      const hasPerm = await this.rbacService.hasPermission(orgId, roleToEvaluate, flag, customRoleId);
      if (!hasPerm) {
        throw new ForbiddenException({
          code: ErrorCode.INSUFFICIENT_PERMISSIONS,
          message: `Missing required enterprise permission: [${flag}].`,
        });
      }
    }

    return true;
  }
}
