import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role, UserStatus, Permission } from '@saas/shared';

export type UserDocument = User & Document;

export const DEFAULT_USER_PERMISSIONS: string[] = [
  Permission.FORMS_READ,
  Permission.FORMS_CREATE,
  Permission.FORMS_UPDATE,
  Permission.FORMS_DEPLOY,
  Permission.FORMS_ROLLBACK,
  Permission.SUBMISSIONS_READ,
  Permission.SUBMISSIONS_EXPORT,
  Permission.USERS_READ,
];

export const DEFAULT_ADMIN_PERMISSIONS: string[] = Object.values(Permission);

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: any) => {
      ret.id = ret._id.toString();
      ret.tenantId = ret.tenantId || ret.id;
      delete ret._id;
      delete ret.__v;
      delete ret.passwordHash;
      return ret;
    },
  },
})
export class User {
  id?: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true, enum: Role, default: Role.USER, index: true })
  role: Role;

  @Prop({ required: true, enum: UserStatus, default: UserStatus.ACTIVE, index: true })
  status: UserStatus;

  @Prop({ type: String, index: true })
  tenantId?: string;

  @Prop({ type: [String], default: () => DEFAULT_USER_PERMISSIONS })
  permissions: string[];

  @Prop({ type: Number, default: 1 })
  tokenVersion: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ tenantId: 1, email: 1 });
UserSchema.index({ createdAt: -1 });

UserSchema.pre('save', function (next) {
  if (!this.tenantId) {
    this.tenantId = this._id ? this._id.toString() : new Types.ObjectId().toString();
  }
  if (!this.permissions || this.permissions.length === 0) {
    this.permissions = this.role === Role.ADMIN ? DEFAULT_ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS;
  }
  next();
});
