import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SecretsService } from './vault/secrets.service';
import { RedisService } from './redis/redis.service';
import { StorageService } from './storage/storage.service';
import { QueueService } from './queue/queue.service';
import { StructuredLoggerService } from './observability/structured-logger.service';
import { HealthController } from './observability/health.controller';
import { CorrelationMiddleware } from './observability/correlation.middleware';
import { AuditLog, AuditLogSchema } from './audit/audit-log.schema';
import { AuditService } from './audit/audit.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [HealthController],
  providers: [
    SecretsService,
    RedisService,
    StorageService,
    QueueService,
    StructuredLoggerService,
    AuditService,
  ],
  exports: [
    SecretsService,
    RedisService,
    StorageService,
    QueueService,
    StructuredLoggerService,
    AuditService,
    MongooseModule,
  ],
})
export class InfrastructureModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
