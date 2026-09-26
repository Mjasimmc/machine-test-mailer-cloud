import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { FormElement, FormSection, LayoutDirection } from '@saas/shared';

export type FormVersionDocument = FormVersion & Document;

@Schema({ timestamps: true })
export class FormVersion {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Form', required: true, index: true })
  formId: string;

  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ required: true, default: 1 })
  versionNumber: number;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Array, default: [] })
  elements: FormElement[];

  @Prop({ type: Array, default: [] })
  sections?: FormSection[];

  @Prop({ type: String, default: 'column' })
  formLayout?: LayoutDirection;

  @Prop({ type: String, default: '' })
  customCss?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const FormVersionSchema = SchemaFactory.createForClass(FormVersion);
FormVersionSchema.index({ formId: 1, versionNumber: 1 }, { unique: true });
FormVersionSchema.index({ tenantId: 1, formId: 1, versionNumber: 1 });
FormVersionSchema.index({ tenantId: 1, formId: 1, createdAt: -1 });
FormVersionSchema.set('toJSON', {
  transform: (_, ret: any) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
