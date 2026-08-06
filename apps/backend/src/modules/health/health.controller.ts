import { Controller, Get, Res, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { PrismaService } from '../../database/prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

declare global {
  var isShuttingDown: boolean;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Basic connectivity check' })
  check() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe (Database connectivity)' })
  async checkReady(@Res() res: any) {
    try {
      const result = await this.health.check([
        () => this.prismaHealth.pingCheck('database', this.prisma),
      ]);
      return res.status(HttpStatus.OK).send(result);
    } catch (error: any) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        status: 'error',
        info: { database: { status: 'down' } },
        error: 'Database not reachable',
        details: error.response?.details || error.message,
      });
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe (Process health)' })
  checkLive(@Res() res: any) {
    if (global.isShuttingDown) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ status: 'shutting_down' });
    }
    return res.status(HttpStatus.OK).send({ status: 'up' });
  }
}
