import { Controller, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { OrganizationInvitationService } from '../services/organization-invitation.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('tenant/invitations')
@UseGuards(JwtAuthGuard)
export class OrganizationInvitationController {
  constructor(private readonly invitationService: OrganizationInvitationService) {}

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @Body('organizationId') organizationId: string,
    @Body('email') email: string,
    @Body('role') role?: string,
    @Body('teamIds') teamIds?: string[],
    @Body('departmentIds') departmentIds?: string[],
    @CurrentUser() user?: any,
  ) {
    const result = await this.invitationService.inviteMember({
      organizationId,
      email,
      role,
      teamIds,
      departmentIds,
      invitedByUserId: user.id,
    });

    return {
      success: true,
      message: 'Invitation sent successfully.',
      data: result,
    };
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Body('token') token: string,
    @CurrentUser() user?: any,
  ) {
    const member = await this.invitationService.acceptInvitation(token, user.id);

    return {
      success: true,
      message: 'Invitation accepted successfully. You are now a member of the organization.',
      data: member,
    };
  }
}
