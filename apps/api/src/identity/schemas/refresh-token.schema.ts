import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type RefreshTokenDocument = RefreshToken & Document;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true, index: true })
  family: string;

  @Prop({ default: false, index: true })
  isRevoked: boolean;

  @Prop({ required: true, index: { expires: '7d' } })
  expiresAt: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ userId: 1, family: 1 });
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
