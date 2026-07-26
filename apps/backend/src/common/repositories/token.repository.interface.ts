export type OtpTypeEnum = 'EMAIL_VERIFY' | 'PASSWORD_RESET';

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}

export interface OtpRecord {
  id: string;
  otpHash: string;
  type: OtpTypeEnum;
  expiresAt: Date;
  isUsed: boolean;
  email: string;
  userId: string;
  createdAt: Date;
}

export interface ITokenRepository {
  createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenRecord>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
  revokeAllUserRefreshTokens(userId: string): Promise<void>;

  createOtp(userId: string, email: string, otpHash: string, type: OtpTypeEnum, expiresAt: Date): Promise<OtpRecord>;
  findLatestOtp(email: string, type: OtpTypeEnum): Promise<OtpRecord | null>;
  markOtpAsUsed(id: string): Promise<void>;
}

export const ITokenRepositoryToken = Symbol('ITokenRepository');
