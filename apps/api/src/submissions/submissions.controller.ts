import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmitFormDto } from '../forms/dto/submit-form.dto';
import { FormDataViewDto, GetFormDataQueryDto, Permission } from '@saas/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveUserGuard } from '../common/guards/active-user.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('public/forms/:publicId/submissions')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  submitPublicForm(
    @Param('publicId') publicId: string,
    @Body() dto: SubmitFormDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('x-idempotency-key') xIdempotencyKey?: string,
  ): Promise<{ message: string; id: string }> {
    return this.submissionsService.submit(publicId, dto, idempotencyKey || xIdempotencyKey);
  }

  @Get('forms/:id/data')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, PermissionsGuard)
  @RequirePermissions(Permission.SUBMISSIONS_READ)
  getDataView(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortField') sortField?: string,
    @Query('sortDirection') sortDirection?: 'asc' | 'desc',
    @Query('versionFilter') versionFilter?: string,
    @Query('search') search?: string,
  ): Promise<FormDataViewDto> {
    const query: GetFormDataQueryDto = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortField,
      sortDirection,
      versionFilter,
      search,
    };
    return this.submissionsService.getDataView(userId, formId, tenantId, query);
  }
}

