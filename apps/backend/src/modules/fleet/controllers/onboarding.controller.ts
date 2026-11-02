import {
  Controller,
  Post,
  Body,
  Inject,
  BadRequestException,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { RegistrationKeyService } from "../services/registration-key.service";
import {
  IOrganizationRepositoryToken,
  IOrganizationRepository,
} from "../../../common/repositories/tenant.repository.interface";
import { PrismaService } from "../../../database/prisma.service";
import {
  IPasswordHasher,
  IPasswordHasherToken,
} from "../../../common/services/password-hasher.interface";
import {
  IMailServiceToken,
  IMailService,
} from "../../../common/services/mail-service.interface";
import { OptionalJwtAuthGuard } from "../../../common/guards/optional-jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import * as crypto from "crypto";

export interface OnboardingWizardDto {
  companyName: string;
  slug: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  password?: string;
  passwordHash?: string;
  timezone?: string;
}

@Controller("fleet/onboarding")
export class OnboardingController {
  constructor(
    private readonly registrationKeyService: RegistrationKeyService,
    @Inject(IOrganizationRepositoryToken)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(IPasswordHasherToken)
    private readonly hasher: IPasswordHasher,
    @Inject(IMailServiceToken)
    private readonly mailService: IMailService,
    private readonly prisma: PrismaService, // Direct access for transactional creation
  ) {}

  @Post("wizard")
  @UseGuards(OptionalJwtAuthGuard)
  async completeOnboarding(
    @Body() dto: OnboardingWizardDto,
    @CurrentUser() currentUser?: any,
  ) {
    const totalOrgs = await this.prisma.organization.count();

    // If the system already has organizations, only authenticated users can create an organization
    if (totalOrgs > 0 && !currentUser) {
      throw new UnauthorizedException(
        "Public onboarding is locked. Please log in or register an account first.",
      );
    }

    // Check if slug exists
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existingOrg) {
      throw new BadRequestException("Organization slug already exists");
    }

    const normalizedEmail = dto.ownerEmail
      ? dto.ownerEmail.trim().toLowerCase()
      : "";

    let user: any;

    if (currentUser) {
      // Authenticated user path: user must match their own identity unless SUPER_ADMIN
      if (
        normalizedEmail &&
        currentUser.email &&
        currentUser.email.toLowerCase() !== normalizedEmail &&
        currentUser.role !== "SUPER_ADMIN"
      ) {
        throw new BadRequestException(
          "Owner email must match your authenticated account email.",
        );
      }
      user = await this.prisma.user.findUnique({
        where: { id: currentUser.id },
      });
      if (!user) {
        throw new UnauthorizedException("Authenticated user not found");
      }
    } else {
      // Initial bootstrap path (totalOrgs === 0)
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingUser) {
        throw new BadRequestException(
          "User with this email already exists. Please log in to complete onboarding.",
        );
      }

      if (!dto.password || dto.password.length < 8) {
        throw new BadRequestException(
          "A password of at least 8 characters is required for the initial administrator account.",
        );
      }

      const hash = await this.hasher.hash(dto.password);
      user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          firstName: dto.ownerFirstName,
          lastName: dto.ownerLastName,
          passwordHash: hash,
          role: "OWNER",
          isEmailVerified: true,
        },
      });
    }

    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.companyName,
          slug: dto.slug,
          timezone: dto.timezone || "UTC",
          companyName: dto.companyName,
          brandingEnabled: false,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
          quota: {
            create: {},
          },
        },
      });

      return { org, user };
    });

    // Generate Registration Key for the newly onboarded org
    const keyResult = await this.registrationKeyService.generateKey({
      organizationId: transactionResult.org.id,
      displayName: "Default Deployment Key",
      createdBy: transactionResult.user.id,
      maxUses: 0, // unlimited
    });

    // Strip sensitive fields
    const { passwordHash: _, ...sanitizedUser } = transactionResult.user;

    return {
      success: true,
      data: {
        organization: transactionResult.org,
        user: sanitizedUser,
        registrationKey: keyResult,
      },
      message: "Onboarding complete. Please save the Registration Key safely.",
    };
  }
}
