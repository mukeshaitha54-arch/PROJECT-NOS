import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ITeamRepository } from "../../common/repositories/tenant.repository.interface";
import {
  DepartmentDto,
  TeamDto,
  OrganizationMemberDto,
  OrganizationInvitationDto,
  InvitationStatus,
  UserRole,
} from "@nos/shared-types";
import { Prisma } from "@prisma/client";

@Injectable()
export class PrismaTeamRepository implements ITeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDepartment(
    organizationId: string,
    name: string,
    description?: string,
    headUserId?: string,
  ): Promise<DepartmentDto> {
    const dept = await this.prisma.department.create({
      data: {
        organizationId,
        name,
        description: description ?? null,
        headUserId: headUserId ?? null,
      },
    });
    return {
      id: dept.id,
      organizationId: dept.organizationId,
      name: dept.name,
      description: dept.description ?? undefined,
      headUserId: dept.headUserId ?? undefined,
      createdAt: dept.createdAt.toISOString(),
      updatedAt: dept.updatedAt.toISOString(),
    };
  }

  async listDepartments(organizationId: string): Promise<DepartmentDto[]> {
    const depts = await this.prisma.department.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return depts.map((dept) => ({
      id: dept.id,
      organizationId: dept.organizationId,
      name: dept.name,
      description: dept.description ?? undefined,
      headUserId: dept.headUserId ?? undefined,
      createdAt: dept.createdAt.toISOString(),
      updatedAt: dept.updatedAt.toISOString(),
    }));
  }

  async createTeam(
    organizationId: string,
    name: string,
    departmentId?: string,
    description?: string,
    leadUserId?: string,
  ): Promise<TeamDto> {
    const team = await this.prisma.team.create({
      data: {
        organizationId,
        name,
        departmentId: departmentId ?? null,
        description: description ?? null,
        leadUserId: leadUserId ?? null,
      },
    });
    return {
      id: team.id,
      organizationId: team.organizationId,
      departmentId: team.departmentId ?? undefined,
      name: team.name,
      description: team.description ?? undefined,
      leadUserId: team.leadUserId ?? undefined,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }

  async listTeams(organizationId: string): Promise<TeamDto[]> {
    const teams = await this.prisma.team.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
    return teams.map((team) => ({
      id: team.id,
      organizationId: team.organizationId,
      departmentId: team.departmentId ?? undefined,
      name: team.name,
      description: team.description ?? undefined,
      leadUserId: team.leadUserId ?? undefined,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    }));
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: UserRole,
    teamIds?: string[],
    departmentIds?: string[],
    customRoleId?: string,
  ): Promise<OrganizationMemberDto> {
    const member = await this.prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      update: {
        role: role as string,
        customRoleId: customRoleId ?? null,
        teamIds: teamIds ?? [],
        departmentIds: departmentIds ?? [],
        isSuspended: false,
      },
      create: {
        organizationId,
        userId,
        role: role as string,
        customRoleId: customRoleId ?? null,
        teamIds: teamIds ?? [],
        departmentIds: departmentIds ?? [],
        isSuspended: false,
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role as UserRole,
      customRoleId: member.customRoleId ?? undefined,
      teamIds: member.teamIds,
      departmentIds: member.departmentIds,
      joinedAt: member.joinedAt.toISOString(),
      isSuspended: member.isSuspended,
      user: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : undefined,
    };
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: UserRole,
    customRoleId?: string,
  ): Promise<OrganizationMemberDto> {
    const member = await this.prisma.organizationMember.update({
      where: { organizationId_userId: { organizationId, userId } },
      data: {
        role: role as string,
        customRoleId: customRoleId ?? null,
      },
    });
    return {
      id: member.id,
      organizationId: member.organizationId,
      userId: member.userId,
      role: member.role as UserRole,
      customRoleId: member.customRoleId ?? undefined,
      teamIds: member.teamIds,
      departmentIds: member.departmentIds,
      joinedAt: member.joinedAt.toISOString(),
      isSuspended: member.isSuspended,
    };
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await this.prisma.organizationMember.deleteMany({
      where: { organizationId, userId },
    });
  }

  async listMembers(
    organizationId: string,
    params?: { search?: string; role?: string; page?: number; limit?: number },
  ): Promise<{ items: OrganizationMemberDto[]; total: number }> {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationMemberWhereInput = { organizationId };
    if (params?.role) {
      where.role = params.role;
    }

    const [total, rows] = await Promise.all([
      this.prisma.organizationMember.count({ where }),
      this.prisma.organizationMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joinedAt: "desc" },
      }),
    ]);

    const userIds = rows.map((r) => r.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const items: OrganizationMemberDto[] = rows.map((m) => {
      const u = userMap.get(m.userId);
      return {
        id: m.id,
        organizationId: m.organizationId,
        userId: m.userId,
        role: m.role as UserRole,
        customRoleId: m.customRoleId ?? undefined,
        teamIds: m.teamIds,
        departmentIds: m.departmentIds,
        joinedAt: m.joinedAt.toISOString(),
        isSuspended: m.isSuspended,
        user: u
          ? {
              id: u.id,
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
            }
          : undefined,
      };
    });

    return { items, total };
  }

  async findMember(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberDto | null> {
    const m = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!m) return null;
    const u = await this.prisma.user.findUnique({ where: { id: m.userId } });
    return {
      id: m.id,
      organizationId: m.organizationId,
      userId: m.userId,
      role: m.role as UserRole,
      customRoleId: m.customRoleId ?? undefined,
      teamIds: m.teamIds,
      departmentIds: m.departmentIds,
      joinedAt: m.joinedAt.toISOString(),
      isSuspended: m.isSuspended,
      user: u
        ? {
            id: u.id,
            email: u.email,
            firstName: u.firstName,
            lastName: u.lastName,
          }
        : undefined,
    };
  }

  async createInvitation(
    organizationId: string,
    email: string,
    role: UserRole,
    invitedByUserId: string,
    tokenHash: string,
    expiresAt: Date,
    teamIds?: string[],
    departmentIds?: string[],
  ): Promise<OrganizationInvitationDto> {
    const inv = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: email.toLowerCase(),
        role: role as string,
        invitedByUserId,
        tokenHash,
        expiresAt,
        teamIds: teamIds ?? [],
        departmentIds: departmentIds ?? [],
        status: InvitationStatus.PENDING,
      },
    });
    return {
      id: inv.id,
      organizationId: inv.organizationId,
      email: inv.email,
      role: inv.role as UserRole,
      teamIds: inv.teamIds,
      departmentIds: inv.departmentIds,
      invitedByUserId: inv.invitedByUserId,
      status: inv.status as InvitationStatus,
      tokenHash: inv.tokenHash,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
    };
  }

  async listInvitations(
    organizationId: string,
  ): Promise<OrganizationInvitationDto[]> {
    const invs = await this.prisma.organizationInvitation.findMany({
      where: { organizationId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: "desc" },
    });
    return invs.map((inv) => ({
      id: inv.id,
      organizationId: inv.organizationId,
      email: inv.email,
      role: inv.role as UserRole,
      teamIds: inv.teamIds,
      departmentIds: inv.departmentIds,
      invitedByUserId: inv.invitedByUserId,
      status: inv.status as InvitationStatus,
      tokenHash: inv.tokenHash,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
    }));
  }

  async revokeInvitation(organizationId: string, id: string): Promise<void> {
    await this.prisma.organizationInvitation.updateMany({
      where: { id, organizationId },
      data: { status: InvitationStatus.REVOKED },
    });
  }
}
