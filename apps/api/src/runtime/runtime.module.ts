import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Form, FormSchema } from '../forms/schemas/form.schema';
import { FormVersion, FormVersionSchema } from '../forms/schemas/form-version.schema';
import { RuntimeService } from './runtime.service';
import { PublicRuntimeController } from './public-runtime.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Form.name, schema: FormSchema },
      { name: FormVersion.name, schema: FormVersionSchema },
    ]),
  ],
  controllers: [PublicRuntimeController],
  providers: [RuntimeService],
  exports: [RuntimeService],
})
export class RuntimeModule {}
