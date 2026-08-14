import {
  Controller,
  Get,
  Req,
  Headers,
  UseGuards,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { RealtimeService } from "./realtime.service";
import { FastifyRequest } from "fastify";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole, ApiResponse, SocketHealthResponse } from "@nos/shared-types";

@ApiTags("Realtime Socket Gateway")
@Controller("socket")
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  @Get("health")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.OPERATOR,
    UserRole.ANALYST,
    UserRole.VIEWER,
    UserRole.USER,
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Inspect Realtime Socket.IO Gateway health, connection metrics, memory, and dropped events",
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: "Socket gateway diagnostics returned successfully.",
  })
  async getHealth(
    @Req() req: FastifyRequest,
    @Headers("x-request-id") headerId?: string,
  ): Promise<ApiResponse<SocketHealthResponse>> {
    const requestId =
      headerId ||
      (req.headers["x-request-id"] as string) ||
      (req.headers["x-correlation-id"] as string) ||
      "unknown";
    return this.realtimeService.getSocketHealth(requestId);
  }
}
