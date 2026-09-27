import { IsObject, IsNotEmpty, IsDefined } from 'class-validator';

export class SubmitFormDto {
  @IsDefined({ message: 'Submission payload must be provided' })
  @IsNotEmpty({ message: 'Submission data is required' })
  @IsObject({ message: 'Submission data must be a valid key-value object' })
  data: Record<string, any>;
}
