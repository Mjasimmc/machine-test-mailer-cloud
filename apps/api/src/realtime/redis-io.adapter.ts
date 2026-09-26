import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  async connectToRedis(redisUrl: string): Promise<boolean> {
    try {
      const pubClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
      });
      const subClient = pubClient.duplicate();

      await Promise.all([
        new Promise<void>((resolve, reject) => {
          pubClient.on('ready', () => resolve());
          pubClient.on('error', (err) => reject(err));
        }),
        new Promise<void>((resolve, reject) => {
          subClient.on('ready', () => resolve());
          subClient.on('error', (err) => reject(err));
        }),
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Socket.IO Redis Adapter configured successfully for multi-instance horizontal scaling.');
      return true;
    } catch (error: any) {
      this.logger.warn(`Failed to connect Socket.IO to Redis adapter (${error.message}). Falling back to default in-memory adapter.`);
      this.adapterConstructor = null;
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
