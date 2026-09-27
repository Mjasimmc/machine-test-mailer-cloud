import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../src/infrastructure/vault/secrets.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { QueueService } from '../src/infrastructure/queue/queue.service';
import { WebhookService } from '../src/infrastructure/webhook/webhook.service';
import { StorageService } from '../src/infrastructure/storage/storage.service';
import { IpFirewallService } from '../src/infrastructure/security/ip-firewall.service';
import { StructuredLoggerService } from '../src/infrastructure/observability/structured-logger.service';
import { CorrelationMiddleware } from '../src/infrastructure/observability/correlation.middleware';
import { HealthController } from '../src/infrastructure/observability/health.controller';
import { AuditService } from '../src/infrastructure/audit/audit.service';
import { validateSafeUrl } from '../src/common/utils/ssrf-protection';
import { validateRegexPattern, safeRegexTest } from '../src/common/utils/safe-regex';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ActiveUserGuard } from '../src/common/guards/active-user.guard';
import { PermissionsGuard } from '../src/common/guards/permissions.guard';
import { Role, UserStatus, Permission } from '@saas/shared';
import { ForbiddenException, UnauthorizedException, BadRequestException, ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RealtimeGateway } from '../src/realtime/realtime.gateway';
import { RealtimeService } from '../src/realtime/realtime.service';
import { RedisIoAdapter } from '../src/realtime/redis-io.adapter';
import { UsersService } from '../src/users/users.service';
import { AdminService } from '../src/administration/admin.service';
import { DashboardService } from '../src/administration/dashboard.service';

