import { Controller, Get, UseGuards, HttpStatus } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse as SwaggerResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { User, UserRole, ApiResponse } from "@nos/shared-types";

@ApiTags("Users & Identity Management")
@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  @Get("me")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.OPERATOR,
    UserRole.ANALYST,
    UserRole.VIEWER,
    UserRole.USER,
  )
  @ApiOperation({
    summary: "Retrieve profile information for currently authenticated user",
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: "Current authenticated user profile data.",
  })
  async getProfile(@CurrentUser() user: User): Promise<ApiResponse<User>> {
    return {
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("admin/ping")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({
    summary: "Test endpoint verifying RBAC Administrative privilege access",
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: "Confirmed Administrative RBAC permissions.",
  })
  async adminPing(@CurrentUser() user: User): Promise<ApiResponse> {
    return {
      success: true,
      data: {
        message: "RBAC verified: Administrative access granted.",
        userId: user.id,
        role: user.role,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
