import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Device } from '@prisma/client';
import { IDeviceAuthenticator, DeviceCredentials } from './device-authenticator.interface';
import { IDeviceRepository } from '../repositories/device.repository.interface';

@Injectable()
export class TokenDeviceAuthenticatorService implements IDeviceAuthenticator {
  private readonly logger = new Logger(TokenDeviceAuthenticatorService.name);

  async generateCredentials(uuid: string): Promise<DeviceCredentials> {
    const rawToken = `nos_agent_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = this.computeHash(rawToken);
    return { rawToken, tokenHash };
  }

  async authenticate(headers: Record<string, string | string[] | undefined>, repository: IDeviceRepository): Promise<Device | null> {
    let token: string | undefined;

    const authHeader = headers['authorization'] || headers['Authorization'];
    const deviceTokenHeader = headers['x-device-token'] || headers['X-Device-Token'];

    if (typeof deviceTokenHeader === 'string' && deviceTokenHeader.trim().length > 0) {
      token = deviceTokenHeader.trim();
    } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      this.logger.debug('No valid Device Token or Authorization header present on incoming heartbeat request.');
      return null;
    }

    const hash = this.computeHash(token);
    const device = await repository.findByTokenHash(hash);

    if (!device) {
      this.logger.warn(`Unrecognized device token presented during authentication verification.`);
      return null;
    }

    return device;
  }

  private computeHash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
