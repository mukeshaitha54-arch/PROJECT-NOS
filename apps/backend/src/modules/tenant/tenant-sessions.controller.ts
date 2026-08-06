import { Controller, Get, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@nos/shared-types';
import { TenantSessionsService } from './tenant-sessions.service';

@ApiTags('Tenant - Session Management')
@Controller('tenant/sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class TenantSessionsController {
  constructor(private readonly sessionsService: TenantSessionsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve active user sessions across the tenant (Admin only)' })
  async getActiveSessions() {
    return this.sessionsService.getActiveSessions();
  }
}
