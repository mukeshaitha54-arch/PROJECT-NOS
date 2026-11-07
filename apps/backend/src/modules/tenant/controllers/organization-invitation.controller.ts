import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { OrganizationInvitationService } from "../services/organization-invitation.service";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";

@Controller("tenant/invitations")
export class OrganizationInvitationController {
  constructor(
    private readonly invitationService: OrganizationInvitationService,
  ) {}

  @Get("preview")
  async preview(@Query("token") token: string) {
    const data = await this.invitationService.previewInvitation(token);
    return {
      success: true,
      data,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@CurrentUser() user: any) {
    const orgId = user?.organizationId || "default-org";
    const data = await this.invitationService.listInvitations(orgId);
    return {
      success: true,
      data,
    };
  }

  @Post("invite")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async invite(
    @Body("organizationId") organizationId: string,
    @Body("email") email: string,
    @Body("role") role?: string,
    @Body("teamIds") teamIds?: string[],
    @Body("departmentIds") departmentIds?: string[],
    @CurrentUser() user?: any,
  ) {
    const targetOrgId = organizationId || user?.organizationId || "default-org";
    const result = await this.invitationService.inviteMember({
      organizationId: targetOrgId,
      email,
      role,
      teamIds,
      departmentIds,
      invitedByUserId: user.id,
    });

    return {
      success: true,
      message: "Invitation sent successfully.",
      data: result,
    };
  }

  @Post("accept")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async accept(@Body("token") token: string, @CurrentUser() user?: any) {
    const member = await this.invitationService.acceptInvitation(
      token,
      user.id,
    );

    return {
      success: true,
      message:
        "Invitation accepted successfully. You are now a member of the organization.",
      data: member,
    };
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async revoke(@Param("id") id: string, @CurrentUser() user: any) {
    const orgId = user?.organizationId || "default-org";
    await this.invitationService.revokeInvitation(id, orgId);
    return {
      success: true,
      message: "Invitation revoked successfully.",
    };
  }
}
