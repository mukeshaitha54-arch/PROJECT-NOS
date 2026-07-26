import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ITokenRepository, OtpTypeEnum, RefreshTokenRecord, OtpRecord } from '../../common/repositories/token.repository.interface';

@Injectable()
export class PrismaTokenRepository implements ITokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshTokenRecord> {
    return this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async createOtp(userId: string, email: string, otpHash: string, type: OtpTypeEnum, expiresAt: Date): Promise<OtpRecord> {
    const created = await this.prisma.verificationOtp.create({
      data: {
        userId,
        email: email.toLowerCase(),
        otpHash,
        type: type as any,
        expiresAt,
      },
    });
    return { ...created, type: created.type as OtpTypeEnum };
  }

  async findLatestOtp(email: string, type: OtpTypeEnum): Promise<OtpRecord | null> {
    const record = await this.prisma.verificationOtp.findFirst({
      where: { email: email.toLowerCase(), type: type as any, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return null;
    return { ...record, type: record.type as OtpTypeEnum };
  }

  async markOtpAsUsed(id: string): Promise<void> {
    await this.prisma.verificationOtp.update({
      where: { id },
      data: { isUsed: true },
    });
  }
}
