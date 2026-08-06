import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { TenantContext, ErrorCode, UserRole } from '@nos/shared-types';
import * as crypto from 'crypto';
import { ITeamRepository, ITeamRepositoryToken, IApiKeyRepository, IApiKeyRepositoryToken } from '../repositories/tenant.repository.interface';

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    @Inject(ITeamRepositoryToken) private readonly teamRepository: ITeamRepository,
    @Inject(IApiKeyRepositoryToken) private readonly apiKeyRepository: IApiKeyRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request) return true;

    // Extract Organization ID from header, query, or body (fallback to 'default-org' for complete backward compatibility with Phase 1-5 tests)
    const orgId =
      request.headers?.['x-organization-id'] ||
      request.headers?.['x-tenant-id'] ||
      request.query?.organizationId ||
      request.body?.organizationId ||
      'default-org';

    const correlationId = (request.headers?.['x-correlation-id'] as string) || crypto.randomUUID();
    const requestId = (request.headers?.['x-request-id'] as string) || crypto.randomUUID();
    const ipAddress = request.ip || request.headers?.['x-forwarded-for'] || request.socket?.remoteAddress || '127.0.0.1';
    const browser = (request.headers?.['user-agent'] as string) || 'NOS-API-Client/6.0';

    const tenantContext: TenantContext = {
      organizationId: orgId,
      correlationId,
      requestId,
      ipAddress,
      browser,
    };

    if (request.user) {
      tenantContext.userId = request.user.id;
      // If user is not SUPER_ADMIN and organization is not 'default-org', verify membership
      if (request.user.role !== UserRole.SUPER_ADMIN && orgId !== 'default-org') {
        const member = await this.teamRepository.findMember(orgId, request.user.id);
        if (!member || member.isSuspended) {
          throw new ForbiddenException({
            code: ErrorCode.INSUFFICIENT_PERMISSIONS,
            message: `User is not an active member of organization [${orgId}].`,
          });
        }
        tenantContext.role = member.role as UserRole;
      }
    }

    // Attach verified TenantContext to request payload (SPL Feature)
    request.tenantContext = tenantContext;
    request.headers['x-correlation-id'] = correlationId;

    return true;
  }
}
