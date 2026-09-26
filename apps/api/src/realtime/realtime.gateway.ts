import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Role, SOCKET_EVENTS, UserStatus } from '@saas/shared';
import { SecretsService } from '../infrastructure/vault/secrets.service';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly secretsService: SecretsService,
    private readonly usersService: UsersService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization?.replace('Bearer ', '') as string);

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token, disconnecting`);
        client.disconnect();
        return;
      }

      const secret = this.secretsService.getJwtSecret();
      const payload = this.jwtService.verify(token, {
        secret,
        algorithms: ['HS256'],
      });

      const userId = payload.sub;
      if (!userId) {
        client.disconnect();
        return;
      }

      // Verify user account state and tokenVersion
      const user = await this.usersService.findById(userId);
      if (!user || user.status !== UserStatus.ACTIVE) {
        this.logger.warn(`Client ${client.id} denied: user account is inactive or not found`);
        client.disconnect();
        return;
      }

      const expectedTokenVersion = user.tokenVersion || 0;
      const presentedTokenVersion = payload.tokenVersion ?? 0;
      if (presentedTokenVersion !== expectedTokenVersion) {
        this.logger.warn(`Client ${client.id} denied: revoked token version`);
        client.disconnect();
        return;
      }

      const tenantId = user.tenantId || payload.tenantId || userId;

      client.data.userId = userId;
      client.data.tenantId = tenantId;
      client.data.role = user.role || Role.USER;

      // Join authorized rooms automatically
      client.join(`user:${userId}`);
      client.join(`tenant:${tenantId}`);

      this.logger.log(`Client ${client.id} connected (user:${userId}, tenant:${tenantId})`);
    } catch (error: any) {
      this.logger.warn(`Socket authentication failed for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe_room')
  handleSubscribeRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (!data || !data.room) {
      return { success: false, message: 'Invalid room payload' };
    }

    const { room } = data;
    const userId = client.data.userId;
    const tenantId = client.data.tenantId;

    // Room authorization check: only allow own user or tenant room
    const isAllowed =
      room === `user:${userId}` ||
      room === `tenant:${tenantId}` ||
      (client.data.role === Role.ADMIN && room.startsWith('admin:'));

    if (!isAllowed) {
      this.logger.warn(`Unauthorized room join attempt by user ${userId} to room "${room}"`);
      return { success: false, message: 'Unauthorized room subscription' };
    }

    client.join(room);
    return { success: true, room };
  }

  emitUserSuspended(userId: string) {
    this.logger.log(`Emitting user:suspended to room user:${userId} and revoking active connections`);
    if (this.server) {
      this.server.to(`user:${userId}`).emit(SOCKET_EVENTS.USER_SUSPENDED, {
        userId,
        message: 'Your account has been suspended by an administrator.',
      });

      // Force disconnect all sockets in that user's room
      this.server.in(`user:${userId}`).disconnectSockets(true);
    }
  }
}

