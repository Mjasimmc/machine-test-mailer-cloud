import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  /**
   * Broadcasts account suspension event to the specific user's room and disconnects active sockets.
   */
  emitUserSuspended(userId: string): void {
    this.gateway.emitUserSuspended(userId);
  }
}

