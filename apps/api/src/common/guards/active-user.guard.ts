import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserStatus } from '@saas/shared';

@Injectable()
export class ActiveUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Your account has been suspended. Access to this resource is denied.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    return true;
  }
}
