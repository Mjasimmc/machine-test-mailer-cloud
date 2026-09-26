import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: String, required: true, index: true })
  action: string;

  @Prop({ type: String, index: true })
  actorId?: string;

  @Prop({ type: String })
  actorEmail?: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: String, required: true, index: true })
  resource: string;

  @Prop({ type: String, index: true })
  resourceId?: string;

  @Prop({ type: String, required: true, enum: ['SUCCESS', 'FAILURE'], index: true })
  result: 'SUCCESS' | 'FAILURE';

  @Prop({ type: String, index: true })
  correlationId?: string;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details?: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
