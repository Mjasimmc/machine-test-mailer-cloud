import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const cookieParser = require('cookie-parser');
const request = require('supertest');
import { AppModule } from '../src/app.module';
import { Role, UserStatus } from '@saas/shared';

jest.setTimeout(60000);

describe('SaaS Full-Stack API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
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

  describe('1. Authentication & Seeded Admin', () => {
    it('should login as seeded Admin successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@saas.local',
          password: 'AdminPassword123!',
        })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe(Role.ADMIN);
      expect(res.body.user.email).toBe('admin@saas.local');

      adminToken = res.body.accessToken;
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@saas.local',
          password: 'WrongPassword!',
        })
        .expect(401);
    });

    it('should register a normal user', async () => {
      const email = `testuser_${Date.now()}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test Regular User',
          email,
          password: 'UserSecret123!',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe(Role.USER);
      expect(res.body.user.status).toBe(UserStatus.ACTIVE);
      expect(res.body.user.email).toBe(email);

      userToken = res.body.accessToken;
      userId = res.body.user.id;
    });

    it('should reject duplicate registration with same email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Duplicate Admin User',
          email: 'admin@saas.local',
          password: 'Password123!',
        })
        .expect(409);
    });
  });

  describe('2. User Endpoints & Self Profile', () => {
    it('should allow user to get own profile via GET /users/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.id).toBe(userId);
      expect(res.body.name).toBe('Test Regular User');
      expect(res.body.role).toBe(Role.USER);
    });

    it('should allow user to update own name and email via PATCH /users/me', async () => {
      const newEmail = `updated_${Date.now()}@example.com`;
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated User Name',
          email: newEmail,
        })
        .expect(200);

      expect(res.body.id).toBe(userId);
      expect(res.body.name).toBe('Updated User Name');
      expect(res.body.email).toBe(newEmail);
      expect(res.body.role).toBe(Role.USER);
    });

    it('should reject non-whitelisted fields (role, status, id) with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: Role.ADMIN,
          status: UserStatus.SUSPENDED,
          id: 'fake-id',
        })
        .expect(400);
    });

    it('should reject email update if already taken by another account', async () => {
      await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'admin@saas.local',
        })
        .expect(409);
    });

    it('should allow admin to update own profile via PATCH /users/me', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Super Administrator',
        })
        .expect(200);

      expect(res.body.name).toBe('Super Administrator');
      expect(res.body.role).toBe(Role.ADMIN);
    });

    it('should reject unauthenticated request to /users/me', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });
  });

  describe('3. Admin Endpoints & Role Authorization', () => {
    it('should forbid normal user from accessing /admin/dashboard/stats', async () => {
      await request(app.getHttpServer())
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should forbid normal user from accessing /admin/users', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should allow admin to get stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.totalUsers).toBeGreaterThanOrEqual(1);
      expect(res.body.activeUsers).toBeGreaterThanOrEqual(1);
      expect(res.body.suspendedUsers).toBeGreaterThanOrEqual(0);
    });

    it('should allow admin to list users with search query', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users?search=Updated User')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((u: any) => u.id === userId);
      expect(found).toBeDefined();
    });

    it('should allow admin to view user detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toBe(userId);
      expect(res.body.email).toBeDefined();
    });
  });

  describe('4. Suspension & Backend Enforcement', () => {
    it('should allow admin to suspend user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe(UserStatus.SUSPENDED);
    });

    it('should prevent suspended user from accessing authenticated endpoints (ActiveUserGuard)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('should prevent suspended user from logging in', async () => {
      // Find the user email to login
      const detailRes = await request(app.getHttpServer())
        .get(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: detailRes.body.email,
          password: 'UserSecret123!',
        })
        .expect(403);

      expect(res.body.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('should allow admin to unsuspend user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/unsuspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe(UserStatus.ACTIVE);
    });

    it('should allow user to log in again after unsuspension', async () => {
      const detailRes = await request(app.getHttpServer())
        .get(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: detailRes.body.email,
          password: 'UserSecret123!',
        })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('3. Cookie-Based Refresh Tokens & Atomic Rotation Lifecycle', () => {
    let refreshCookie: string;
    let rotatedCookie: string;
    let testUserToken: string;

    it('should set an HttpOnly refreshToken cookie upon login', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@saas.local',
          password: 'AdminPassword123!',
        })
        .expect(200);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(refCookie).toBeDefined();
      expect(refCookie).toContain('HttpOnly');
      expect(refCookie).toContain('Path=/auth');

      refreshCookie = refCookie.split(';')[0];
      testUserToken = res.body.accessToken;
    });

    it('should rotate token and set new cookie via POST /auth/refresh', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie])
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      // Raw refresh token must NOT be in JSON body
      expect(res.body.refreshToken).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const newRefCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
      expect(newRefCookie).toBeDefined();
      rotatedCookie = newRefCookie.split(';')[0];
      expect(rotatedCookie).not.toEqual(refreshCookie);
    });

    it('should reject reuse of already-consumed refresh token and invalidate family', async () => {
      // Present the old already-consumed refresh token
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie])
        .expect(401);

      // Now the rotated cookie should also be rejected because the family was revoked upon reuse detection!
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [rotatedCookie])
        .expect(401);
    });

    it('should clear refresh cookie on logout', async () => {
      // First log in to get a fresh cookie
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@saas.local',
          password: 'AdminPassword123!',
        })
        .expect(200);

      const loginCookies = loginRes.headers['set-cookie'];
      const activeCookie = loginCookies.find((c: string) => c.startsWith('refreshToken=')).split(';')[0];

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [activeCookie])
        .expect(200);

      expect(res.body.message).toContain('Logged out successfully');
      const logoutCookies = res.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();
      const clearedCookie = logoutCookies.find((c: string) => c.startsWith('refreshToken='));
      expect(clearedCookie).toContain('Expires=');
    });

    it('should immediately invalidate access token on logout-all via tokenVersion', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@saas.local',
          password: 'AdminPassword123!',
        })
        .expect(200);

      const tokenBefore = loginRes.body.accessToken;

      // Verify token works
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${tokenBefore}`)
        .expect(200);

      // Call logout-all
      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${tokenBefore}`)
        .expect(200);

      // Previous token must now fail immediately
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${tokenBefore}`)
        .expect(401);
    });
  });
});
