import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!', description: 'Current password for verification' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePassword456!', description: 'New password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

