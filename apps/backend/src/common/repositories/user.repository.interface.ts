import { User, UserRole } from '@nos/shared-types';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  isEmailVerified?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  passwordHash?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
}

export interface IUserRepository {
  findById(id: string): Promise<(User & { passwordHash: string }) | null>;
  findByEmail(email: string): Promise<(User & { passwordHash: string }) | null>;
  search(query: string, organizationId: string): Promise<any[]>;
  create(data: CreateUserData): Promise<User & { passwordHash: string }>;
  update(id: string, data: UpdateUserData): Promise<User & { passwordHash: string }>;
  delete(id: string): Promise<boolean>;
}

export const IUserRepositoryToken = Symbol('IUserRepository');
