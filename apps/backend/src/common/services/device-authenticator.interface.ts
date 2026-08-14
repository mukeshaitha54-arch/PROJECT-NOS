import { Device } from "@prisma/client";
import { IDeviceRepository } from "../repositories/device.repository.interface";

export const IDeviceAuthenticatorToken = Symbol("IDeviceAuthenticator");

export interface DeviceCredentials {
  rawToken: string;
  tokenHash: string;
}

/**
 * Abstract interface for validating device authentication.
 * Currently implemented via Token Hash checking (Phase 2A),
 * architected for future seamless swap to Signed HMAC verification.
 */
export interface IDeviceAuthenticator {
  generateCredentials(uuid: string): Promise<DeviceCredentials>;
  authenticate(
    headers: Record<string, string | string[] | undefined>,
    repository: IDeviceRepository,
  ): Promise<Device | null>;
}
