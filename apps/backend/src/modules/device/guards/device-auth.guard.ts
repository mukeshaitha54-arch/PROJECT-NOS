import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { IDeviceAuthenticatorToken, IDeviceAuthenticator } from '../../../common/services/device-authenticator.interface';
import { IDeviceRepositoryToken, IDeviceRepository } from '../../../common/repositories/device.repository.interface';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    @Inject(IDeviceAuthenticatorToken) private readonly authenticator: IDeviceAuthenticator,
    @Inject(IDeviceRepositoryToken) private readonly deviceRepository: IDeviceRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    const device = await this.authenticator.authenticate(headers, this.deviceRepository);

    if (!device) {
      throw new UnauthorizedException('Invalid or missing Device Authentication Token. Please register agent or provide X-Device-Token header.');
    }

    request.device = device;
    return true;
  }
}
