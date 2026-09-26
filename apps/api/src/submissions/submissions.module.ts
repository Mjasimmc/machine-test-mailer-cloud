import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Form, FormSchema } from '../forms/schemas/form.schema';
import { FormVersion, FormVersionSchema } from '../forms/schemas/form-version.schema';
import { FormSubmission, FormSubmissionSchema } from '../forms/schemas/form-submission.schema';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Form.name, schema: FormSchema },
      { name: FormVersion.name, schema: FormVersionSchema },
      { name: FormSubmission.name, schema: FormSubmissionSchema },
    ]),
    InfrastructureModule,
  ],
  controllers: [SubmissionsController],
  providers: [SubmissionsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
