import { Logger } from "@nestjs/common";
import { TenantContext } from "@nos/shared-types";

export interface TenantAwareJobPayload<T = any> {
  tenantContext: TenantContext;
  data: T;
}

export class TenantJobContext {
  private static readonly logger = new Logger("TenantJobContext");

  public static wrapPayload<T>(
    payload: T,
    context?: Partial<TenantContext>,
  ): TenantAwareJobPayload<T> {
    return {
      tenantContext: {
        organizationId: context?.organizationId || "default-org",
        correlationId: context?.correlationId || `worker-${Date.now()}`,
        requestId: context?.requestId || `req-${Date.now()}`,
        userId: context?.userId,
      },
      data: payload,
    };
  }

  public static extractContext<T>(
    jobData: TenantAwareJobPayload<T> | any,
  ): TenantContext {
    if (jobData?.tenantContext && jobData.tenantContext.organizationId) {
      return jobData.tenantContext as TenantContext;
    }
    this.logger.debug(
      "Job payload lacking explicit tenantContext; using default backward-compatible context.",
    );
    return {
      organizationId: jobData?.organizationId || "default-org",
      correlationId: jobData?.correlationId || "job-no-corr-id",
      requestId: jobData?.requestId || "job-no-req-id",
    };
  }
}
