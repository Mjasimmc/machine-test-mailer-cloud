import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { SecretsService } from '../vault/secrets.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private memoryStore = new Map<string, { value: string; expiresAt?: number }>();

  constructor(private readonly secretsService: SecretsService) {}

  async onModuleInit() {
    await this.initRedis();
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit().catch(() => {});
      this.client = null;
      this.isConnected = false;
    }
    this.memoryStore.clear();
  }

  private async initRedis() {
    const redisUrl = this.secretsService.getRedisUrl();
    if (!redisUrl) {
      this.logger.log('Redis URL not configured. Operating in single-node in-memory mode.');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.warn('Redis reconnection retries exhausted. Disabling Redis temporarily.');
            return null;
          }
          return Math.min(times * 500, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connection established successfully.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis client error: ${err.message}. Graceful fallback active.`);
      });
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(`Failed to initialize Redis (${error.message}). Operating without Redis.`);
    }
  }

  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  getClient(): Redis | null {
    return this.client;
  }

  createDuplicateClient(): Redis | null {
    const redisUrl = this.secretsService.getRedisUrl();
    if (!redisUrl) return null;
    try {
      return new Redis(redisUrl, {
        maxRetriesPerRequest: null,
      });
    } catch {
      return null;
    }
  }

  async ping(): Promise<boolean> {
    if (this.isAvailable()) {
      try {
        const res = await this.client!.ping();
        return res === 'PONG';
      } catch {
        return false;
      }
    }
    return true; // In-memory always healthy
  }

  async get(key: string): Promise<string | null> {
    if (this.isAvailable()) {
      try {
        return await this.client!.get(key);
      } catch (err: any) {
        this.logger.warn(`Redis GET failed for key "${key}": ${err.message}`);
      }
    }

    // In-memory fallback
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isAvailable()) {
      try {
        if (ttlSeconds && ttlSeconds > 0) {
          await this.client!.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.client!.set(key, value);
        }
        return;
      } catch (err: any) {
        this.logger.warn(`Redis SET failed for key "${key}": ${err.message}`);
      }
    }

    // In-memory fallback
    this.memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (this.isAvailable()) {
      try {
        const res = await this.client!.set(key, value, 'EX', ttlSeconds, 'NX');
        return res === 'OK';
      } catch (err: any) {
        this.logger.warn(`Redis SET NX failed for key "${key}": ${err.message}`);
      }
    }

    // In-memory fallback
    const existing = this.memoryStore.get(key);
    if (existing && (!existing.expiresAt || Date.now() <= existing.expiresAt)) {
      return false; // Key already exists
    }

    this.memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined,
    });
    return true;
  }

  async del(key: string): Promise<void> {
    if (this.isAvailable()) {
      try {
        await this.client!.del(key);
      } catch (err: any) {
        this.logger.warn(`Redis DEL failed for key "${key}": ${err.message}`);
      }
    }
    this.memoryStore.delete(key);
  }
}
