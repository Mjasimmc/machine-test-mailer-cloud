import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveUserGuard } from '../common/guards/active-user.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { FormsService } from './forms.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { FormDto, FormVersionDto, Permission } from '@saas/shared';

@Controller('forms')
@UseGuards(JwtAuthGuard, ActiveUserGuard, PermissionsGuard)
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @RequirePermissions(Permission.FORMS_CREATE)
  create(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateFormDto,
  ): Promise<FormDto> {
    return this.formsService.create(userId, dto, tenantId);
  }

  @Get()
  @RequirePermissions(Permission.FORMS_READ)
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
  ): Promise<FormDto[]> {
    return this.formsService.findAllForUser(userId, tenantId);
  }

  @Get(':id')
  @RequirePermissions(Permission.FORMS_READ)
  findOne(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
  ): Promise<FormDto> {
    return this.formsService.findOne(userId, formId, tenantId);
  }

  @Patch(':id/draft')
  @RequirePermissions(Permission.FORMS_UPDATE)
  updateDraft(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Body() dto: UpdateDraftDto,
  ): Promise<FormDto> {
    return this.formsService.updateDraft(userId, formId, dto, tenantId);
  }

  @Post(':id/deploy')
  @RequirePermissions(Permission.FORMS_DEPLOY)
  deploy(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
  ): Promise<FormDto> {
    return this.formsService.deployDraft(userId, formId, tenantId);
  }

  @Patch(':id/settings')
  @RequirePermissions(Permission.FORMS_UPDATE)
  updateSettings(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Body() dto: UpdateSettingsDto,
  ): Promise<FormDto> {
    return this.formsService.updateSettings(userId, formId, dto, tenantId);
  }

  @Post(':id/versions')
  @RequirePermissions(Permission.FORMS_CREATE)
  createVersion(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Body() dto: CreateVersionDto,
  ): Promise<FormVersionDto> {
    return this.formsService.createVersion(userId, formId, dto, tenantId);
  }

  @Post(':id/versions/:versionId/duplicate')
  @RequirePermissions(Permission.FORMS_CREATE)
  duplicateVersion(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Param('versionId') versionId: string,
  ): Promise<FormVersionDto> {
    return this.formsService.duplicateVersion(userId, formId, versionId, tenantId);
  }

  @Patch(':id/versions/:versionId')
  @RequirePermissions(Permission.FORMS_UPDATE)
  updateVersion(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Param('versionId') versionId: string,
    @Body() dto: UpdateVersionDto,
  ): Promise<FormVersionDto> {
    return this.formsService.updateVersion(userId, formId, versionId, dto, tenantId);
  }

  @Post(':id/versions/:versionId/deploy')
  @RequirePermissions(Permission.FORMS_DEPLOY)
  deployVersion(
    @CurrentUser('id') userId: string,
    @CurrentTenant() tenantId: string,
    @Param('id') formId: string,
    @Param('versionId') versionId: string,
  ): Promise<FormDto> {
    return this.formsService.deployVersion(userId, formId, versionId, tenantId);
  }
}
