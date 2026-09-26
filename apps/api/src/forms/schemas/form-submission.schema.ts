import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type FormSubmissionDocument = FormSubmission & Document;

@Schema({ timestamps: true })
export class FormSubmission {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Form', required: true, index: true })
  formId: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'FormVersion', required: true, index: true })
  versionId: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  data: Record<string, any>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FormSubmissionSchema = SchemaFactory.createForClass(FormSubmission);
FormSubmissionSchema.index({ formId: 1, createdAt: -1 });
FormSubmissionSchema.index({ tenantId: 1, formId: 1, createdAt: -1 });
FormSubmissionSchema.index({ tenantId: 1, formId: 1, versionId: 1 });
FormSubmissionSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
