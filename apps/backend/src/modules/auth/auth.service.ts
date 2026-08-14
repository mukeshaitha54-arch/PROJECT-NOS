import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Inject,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  User,
  TokenResponsePayload,
  ErrorCode,
  UserRole,
} from "@nos/shared-types";
import {
  IUserRepository,
  IUserRepositoryToken,
} from "../../common/repositories/user.repository.interface";
import {
  ITokenRepository,
  ITokenRepositoryToken,
} from "../../common/repositories/token.repository.interface";
import {
  IPasswordHasher,
  IPasswordHasherToken,
} from "../../common/services/password-hasher.interface";
import {
  IMailService,
  IMailServiceToken,
} from "../../common/services/mail-service.interface";
import {
  RegisterDto,
  LoginDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  RefreshDto,
} from "./dto/auth.dto";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(IUserRepositoryToken) private readonly userRepo: IUserRepository,
    @Inject(ITokenRepositoryToken) private readonly tokenRepo: ITokenRepository,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
    @Inject(IMailServiceToken) private readonly mailService: IMailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async generateTokens(user: User): Promise<TokenResponsePayload> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRED_IN", "15m"),
    });

    const randomSecret = crypto.randomUUID() + crypto.randomUUID();
    const refreshToken = `${user.id}.${randomSecret}`;
    const tokenHash = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.tokenRepo.createRefreshToken(user.id, tokenHash, expiresAt);

    return { accessToken, refreshToken, user };
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ message: string; user: User; devOtp?: string }> {
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.USER_ALREADY_EXISTS,
        message: "Account with this email already exists.",
      });
    }

    const passwordHash = await this.hasher.hash(dto.password);
    const user = await this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: UserRole.USER,
      isEmailVerified: false,
    });

    // Generate 6-digit verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await this.hasher.hash(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.tokenRepo.createOtp(
      user.id,
      user.email,
      otpHash,
      "EMAIL_VERIFY",
      expiresAt,
    );

    let smtpConfigured = false;
    try {
      await this.mailService.sendVerificationOtp(user.email, otp);
      smtpConfigured = true;
    } catch (mailErr: any) {
      this.logger.warn(
        `Verification email delivery skipped: ${mailErr?.message || mailErr}`,
      );
    }

    this.logger.log(
      `📧 [OTP ISSUED] For [${user.email}]: Verification OTP is [${otp}] (expires in 15m)`,
    );

    const { passwordHash: _, ...cleanUser } = user;
    this.logger.log(
      `👤 New user registered: [${cleanUser.email}] (ID: ${cleanUser.id})`,
    );
    return {
      message:
        "Registration successful. Please enter the 6-digit verification code sent to your email.",
      user: cleanUser,
      devOtp: smtpConfigured ? undefined : otp,
    };
  }

  async resendVerificationOtp(
    email: string,
  ): Promise<{ message: string; devOtp?: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      return {
        message: "If this email is registered, a new OTP has been sent.",
      };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await this.hasher.hash(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.tokenRepo.createOtp(
      user.id,
      user.email,
      otpHash,
      "EMAIL_VERIFY",
      expiresAt,
    );

    let smtpDelivered = false;
    try {
      await this.mailService.sendVerificationOtp(user.email, otp);
      smtpDelivered = true;
    } catch (mailErr: any) {
      this.logger.warn(
        `Verification email delivery skipped: ${mailErr?.message || mailErr}`,
      );
    }

    this.logger.log(`📧 [OTP RESENT] For [${email}]: New OTP is [${otp}]`);
    return {
      message: smtpDelivered
        ? "A new verification code has been dispatched to your email."
        : "OTP generated. SMTP not configured — check the code displayed on screen.",
      devOtp: smtpDelivered ? undefined : otp,
    };
  }

  async login(dto: LoginDto): Promise<TokenResponsePayload> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user || !(await this.hasher.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: "Invalid email or password.",
      });
    }

    if (
      !user.isEmailVerified &&
      this.configService.get<string>("REQUIRE_EMAIL_VERIFICATION", "true") !==
        "false"
    ) {
      throw new UnauthorizedException({
        code: ErrorCode.EMAIL_NOT_VERIFIED,
        message:
          "Email address has not been verified. Please enter the OTP sent to your email.",
      });
    }

    const { passwordHash: _, ...cleanUser } = user;
    this.logger.log(`🔑 User login successful: [${cleanUser.email}]`);
    return this.generateTokens(cleanUser);
  }

  async verifyEmail(
    dto: VerifyEmailDto,
  ): Promise<{
    message: string;
    accessToken?: string;
    refreshToken?: string;
    user?: any;
  }> {
    const latestOtp = await this.tokenRepo.findLatestOtp(
      dto.email,
      "EMAIL_VERIFY",
    );
    if (!latestOtp) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OTP,
        message: "No valid verification request found for this email.",
      });
    }

    if (new Date() > latestOtp.expiresAt) {
      throw new BadRequestException({
        code: ErrorCode.OTP_EXPIRED,
        message: "Verification OTP has expired. Please request a new one.",
      });
    }

    if (!(await this.hasher.verify(latestOtp.otpHash, dto.otp))) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OTP,
        message: "Incorrect OTP code.",
      });
    }

    await this.tokenRepo.markOtpAsUsed(latestOtp.id);
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException("User account not found.");
    }

    await this.userRepo.update(user.id, { isEmailVerified: true });
    try {
      await this.mailService.sendWelcomeEmail(
        user.email,
        user.firstName || "User",
      );
    } catch {}

    const { passwordHash: _, ...cleanUser } = user;
    cleanUser.isEmailVerified = true;
    const tokens = await this.generateTokens(cleanUser);

    this.logger.log(`✅ Email verified successfully for: [${dto.email}]`);
    return {
      message: "Email verified successfully! Welcome to NOS Platform.",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: cleanUser,
    };
  }

  async refresh(dto: RefreshDto): Promise<TokenResponsePayload> {
    const parts = dto.refreshToken.split(".");
    if (parts.length < 2) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Malformed refresh token format.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(dto.refreshToken)
      .digest("hex");
    const storedToken = await this.tokenRepo.findRefreshToken(tokenHash);

    if (
      !storedToken ||
      storedToken.isRevoked ||
      new Date() > storedToken.expiresAt
    ) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: "Refresh token is invalid, revoked, or expired.",
      });
    }

    const user = await this.userRepo.findById(storedToken.userId);
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.USER_NOT_FOUND,
        message: "Associated user no longer exists.",
      });
    }

    await this.tokenRepo.revokeAllUserRefreshTokens(user.id);
    const { passwordHash: _, ...cleanUser } = user;
    this.logger.log(
      `🔄 Rotated session refresh tokens for user: [${cleanUser.email}]`,
    );
    return this.generateTokens(cleanUser);
  }

  async logout(user: User): Promise<{ message: string }> {
    await this.tokenRepo.revokeAllUserRefreshTokens(user.id);
    this.logger.log(
      `🚪 User logged out and session tokens revoked: [${user.email}]`,
    );
    return { message: "Logged out successfully." };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await this.hasher.hash(otp);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

      await this.tokenRepo.createOtp(
        user.id,
        user.email,
        otpHash,
        "PASSWORD_RESET",
        expiresAt,
      );
      await this.mailService.sendPasswordResetOtp(user.email, otp);
      this.logger.log(`📩 Password reset OTP generated for: [${user.email}]`);
    }
    return {
      message:
        "If an account matching this email exists, a password reset OTP has been sent.",
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const latestOtp = await this.tokenRepo.findLatestOtp(
      dto.email,
      "PASSWORD_RESET",
    );
    if (!latestOtp) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OTP,
        message: "No active password reset request found.",
      });
    }

    if (new Date() > latestOtp.expiresAt) {
      throw new BadRequestException({
        code: ErrorCode.OTP_EXPIRED,
        message: "Password reset OTP has expired.",
      });
    }

    if (!(await this.hasher.verify(latestOtp.otpHash, dto.otp))) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OTP,
        message: "Incorrect OTP code.",
      });
    }

    await this.tokenRepo.markOtpAsUsed(latestOtp.id);
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.USER_NOT_FOUND,
        message: "Account not found.",
      });
    }

    const newPasswordHash = await this.hasher.hash(dto.newPassword);
    await this.userRepo.update(user.id, { passwordHash: newPasswordHash });
    await this.tokenRepo.revokeAllUserRefreshTokens(user.id);

    this.logger.log(`🛡️ Password reset successful for user: [${user.email}]`);
    return {
      message:
        "Password reset successful. Please login with your new credentials.",
    };
  }

  async changePassword(
    user: User,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const fullUser = await this.userRepo.findById(user.id);
    if (
      !fullUser ||
      !(await this.hasher.verify(fullUser.passwordHash, dto.currentPassword))
    ) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: "Current password is incorrect.",
      });
    }

    const newPasswordHash = await this.hasher.hash(dto.newPassword);
    await this.userRepo.update(user.id, { passwordHash: newPasswordHash });
    await this.tokenRepo.revokeAllUserRefreshTokens(user.id);

    this.logger.log(
      `🔒 Password changed and existing sessions revoked for: [${user.email}]`,
    );
    return { message: "Password changed successfully." };
  }
}
