import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Optional refresh token if not provided via HTTP-only cookie' })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}


