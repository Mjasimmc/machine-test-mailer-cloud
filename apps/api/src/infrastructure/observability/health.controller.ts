import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { SecretsService } from '../vault/secrets.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisService: RedisService,
    private readonly secretsService: SecretsService,
  ) {}

  @Get()
  checkHealth(@Res() res: Response) {
    return this.liveness(res);
  }

  @Get('liveness')
  liveness(@Res() res: Response) {
    return res.status(HttpStatus.OK).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  }

  @Get('readiness')
  async readiness(@Res() res: Response) {
    const mongoState = this.mongoConnection.readyState;
    const isMongoReady = mongoState === 1; // 1 = connected

    const isRedisReady = await this.redisService.ping();
    const isVaultReady = this.secretsService.isVaultConnected();

    const isReady = isMongoReady; // Mongo is primary authoritative database

    const statusReport = {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: isMongoReady ? 'up' : 'down',
          state: mongoState,
        },
        redis: {
          status: isRedisReady ? 'up' : (this.redisService.getClient() ? 'down' : 'disabled'),
        },
        vault: {
          status: isVaultReady ? 'connected' : 'fallback_env',
        },
      },
    };

    if (isReady) {
      return res.status(HttpStatus.OK).json(statusReport);
    } else {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(statusReport);
    }
  }
}
