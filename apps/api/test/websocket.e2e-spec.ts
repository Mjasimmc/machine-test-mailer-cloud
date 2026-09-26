import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';
import { Role, SOCKET_EVENTS, UserStatus } from '@saas/shared';

describe('Real-Time Suspension via Socket.IO (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  let userId: string;
  let userSocket: Socket;
  let serverPort: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.listen(0); // dynamic port
    const address = app.getHttpServer().address();
    serverPort = typeof address === 'string' ? 3000 : address.port;

    // Admin login
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@saas.local', password: 'AdminPassword123!' });
    adminToken = adminRes.body.accessToken;

    // Register test user
    const userRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Socket Test User',
        email: `socketuser_${Date.now()}@example.com`,
        password: 'UserSecret123!',
      });
    userToken = userRes.body.accessToken;
    userId = userRes.body.user.id;
  });

  afterAll(async () => {
    if (userSocket && userSocket.connected) {
      userSocket.disconnect();
    }
    await app.close();
  });

  it('should establish socket connection with JWT auth and receive user:suspended on admin action', (done) => {
    userSocket = io(`http://localhost:${serverPort}`, {
      auth: { token: userToken },
      transports: ['websocket'],
    });

    userSocket.on('connect', async () => {
      expect(userSocket.connected).toBe(true);

      // Listen for the suspension event
      userSocket.on(SOCKET_EVENTS.USER_SUSPENDED, (data: any) => {
        try {
          expect(data).toBeDefined();
          expect(data.userId).toBe(userId);
          userSocket.disconnect();
          done();
        } catch (err) {
          done(err);
        }
      });

      // Admin suspends user
      await request(app.getHttpServer())
        .patch(`/admin/users/${userId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    userSocket.on('connect_error', (err) => {
      done(err);
    });
  });
});
