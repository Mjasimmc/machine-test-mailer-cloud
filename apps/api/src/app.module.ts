import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import * as path from 'path';

import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { SecretsService } from './infrastructure/vault/secrets.service';
import { IdentityModule } from './identity/identity.module';
import { FormsModule } from './forms/forms.module';
import { RuntimeModule } from './runtime/runtime.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AdministrationModule } from './administration/administration.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../.env'),
    }),
    InfrastructureModule,
    MongooseModule.forRootAsync({
      imports: [InfrastructureModule],
      useFactory: (secretsService: SecretsService) => ({
        uri: secretsService.getDatabaseUri(),
      }),
      inject: [SecretsService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 60 seconds
        limit: 300,  // 300 requests per minute default
      },
    ]),
    IdentityModule,
    FormsModule,
    RuntimeModule,
    SubmissionsModule,
    AdministrationModule,
    RealtimeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
