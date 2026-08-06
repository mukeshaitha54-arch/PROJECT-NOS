import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  IOrganizationRepositoryToken,
  ITeamRepositoryToken,
  IApiKeyRepositoryToken,
  IUserSessionRepositoryToken,
  IAuditLogRepositoryToken,
  IDeviceGovernanceRepositoryToken,
} from '../common/repositories/tenant.repository.interface';
import { IDeviceTimelineRepository } from '../common/repositories/device-timeline.repository.interface';
import { PrismaOrganizationRepository } from './repositories/prisma-organization.repository';
import { PrismaTeamRepository } from './repositories/prisma-team.repository';
import { PrismaApiKeyRepository } from './repositories/prisma-api-key.repository';
import { PrismaUserSessionRepository } from './repositories/prisma-user-session.repository';
import { PrismaAuditLogRepository } from './repositories/prisma-audit-log.repository';
import { PrismaDeviceGovernanceRepository } from './repositories/prisma-device-governance.repository';
import { PrismaDeviceTimelineRepository } from './repositories/prisma-device-timeline.repository';
import { PrismaRegistrationKeyRepository } from './repositories/prisma-registration-key.repository';
import { IRegistrationKeyRepository } from '../common/repositories/registration-key.repository.interface';

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: IOrganizationRepositoryToken, useClass: PrismaOrganizationRepository },
    { provide: ITeamRepositoryToken, useClass: PrismaTeamRepository },
    { provide: IApiKeyRepositoryToken, useClass: PrismaApiKeyRepository },
    { provide: IUserSessionRepositoryToken, useClass: PrismaUserSessionRepository },
    { provide: IAuditLogRepositoryToken, useClass: PrismaAuditLogRepository },
    { provide: IDeviceGovernanceRepositoryToken, useClass: PrismaDeviceGovernanceRepository },
    { provide: IDeviceTimelineRepository, useClass: PrismaDeviceTimelineRepository },
    { provide: IRegistrationKeyRepository, useClass: PrismaRegistrationKeyRepository },
  ],
  exports: [
    PrismaService,
    IOrganizationRepositoryToken,
    ITeamRepositoryToken,
    IApiKeyRepositoryToken,
    IUserSessionRepositoryToken,
    IAuditLogRepositoryToken,
    IDeviceGovernanceRepositoryToken,
    IDeviceTimelineRepository,
    IRegistrationKeyRepository,
  ],
})
export class DatabaseModule {}

