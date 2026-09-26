import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FormElement, FormSection, LayoutDirection } from '@saas/shared';

export class UpdateDraftDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Title cannot be empty' })
  @MaxLength(150, { message: 'Title cannot exceed 150 characters' })
  title?: string;

  @IsOptional()
  @IsArray()
  elements?: FormElement[];

  @IsOptional()
  @IsArray()
  sections?: FormSection[];

  @IsOptional()
  @IsIn(['row', 'column'])
  formLayout?: LayoutDirection;

  @IsOptional()
  @IsString()
  customCss?: string;
}
