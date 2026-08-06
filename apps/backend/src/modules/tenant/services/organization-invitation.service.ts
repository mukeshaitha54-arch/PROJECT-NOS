import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import * as crypto from 'crypto';

import { IMailService, IMailServiceToken } from '../../../common/services/mail-service.interface';

export interface CreateInvitationDto {
  organizationId: string;
  email: string;
  role?: string;
  teamIds?: string[];
  departmentIds?: string[];
  invitedByUserId: string;
}

@Injectable()
export class OrganizationInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMailServiceToken) private readonly mailService: IMailService
  ) {}

  async inviteMember(dto: CreateInvitationDto) {
    const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Generate unique secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId: dto.organizationId,
        email: dto.email,
        role: dto.role || 'OPERATOR',
        teamIds: dto.teamIds || [],
        departmentIds: dto.departmentIds || [],
        invitedByUserId: dto.invitedByUserId,
        status: 'PENDING',
        tokenHash,
        expiresAt,
      },
    });

    const inviteUrl = `http://localhost:3000/onboarding/invite?token=${token}`;
    await this.mailService.sendInvitationEmail(dto.email, org.name, inviteUrl);

    return {
      invitationId: invitation.id,
      token, // Return token so the caller (or tests) can simulate the link
    };
  }

  async acceptInvitation(token: string, userId: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation is already ${invitation.status.toLowerCase()}`);
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this organization');
    }

    // Add user as member and update invitation
    const member = await this.prisma.$transaction(async (tx) => {
      const newMember = await tx.organizationMember.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
          teamIds: invitation.teamIds,
          departmentIds: invitation.departmentIds,
        },
      });

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      return newMember;
    });

    return member;
  }
}
