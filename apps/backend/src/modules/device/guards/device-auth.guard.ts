import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import {
  IDeviceAuthenticatorToken,
  IDeviceAuthenticator,
} from "../../../common/services/device-authenticator.interface";
import {
  IDeviceRepositoryToken,
  IDeviceRepository,
} from "../../../common/repositories/device.repository.interface";
import { decommissionedDevicesStore } from "../../../common/stores/device-decommissioned.store";

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    @Inject(IDeviceAuthenticatorToken)
    private readonly authenticator: IDeviceAuthenticator,
    @Inject(IDeviceRepositoryToken)
    private readonly deviceRepository: IDeviceRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const headers = request.headers;

    // Fast check: Is this device or token in the decommissioned set?
    const deviceIdHeader =
      headers["x-device-id"] ||
      headers["X-Device-Id"] ||
      request.body?.deviceId;
    const rawToken =
      headers["x-device-token"] ||
      headers["X-Device-Token"] ||
      headers["authorization"] ||
      headers["Authorization"];

    if (
      (deviceIdHeader &&
        decommissionedDevicesStore.has(String(deviceIdHeader).trim())) ||
      (rawToken &&
        decommissionedDevicesStore.has(
          String(rawToken)
            .replace(/^Bearer\s+/i, "")
            .trim(),
        ))
    ) {
      throw new HttpException(
        {
          statusCode: 410,
          decommissioned: true,
          message:
            "Device has been permanently removed by administrator. Terminate agent.",
        },
        HttpStatus.GONE,
      );
    }

    const device = await this.authenticator.authenticate(
      headers,
      this.deviceRepository,
    );

    if (!device) {
      // Re-check with resolved device id if device was deleted while running
      if (
        deviceIdHeader &&
        decommissionedDevicesStore.has(String(deviceIdHeader).trim())
      ) {
        throw new HttpException(
          {
            statusCode: 410,
            decommissioned: true,
            message:
              "Device has been permanently removed by administrator. Terminate agent.",
          },
          HttpStatus.GONE,
        );
      }

      throw new UnauthorizedException(
        "Invalid or missing Device Authentication Token. Please register agent or provide X-Device-Token header.",
      );
    }

    if (decommissionedDevicesStore.has(device.id)) {
      throw new HttpException(
        {
          statusCode: 410,
          decommissioned: true,
          message:
            "Device has been permanently removed by administrator. Terminate agent.",
        },
        HttpStatus.GONE,
      );
    }

    request.device = device;
    return true;
  }
}
