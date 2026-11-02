import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { IRegistrationKeyRepository } from "../../common/repositories/registration-key.repository.interface";
import { RegistrationKey } from "@prisma/client";

@Injectable()
export class PrismaRegistrationKeyRepository implements IRegistrationKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Omit<RegistrationKey, "id" | "createdAt">,
  ): Promise<RegistrationKey> {
    return this.prisma.registrationKey.create({
      data,
    });
  }

  async findById(id: string): Promise<RegistrationKey | null> {
    return this.prisma.registrationKey.findUnique({
      where: { id },
    });
  }

  async findByHash(keyHash: string): Promise<RegistrationKey | null> {
    return this.prisma.registrationKey.findUnique({
      where: { keyHash },
    });
  }

  async findByOrganizationId(
    organizationId: string,
  ): Promise<RegistrationKey[]> {
    return this.prisma.registrationKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(
    id: string,
    data: Partial<RegistrationKey>,
  ): Promise<RegistrationKey> {
    return this.prisma.registrationKey.update({
      where: { id },
      data,
    });
  }

  async incrementUsage(
    id: string,
    deviceId: string,
    ipAddress?: string,
  ): Promise<void> {
    const key = await this.prisma.registrationKey.findUnique({
      where: { id },
    });
    if (!key) {
      throw new BadRequestException("Registration key not found");
    }
    if (key.status !== "ACTIVE") {
      await this.recordFailedAttempt(id).catch(() => {});
      throw new BadRequestException("Registration key is not active");
    }
    if (key.expiresAt && new Date() > key.expiresAt) {
      await this.recordFailedAttempt(id).catch(() => {});
      throw new BadRequestException("Registration key has expired");
    }
    if (key.maxUses > 0 && key.currentUses >= key.maxUses) {
      await this.recordFailedAttempt(id).catch(() => {});
      throw new BadRequestException("Registration key usage limit reached");
    }

    // Atomic conditional update under concurrency
    const updateResult = await this.prisma.registrationKey.updateMany({
      where: {
        id,
        status: "ACTIVE",
        currentUses: key.currentUses,
      },
      data: {
        currentUses: { increment: 1 },
        devicesCreated: { increment: 1 },
        lastUsed: new Date(),
        lastUsedBy: deviceId,
        lastUsedIp: ipAddress,
      },
    });

    if (updateResult.count === 0) {
      await this.recordFailedAttempt(id).catch(() => {});
      throw new BadRequestException(
        "Registration key usage limit reached or modified concurrently",
      );
    }
  }

  async recordFailedAttempt(id: string): Promise<void> {
    await this.prisma.registrationKey.update({
      where: { id },
      data: {
        failedAttempts: { increment: 1 },
      },
    });
  }
}
