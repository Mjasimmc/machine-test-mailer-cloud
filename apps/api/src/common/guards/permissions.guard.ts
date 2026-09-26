import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Role, Permission } from '@saas/shared';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Authentication context required for permission verification',
        code: 'AUTH_REQUIRED',
      });
    }

    // Platform administrators possess universal system permissions
    if (user.role === Role.ADMIN) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];
    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAll) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: `Missing required permissions: ${requiredPermissions.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    return true;
  }
}
