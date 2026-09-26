import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { StructuredLoggerService } from '../observability/structured-logger.service';

export interface BlockedIpRecord {
  ip: string;
  reason: string;
  blockedAt: string;
  expiresAt?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  total: number;
}

@Injectable()
export class IpFirewallService implements OnModuleInit {
  private readonly logger = new Logger(IpFirewallService.name);

  // In-memory fallback sets for local/standalone resilience
  private localBlacklist = new Map<string, BlockedIpRecord>();
  private localRateLimitMap = new Map<string, { count: number; expiresAt: number }>();

  // Redis Keys
  private readonly blacklistSetKey = 'saas:firewall:blacklist:set';
  private readonly blacklistMetaPrefix = 'saas:firewall:blacklist:meta:';
  private readonly suspiciousCounterPrefix = 'saas:firewall:suspicious:';
  private readonly rateLimitPrefix = 'saas:ratelimit:';

  private readonly suspiciousThreshold = 60; // 60 suspicious hits within 60 seconds auto-bans
  private readonly autoBanDurationSeconds = 3600; // 1 hour auto-ban

  constructor(
    private readonly redisService: RedisService,
    private readonly structuredLogger: StructuredLoggerService,
  ) {}

  onModuleInit() {
    this.logger.log('IpFirewallService initialized with Redis distributed backing and local fallback.');
  }

  /**
   * Check whether an IP address is currently blacklisted.
   */
  async isIpBlocked(ip: string): Promise<boolean> {
    const normalizedIp = this.normalizeIp(ip);

    if (this.redisService.isAvailable()) {
      try {
        const client = this.redisService.getClient();
        const isMember = await client?.sismember(this.blacklistSetKey, normalizedIp);
        return isMember === 1;
      } catch (err: any) {
        this.logger.warn(`Redis blacklist check error: ${err.message}. Falling back to memory set.`);
      }
    }

    const localRecord = this.localBlacklist.get(normalizedIp);
    if (!localRecord) return false;

    if (localRecord.expiresAt && new Date(localRecord.expiresAt).getTime() <= Date.now()) {
      this.localBlacklist.delete(normalizedIp);
      return false;
    }

    return true;
  }

  /**
   * Add an IP address to the blacklist.
   */
  async blockIp(ip: string, reason: string, ttlSeconds: number = this.autoBanDurationSeconds): Promise<void> {
    const normalizedIp = this.normalizeIp(ip);
    const now = new Date();
    const expiresAt = ttlSeconds > 0 ? new Date(now.getTime() + ttlSeconds * 1000).toISOString() : undefined;

    const record: BlockedIpRecord = {
      ip: normalizedIp,
      reason,
      blockedAt: now.toISOString(),
      expiresAt,
    };

    // Store in local memory map
    this.localBlacklist.set(normalizedIp, record);

    if (this.redisService.isAvailable()) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          await client.sadd(this.blacklistSetKey, normalizedIp);
          const metaKey = `${this.blacklistMetaPrefix}${normalizedIp}`;
          if (ttlSeconds > 0) {
            await client.set(metaKey, JSON.stringify(record), 'EX', ttlSeconds);
          } else {
            await client.set(metaKey, JSON.stringify(record));
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to persist IP block in Redis: ${err.message}`);
      }
    }

    this.structuredLogger.warn(`[Firewall] Blocked IP: ${normalizedIp} | Reason: ${reason} | Duration: ${ttlSeconds}s`);
  }

  /**
   * Remove an IP address from the blacklist.
   */
  async unblockIp(ip: string): Promise<void> {
    const normalizedIp = this.normalizeIp(ip);
    this.localBlacklist.delete(normalizedIp);

    if (this.redisService.isAvailable()) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          await client.srem(this.blacklistSetKey, normalizedIp);
          await client.del(`${this.blacklistMetaPrefix}${normalizedIp}`);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to remove IP block from Redis: ${err.message}`);
      }
    }

    this.structuredLogger.log(`[Firewall] Unblocked IP: ${normalizedIp}`);
  }

  /**
   * List all currently active blocked IP records.
   */
  async listBlockedIps(): Promise<BlockedIpRecord[]> {
    if (this.redisService.isAvailable()) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          const ips = await client.smembers(this.blacklistSetKey);
          const records: BlockedIpRecord[] = [];
          for (const ip of ips) {
            const raw = await client.get(`${this.blacklistMetaPrefix}${ip}`);
            if (raw) {
              try {
                records.push(JSON.parse(raw));
              } catch {
                records.push({ ip, reason: 'Manual block', blockedAt: new Date().toISOString() });
              }
            } else {
              records.push({ ip, reason: 'Distributed policy block', blockedAt: new Date().toISOString() });
            }
          }
          return records;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to fetch blocked IPs from Redis: ${err.message}`);
      }
    }

    const activeRecords: BlockedIpRecord[] = [];
    const now = Date.now();
    for (const [ip, record] of this.localBlacklist.entries()) {
      if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) {
        this.localBlacklist.delete(ip);
      } else {
        activeRecords.push(record);
      }
    }
    return activeRecords;
  }

  /**
   * Sliding window distributed rate limiting.
   */
  async checkRateLimit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const key = `${this.rateLimitPrefix}${identifier}`;
    const now = Date.now();
    const resetTime = Math.ceil((now + windowSeconds * 1000) / 1000);

    if (this.redisService.isAvailable()) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          const currentCount = await client.incr(key);
          if (currentCount === 1) {
            await client.expire(key, windowSeconds);
          }
          const ttl = await client.ttl(key);
          const remaining = Math.max(0, limit - currentCount);

          return {
            allowed: currentCount <= limit,
            limit,
            remaining,
            resetTime: Math.ceil(now / 1000) + Math.max(1, ttl),
            total: currentCount,
          };
        }
      } catch (err: any) {
        this.logger.warn(`Redis rate limit error: ${err.message}. Using memory limiter fallback.`);
      }
    }

    // In-memory rate limiting fallback
    const entry = this.localRateLimitMap.get(key);
    if (!entry || entry.expiresAt <= now) {
      this.localRateLimitMap.set(key, {
        count: 1,
        expiresAt: now + windowSeconds * 1000,
      });
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetTime,
        total: 1,
      };
    }

    entry.count += 1;
    const remaining = Math.max(0, limit - entry.count);
    return {
      allowed: entry.count <= limit,
      limit,
      remaining,
      resetTime: Math.ceil(entry.expiresAt / 1000),
      total: entry.count,
    };
  }

  /**
   * Track suspicious activities (e.g. repeated 401s, 403s, scanner probes, malformed payloads).
   * Automatically blacklists IP if threshold is breached within 60s.
   */
  async recordSuspiciousHit(ip: string, reason: string = 'Automated anomaly threshold exceeded'): Promise<{ autoBanned: boolean }> {
    const normalizedIp = this.normalizeIp(ip);
    const key = `${this.suspiciousCounterPrefix}${normalizedIp}`;

    let hitCount = 1;
    if (this.redisService.isAvailable()) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          hitCount = await client.incr(key);
          if (hitCount === 1) {
            await client.expire(key, 60);
          }
        }
      } catch {
        hitCount = 1;
      }
    }

    if (hitCount >= this.suspiciousThreshold) {
      await this.blockIp(normalizedIp, reason, this.autoBanDurationSeconds);
      return { autoBanned: true };
    }

    return { autoBanned: false };
  }

  private normalizeIp(rawIp: string): string {
    if (!rawIp) return '127.0.0.1';
    let ip = rawIp.trim();
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    return ip;
  }
}
