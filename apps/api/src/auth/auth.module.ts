import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { SecretsService } from '../infrastructure/vault/secrets.service';
import { RefreshToken, RefreshTokenSchema } from '../identity/schemas/refresh-token.schema';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: (secretsService: SecretsService) => ({
        secret: secretsService.getJwtSecret(),
        signOptions: {
          expiresIn: '15m', // Short-lived access tokens
          issuer: 'saas-platform',
          audience: 'saas-api',
        },
      }),
      inject: [SecretsService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
