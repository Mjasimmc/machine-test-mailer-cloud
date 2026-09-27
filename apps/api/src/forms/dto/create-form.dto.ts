import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFormDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Form name is required' })
  @MinLength(1, { message: 'Form name cannot be empty' })
  @MaxLength(100, { message: 'Form name cannot exceed 100 characters' })
  name: string;
}
