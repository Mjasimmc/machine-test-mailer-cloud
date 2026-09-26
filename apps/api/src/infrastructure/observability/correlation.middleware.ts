import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export interface CorrelatedRequest extends Request {
  correlationId?: string;
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: CorrelatedRequest, res: Response, next: NextFunction) {
    const incomingId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
    const correlationId = (Array.isArray(incomingId) ? incomingId[0] : incomingId) || `req_${Date.now()}_${randomBytes(4).toString('hex')}`;

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);

    next();
  }
}
