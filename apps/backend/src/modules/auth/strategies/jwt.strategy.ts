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
    });
  }

  async validate(
    payload: JwtPayload,
  ): Promise<User & { organizationId?: string }> {
    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Token credentials invalidated.");
    }
    const { passwordHash, ...userWithoutPass } = user as any;

    // Attach the user's primary organizationId so controllers can use it directly
    // without requiring TenantContextGuard on every route
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    });
    return {
      ...userWithoutPass,
      organizationId: membership?.organizationId ?? "default-org",
    };
  }
}
