import { Global, Module } from '@nestjs/common';

import { TenantController } from './controllers/tenant.controller';
import { OrganizationInvitationController } from './controllers/organization-invitation.controller';
import { TenantSessionsController } from './tenant-sessions.controller';

import { OrganizationService } from './services/organization.service';
import { UserGovernanceService } from './services/user-governance.service';
import { ApiKeyService } from './services/api-key.service';
import { AuditEngineService } from './services/audit-engine.service';
import { DeviceGovernanceService } from './services/device-governance.service';
import { RbacEvaluationService } from './services/rbac-evaluation.service';
import { QuotaEngineService } from './services/quota-engine.service';
import { TenantScoresService } from './services/tenant-scores.service';
import { OrganizationInvitationService } from './services/organization-invitation.service';
import { TenantSessionsService } from './tenant-sessions.service';

import { DeviceModule } from '../device/device.module';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({

  imports: [
    DeviceModule,
    AuthModule,
  ],

  controllers: [
    TenantController,
    OrganizationInvitationController,
    TenantSessionsController,
  ],

  providers: [
    OrganizationService,
    UserGovernanceService,
    ApiKeyService,
    AuditEngineService,
    DeviceGovernanceService,
    RbacEvaluationService,
    QuotaEngineService,
    TenantScoresService,
    OrganizationInvitationService,
    TenantSessionsService,
  ],

  exports: [
    OrganizationService,
    UserGovernanceService,
    ApiKeyService,
    AuditEngineService,
    DeviceGovernanceService,
    RbacEvaluationService,
    QuotaEngineService,
    TenantScoresService,
    OrganizationInvitationService,
    TenantSessionsService,
  ],
})
export class TenantModule { }