import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;

  @IsOptional()
  settings?: {
    submissionLimit?: number | null;
    allowMultipleSubmissions?: boolean;
    successMessage?: string;
    redirectUrl?: string;
    closedMessage?: string;
    isAcceptingSubmissions?: boolean;
    notifyOnSubmission?: boolean;
    notificationEmails?: string[];
    webhookUrl?: string;
  };
}

