import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Form, FormDocument } from './schemas/form.schema';
import { FormVersion, FormVersionDocument } from './schemas/form-version.schema';
import { FormSubmission, FormSubmissionDocument } from './schemas/form-submission.schema';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  FormDto,
  FormVersionDto,
  FormDraftDto,
  LayoutDirection,
  checkDuplicateReferences,
  extractAllElements,
  getRealisticDefaultForm,
  sanitizeCustomCss,
} from '@saas/shared';
import { AuditService } from '../infrastructure/audit/audit.service';
import { validateSafeUrl } from '../common/utils/ssrf-protection';

@Injectable()
export class FormsService {
  constructor(
    @InjectModel(Form.name) private readonly formModel: Model<FormDocument>,
    @InjectModel(FormVersion.name) private readonly formVersionModel: Model<FormVersionDocument>,
    @InjectModel(FormSubmission.name) private readonly formSubmissionModel: Model<FormSubmissionDocument>,
    private readonly auditService: AuditService,
  ) {}

  private generatePublicId(): string {
    return `f_${randomBytes(6).toString('hex')}`;
  }

  private ensureDraft(form: FormDocument, versions?: FormVersionDocument[]): FormDraftDto {
    if (form.draft && form.draft.title) {
      return {
        title: form.draft.title,
        elements: form.draft.elements || [],
        sections: form.draft.sections || [],
        formLayout: (form.draft.formLayout as LayoutDirection) || 'column',
        customCss: form.draft.customCss || '',
        updatedAt: form.draft.updatedAt ? new Date(form.draft.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    if (versions && versions.length > 0) {
      const latest = versions[versions.length - 1];
      const draft: FormDraftDto = {
        title: latest.title,
        elements: latest.elements || [],
        sections: latest.sections || [],
        formLayout: latest.formLayout || 'column',
        customCss: latest.customCss || '',
        updatedAt: latest.updatedAt ? new Date(latest.updatedAt).toISOString() : new Date().toISOString(),
      };
      form.draft = {
        ...draft,
        updatedAt: new Date(),
      };
      return draft;
    }

    const seed = getRealisticDefaultForm(form.name);
    const draft: FormDraftDto = {
      title: form.name,
      elements: seed.elements,
      sections: seed.sections,
      formLayout: seed.formLayout,
      customCss: '',
      updatedAt: new Date().toISOString(),
    };
    form.draft = {
      ...draft,
      updatedAt: new Date(),
    };
    return draft;
  }

  async create(userId: string, dto: CreateFormDto, tenantId?: string): Promise<FormDto> {
    const publicId = this.generatePublicId();
    const formName = dto.name.trim();
    const seed = getRealisticDefaultForm(formName);
    const activeTenantId = tenantId || userId;

    const initialDraft = {
      title: formName,
      elements: seed.elements,
      sections: seed.sections,
      formLayout: seed.formLayout,
      customCss: '',
      updatedAt: new Date(),
    };

    const form = await this.formModel.create({
      name: formName,
      userId: new Types.ObjectId(userId),
      tenantId: activeTenantId,
      publicId,
      draft: initialDraft,
      deployedVersionId: null,
      deployments: [],
      activities: [
        {
          id: `act_${randomBytes(4).toString('hex')}`,
          formId: '',
          type: 'form_created',
          title: 'Form created',
          description: `Form "${formName}" was created with initial editable draft.`,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    form.activities[0].formId = form._id.toString();
    await form.save();

    await this.auditService.log({
      action: 'form:created',
      actorId: userId,
      tenantId: activeTenantId,
      resource: 'form',
      resourceId: form._id.toString(),
      result: 'SUCCESS',
      details: { name: formName, publicId },
    });

    const formJson = form.toJSON();

    return {
      id: formJson.id,
      name: formJson.name,
      userId: formJson.userId.toString(),
      tenantId: activeTenantId,
      publicId: formJson.publicId,
      draft: {
        title: initialDraft.title,
        elements: initialDraft.elements,
        sections: initialDraft.sections,
        formLayout: initialDraft.formLayout,
        customCss: initialDraft.customCss,
        updatedAt: initialDraft.updatedAt.toISOString(),
      },
      deployedVersionId: null,
      deployedVersion: null,
      versionsCount: 0,
      submissionsCount: 0,
      settings: form.settings,
      deployments: [],
      activities: form.activities,
      versions: [],
      hasUnpublishedChanges: true,
      createdAt: formJson.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: formJson.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  async findAllForUser(userId: string, tenantId?: string): Promise<FormDto[]> {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (tenantId) {
      filter.tenantId = tenantId;
    }

    const forms = await this.formModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .exec();

    if (forms.length === 0) {
      return [];
    }

    const formIds = forms.map((f) => f._id);
    const submissionCounts = await this.formSubmissionModel.aggregate([
      { $match: { formId: { $in: formIds } } },
      { $group: { _id: '$formId', count: { $sum: 1 } } },
    ]);
    const submissionCountMap = new Map<string, number>(
      submissionCounts.map((s: any) => [s._id.toString(), s.count]),
    );

    const results: FormDto[] = [];

    for (const form of forms) {
      const formJson = form.toJSON();
      const versionsCount = await this.formVersionModel.countDocuments({ formId: form._id });
      const submissionsCount = submissionCountMap.get(form._id.toString()) || 0;

      let deployedVersion: FormVersionDto | null = null;
      if (form.deployedVersionId) {
        const dep = await this.formVersionModel.findById(form.deployedVersionId).exec();
        if (dep) {
          const depJson = dep.toJSON();
          deployedVersion = {
            id: depJson.id,
            formId: formJson.id,
            tenantId: form.tenantId,
            versionNumber: depJson.versionNumber,
            title: depJson.title,
            elements: depJson.elements || [],
            sections: depJson.sections || [],
            formLayout: (depJson.formLayout as LayoutDirection) || 'column',
            customCss: depJson.customCss || '',
            isDeployed: true,
            createdAt: depJson.createdAt?.toISOString?.() || new Date().toISOString(),
            updatedAt: depJson.updatedAt?.toISOString?.() || new Date().toISOString(),
          };
        }
      }

      const draft = this.ensureDraft(form);

      results.push({
        id: formJson.id,
        name: formJson.name,
        userId: formJson.userId.toString(),
        tenantId: form.tenantId,
        publicId: formJson.publicId,
        draft,
        deployedVersionId: form.deployedVersionId ? form.deployedVersionId.toString() : null,
        deployedVersion,
        versionsCount,
        submissionsCount,
        settings: form.settings,
        deployments: form.deployments || [],
        activities: form.activities || [],
        hasUnpublishedChanges: !deployedVersion || Boolean(form.draft && form.draft.updatedAt > (deployedVersion?.updatedAt ? new Date(deployedVersion.updatedAt) : new Date(0))),
        createdAt: formJson.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: formJson.updatedAt?.toISOString?.() || new Date().toISOString(),
      });
    }

    return results;
  }

  async findOne(userId: string, formId: string, tenantId?: string): Promise<FormDto> {
    if (!Types.ObjectId.isValid(formId)) {
      throw new NotFoundException('Form not found');
    }

    const form = await this.formModel.findById(formId).exec();
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    const formJson = form.toJSON();
    const deployedVersionIdStr = form.deployedVersionId ? form.deployedVersionId.toString() : null;

    const versions = await this.formVersionModel
      .find({ formId: form._id })
      .sort({ versionNumber: 1 })
      .exec();

    const submissionsCount = await this.formSubmissionModel.countDocuments({ formId: form._id });

    const draft = this.ensureDraft(form, versions);
    if (!form.draft) {
      await form.save();
    }

    const versionDtos: FormVersionDto[] = versions.map((v) => {
      const vJson = v.toJSON();
      const isDeployed = vJson.id === deployedVersionIdStr;
      return {
        id: vJson.id,
        formId: formJson.id,
        tenantId: form.tenantId,
        versionNumber: vJson.versionNumber,
        title: vJson.title,
        elements: vJson.elements || [],
        sections: vJson.sections || [],
        formLayout: (vJson.formLayout as LayoutDirection) || 'column',
        customCss: vJson.customCss || '',
        isDeployed,
        createdAt: vJson.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: vJson.updatedAt?.toISOString?.() || new Date().toISOString(),
      };
    });

    let deployedVersionDto: FormVersionDto | null = null;
    if (deployedVersionIdStr) {
      deployedVersionDto = versionDtos.find((v) => v.id === deployedVersionIdStr) || null;
    }

    let hasUnpublishedChanges = true;
    if (deployedVersionDto) {
      const draftMatchesDeployed =
        draft.title === deployedVersionDto.title &&
        draft.formLayout === deployedVersionDto.formLayout &&
        draft.customCss === deployedVersionDto.customCss &&
        JSON.stringify(draft.sections || []) === JSON.stringify(deployedVersionDto.sections || []);
      hasUnpublishedChanges = !draftMatchesDeployed;
    }

    return {
      id: formJson.id,
      name: formJson.name,
      userId: formJson.userId.toString(),
      tenantId: form.tenantId,
      publicId: formJson.publicId,
      draft,
      deployedVersionId: deployedVersionIdStr,
      deployedVersion: deployedVersionDto,
      versions: versionDtos,
      versionsCount: versionDtos.length,
      submissionsCount,
      settings: form.settings,
      deployments: form.deployments || [],
      activities: form.activities || [],
      hasUnpublishedChanges,
      createdAt: formJson.createdAt?.toISOString?.() || new Date().toISOString(),
      updatedAt: formJson.updatedAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  async updateDraft(
    userId: string,
    formId: string,
    dto: UpdateDraftDto,
    tenantId?: string,
  ): Promise<FormDto> {
    if (!Types.ObjectId.isValid(formId)) {
      throw new NotFoundException('Form not found');
    }

    const form = await this.formModel.findById(formId).exec();
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    const currentDraft = this.ensureDraft(form);
    const title = dto.title !== undefined ? dto.title : currentDraft.title;
    const elements = dto.elements !== undefined ? dto.elements : currentDraft.elements;
    const sections = dto.sections !== undefined ? dto.sections : currentDraft.sections;
    const formLayout = dto.formLayout !== undefined ? dto.formLayout : currentDraft.formLayout;
    const customCss = dto.customCss !== undefined ? sanitizeCustomCss(dto.customCss) : currentDraft.customCss;

    form.draft = {
      title,
      elements,
      sections,
      formLayout,
      customCss,
      updatedAt: new Date(),
    };

    form.updatedAt = new Date();
    await form.save();

    return this.findOne(userId, formId, tenantId);
  }

  async deployDraft(userId: string, formId: string, tenantId?: string): Promise<FormDto> {
    if (!Types.ObjectId.isValid(formId)) {
      throw new NotFoundException('Form not found');
    }

    const form = await this.formModel.findById(formId).exec();
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    const draft = this.ensureDraft(form);

    if (draft.sections && draft.sections.length > 0) {
      const duplicates = checkDuplicateReferences(draft.sections);
      if (duplicates.length > 0) {
        throw new BadRequestException(
          `Deployment blocked: duplicate field reference(s) found: [${duplicates.join(', ')}]. Each field reference must be unique across the entire form.`,
        );
      }
    }

    const elements = draft.sections && draft.sections.length > 0
      ? extractAllElements(draft.sections)
      : (draft.elements || []);

    const activeTenantId = form.tenantId || tenantId || userId;

    // Concurrency Protection & Atomic Version Increment
    let newVersion: FormVersionDocument | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (!newVersion && attempts < maxAttempts) {
      attempts++;
      const latestVersion = await this.formVersionModel
        .findOne({ formId: form._id })
        .sort({ versionNumber: -1 })
        .exec();

      const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

      try {
        newVersion = await this.formVersionModel.create({
          formId: form._id,
          tenantId: activeTenantId,
          versionNumber: nextVersionNumber,
          title: draft.title || form.name,
          elements,
          sections: draft.sections || [],
          formLayout: draft.formLayout || 'column',
          customCss: draft.customCss || '',
        });
      } catch (err: any) {
        // E11000 duplicate key error on concurrent deployments
        if (err.code === 11000 && attempts < maxAttempts) {
          continue; // Retry with next increment
        }
        throw new ConflictException('Concurrent deployment detected. Please retry.');
      }
    }

    if (!newVersion) {
      throw new ConflictException('Could not allocate a unique version number. Please retry.');
    }

    form.deployedVersionId = newVersion._id as any;
    form.updatedAt = new Date();

    const previousDeployments = (form.deployments || []).map((d: any) => ({
      ...d,
      isCurrent: false,
    }));

    const newDeployment = {
      id: `dep_${randomBytes(4).toString('hex')}`,
      formId: form._id.toString(),
      versionId: newVersion._id.toString(),
      versionNumber: newVersion.versionNumber,
      deployedAt: new Date().toISOString(),
      deployedBy: 'Workspace Member',
      isCurrent: true,
      notes: `Production deployment of Version ${newVersion.versionNumber}`,
    };

    form.deployments = [newDeployment, ...previousDeployments];

    const activity = {
      id: `act_${randomBytes(4).toString('hex')}`,
      formId: form._id.toString(),
      type: 'version_deployed',
      title: `Version ${newVersion.versionNumber} deployed`,
      description: `Version ${newVersion.versionNumber} ("${newVersion.title}") was published to production.`,
      timestamp: new Date().toISOString(),
      versionNumber: newVersion.versionNumber,
    };
    form.activities = [activity, ...(form.activities || [])];

    await form.save();

    await this.auditService.log({
      action: 'form:deploy',
      actorId: userId,
      tenantId: activeTenantId,
      resource: 'form_version',
      resourceId: newVersion._id.toString(),
      result: 'SUCCESS',
      details: {
        formId: form._id.toString(),
        versionNumber: newVersion.versionNumber,
        title: newVersion.title,
      },
    });

    return this.findOne(userId, formId, tenantId);
  }

  async deployVersion(userId: string, formId: string, versionId?: string, tenantId?: string): Promise<FormDto> {
    if (!versionId) {
      return this.deployDraft(userId, formId, tenantId);
    }

    if (!Types.ObjectId.isValid(formId) || !Types.ObjectId.isValid(versionId)) {
      throw new NotFoundException('Form or version not found');
    }

    const form = await this.formModel.findById(formId).exec();
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    const version = await this.formVersionModel.findOne({
      _id: new Types.ObjectId(versionId),
      formId: form._id,
    });

    if (!version) {
      return this.deployDraft(userId, formId, tenantId);
    }

    form.deployedVersionId = version._id as any;
    form.updatedAt = new Date();

    const previousDeployments = (form.deployments || []).map((d: any) => ({
      ...d,
      isCurrent: false,
    }));

    const newDeployment = {
      id: `dep_${randomBytes(4).toString('hex')}`,
      formId: form._id.toString(),
      versionId: version._id.toString(),
      versionNumber: version.versionNumber,
      deployedAt: new Date().toISOString(),
      deployedBy: 'Workspace Member',
      isCurrent: true,
      notes: `Re-activated Version ${version.versionNumber} for production`,
    };

    form.deployments = [newDeployment, ...previousDeployments];

    const activity = {
      id: `act_${randomBytes(4).toString('hex')}`,
      formId: form._id.toString(),
      type: 'version_deployed',
      title: `Version ${version.versionNumber} re-activated`,
      description: `Historical Version ${version.versionNumber} was re-activated for production.`,
      timestamp: new Date().toISOString(),
      versionNumber: version.versionNumber,
    };
    form.activities = [activity, ...(form.activities || [])];

    await form.save();

    await this.auditService.log({
      action: 'form:rollback',
      actorId: userId,
      tenantId: form.tenantId || tenantId || userId,
      resource: 'form_version',
      resourceId: version._id.toString(),
      result: 'SUCCESS',
      details: {
        formId: form._id.toString(),
        versionNumber: version.versionNumber,
      },
    });

    return this.findOne(userId, formId, tenantId);
  }

  async updateSettings(
    userId: string,
    formId: string,
    dto: UpdateSettingsDto,
    tenantId?: string,
  ): Promise<FormDto> {
    if (!Types.ObjectId.isValid(formId)) {
      throw new NotFoundException('Form not found');
    }

    const form = await this.formModel.findById(formId).exec();
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    // SSRF Validation on Webhook URL
    if (dto.webhookUrl && dto.webhookUrl.trim() !== '') {
      dto.webhookUrl = await validateSafeUrl(dto.webhookUrl.trim());
    }

    form.settings = {
      ...(form.settings || {}),
      ...dto,
    };

    form.updatedAt = new Date();
    await form.save();

    await this.auditService.log({
      action: 'form:settings_updated',
      actorId: userId,
      tenantId: form.tenantId || tenantId || userId,
      resource: 'form',
      resourceId: form._id.toString(),
      result: 'SUCCESS',
      details: { settingsKeys: Object.keys(dto) },
    });

    return this.findOne(userId, formId, tenantId);
  }

  // Compatibility stubs
  async createVersion(userId: string, formId: string, dto: CreateVersionDto, tenantId?: string): Promise<FormVersionDto> {
    if (dto.title || dto.sections || dto.elements) {
      await this.updateDraft(userId, formId, dto, tenantId);
    }
    const updatedForm = await this.deployDraft(userId, formId, tenantId);
    return updatedForm.deployedVersion!;
  }

  async updateVersion(userId: string, formId: string, _versionId: string, dto: UpdateVersionDto, tenantId?: string): Promise<FormVersionDto> {
    const updatedForm = await this.updateDraft(userId, formId, dto, tenantId);
    const draft = updatedForm.draft!;
    return {
      id: 'draft',
      formId: updatedForm.id,
      tenantId: updatedForm.tenantId,
      versionNumber: (updatedForm.versions?.length || 0) + 1,
      title: draft.title,
      elements: draft.elements,
      sections: draft.sections,
      formLayout: draft.formLayout,
      customCss: draft.customCss,
      isDeployed: false,
      createdAt: draft.updatedAt || new Date().toISOString(),
      updatedAt: draft.updatedAt || new Date().toISOString(),
    };
  }

  async duplicateVersion(userId: string, formId: string, versionId: string, tenantId?: string): Promise<FormVersionDto> {
    if (!Types.ObjectId.isValid(formId) || !Types.ObjectId.isValid(versionId)) {
      throw new NotFoundException('Form or version not found');
    }

    const form = await this.formModel.findById(formId).exec();
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
      throw new ForbiddenException('You do not have access to this form');
    }

    const version = await this.formVersionModel.findOne({
      _id: new Types.ObjectId(versionId),
      formId: form._id,
    });

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    return this.updateVersion(userId, formId, versionId, {
      title: `${version.title} (Copy)`,
      elements: version.elements,
      sections: version.sections,
      formLayout: version.formLayout,
      customCss: version.customCss,
    }, tenantId);
  }
}
