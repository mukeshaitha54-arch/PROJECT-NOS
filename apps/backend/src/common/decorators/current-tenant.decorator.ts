import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '@nos/shared-types';

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    if (request?.tenantContext) {
      return request.tenantContext as TenantContext;
    }
    return {
      organizationId: 'default-org',
      correlationId: 'fallback-corr-id',
      requestId: 'fallback-req-id',
    };
  },
);
