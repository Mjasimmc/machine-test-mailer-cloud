import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './audit-log.schema';

export interface AuditEventParams {
  action: string;
  actorId?: string;
  actorEmail?: string;
  tenantId: string;
  resource: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE';
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(params: AuditEventParams): Promise<void> {
    try {
      const sanitizedDetails = this.sanitizeDetails(params.details);

      await this.auditLogModel.create({
        ...params,
        details: sanitizedDetails,
      });

      this.logger.log(
        `[AUDIT] [${params.result}] Action: ${params.action} | Actor: ${params.actorEmail || params.actorId || 'system'} | Tenant: ${params.tenantId} | Resource: ${params.resource}:${params.resourceId || 'N/A'}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to record audit event: ${error.message}`, error.stack);
    }
  }

  private sanitizeDetails(details?: Record<string, any>): Record<string, any> {
    if (!details) return {};
    const sanitized: Record<string, any> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'hash', 'authorization', 'bearer', 'cookie'];

    for (const [key, value] of Object.entries(details)) {
      const lower = key.toLowerCase();
      if (sensitiveKeys.some((s) => lower.includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
