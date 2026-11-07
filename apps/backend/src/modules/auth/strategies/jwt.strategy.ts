import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import {
  IUserRepository,
  IUserRepositoryToken,
} from "../../../common/repositories/user.repository.interface";
import { User } from "@nos/shared-types";
import { PrismaService } from "../../../database/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    configService: ConfigService,
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        "JWT_SECRET",
        "nos_super_secret_jwt_key_32_chars_min_length_value!",
      ),
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    payload: JwtPayload,
  ): Promise<
    User & {
      organizationId?: string;
      memberRole?: string;
      activeOrganization?: any;
      organizations?: any[];
    }
  > {
    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Token credentials invalidated.");
    }
    const { passwordHash, ...userWithoutPass } = user as any;

    // Check if client explicitly requested an organization via header or query
    const requestedOrgId =
      req?.headers?.["x-organization-id"] ||
      req?.headers?.["x-tenant-id"] ||
      req?.query?.organizationId;

    // Fetch all active memberships for this user, ordered by most recently joined
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id, isSuspended: false },
      include: {
        organization: {
          include: {
            _count: {
              select: { devices: true },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    });

    let selectedMembership: any = null;

    if (requestedOrgId && typeof requestedOrgId === "string") {
      selectedMembership = memberships.find(
        (m) => m.organizationId === requestedOrgId,
      );
    }

    if (!selectedMembership) {
      // 1. Prioritize organization with registered devices
      selectedMembership =
        memberships.find(
          (m) => ((m.organization as any)?._count?.devices || 0) > 0,
        ) ||
        // 2. Fall back to most recently joined/accepted organization
        memberships[0] ||
        null;
    }

    const orgId = selectedMembership?.organizationId ?? "default-org";

    return {
      ...userWithoutPass,
      organizationId: orgId,
      memberRole: selectedMembership?.role ?? user.role,
      activeOrganization: selectedMembership?.organization
        ? {
            id: selectedMembership.organization.id,
            name: selectedMembership.organization.name,
            slug: selectedMembership.organization.slug,
            role: selectedMembership.role,
            deviceCount:
              (selectedMembership.organization as any)?._count?.devices || 0,
          }
        : null,
      organizations: memberships.map((m) => ({
        id: m.organizationId,
        name: m.organization?.name || "Workspace",
        slug: m.organization?.slug,
        role: m.role,
        deviceCount: (m.organization as any)?._count?.devices || 0,
        isCurrent: m.organizationId === orgId,
      })),
    };
  }
}
