import { Injectable } from "@nestjs/common";
import { UserRole } from "@nos/shared-types";
import { PrismaService } from "../prisma.service";
import {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
} from "../../common/repositories/user.repository.interface";
import { Role as PrismaRole, Prisma, User } from "@prisma/client";

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapRole(role: PrismaRole): UserRole {
    return role as unknown as UserRole;
  }

  private mapPrismaRole(role: UserRole): PrismaRole {
    return role as unknown as PrismaRole;
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      ...user,
      role: this.mapRole(user.role),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;
    return {
      ...user,
      role: this.mapRole(user.role),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async create(data: CreateUserData) {
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ? this.mapPrismaRole(data.role) : PrismaRole.USER,
        isEmailVerified: data.isEmailVerified ?? false,
      },
    });
    return {
      ...user,
      role: this.mapRole(user.role),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async update(id: string, data: UpdateUserData) {
    const updatePayload: Prisma.UserUpdateInput = {};
    if (data.firstName !== undefined) updatePayload.firstName = data.firstName;
    if (data.lastName !== undefined) updatePayload.lastName = data.lastName;
    if (data.passwordHash !== undefined)
      updatePayload.passwordHash = data.passwordHash;
    if (data.role !== undefined)
      updatePayload.role = this.mapPrismaRole(data.role);
    if (data.isEmailVerified !== undefined)
      updatePayload.isEmailVerified = data.isEmailVerified;

    const user = await this.prisma.user.update({
      where: { id },
      data: updatePayload,
    });

    return {
      ...user,
      role: this.mapRole(user.role),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async search(query: string, organizationId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 20,
    }); // Needs joining with organization member in real app if organizationId scoped
  }
}
