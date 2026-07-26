import { Controller, Post, Get, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Device } from '@prisma/client';
import { DeviceService } from './device.service';
import { RegisterDeviceDto, HeartbeatDto } from './dto/device.dto';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { CurrentDevice } from './decorators/current-device.decorator';

@ApiTags('Device Onboarding & Heartbeat (Phase 2A)')
@Controller('api/v1/device')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new monitoring agent', description: 'Provisions unique device hardware identity and returns registration token.' })
  @ApiResponse({ status: 201, description: 'Device registered successfully; returns deviceId and registrationToken.' })
  @ApiResponse({ status: 400, description: 'Invalid device payload parameters.' })
  async register(@Body() dto: RegisterDeviceDto) {
    const data = await this.deviceService.register(dto);
    return {
      success: true,
      message: 'Monitoring agent successfully registered with NOS Zero-Trust control plane.',
      data,
    };
  }

  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(DeviceAuthGuard)
  @ApiOperation({ summary: 'Agent diagnostic heartbeat ingestion (Every 30 seconds)', description: 'Records basic CPU/RAM operational health and refreshes Last Seen timer.' })
  @ApiHeader({ name: 'X-Device-Token', required: true, description: 'Cryptographic agent registration credentials' })
  @ApiResponse({ status: 200, description: 'Heartbeat ingested and device status marked ONLINE.' })
  @ApiResponse({ status: 401, description: 'Missing or unrecognized device authentication token.' })
  async heartbeat(@CurrentDevice() device: Device, @Body() dto: HeartbeatDto) {
    const data = await this.deviceService.recordHeartbeat(device, dto);
    return {
      success: true,
      message: 'Heartbeat recorded.',
      data,
    };
  }

  @Get('me')
  @UseGuards(DeviceAuthGuard)
  @ApiOperation({ summary: 'Retrieve authenticated device profile', description: 'Returns current registered device details and latest recorded heartbeat.' })
  @ApiHeader({ name: 'X-Device-Token', required: true, description: 'Cryptographic agent registration credentials' })
  @ApiResponse({ status: 200, description: 'Device identity profile returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized agent session.' })
  async getMe(@CurrentDevice() device: Device) {
    const data = await this.deviceService.getDeviceProfile(device);
    return {
      success: true,
      data,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Retrieve real-time platform device status and heartbeat roster', description: 'Returns complete inventory of registered agents, online/offline counts, and diagnostic metrics for operators and management tools.' })
  @ApiResponse({ status: 200, description: 'Platform heartbeat status retrieved successfully.' })
  async getStatus() {
    const data = await this.deviceService.getPlatformStatus();
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve specific registered machine profile by primary DB ID or UUID', description: 'Returns complete hardware profile and latest diagnostic heartbeat sample for target device.' })
  @ApiResponse({ status: 200, description: 'Device profile and heartbeat retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Device not found in registry.' })
  async getDeviceById(@Param('id') id: string) {
    const data = await this.deviceService.getDeviceById(id);
    return {
      success: true,
      data,
    };
  }
}

