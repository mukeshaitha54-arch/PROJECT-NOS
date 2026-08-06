import { Controller, Post, Body, Inject, BadRequestException } from '@nestjs/common';
import { RegistrationKeyService } from '../services/registration-key.service';
import { IOrganizationRepositoryToken, IOrganizationRepository } from '../../../common/repositories/tenant.repository.interface';
import { PrismaService } from '../../../database/prisma.service';
import { IPasswordHasher, IPasswordHasherToken } from '../../../common/services/password-hasher.interface';
import * as crypto from 'crypto';
// Assuming we might have a TenantService or similar to handle Org creation,
// but for now we'll inject PrismaService to handle the transaction if needed,
// or use the repositories.

export interface OnboardingWizardDto {
  companyName: string;
  slug: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  // password handling usually separate or included here
  passwordHash?: string; 
  timezone?: string;
}

@Controller('fleet/onboarding')
export class OnboardingController {
  constructor(
    private readonly registrationKeyService: RegistrationKeyService,
    @Inject(IOrganizationRepositoryToken)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(IPasswordHasherToken)
    private readonly hasher: IPasswordHasher,
    private readonly prisma: PrismaService, // Direct access for transactional creation
  ) {}

  @Post('wizard')
  async completeOnboarding(@Body() dto: OnboardingWizardDto) {
    // 1. Create Organization & Owner User (Transactional)
    // To respect clean architecture as much as possible, this would ideally be in a domain service.
    // However, to keep it functional for Phase 8:
    
    // Check if slug exists
    const existingOrg = await this.prisma.organization.findUnique({ where: { slug: dto.slug } });
    if (existingOrg) {
      throw new BadRequestException('Organization slug already exists');
    }
    
    // Check if user exists
    let user = await this.prisma.user.findUnique({ where: { email: dto.ownerEmail } });

    const transactionResult = await this.prisma.$transaction(async (tx) => {
      if (!user) {
        const generatedPassword = crypto.randomUUID();
        const hash = dto.passwordHash || (await this.hasher.hash(generatedPassword));
        user = await tx.user.create({
          data: {
            email: dto.ownerEmail,
            firstName: dto.ownerFirstName,
            lastName: dto.ownerLastName,
            passwordHash: hash,
            role: 'OWNER',
            isEmailVerified: true,
          }
        });
      }

      const org = await tx.organization.create({
        data: {
          name: dto.companyName,
          slug: dto.slug,
          timezone: dto.timezone || 'UTC',
          companyName: dto.companyName,
          brandingEnabled: false,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            }
          },
          quota: {
            create: {}
          }
        }
      });

      return { org, user };
    });

    // 2. Generate Registration Key
    const keyResult = await this.registrationKeyService.generateKey({
      organizationId: transactionResult.org.id,
      displayName: 'Default Deployment Key',
      createdBy: transactionResult.user.id,
      maxUses: 0, // unlimited
    });

    return {
      success: true,
      data: {
        organization: transactionResult.org,
        user: transactionResult.user,
        registrationKey: keyResult,
      },
      message: 'Onboarding complete. Please save the Registration Key safely.',
    };
  }
}
