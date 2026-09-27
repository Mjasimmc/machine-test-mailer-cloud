import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { Form, FormDocument } from '../forms/schemas/form.schema';
import { FormVersion, FormVersionDocument } from '../forms/schemas/form-version.schema';
import { PublicFormDto } from '@saas/shared';

export interface RuntimeFormResult {
  dto: PublicFormDto;
  etag: string;
  lastModified: Date;
}

@Injectable()
export class RuntimeService {
  constructor(
    @InjectModel(Form.name) private readonly formModel: Model<FormDocument>,
    @InjectModel(FormVersion.name) private readonly formVersionModel: Model<FormVersionDocument>,
  ) {}

  async getPublicForm(publicId: string): Promise<RuntimeFormResult> {
    const form = await this.formModel.findOne({ publicId }).lean().exec();
    if (!form) {
      throw new NotFoundException(`Public form with ID "${publicId}" not found`);
    }

    const formUpdatedDate = form.updatedAt ? new Date(form.updatedAt) : new Date();

    if (!form.deployedVersionId) {
      const dto: PublicFormDto = {
        publicId: form.publicId,
        name: form.name,
        title: form.name,
        elements: [],
        sections: [],
        formLayout: 'column',
        customCss: '',
        isDeployed: false,
        updatedAt: formUpdatedDate.toISOString(),
      };
      return {
        dto,
        etag: `"undeployed-${form._id}"`,
        lastModified: formUpdatedDate,
      };
    }

    // Isolate public runtime strictly to the immutable deployed version snapshot
    const deployedVersion = await this.formVersionModel.findById(form.deployedVersionId).lean().exec();
    if (!deployedVersion) {
      const dto: PublicFormDto = {
        publicId: form.publicId,
        name: form.name,
        title: form.name,
        elements: [],
        sections: [],
        formLayout: 'column',
        customCss: '',
        isDeployed: false,
        updatedAt: formUpdatedDate.toISOString(),
      };
      return {
        dto,
        etag: `"missing-version-${form._id}"`,
        lastModified: formUpdatedDate,
      };
    }

    const versionDate = deployedVersion.updatedAt || new Date();
    // Strong deterministic ETag based on immutable version content hash
    const contentToHash = `${deployedVersion._id.toString()}-v${deployedVersion.versionNumber}-${versionDate.getTime()}`;
    const strongEtag = `"${createHash('sha256').update(contentToHash).digest('hex')}"`;

    const dto: PublicFormDto = {
      publicId: form.publicId,
      name: form.name,
      title: deployedVersion.title,
      elements: deployedVersion.elements || [],
      sections: deployedVersion.sections || [],
      formLayout: deployedVersion.formLayout || 'column',
      customCss: deployedVersion.customCss || '',
      isDeployed: true,
      updatedAt: versionDate.toISOString(),
    };

    return {
      dto,
      etag: strongEtag,
      lastModified: versionDate,
    };
  }
}

