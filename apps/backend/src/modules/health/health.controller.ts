import { Controller, Get, Req, Headers } from '@nestjs/common';
import { ApiOperation, ApiResponse as SwaggerResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { FastifyRequest } from 'fastify';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Inspect overall backend service health and database liveliness' })
  @SwaggerResponse({ status: 200, description: 'Service health diagnostic telemetry returns successfully.' })
  async checkHealth(
    @Req() req: FastifyRequest,
    @Headers('x-request-id') headerId?: string,
  ) {
    const requestId = headerId || (req.headers['x-request-id'] as string) || 'unknown';
    return this.healthService.getSystemStatus(requestId);
  }
}
