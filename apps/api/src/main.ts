import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { SecretsService } from './infrastructure/vault/secrets.service';
import { RedisIoAdapter } from './realtime/redis-io.adapter';
import { StructuredLoggerService } from './infrastructure/observability/structured-logger.service';


async function bootstrap() {
  const logger = new StructuredLoggerService();
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.use(cookieParser());

  const secretsService = app.get(SecretsService);

  // WAF / Edge / Load Balancer Proxy Trust
  const expressApp = app.getHttpAdapter().getInstance();
  const trustProxy = secretsService.get('TRUST_PROXY', '1');
  expressApp.set('trust proxy', trustProxy === 'true' ? true : Number(trustProxy) || 1);

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Request size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration
  const frontendUrl = secretsService.get('FRONTEND_URL', 'http://localhost:5173');
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'If-None-Match'],
    exposedHeaders: ['ETag', 'X-Correlation-ID'],
  });

  // Socket.IO horizontal scaling via Redis adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  const redisUrl = secretsService.getRedisUrl();
  if (redisUrl) {
    const isConnected = await redisIoAdapter.connectToRedis(redisUrl);
    if (isConnected) {
      app.useWebSocketAdapter(redisIoAdapter);
      logger.log('WebSocket Redis adapter activated for multi-node horizontal cluster.');
    }
  }

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaaS Form Builder & Submissions Engine API')
    .setDescription(
      'Enterprise RESTful API specification for the Form Builder, AST Schema Engine, Submissions Pipeline, and Administration.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Authentication, session management, and token rotation')
    .addTag('Forms', 'Form lifecycle, AST draft editing, versions, and deployment')
    .addTag('Submissions', 'Public form intake, responses matrix query, and CSV/JSON export')
    .addTag('Admin', 'Tenant dashboard analytics, system health, and user administration')
    .addTag('Health', 'Kubernetes liveness and readiness probes')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'SaaS Form Builder API Documentation',
  });

  const port = parseInt(secretsService.get('PORT', '3000'), 10);
  await app.listen(port);
  logger.log(`[API] NestJS Scalable SaaS Modular Monolith running on port ${port}`);
  logger.log(`[Docs] Interactive OpenAPI Swagger UI available at http://localhost:${port}/docs`);
}

bootstrap();

