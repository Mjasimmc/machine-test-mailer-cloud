import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { Form, FormDocument } from '../forms/schemas/form.schema';
import { FormVersion, FormVersionDocument } from '../forms/schemas/form-version.schema';
import {
  FormSubmission,
  FormSubmissionDocument,
} from '../forms/schemas/form-submission.schema';
import {
  FormDataViewDto,
  FormDataColumnDto,
  FormDataRowDto,
  FormElement,
  FormSection,
  GetFormDataQueryDto,
  evaluateConditionGroup,
} from '@saas/shared';
import { SubmitFormDto } from '../forms/dto/submit-form.dto';
import { QueueService } from '../infrastructure/queue/queue.service';
import { RedisService } from '../infrastructure/redis/redis.service';
import { safeRegexTest } from '../common/utils/safe-regex';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectModel(Form.name) private readonly formModel: Model<FormDocument>,
    @InjectModel(FormVersion.name) private readonly formVersionModel: Model<FormVersionDocument>,
    @InjectModel(FormSubmission.name) private readonly formSubmissionModel: Model<FormSubmissionDocument>,
    private readonly queueService: QueueService,
    private readonly redisService: RedisService,
  ) {}

  private validateSubmissionPayload(data: Record<string, any>): void {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException('Submission data must be an object');
    }

    const keys = Object.keys(data);
    if (keys.length > 200) {
      throw new BadRequestException('Submission contains too many fields (maximum 200 fields allowed)');
    }

    for (const key of keys) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new BadRequestException('Invalid submission field key detected');
      }

      if (key.length > 100) {
        throw new BadRequestException(`Field key "${key.substring(0, 20)}..." exceeds maximum allowed length of 100 characters`);
      }

      const val = data[key];
      if (typeof val === 'string' && val.length > 50000) {
        throw new BadRequestException(`Field "${key}" exceeds maximum allowed length of 50,000 characters`);
      }

      if (Array.isArray(val) && val.length > 100) {
        throw new BadRequestException(`Field "${key}" contains too many items (maximum 100 items allowed)`);
      }
    }
  }

  async submit(
    publicId: string,
    dto: SubmitFormDto,
    idempotencyKey?: string,
  ): Promise<{ message: string; id: string }> {
    const redisIdempotencyKey = idempotencyKey && idempotencyKey.trim()
      ? `saas:idempotency:${publicId}:${idempotencyKey.trim()}`
      : null;

    if (redisIdempotencyKey) {
      const cached = await this.redisService.get(redisIdempotencyKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // fallback to processing if cached value corrupt
        }
      }
    }

    const form = await this.formModel.findOne({ publicId }).exec();
    if (!form) {
      throw new NotFoundException(`Public form with ID "${publicId}" not found`);
    }

    if (!form.deployedVersionId) {
      throw new BadRequestException('This form has not been deployed yet and cannot accept submissions');
    }

    const settings = form.settings || {};
    if (settings.isAcceptingSubmissions === false) {
      throw new BadRequestException(
        settings.closedMessage || 'This form is currently closed and not accepting new responses.',
      );
    }

    if (settings.submissionLimit && settings.submissionLimit > 0) {
      const existingCount = await this.formSubmissionModel.countDocuments({ formId: form._id });
      if (existingCount >= settings.submissionLimit) {
        throw new BadRequestException(
          'This form has reached its maximum submission limit and is no longer accepting responses.',
        );
      }
    }

    const deployedVersion = await this.formVersionModel.findById(form.deployedVersionId).exec();
    if (!deployedVersion) {
      throw new BadRequestException('The deployed version for this form is unavailable');
    }

    // Payload limits and anti-abuse validation
    this.validateSubmissionPayload(dto.data || {});

    // Server-side validation against the deployed immutable version schema
    const elements: FormElement[] = [];
    if (deployedVersion.sections && deployedVersion.sections.length > 0) {
      for (const section of deployedVersion.sections) {
        for (const zone of section.zones || []) {
          for (const el of zone.elements || []) {
            elements.push(el);
          }
        }
      }
    } else if (deployedVersion.elements && deployedVersion.elements.length > 0) {
      elements.push(...deployedVersion.elements);
    }

    const submittedData = dto.data || {};

    for (const el of elements) {
      const isDataField =
        el.type !== 'button' &&
        el.type !== 'title' &&
        el.type !== 'description' &&
        el.type !== 'divider' &&
        el.type !== 'spacer' &&
        el.type !== 'alert';

      if (!isDataField) continue;

      // Skip validation if field is conditionally hidden
      const isVisible = evaluateConditionGroup(el.conditions, submittedData);
      if (!isVisible) continue;

      const fieldKey = el.reference || el.id;
      const rawVal = submittedData[fieldKey] !== undefined ? submittedData[fieldKey] : submittedData[el.id];

      // Required check
      if (el.required) {
        const isEmpty =
          rawVal === undefined ||
          rawVal === null ||
          rawVal === '' ||
          (Array.isArray(rawVal) && rawVal.length === 0);

        if (isEmpty) {
          throw new BadRequestException(`Field "${el.label || el.name || fieldKey}" is required`);
        }
      }

      // Safe Regex validation pattern check (ReDoS-safe)
      if (el.validation?.enabled && el.validation.pattern && rawVal !== undefined && rawVal !== null && rawVal !== '') {
        const regexResult = safeRegexTest(el.validation.pattern, String(rawVal), 5000);
        if (!regexResult.matches) {
          throw new BadRequestException(
            el.validation.errorMessage || regexResult.error || `Field "${el.label || el.name || fieldKey}" has an invalid format`,
          );
        }
      }

      // Strict Option Validation for select and radio fields
      if (
        (el.type === 'select' || el.type === 'radio') &&
        el.options &&
        el.options.length > 0 &&
        rawVal !== undefined &&
        rawVal !== null &&
        rawVal !== ''
      ) {
        const strVal = String(rawVal);
        if (!el.options.includes(strVal)) {
          throw new BadRequestException(
            `Field "${el.label || el.name || fieldKey}" must be one of: [${el.options.join(', ')}]`,
          );
        }
      }
    }

    // Derive tenant identity server-side from form
    const tenantId = form.tenantId || form.userId.toString();

    // Canonicalize submitted data to eliminate redundant duplicated keys
    const canonicalData: Record<string, any> = {};
    for (const el of elements) {
      const isDataField =
        el.type !== 'button' &&
        el.type !== 'title' &&
        el.type !== 'description' &&
        el.type !== 'divider' &&
        el.type !== 'spacer' &&
        el.type !== 'alert';

      if (!isDataField) continue;

      const fieldKey = el.reference || el.id;
      const rawVal = submittedData[fieldKey] !== undefined ? submittedData[fieldKey] : submittedData[el.id];
      if (rawVal !== undefined) {
        canonicalData[fieldKey] = rawVal;
      }
    }

    // Persist immutable submission record linked permanently to the versionId and tenantId
    const submission = await this.formSubmissionModel.create({
      formId: form._id,
      tenantId,
      versionId: deployedVersion._id,
      data: canonicalData,
    });

    // Record submission activity on Form document
    const activity = {
      id: `act_${randomBytes(4).toString('hex')}`,
      formId: form._id.toString(),
      type: 'submission_received',
      title: 'New submission received',
      description: `Submission recorded under Version ${deployedVersion.versionNumber}.`,
      timestamp: new Date().toISOString(),
      versionNumber: deployedVersion.versionNumber,
    };

    await this.formModel.updateOne(
      { _id: form._id },
      { $push: { activities: { $each: [activity], $position: 0 } } },
    );

    // Asynchronously dispatch webhook notification if configured
    if (settings.webhookUrl) {
      await this.queueService.dispatch('webhook_notification', {
        url: settings.webhookUrl,
        formId: form._id.toString(),
        submissionId: submission._id.toString(),
        data: canonicalData,
      });
    }

    const response = {
      message: 'Submission received successfully',
      id: submission._id.toString(),
    };

    if (redisIdempotencyKey) {
      await this.redisService.set(redisIdempotencyKey, JSON.stringify(response), 86400);
    }

    return response;
  }

  async getDataView(
    userId: string,
    formId: string,
    tenantId?: string,
    query?: GetFormDataQueryDto,
  ): Promise<FormDataViewDto> {
    if (!Types.ObjectId.isValid(formId)) {
      throw new NotFoundException('Form not found');
    }

    const form = await this.formModel.findById(formId).exec();
    if (!form) {
      throw new NotFoundException('Form not found');
    }

    if (form.userId.toString() !== userId || (tenantId && form.tenantId && form.tenantId !== tenantId)) {
      throw new ForbiddenException('You do not have access to this form data');
    }

    // Query all versions ever deployed for this form in ascending order
    const allVersions = await this.formVersionModel
      .find({ formId: form._id })
      .sort({ versionNumber: 1 })
      .exec();

    const versionMap = new Map<string, number>();
    const versionNumberToIdMap = new Map<number, string>();
    for (const v of allVersions) {
      versionMap.set(v._id.toString(), v.versionNumber);
      versionNumberToIdMap.set(v.versionNumber, v._id.toString());
    }

    // Query all submissions for this form with tenant and version scoping
    const subFilter: any = { formId: form._id };
    if (tenantId) {
      subFilter.tenantId = tenantId;
    }

    if (query?.versionFilter && query.versionFilter !== 'all') {
      const vNum = parseInt(query.versionFilter, 10);
      const targetVersionId = versionNumberToIdMap.get(vNum);
      if (targetVersionId) {
        subFilter.versionId = targetVersionId;
      }
    }

    const totalCount = await this.formSubmissionModel.countDocuments(subFilter);

    const isPaginated = query?.page !== undefined || query?.limit !== undefined;
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 25));
    const skip = (page - 1) * limit;
    const sortDirection = query?.sortDirection === 'asc' ? 1 : -1;

    let subQuery = this.formSubmissionModel
      .find(subFilter)
      .sort({ createdAt: sortDirection });

    if (isPaginated) {
      subQuery = subQuery.skip(skip).limit(limit);
    }

    const submissions = await subQuery.exec();

    // Unified Column Accumulator with alias awareness
    interface InternalColumn {
      id: string;
      label: string;
      type: any;
      reference?: string;
      aliases: Set<string>;
    }

    const columns: InternalColumn[] = [];
    const keyToColumnMap = new Map<string, InternalColumn>();

    // Helper to extract form elements from any schema container (version or draft)
    const extractElements = (container: any): FormElement[] => {
      const els: FormElement[] = [];
      if (container?.sections && container.sections.length > 0) {
        for (const s of container.sections as FormSection[]) {
          for (const z of s.zones || []) {
            for (const el of z.elements || []) {
              els.push(el);
            }
          }
        }
      } else if (container?.elements && container.elements.length > 0) {
        els.push(...container.elements);
      }
      return els;
    };

    // Include historical versions first, then latest draft to capture field definitions
    const schemaContainers: any[] = [...allVersions];
    if (form.draft) {
      schemaContainers.push(form.draft);
    }

    for (const container of schemaContainers) {
      const els = extractElements(container);
      for (const el of els) {
        const isDataField =
          el.type !== 'button' &&
          el.type !== 'title' &&
          el.type !== 'description' &&
          el.type !== 'divider' &&
          el.type !== 'spacer' &&
          el.type !== 'alert';

        if (!isDataField) continue;

        // Check if an existing column matches by element ID or reference
        let existingCol: InternalColumn | undefined;
        if (el.id && keyToColumnMap.has(el.id)) {
          existingCol = keyToColumnMap.get(el.id);
        } else if (el.reference && keyToColumnMap.has(el.reference)) {
          existingCol = keyToColumnMap.get(el.reference);
        }

        if (existingCol) {
          // Merge element IDs and references as aliases for the same field
          if (el.id) {
            existingCol.aliases.add(el.id);
            keyToColumnMap.set(el.id, existingCol);
          }
          if (el.reference) {
            existingCol.aliases.add(el.reference);
            keyToColumnMap.set(el.reference, existingCol);
            existingCol.reference = el.reference;
            existingCol.id = el.reference;
          }
          if (el.label || el.name) {
            existingCol.label = el.label || el.name || existingCol.label;
          }
          existingCol.type = el.type;
        } else {
          const colId = el.reference || el.id;
          const newCol: InternalColumn = {
            id: colId,
            label: el.label || el.name || colId,
            type: el.type,
            reference: el.reference || undefined,
            aliases: new Set<string>(),
          };
          if (el.id) {
            newCol.aliases.add(el.id);
            keyToColumnMap.set(el.id, newCol);
          }
          if (el.reference) {
            newCol.aliases.add(el.reference);
            keyToColumnMap.set(el.reference, newCol);
          }
          newCol.aliases.add(colId);
          keyToColumnMap.set(colId, newCol);
          columns.push(newCol);
        }
      }
    }

    // Inspect submitted data for any extra dynamic fields that are genuinely unmapped
    for (const sub of submissions) {
      const data = sub.data || {};
      for (const rawKey of Object.keys(data)) {
        if (!keyToColumnMap.has(rawKey)) {
          const extraCol: InternalColumn = {
            id: rawKey,
            label: rawKey,
            type: 'text',
            reference: rawKey,
            aliases: new Set([rawKey]),
          };
          columns.push(extraCol);
          keyToColumnMap.set(rawKey, extraCol);
        }
      }
    }

    // Build unified rows with alias resolution
    const rows: FormDataRowDto[] = submissions.map((sub) => {
      const subJson = sub.toJSON();
      const versionNum = versionMap.get(sub.versionId?.toString()) || 1;
      const data = sub.data || {};

      const rowData: Record<string, any> = {};
      for (const col of columns) {
        // Resolve value checking primary ID, reference, and all known aliases
        let val = data[col.id];
        if ((val === undefined || val === null || val === '') && col.reference) {
          val = data[col.reference];
        }
        if (val === undefined || val === null || val === '') {
          for (const alias of col.aliases) {
            if (data[alias] !== undefined && data[alias] !== null && data[alias] !== '') {
              val = data[alias];
              break;
            }
          }
        }
        rowData[col.id] = val !== undefined && val !== null ? val : '';
      }

      return {
        id: subJson.id,
        submittedAt: subJson.createdAt?.toISOString?.() || new Date().toISOString(),
        versionNumber: versionNum,
        data: rowData,
      };
    });

    const resultColumns: FormDataColumnDto[] = columns.map((col) => ({
      id: col.id,
      label: col.label,
      type: col.type,
      reference: col.reference,
    }));

    return {
      formId: form._id.toString(),
      tenantId: form.tenantId,
      formName: form.name,
      totalCount,
      page: isPaginated ? page : 1,
      pageSize: isPaginated ? limit : totalCount,
      totalPages: isPaginated ? Math.ceil(totalCount / limit) || 1 : 1,
      columns: resultColumns,
      rows,
    };
  }
}
