import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponse } from '@saas/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveUserGuard } from '../common/guards/active-user.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, rawToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', rawToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/auth',
    });
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.register(dto, this.extractMeta(req));
    if (result.refreshToken) {
      this.setRefreshCookie(res, result.refreshToken);
    }
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const result = await this.authService.login(dto, this.extractMeta(req));
    if (result.refreshToken) {
      this.setRefreshCookie(res, result.refreshToken);
    }
    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const rawToken = req.cookies?.refreshToken || dto?.refreshToken;
    try {
      const result = await this.authService.refreshToken(rawToken, this.extractMeta(req));
      this.setRefreshCookie(res, result.refreshToken);
      return { accessToken: result.accessToken };
    } catch (err) {
      this.clearRefreshCookie(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: Partial<RefreshTokenDto>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const rawToken = req.cookies?.refreshToken || dto?.refreshToken;
    const user = (req as any).user;
    this.clearRefreshCookie(res);
    return this.authService.logout(rawToken, user?.id, this.extractMeta(req));
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  async logoutAll(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    this.clearRefreshCookie(res);
    return this.authService.logoutAll(userId, tenantId, this.extractMeta(req));
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  async changePassword(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    this.clearRefreshCookie(res);
    return this.authService.changePassword(userId, tenantId, dto, this.extractMeta(req));
  }

  private extractMeta(req: Request) {
    return {
      ipAddress: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'] as string,
      correlationId: (req as any).correlationId,
    };
  }
}
