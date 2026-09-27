import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
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

@ApiTags('Submissions')
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
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : undefined;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : undefined;
    const query: GetFormDataQueryDto = {
      page: !isNaN(pageNum as number) ? pageNum : undefined,
      limit: !isNaN(limitNum as number) ? limitNum : undefined,
      sortField: sortField?.trim(),
      sortDirection,
      versionFilter: versionFilter?.trim(),
      search: search?.trim(),
    };
    return this.submissionsService.getDataView(userId, formId, tenantId, query);
  }

  @Get('forms/:id/export/csv')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, PermissionsGuard)
  @RequirePermissions(Permission.SUBMISSIONS_READ)
  async exportCsv(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Query('versionFilter') versionFilter: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.submissionsService.exportCsv(userId, formId, tenantId, { versionFilter });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.content);
  }

  @Get('forms/:id/export/json')
  @UseGuards(JwtAuthGuard, ActiveUserGuard, PermissionsGuard)
  @RequirePermissions(Permission.SUBMISSIONS_READ)
  async exportJson(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Query('versionFilter') versionFilter: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.submissionsService.exportJson(userId, formId, tenantId, { versionFilter });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(JSON.stringify(result.data, null, 2));
  }
}


