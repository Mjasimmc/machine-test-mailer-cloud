import { FormElement, FormElementType, FormSection, LayoutDirection } from './form-ast';

export interface FormVersionDto {
  id: string;
  formId: string;
  tenantId?: string;
  versionNumber: number;
  title: string;
  elements: FormElement[];
  sections?: FormSection[];
  formLayout?: LayoutDirection;
  customCss?: string;
  isDeployed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormSettingsDto {
  submissionLimit?: number | null;
  allowMultipleSubmissions?: boolean;
  successMessage?: string;
  redirectUrl?: string;
  closedMessage?: string;
  isAcceptingSubmissions?: boolean;
  notifyOnSubmission?: boolean;
  notificationEmails?: string[];
  webhookUrl?: string;
}

export interface FormDeploymentDto {
  id: string;
  formId: string;
  versionId: string;
  versionNumber: number;
  deployedAt: string;
  deployedBy?: string;
  isCurrent: boolean;
  notes?: string;
}

export interface FormActivityDto {
  id: string;
  formId: string;
  type:
    | 'form_created'
    | 'version_created'
    | 'version_deployed'
    | 'field_updated'
    | 'submission_received'
    | 'settings_updated';
  title: string;
  description: string;
  timestamp: string;
  actor?: string;
  versionNumber?: number;
  metadata?: Record<string, any>;
}

export interface FormDraftDto {
  title: string;
  elements: FormElement[];
  sections?: FormSection[];
  formLayout?: LayoutDirection;
  customCss?: string;
  updatedAt?: string;
}

export interface FormDto {
  id: string;
  name: string;
  userId: string;
  tenantId?: string;
  publicId: string;
  draft?: FormDraftDto;
  deployedVersionId: string | null;
  deployedVersion?: FormVersionDto | null;
  versions?: FormVersionDto[];
  versionsCount?: number;
  submissionsCount?: number;
  settings?: FormSettingsDto;
  deployments?: FormDeploymentDto[];
  activities?: FormActivityDto[];
  hasUnpublishedChanges?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicFormDto {
  name: string;
  title: string | null;
  elements: FormElement[];
  sections?: FormSection[];
  formLayout?: LayoutDirection;
  customCss?: string;
  isDeployed: boolean;
  publicId: string;
  updatedAt: string;
}

export interface CreateFormDto {
  name: string;
}

export interface UpdateDraftDto {
  title?: string;
  elements?: FormElement[];
  sections?: FormSection[];
  formLayout?: LayoutDirection;
  customCss?: string;
}

export interface CreateVersionDto {
  title?: string;
  elements?: FormElement[];
  sections?: FormSection[];
  formLayout?: LayoutDirection;
  customCss?: string;
}

export interface UpdateVersionDto {
  title?: string;
  elements?: FormElement[];
  sections?: FormSection[];
  formLayout?: LayoutDirection;
  customCss?: string;
}

export interface SubmitFormDto {
  data: Record<string, any>;
}

export interface FormSubmissionDto {
  id: string;
  formId: string;
  tenantId?: string;
  versionId: string;
  versionNumber?: number;
  data: Record<string, any>;
  createdAt: string;
}

export interface FormDataColumnDto {
  id: string;
  label: string;
  type: FormElementType;
  reference?: string;
}

export interface FormDataRowDto {
  id: string;
  submittedAt: string;
  versionNumber?: number;
  data: Record<string, any>;
}

export interface FormDataViewDto {
  formId: string;
  tenantId?: string;
  formName: string;
  columns: FormDataColumnDto[];
  rows: FormDataRowDto[];
  totalCount: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface GetFormDataQueryDto {
  page?: number;
  limit?: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  versionFilter?: string;
  search?: string;
}
