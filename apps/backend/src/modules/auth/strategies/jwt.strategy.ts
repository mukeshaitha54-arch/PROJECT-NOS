import { Injectable, UnauthorizedException, Inject } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import {
  IUserRepository,
  IUserRepositoryToken,
} from "../../../common/repositories/user.repository.interface";
import { User } from "@nos/shared-types";

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

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("Token credentials invalidated.");
    }
    const { passwordHash, ...userWithoutPass } = user;
    return userWithoutPass;
  }
}
