import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SecretsService } from '../../infrastructure/vault/secrets.service';
import { UsersService } from '../../users/users.service';
import { Role } from '@saas/shared';
import { DEFAULT_ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS } from '../../users/schemas/user.schema';

export interface JwtPayload {
  sub: string;
  tokenVersion?: number;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly secretsService: SecretsService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secretsService.getJwtSecret(),
      algorithms: ['HS256'], // Explicit algorithm restriction (blocks 'none' and mismatched cipher attacks)
      issuer: 'saas-platform',
      audience: 'saas-api',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Immediate session revocation check via tokenVersion
    if (payload.tokenVersion && user.tokenVersion && payload.tokenVersion < user.tokenVersion) {
      throw new UnauthorizedException('Session has been revoked or password was changed. Please re-authenticate.');
    }

    const tenantId = user.tenantId || user._id.toString();
    const permissions =
      user.permissions && user.permissions.length > 0
        ? user.permissions
        : user.role === Role.ADMIN
          ? DEFAULT_ADMIN_PERMISSIONS
          : DEFAULT_USER_PERMISSIONS;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId,
      permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
