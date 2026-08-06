import { SetMetadata } from '@nestjs/common';
import { PermissionFlag } from '@nos/shared-types';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionFlag[]) => SetMetadata(PERMISSIONS_KEY, permissions);
