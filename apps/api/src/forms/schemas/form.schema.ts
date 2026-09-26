import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FormDocument = Form & Document;

@Schema({ timestamps: true })
export class Form {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ required: true, unique: true, index: true })
  publicId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'FormVersion', default: null, index: true })
  deployedVersionId: string | null;

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: null,
  })
  draft?: {
    title: string;
    elements: any[];
    sections?: any[];
    formLayout?: string;
    customCss?: string;
    updatedAt?: Date;
  };

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: () => ({
      submissionLimit: null,
      allowMultipleSubmissions: true,
      successMessage: 'Thank you! Your response has been submitted successfully.',
      redirectUrl: '',
      closedMessage: 'This form is currently closed and not accepting new responses.',
      isAcceptingSubmissions: true,
      notifyOnSubmission: false,
      notificationEmails: [],
      webhookUrl: '',
    }),
  })
  settings?: Record<string, any>;

  @Prop({ type: Array, default: [] })
  deployments?: any[];

  @Prop({ type: Array, default: [] })
  activities?: any[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const FormSchema = SchemaFactory.createForClass(Form);
FormSchema.index({ tenantId: 1, userId: 1, updatedAt: -1 });
FormSchema.index({ tenantId: 1, publicId: 1 });
FormSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    ret.tenantId = ret.tenantId || (ret.userId ? ret.userId.toString() : '');
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
