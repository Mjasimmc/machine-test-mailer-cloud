import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshToken, RefreshTokenDocument } from '../identity/schemas/refresh-token.schema';
import { AuditService } from '../infrastructure/audit/audit.service';
import { AuthResponse, Role, UserDto, UserStatus, ChangePasswordDto } from '@saas/shared';

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async register(dto: RegisterDto, meta: RequestMetadata = {}): Promise<AuthResponse> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      await this.auditService.log({
        action: 'auth:register_duplicate',
        actorEmail: dto.email,
        tenantId: 'system',
        resource: 'user',
        result: 'FAILURE',
        correlationId: meta.correlationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        details: { email: dto.email },
      });
      throw new ConflictException('Email address is already in use');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: Role.USER,
      status: UserStatus.ACTIVE,
    });

    const userDto = this.formatUserDto(user);
    const tokens = await this.issueTokenPair(user);

    await this.auditService.log({
      action: 'auth:register',
      actorId: userDto.id,
      actorEmail: userDto.email,
      tenantId: userDto.tenantId || userDto.id,
      resource: 'user',
      resourceId: userDto.id,
      result: 'SUCCESS',
      correlationId: meta.correlationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userDto,
    };
  }

  async login(dto: LoginDto, meta: RequestMetadata = {}): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      await this.auditService.log({
        action: 'auth:failed_login',
        actorEmail: dto.email,
        tenantId: 'system',
        resource: 'user',
        result: 'FAILURE',
        correlationId: meta.correlationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        details: { reason: 'User not found' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.auditService.log({
        action: 'auth:failed_login',
        actorId: user._id.toString(),
        actorEmail: user.email,
        tenantId: user.tenantId || user._id.toString(),
        resource: 'user',
        resourceId: user._id.toString(),
        result: 'FAILURE',
        correlationId: meta.correlationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        details: { reason: 'Password mismatch' },
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status === UserStatus.SUSPENDED) {
      await this.auditService.log({
        action: 'auth:login_suspended',
        actorId: user._id.toString(),
        actorEmail: user.email,
        tenantId: user.tenantId || user._id.toString(),
        resource: 'user',
        resourceId: user._id.toString(),
        result: 'FAILURE',
        correlationId: meta.correlationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Your account has been suspended. Please contact an administrator.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    const userDto = this.formatUserDto(user);
    const tokens = await this.issueTokenPair(user);

    await this.auditService.log({
      action: 'auth:login',
      actorId: userDto.id,
      actorEmail: userDto.email,
      tenantId: userDto.tenantId || userDto.id,
      resource: 'user',
      resourceId: userDto.id,
      result: 'SUCCESS',
      correlationId: meta.correlationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userDto,
    };
  }

  async refreshToken(rawToken: string, meta: RequestMetadata = {}): Promise<{ accessToken: string; refreshToken: string }> {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token required');
    }

    const tokenHash = this.hashToken(rawToken);
    const now = new Date();

    // Atomic consumption: find and revoke in a single atomic database operation
    const consumedToken = await this.refreshTokenModel.findOneAndUpdate(
      {
        tokenHash,
        isRevoked: false,
        expiresAt: { $gt: now },
      },
      {
        $set: { isRevoked: true },
      },
      { new: false },
    ).exec();

    if (!consumedToken) {
      // Check if this token was already revoked (Reuse Detection!)
      const revokedToken = await this.refreshTokenModel.findOne({ tokenHash, isRevoked: true }).exec();
      if (revokedToken) {
        // Security Incident: A revoked token is being re-used. Revoke the entire token family!
        await this.refreshTokenModel.updateMany(
          { family: revokedToken.family },
          { isRevoked: true },
        ).exec();

        await this.auditService.log({
          action: 'auth:refresh_token_reuse_detected',
          actorId: revokedToken.userId,
          tenantId: revokedToken.tenantId,
          resource: 'refresh_token',
          resourceId: revokedToken._id.toString(),
          result: 'FAILURE',
          correlationId: meta.correlationId,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          details: { family: revokedToken.family },
        });

        throw new UnauthorizedException('Security alert: Refresh token reuse detected. All sessions in family revoked.');
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check user active status
    const user = await this.usersService.findById(consumedToken.userId);
    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('User account inactive or suspended');
    }

    // Issue rotated token pair maintaining family identity
    const newTokens = await this.issueTokenPair(user, consumedToken.family);

    await this.auditService.log({
      action: 'auth:token_refreshed',
      actorId: user._id.toString(),
      actorEmail: user.email,
      tenantId: user.tenantId || user._id.toString(),
      resource: 'token',
      result: 'SUCCESS',
      correlationId: meta.correlationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return newTokens;
  }

  async logout(rawToken?: string, userId?: string, meta: RequestMetadata = {}): Promise<{ message: string }> {
    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.refreshTokenModel.updateOne({ tokenHash }, { isRevoked: true }).exec();
    }

    if (userId) {
      await this.auditService.log({
        action: 'auth:logout',
        actorId: userId,
        tenantId: userId,
        resource: 'session',
        result: 'SUCCESS',
        correlationId: meta.correlationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string, tenantId: string, meta: RequestMetadata = {}): Promise<{ message: string }> {
    // Revoke all refresh tokens for this user
    await this.refreshTokenModel.updateMany({ userId }, { isRevoked: true }).exec();

    // Increment user tokenVersion to immediately invalidate all in-flight access tokens
    await this.usersService.incrementTokenVersion(userId);

    await this.auditService.log({
      action: 'auth:logout_all_sessions',
      actorId: userId,
      tenantId,
      resource: 'session',
      result: 'SUCCESS',
      correlationId: meta.correlationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { message: 'All active sessions have been terminated successfully' };
  }

  async changePassword(userId: string, tenantId: string, dto: ChangePasswordDto, meta: RequestMetadata = {}): Promise<{ message: string }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      await this.auditService.log({
        action: 'auth:change_password_failed',
        actorId: userId,
        actorEmail: user.email,
        tenantId,
        resource: 'user',
        resourceId: userId,
        result: 'FAILURE',
        correlationId: meta.correlationId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      throw new BadRequestException('Current password does not match');
    }

    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const saltRounds = 10;
    const newHash = await bcrypt.hash(dto.newPassword, saltRounds);

    await this.usersService.updatePassword(userId, newHash);
    // Revoke all refresh tokens
    await this.refreshTokenModel.updateMany({ userId }, { isRevoked: true }).exec();

    await this.auditService.log({
      action: 'auth:change_password',
      actorId: userId,
      actorEmail: user.email,
      tenantId,
      resource: 'user',
      resourceId: userId,
      result: 'SUCCESS',
      correlationId: meta.correlationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { message: 'Password updated successfully. All other sessions have been logged out.' };
  }

  private async issueTokenPair(user: any, family?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tenantId = user.tenantId || user._id.toString();
    const tokenVersion = user.tokenVersion || 1;

    const accessPayload = {
      sub: user._id.toString(),
      tokenVersion,
    };

    const accessToken = this.jwtService.sign(accessPayload);

    // Refresh Token Rotation Architecture
    const tokenFamily = family || `fam_${randomBytes(16).toString('hex')}`;
    const rawRefreshToken = `rt_${randomBytes(32).toString('hex')}`;
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenModel.create({
      userId: user._id.toString(),
      tenantId,
      tokenHash,
      family: tokenFamily,
      isRevoked: false,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private formatUserDto(user: any): UserDto {
    return {
      id: user._id ? user._id.toString() : user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId || (user._id ? user._id.toString() : user.id),
      permissions: user.permissions || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
