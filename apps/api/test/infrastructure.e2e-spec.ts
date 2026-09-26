import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Scalable Production Infrastructure (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Health & Readiness Probes', () => {
    it('should return 200 OK on /health/liveness', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.uptime).toBeGreaterThan(0);
      expect(res.body.timestamp).toBeDefined();
    });

    it('should return readiness status with database and service diagnostics on /health/readiness', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/readiness')
        .expect(200);

      expect(res.body.status).toBe('ready');
      expect(res.body.services.database.status).toBe('up');
      expect(res.body.services.vault).toBeDefined();
      expect(res.body.services.redis).toBeDefined();
    });
  });

  describe('2. Observability & Correlation ID Tracing', () => {
    it('should generate and return X-Correlation-ID header on incoming requests', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/liveness')
        .expect(200);

      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(res.headers['x-correlation-id'].startsWith('req_')).toBe(true);
    });

    it('should preserve and echo back incoming X-Correlation-ID from client/proxy', async () => {
      const customId = 'trace_client_correlation_998877';
      const res = await request(app.getHttpServer())
        .get('/health/liveness')
        .set('X-Correlation-ID', customId)
        .expect(200);

      expect(res.headers['x-correlation-id']).toBe(customId);
    });
  });

  describe('3. Rate Limiting & Throttler Protection', () => {
    it('should track requests under throttler limits', async () => {
      // Multiple requests below limit succeed
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get('/health/liveness')
          .expect(200);
      }
    });
  });

  describe('4. Webhook Security & SSRF Protection', () => {
    it('should reject webhook delivery to localhost or internal RFC1918 IPs', async () => {
      const { WebhookService } = await import('../src/infrastructure/webhook/webhook.service');
      const webhookService = app.get(WebhookService);

      const result = await webhookService.deliverWebhook({
        url: 'http://127.0.0.1:8080/internal-hook',
        formId: 'form_123',
        data: { field: 'value' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SSRF validation failed');
    });

    it('should successfully dispatch webhook jobs via the queue service', async () => {
      const { WebhookService } = await import('../src/infrastructure/webhook/webhook.service');
      const webhookService = app.get(WebhookService);

      const jobId = await webhookService.dispatchWebhook({
        url: 'https://example.com/webhook',
        formId: 'form_test_456',
        data: { email: 'user@example.com' },
      });

      expect(jobId).toBeDefined();
      expect(jobId.startsWith('job_')).toBe(true);
    });
  });

  describe('5. IP Firewall & Reputation Protection', () => {
    it('should block requests immediately with 403 when originating from blacklisted IP', async () => {
      const { IpFirewallService } = await import('../src/infrastructure/security/ip-firewall.service');
      const firewallService = app.get(IpFirewallService);

      const maliciousIp = '198.51.100.77';
      await firewallService.blockIp(maliciousIp, 'Automated honeypot trigger', 300);

      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('X-Forwarded-For', maliciousIp)
        .expect(403);

      expect(res.body.statusCode).toBe(403);
      expect(res.body.error).toBe('Forbidden');
      expect(res.body.message).toContain('Access denied');

      // Unblock and verify access returns to standard auth guard evaluation
      await firewallService.unblockIp(maliciousIp);
    });

    it('should populate rate limit headers on incoming standard API traffic', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .expect(401); // 401 because unauthenticated, but headers must be present

      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      expect(res.headers['x-ratelimit-reset']).toBeDefined();
    });
  });
});


