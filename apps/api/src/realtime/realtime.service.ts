import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitUserSuspended(userId: string): void {
    this.gateway.emitUserSuspended(userId);
  }
}
