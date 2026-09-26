import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Form, FormSchema } from './schemas/form.schema';
import { FormVersion, FormVersionSchema } from './schemas/form-version.schema';
import { FormSubmission, FormSubmissionSchema } from './schemas/form-submission.schema';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Form.name, schema: FormSchema },
      { name: FormVersion.name, schema: FormVersionSchema },
      { name: FormSubmission.name, schema: FormSubmissionSchema },
    ]),
  ],
  controllers: [FormsController],
  providers: [FormsService],
  exports: [FormsService, MongooseModule],
})
export class FormsModule {}
