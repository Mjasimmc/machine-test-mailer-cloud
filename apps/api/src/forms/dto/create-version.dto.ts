import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { FormElement, FormSection, LayoutDirection } from '@saas/shared';

export class CreateVersionDto {
  @IsOptional()
  @IsString()
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
