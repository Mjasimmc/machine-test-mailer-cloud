import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IpFirewallService } from './ip-firewall.service';
import { StructuredLoggerService } from '../observability/structured-logger.service';

@Injectable()
export class IpFirewallMiddleware implements NestMiddleware {
  private readonly defaultGlobalLimit = 600; // 600 requests / 60 seconds per IP
  private readonly windowSeconds = 60;

  constructor(
    private readonly firewallService: IpFirewallService,
    private readonly logger: StructuredLoggerService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const clientIp = this.extractClientIp(req);
    const correlationId = (req as any).correlationId || `req_${Date.now()}`;
    const url = req.originalUrl || req.url;

    // 1. IP Blacklist check
    const isBlocked = await this.firewallService.isIpBlocked(clientIp);
    if (isBlocked) {
      this.logger.warn(`[Firewall Block] Denied request from blocked IP: ${clientIp} to ${url}`);
      return res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'Access denied: your IP address is restricted by platform security policy.',
        correlationId,
      });
    }

    // Bypass rate limiting for internal orchestrator health probes
    if (url.startsWith('/health') || url.startsWith('/api/health')) {
      return next();
    }

    // 2. Distributed Rate Limiting check per IP
    const rateLimit = await this.firewallService.checkRateLimit(
      `ip:${clientIp}`,
      this.defaultGlobalLimit,
      this.windowSeconds,
    );

    res.setHeader('X-RateLimit-Limit', rateLimit.limit.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimit.resetTime.toString());

    if (!rateLimit.allowed) {
      this.logger.warn(`[Rate Limit Exceeded] IP: ${clientIp} exceeded ${this.defaultGlobalLimit} req/${this.windowSeconds}s`);
      
      // Record suspicious burst hit
      await this.firewallService.recordSuspiciousHit(clientIp, 'Exceeded maximum request rate limit threshold');

      return res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please retry after the cooldown period.',
        retryAfter: Math.max(1, rateLimit.resetTime - Math.ceil(Date.now() / 1000)),
        correlationId,
      });
    }

    next();
  }

  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
      if (ips.length > 0) {
        return ips[0].trim();
      }
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
      return realIp.trim();
    }
    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }
}
