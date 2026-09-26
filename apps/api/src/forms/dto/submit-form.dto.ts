import { IsObject, IsNotEmpty } from 'class-validator';

export class SubmitFormDto {
  @IsNotEmpty({ message: 'Submission data is required' })
  @IsObject({ message: 'Submission data must be an object' })
  data: Record<string, any>;
}