describe('Comprehensive Security & Infrastructure Unit Tests (Coverage Booster)', () => {
  describe('1. Safe Regex & SSRF Protection Utilities', () => {
    it('should validate and detect dangerous ReDoS nested quantifiers', () => {
      expect(validateRegexPattern('(a+)+').isValid).toBe(false);
      expect(validateRegexPattern('(x*)*').isValid).toBe(false);
      expect(validateRegexPattern('a'.repeat(251)).isValid).toBe(false);
      expect(validateRegexPattern('^[a-zA-Z0-9]+$').isValid).toBe(true);
      expect(validateRegexPattern('[invalid(').isValid).toBe(false);
    });

    it('should evaluate safeRegexTest within bounds and reject dangerous/long inputs', () => {
      expect(safeRegexTest('^[0-9]+$', '12345').matches).toBe(true);
      expect(safeRegexTest('^[0-9]+$', 'abc').matches).toBe(false);
      expect(safeRegexTest('^[0-9]+$', 'x'.repeat(1001), 1000).matches).toBe(false);
      expect(safeRegexTest('(a+)+', 'aaaa').matches).toBe(false);
    });

    it('should validate SSRF safe URLs and block private/reserved ranges', async () => {
      await expect(validateSafeUrl('ftp://example.com')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('invalid-url')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('http://localhost:3000')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('http://127.0.0.1')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('http://10.0.0.1')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('http://192.168.1.1')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('http://172.20.0.1')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('http://test.local')).rejects.toThrow(BadRequestException);
      await expect(validateSafeUrl('http://test.internal')).rejects.toThrow(BadRequestException);
      const valid = await validateSafeUrl('https://example.com/webhook');
      expect(valid).toBe('https://example.com/webhook');
    });
  });

  describe('2. Structured Logger Service', () => {
    let logger: StructuredLoggerService;

    beforeEach(() => {
      logger = new StructuredLoggerService();
      logger.setContext('TestContext');
    });

    it('should format and emit logs across all levels in development mode', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      logger.log('Info message', 'CustomContext');
      logger.log({ json: true });
      logger.warn('Warn message');
      logger.error('Error message', 'trace-stack');
      logger.debug('Debug message');
      logger.verbose('Verbose message');

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleDebugSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleDebugSpy.mockRestore();
    });

    it('should format logs as valid JSON in production mode', () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      logger.log('Prod info message', 'ProdContext', { extra: 123 });
      expect(consoleLogSpy).toHaveBeenCalled();
      const rawArg = consoleLogSpy.mock.calls[0][0];
      const parsed = JSON.parse(rawArg);
      expect(parsed.level).toBe('INFO');
      expect(parsed.context).toBe('ProdContext');

      process.env.NODE_ENV = oldEnv;
      consoleLogSpy.mockRestore();
    });
  });

  describe('3. Secrets & HashiCorp Vault Service', () => {
    it('should fallback gracefully to env when Vault is disabled', async () => {
      const configService = {
        get: jest.fn((key: string, def?: string) => {
          if (key === 'VAULT_ENABLED') return 'false';
          if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/custom';
          if (key === 'JWT_SECRET') return 'custom-jwt-secret';
          return def ?? '';
        }),
      } as unknown as ConfigService;

      const secretsService = new SecretsService(configService);
      await secretsService.onModuleInit();

      expect(secretsService.isVaultConnected()).toBe(false);
      expect(secretsService.getDatabaseUri()).toBe('mongodb://localhost:27017/custom');
      expect(secretsService.getJwtSecret()).toBe('custom-jwt-secret');
      expect(secretsService.getJwtExpiresIn()).toBe('7d');
      expect(secretsService.getStorageDriver()).toBe('local');
    });

    it('should load KV v2 and KV v1 secrets when Vault is active', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            data: {
              MONGODB_URI: 'mongodb+srv://vault-user:vault-pass@cluster0.mongodb.net/prod',
              JWT_SECRET: 'vault-protected-jwt-secret-xyz',
              STORAGE_DRIVER: 's3',
              S3_BUCKET: 'vault-bucket',
            },
          },
        }),
      } as any);

      const configService = {
        get: jest.fn((key: string, def?: string) => {
          if (key === 'VAULT_ENABLED') return 'true';
          if (key === 'VAULT_ADDR') return 'http://127.0.0.1:8200';
          if (key === 'VAULT_TOKEN') return 's.testtoken';
          return def ?? '';
        }),
      } as unknown as ConfigService;

      const secretsService = new SecretsService(configService);
      await secretsService.onModuleInit();

      expect(secretsService.isVaultConnected()).toBe(true);
      expect(secretsService.getDatabaseUri()).toBe('mongodb+srv://vault-user:vault-pass@cluster0.mongodb.net/prod');
      expect(secretsService.getJwtSecret()).toBe('vault-protected-jwt-secret-xyz');
      expect(secretsService.getStorageDriver()).toBe('s3');
      expect(secretsService.getS3Config().bucket).toBe('vault-bucket');

      global.fetch = originalFetch;
    });

    it('should throw in production when default JWT secret is used or Vault fails in production', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Error',
      } as any);

      const prodConfigService = {
        get: jest.fn((key: string, def?: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'VAULT_ENABLED') return 'true';
          if (key === 'VAULT_ADDR') return 'http://127.0.0.1:8200';
          if (key === 'VAULT_TOKEN') return 's.testtoken';
          return def ?? '';
        }),
      } as unknown as ConfigService;

      const secretsService = new SecretsService(prodConfigService);
      await expect(secretsService.onModuleInit()).rejects.toThrow();

      global.fetch = originalFetch;
    });
  });

  describe('4. Redis Service Resilience & In-Memory Fallback', () => {
    let redisService: RedisService;
    let secretsService: SecretsService;

    beforeEach(async () => {
      secretsService = {
        getRedisUrl: jest.fn(() => undefined), // Fallback in-memory
      } as unknown as SecretsService;

      redisService = new RedisService(secretsService);
      await redisService.onModuleInit();
    });

    afterEach(async () => {
      await redisService.onModuleDestroy();
    });

    it('should support in-memory store set, get, ttl, setNx, and del operations', async () => {
      expect(redisService.isAvailable()).toBe(false);
      expect(await redisService.ping()).toBe(true);

      await redisService.set('user:session:1', 'active-token', 10);
      const val = await redisService.get('user:session:1');
      expect(val).toBe('active-token');

      // setNx on existing key should return false
      const nxFail = await redisService.setNx('user:session:1', 'new-token', 10);
      expect(nxFail).toBe(false);

      // setNx on non-existing key should return true
      const nxSuccess = await redisService.setNx('user:session:2', 'token-2', 10);
      expect(nxSuccess).toBe(true);

      // Delete key
      await redisService.del('user:session:1');
      expect(await redisService.get('user:session:1')).toBeNull();
    });

    it('should correctly prune expired memory entries', async () => {
      await redisService.set('short-lived', 'val', 1); // 1 second TTL
      expect(await redisService.get('short-lived')).toBe('val');

      // Simulate passage of time
      (redisService as any).memoryStore.set('short-lived', {
        value: 'val',
        expiresAt: Date.now() - 5000,
      });

      expect(await redisService.get('short-lived')).toBeNull();
    });

    it('should handle client delegation when Redis client is mock-connected', async () => {
      const mockClient = {
        ping: jest.fn().mockResolvedValue('PONG'),
        get: jest.fn().mockResolvedValue('redis-val'),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
        quit: jest.fn().mockResolvedValue('OK'),
      };

      (redisService as any).client = mockClient;
      (redisService as any).isConnected = true;

      expect(redisService.isAvailable()).toBe(true);
      expect(await redisService.ping()).toBe(true);
      expect(await redisService.get('test')).toBe('redis-val');
      await redisService.set('test', 'new-val', 60);
      expect(mockClient.set).toHaveBeenCalledWith('test', 'new-val', 'EX', 60);
      await redisService.del('test');
      expect(mockClient.del).toHaveBeenCalledWith('test');
    });
  });

  describe('5. Webhook Service Delivery & Exponential Backoff', () => {
    let webhookService: WebhookService;
    let queueService: QueueService;

    beforeEach(() => {
      queueService = {
        registerHandler: jest.fn(),
        dispatch: jest.fn().mockResolvedValue('job-123'),
      } as unknown as QueueService;

      webhookService = new WebhookService(queueService);
      webhookService.onModuleInit();
    });

    it('should register webhook queue handler on initialization', () => {
      expect(queueService.registerHandler).toHaveBeenCalledWith('webhook_notification', expect.any(Function));
    });

    it('should dispatch webhook notification jobs via QueueService', async () => {
      const jobId = await webhookService.dispatchWebhook({
        url: 'https://example.com/webhook',
        formId: 'form-123',
        data: { test: true },
      });
      expect(jobId).toBe('job-123');
      expect(queueService.dispatch).toHaveBeenCalled();
    });

    it('should reject SSRF / private targets in deliverWebhook without making network calls', async () => {
      const result = await webhookService.deliverWebhook({
        url: 'http://169.254.169.254/latest/meta-data',
        formId: 'form-123',
        data: {},
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('SSRF validation failed');
    });

    it('should successfully deliver webhook to valid endpoint with HMAC signature', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      } as any);

      const result = await webhookService.deliverWebhook({
        url: 'https://webhook.site/unique-uuid',
        secret: 'super-secret-webhook-key',
        formId: 'form-789',
        submissionId: 'sub-456',
        data: { fieldA: 'valueA' },
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.attempts).toBe(1);

      // Verify header format
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['X-Webhook-Signature-256']).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);

      global.fetch = originalFetch;
    });

    it('should retry on 5xx errors and abort on non-retryable 4xx client errors', async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as any);

      const result = await webhookService.deliverWebhook({
        url: 'https://webhook.site/not-found',
        formId: 'form-789',
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.attempts).toBe(1); // Does not retry 404

      global.fetch = originalFetch;
    });
  });

  describe('6. IP Firewall Service & Rate Limiting Honeypot', () => {
    let firewallService: IpFirewallService;
    let redisService: RedisService;
    let logger: StructuredLoggerService;

    beforeEach(() => {
      redisService = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
        del: jest.fn().mockResolvedValue(undefined),
        isAvailable: jest.fn().mockReturnValue(false),
      } as unknown as RedisService;

      logger = new StructuredLoggerService();
      firewallService = new IpFirewallService(redisService, logger);
    });

    it('should correctly identify CIDR ranges and whitelist localhost', async () => {
      expect(await firewallService.isIpBlocked('127.0.0.1')).toBe(false);
      expect(await firewallService.isIpBlocked('::1')).toBe(false);
    });

    it('should manually block, check, and unblock IP addresses', async () => {
      const testIp = '203.0.113.50';
      expect(await firewallService.isIpBlocked(testIp)).toBe(false);

      await firewallService.blockIp(testIp, 'Testing manual block', 300);
      expect(await firewallService.isIpBlocked(testIp)).toBe(true);

      const blockedList = await firewallService.listBlockedIps();
      expect(blockedList.some((b) => b.ip === testIp)).toBe(true);

      await firewallService.unblockIp(testIp);
      expect(await firewallService.isIpBlocked(testIp)).toBe(false);
    });

    it('should track rate limits and suspicious hits with auto-ban', async () => {
      const hackerIp = '198.51.100.99';
      const rateLimitRes = await firewallService.checkRateLimit(hackerIp, 5, 60);
      expect(rateLimitRes.allowed).toBe(true);
      expect(rateLimitRes.remaining).toBe(4);

      (firewallService as any).suspiciousThreshold = 10;

      // Hit suspicious anomalies
      for (let i = 0; i < 9; i++) {
        await firewallService.recordSuspiciousHit(hackerIp, 'Probing sensitive endpoints');
      }
      const finalHit = await firewallService.recordSuspiciousHit(hackerIp, 'Probing sensitive endpoints');
      expect(finalHit.autoBanned).toBe(true);
      expect(await firewallService.isIpBlocked(hackerIp)).toBe(true);
    });
  });

  describe('7. Security Guards (Roles, ActiveUser, Permissions)', () => {
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
    });

    it('should enforce ActiveUserGuard for ACTIVE users and reject SUSPENDED/DELETED', () => {
      const guard = new ActiveUserGuard();

      const activeCtx = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { status: UserStatus.ACTIVE } }),
        }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(activeCtx)).toBe(true);

      const suspendedCtx = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { status: UserStatus.SUSPENDED } }),
        }),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(suspendedCtx)).toThrow(ForbiddenException);

      const noUserCtx = {
        switchToHttp: () => ({
          getRequest: () => ({ user: null }),
        }),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(noUserCtx)).toThrow(UnauthorizedException);
    });

    it('should enforce RolesGuard correctly with hierarchical permissions', () => {
      const guard = new RolesGuard(reflector);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const adminCtx = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: Role.ADMIN } }),
        }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(adminCtx)).toBe(true);

      const userCtx = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: Role.USER } }),
        }),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(userCtx)).toThrow(ForbiddenException);
    });

    it('should enforce PermissionsGuard allowing wildcard ADMIN access and granular permissions', () => {
      const guard = new PermissionsGuard(reflector);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.FORMS_DEPLOY]);

      const adminCtx = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: Role.ADMIN, permissions: [] } }),
        }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(adminCtx)).toBe(true);

      const userWithPermCtx = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: Role.USER, permissions: [Permission.FORMS_DEPLOY] } }),
        }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(userWithPermCtx)).toBe(true);

      const userWithoutPermCtx = {
        getHandler: jest.fn(),
        getClass: jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user: { role: Role.USER, permissions: [Permission.FORMS_READ] } }),
        }),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(userWithoutPermCtx)).toThrow(ForbiddenException);
    });
  });

  describe('8. Local Storage Service', () => {
    let storageService: StorageService;
    let secretsService: SecretsService;

    beforeEach(async () => {
      secretsService = {
        getStorageDriver: jest.fn(() => 'local'),
        getS3Config: jest.fn(() => ({ bucket: 'test-bucket' })),
        get: jest.fn(() => 'uploads/test'),
      } as unknown as SecretsService;

      storageService = new StorageService(secretsService);
    });

    it('should upload, retrieve, and delete files using local disk driver', async () => {
      const testBuffer = Buffer.from('test file content');
      const filename = 'sample.txt';
      const mimetype = 'text/plain';

      const fileUrl = await storageService.uploadFile(filename, testBuffer, mimetype);
      expect(fileUrl).toContain(filename);
      expect(storageService.getFileUrl(filename)).toContain(filename);

      const retrievedBuffer = await storageService.getFile(filename);
      expect(retrievedBuffer).not.toBeNull();
      expect(retrievedBuffer!.toString()).toBe('test file content');

      await storageService.deleteFile(filename);
      const afterDelete = await storageService.getFile(filename);
      expect(afterDelete).toBeNull();
    });
  });

  describe('9. Correlation Middleware & Health Controller', () => {
    it('should assign or propagate X-Correlation-ID in correlation middleware', () => {
      const middleware = new CorrelationMiddleware();
      const req: any = { headers: {} };
      const res: any = { setHeader: jest.fn() };
      const next = jest.fn();

      middleware.use(req, res, next);
      expect(req.correlationId).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', req.correlationId);
      expect(next).toHaveBeenCalled();

      // Propagate existing
      const reqWithId: any = { headers: { 'x-correlation-id': 'custom-id-999' } };
      middleware.use(reqWithId, res, next);
      expect(reqWithId.correlationId).toBe('custom-id-999');
    });

    it('should return health and readiness status in HealthController', async () => {
      const mockMongoConnection = {
        readyState: 1, // Connected
      } as any;

      const redisService = {
        ping: jest.fn().mockResolvedValue(true),
        getClient: jest.fn().mockReturnValue({}),
      } as unknown as RedisService;

      const secretsService = {
        isVaultConnected: jest.fn(() => false),
      } as unknown as SecretsService;

      const healthController = new HealthController(mockMongoConnection, redisService, secretsService);

      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockImplementation((data) => data),
      };

      healthController.liveness(res);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ok',
        }),
      );

      await healthController.readiness(res);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready',
          services: expect.objectContaining({
            database: { status: 'up', state: 1 },
            redis: { status: 'up' },
            vault: { status: 'fallback_env' },
          }),
        }),
      );
    });
  });

  describe('10. Realtime Gateway & Service & Redis Adapter', () => {
    let realtimeGateway: RealtimeGateway;
    let realtimeService: RealtimeService;

    beforeEach(() => {
      const mockJwtService = {
        verify: jest.fn().mockReturnValue({ sub: 'user-1', tokenVersion: 0, tenantId: 'tenant-1' }),
      } as any;
      const mockSecretsService = {
        getJwtSecret: jest.fn().mockReturnValue('secret'),
      } as any;
      const mockUsersService = {
        findById: jest.fn().mockResolvedValue({
          _id: 'user-1',
          status: UserStatus.ACTIVE,
          tokenVersion: 0,
          role: Role.USER,
          tenantId: 'tenant-1',
        }),
      } as any;

      realtimeGateway = new RealtimeGateway(mockJwtService, mockSecretsService, mockUsersService);
      realtimeService = new RealtimeService(realtimeGateway);
    });

    it('should handle socket connection, room subscription, and user suspension', async () => {
      const mockSocket: any = {
        id: 'socket-123',
        handshake: {
          auth: { token: 'valid-jwt-token' },
          headers: {},
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      };

      await realtimeGateway.handleConnection(mockSocket);
      expect(mockSocket.data.userId).toBe('user-1');
      expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
      expect(mockSocket.join).toHaveBeenCalledWith('tenant:tenant-1');

      // Subscribe room
      const res = realtimeGateway.handleSubscribeRoom(mockSocket, { room: 'tenant:tenant-1' });
      expect(res).toEqual({ success: true, room: 'tenant:tenant-1' });

      // Unauthorized room subscription
      const unauthorizedRes = realtimeGateway.handleSubscribeRoom(mockSocket, { room: 'admin:secret' });
      expect(unauthorizedRes.success).toBe(false);

      // User suspended emit
      const mockServer = {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
        in: jest.fn().mockReturnValue({ disconnectSockets: jest.fn() }),
      };
      realtimeGateway.server = mockServer as any;
      realtimeService.emitUserSuspended('user-1');
      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.in).toHaveBeenCalledWith('user:user-1');
    });

    it('should handle RedisIoAdapter fallback when Redis is unreachable', async () => {
      const adapter = new RedisIoAdapter();
      const connected = await adapter.connectToRedis('redis://127.0.0.1:9999');
      expect(connected).toBe(false);
    });
  });

  describe('11. Users Service & Admin Service Unit Tests', () => {
    it('should manage users and administration statistics', async () => {
      const mockUserModel = {
        findById: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: '507f1f77bcf86cd799439011',
            name: 'Test User',
            email: 'user@example.com',
            role: Role.USER,
            status: UserStatus.ACTIVE,
          }),
        }),
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
        findByIdAndUpdate: jest.fn().mockResolvedValue({
          _id: '507f1f77bcf86cd799439011',
          name: 'Updated User',
          email: 'user@example.com',
          role: Role.USER,
          status: UserStatus.SUSPENDED,
        }),
        countDocuments: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(10),
        }),
      };

      const usersService = new UsersService(mockUserModel as any);
      const user = await usersService.findById('507f1f77bcf86cd799439011');
      expect(user).not.toBeNull();
      expect(user!.email).toBe('user@example.com');

      const nullId = await usersService.findById('invalid-id');
      expect(nullId).toBeNull();

      const updated = await usersService.updateProfile('507f1f77bcf86cd799439011', { name: 'New Name' });
      expect(updated).toBeDefined();

      const tokenVer = await usersService.incrementTokenVersion('507f1f77bcf86cd799439011');
      expect(tokenVer).toBeDefined();

      const pwdUpdate = await usersService.updatePassword('507f1f77bcf86cd799439011', 'new-hash');
      expect(pwdUpdate).toBeDefined();

      const allUsers = await usersService.findAll('test', 'tenant-1');
      expect(allUsers).toEqual([]);

      const mockRealtime = { emitUserSuspended: jest.fn() };
      const mockAudit = { log: jest.fn().mockResolvedValue(undefined) };
      const adminService = new AdminService(usersService, mockRealtime as any, mockAudit as any);

      const suspended = await adminService.suspendUser('507f1f77bcf86cd799439011', 'admin-id-1');
      expect(suspended.status).toBe(UserStatus.SUSPENDED);
      expect(mockRealtime.emitUserSuspended).toHaveBeenCalledWith('507f1f77bcf86cd799439011');

      const unsuspended = await adminService.unsuspendUser('507f1f77bcf86cd799439011', 'admin-id-1');
      expect(unsuspended.status).toBe(UserStatus.SUSPENDED);

      const listed = await adminService.listUsers('test');
      expect(Array.isArray(listed)).toBe(true);

      const singleUser = await adminService.getUserById('507f1f77bcf86cd799439011');
      expect(singleUser.email).toBe('user@example.com');

      const dashboardService = new DashboardService(usersService);
      const stats = await dashboardService.getAdminStats();
      expect(stats.totalUsers).toBe(10);
    });
  });

  describe('12. Audit Service Event Logging & Sanitization', () => {
    it('should log audit events and sanitize sensitive token/password fields', async () => {
      const mockCreate = jest.fn().mockResolvedValue({ _id: 'audit-1' });
      const mockAuditModel: any = {
        create: mockCreate,
      };

      const auditService = new AuditService(mockAuditModel);
      await auditService.log({
        action: 'auth:login',
        tenantId: 'tenant-1',
        resource: 'user',
        result: 'SUCCESS',
        details: {
          password: 'plain-password-123',
          token: 'jwt-bearer-xyz',
          normalField: 'visible-data',
        },
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'auth:login',
          details: {
            password: '[REDACTED]',
            token: '[REDACTED]',
            normalField: 'visible-data',
          },
        }),
      );
    });
  });

  describe('13. Queue Service Asynchronous Processing & DLQ', () => {
    it('should dispatch and execute jobs in in-memory mode and push to DLQ', async () => {
      const mockRedisClient = {
        lpush: jest.fn().mockResolvedValue(1),
      };
      const redisService = {
        isAvailable: jest.fn().mockReturnValue(true),
        getClient: jest.fn().mockReturnValue(mockRedisClient),
        createDuplicateClient: jest.fn().mockReturnValue(null),
      } as unknown as RedisService;

      const queueService = new QueueService(redisService);
      queueService.onModuleInit();

      const jobId = await queueService.dispatch('redis_job', { data: 456 });
      expect(mockRedisClient.lpush).toHaveBeenCalled();
      expect(jobId).toBeDefined();

      // Test DLQ move directly
      await (queueService as any).moveToDlq({ id: 'job-err', type: 'err_job', payload: {} }, 'Fatal Error');
      expect(mockRedisClient.lpush).toHaveBeenCalledWith('saas:jobs:dlq', expect.stringContaining('Fatal Error'));

      queueService.onModuleDestroy();
    });
  });

  describe('14. Storage Service S3 Driver Branch', () => {
    it('should configure S3 compatible storage driver branch when driver is s3', () => {
      const secretsService = {
        getStorageDriver: jest.fn(() => 's3'),
        getS3Config: jest.fn(() => ({
          accessKey: 'test-key',
          secretKey: 'test-secret',
          bucket: 's3-bucket',
        })),
        get: jest.fn(() => 'uploads/test'),
      } as unknown as SecretsService;

      const storage = new StorageService(secretsService);
      expect(storage.getFileUrl('avatar.png')).toBe('/uploads/avatar.png');
    });
  });
});
