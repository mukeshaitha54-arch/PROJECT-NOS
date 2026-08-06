import { RegistrationKey } from '@prisma/client';

export const IRegistrationKeyRepository = Symbol('IRegistrationKeyRepository');

export interface IRegistrationKeyRepository {
  create(data: Omit<RegistrationKey, 'id' | 'createdAt'>): Promise<RegistrationKey>;
  findById(id: string): Promise<RegistrationKey | null>;
  findByHash(keyHash: string): Promise<RegistrationKey | null>;
  findByOrganizationId(organizationId: string): Promise<RegistrationKey[]>;
  update(id: string, data: Partial<RegistrationKey>): Promise<RegistrationKey>;
  incrementUsage(id: string, deviceId: string, ipAddress?: string): Promise<void>;
  recordFailedAttempt(id: string): Promise<void>;
}
