import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { User, UserRole, ErrorCode } from "@nos/shared-types";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user }: { user: User } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException({
        code: ErrorCode.UNAUTHORIZED,
        message: "User context missing.",
      });
    }

    // SUPER_ADMIN overrides all restrictions globally
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantRole = request.tenantContext?.role;

    // Check if the user has the required role globally OR in the current tenant context
    const hasRole =
      requiredRoles.includes(user.role) ||
      (tenantRole && requiredRoles.includes(tenantRole as UserRole));

    if (!hasRole) {
      throw new ForbiddenException({
        code: ErrorCode.INSUFFICIENT_PERMISSIONS,
        message: `Required role(s): [${requiredRoles.join(", ")}]. Current role: [${user.role}].`,
      });
    }
    return true;
  }
}
