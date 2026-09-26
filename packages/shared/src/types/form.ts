export type LayoutDirection = 'row' | 'column';

export type ZoneWidthPreset =
  | 'full'
  | 'three_quarters'
  | 'two_thirds'
  | 'half'
  | 'one_third'
  | 'one_quarter'
  | 'custom';

export interface ResponsiveZoneWidth {
  desktop: ZoneWidthPreset;
  desktopCustom?: number;
  tablet: ZoneWidthPreset;
  tabletCustom?: number;
  mobile: ZoneWidthPreset;
  mobileCustom?: number;
}

export type FormElementType =
  // Interactive Data Fields
  | 'text'
  | 'email'
  | 'number'
  | 'phone'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file'
  | 'button'
  // Non-Interactive Elements
  | 'title'
  | 'description'
  | 'divider'
  | 'alert'
  | 'spacer';

export type FieldDataType = 'text' | 'number' | 'date' | 'boolean' | 'file';

export interface FieldValidation {
  enabled: boolean;
  pattern?: string;
  errorMessage?: string;
  successMessage?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export interface FieldConditionRule {
  fieldIdOrReference: string;
  operator: ConditionOperator;
  value?: any;
}

export interface FieldConditionGroup {
  action: 'show' | 'hide';
  matchType: 'all' | 'any';
  rules: FieldConditionRule[];
}

export interface FormElement {
  id: string;
  type: FormElementType;
  name?: string;
  reference?: string;
  isReferenceManual?: boolean;
  dataType?: FieldDataType;
  label?: string;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  defaultValue?: any;
  multiple?: boolean;
  options?: string[]; // for select, radio
  buttonAction?: 'submit' | 'reset' | 'button'; // for button
  buttonText?: string;
  headingLevel?: 1 | 2 | 3; // for title
  content?: string; // for title, description, alert
  alertVariant?: 'info' | 'warning' | 'success'; // for alert
  validation?: FieldValidation;
  conditions?: FieldConditionGroup;
  colSpan?: number; // legacy backward compatibility
  customWidth?: string; // e.g. '100%', '50%', '300px' (max-width capped at 100%)
  customHeight?: string; // e.g. '40px', '120px', 'auto'
}

export type ZoneAlignment =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type HorizontalAlignment =
  | 'start'
  | 'center'
  | 'end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export type VerticalAlignment =
  | 'start'
  | 'center'
  | 'end'
  | 'stretch';

export interface FormZone {
  id: string;
  name?: string;
  layout: LayoutDirection; // controls element arrangement: 'column' | 'row'
  responsiveWidth: ResponsiveZoneWidth;
  alignment?: ZoneAlignment; // Visual 3x3 flex positioning
  horizontalAlign?: HorizontalAlignment;
  verticalAlign?: VerticalAlignment;
  customWidth?: string;
  customHeight?: string;
  conditions?: FieldConditionGroup;
  elements: FormElement[];
}

export interface FormSection {
  id: string;
  name?: string;
  title?: string;
  layout: LayoutDirection; // controls zone arrangement: 'row' | 'column'
  columns?: number; // Visual column count: 1, 2, 3, 4
  horizontalAlign?: HorizontalAlignment;
  verticalAlign?: VerticalAlignment;
  customWidth?: string;
  customHeight?: string;
  conditions?: FieldConditionGroup;
  zones: FormZone[];
}

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
  type: 'form_created' | 'version_created' | 'version_deployed' | 'field_updated' | 'submission_received' | 'settings_updated';
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

export function sanitizeCustomCss(rawCss?: string): string {
  if (!rawCss) return '';
  return rawCss
    .replace(/<\/?style[^>]*>/gi, '')
    .replace(/<\/?script[^>]*>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/@import\s+[^;]+;/gi, '')
    .replace(/url\s*\(\s*["']?\s*(?:javascript|data:text\/html)/gi, 'url(');
}

// ---------------------------------------------------------------------------
// Helpers & Utilities
// ---------------------------------------------------------------------------

export const INTERACTIVE_ELEMENT_TYPES: readonly FormElementType[] = [
  'text',
  'email',
  'number',
  'phone',
  'textarea',
  'select',
  'radio',
  'checkbox',
  'date',
  'file',
  'button',
] as const;

export const NON_INTERACTIVE_ELEMENT_TYPES: readonly FormElementType[] = [
  'title',
  'description',
  'divider',
  'alert',
  'spacer',
] as const;

export function isInteractiveElement(type: FormElementType): boolean {
  return INTERACTIVE_ELEMENT_TYPES.includes(type);
}

export function isDataField(type: FormElementType): boolean {
  return isInteractiveElement(type) && type !== 'button';
}

export function getDataTypeForElementType(type: FormElementType): FieldDataType | undefined {
  switch (type) {
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'checkbox':
      return 'boolean';
    case 'file':
      return 'file';
    case 'text':
    case 'email':
    case 'phone':
    case 'textarea':
    case 'select':
    case 'radio':
      return 'text';
    default:
      return undefined;
  }
}

export function generateReference(name: string): string {
  if (!name || !name.trim()) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function getZoneWidthPercent(preset: ZoneWidthPreset, customVal?: number): number {
  switch (preset) {
    case 'full':
      return 100;
    case 'three_quarters':
      return 75;
    case 'two_thirds':
      return 66.67;
    case 'half':
      return 50;
    case 'one_third':
      return 33.33;
    case 'one_quarter':
      return 25;
    case 'custom': {
      if (typeof customVal === 'number' && !isNaN(customVal)) {
        return Math.min(100, Math.max(10, Math.round(customVal * 10) / 10));
      }
      return 50;
    }
    default:
      return 100;
  }
}

export function extractAllElements(sections: FormSection[]): FormElement[] {
  const elements: FormElement[] = [];
  if (!sections) return elements;
  for (const sec of sections) {
    if (!sec.zones) continue;
    for (const zone of sec.zones) {
      if (!zone.elements) continue;
      elements.push(...zone.elements);
    }
  }
  return elements;
}

export function extractInteractiveElements(sections: FormSection[]): FormElement[] {
  return extractAllElements(sections).filter((el) => isDataField(el.type));
}

export function checkDuplicateReferences(sections: FormSection[]): string[] {
  const dataElements = extractInteractiveElements(sections);
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const el of dataElements) {
    const ref = (el.reference || el.id).trim();
    if (!ref) continue;
    if (seen.has(ref)) {
      duplicates.add(ref);
    } else {
      seen.add(ref);
    }
  }

  return Array.from(duplicates);
}

export function getRealisticDefaultForm(title = 'Sample Form'): {
  formLayout: LayoutDirection;
  sections: FormSection[];
  elements: FormElement[];
} {
  const sections: FormSection[] = [
    {
      id: 'sec_general_fields',
      name: 'General Inputs',
      title: title || 'Section 1: General Fields',
      layout: 'row',
      zones: [
        {
          id: 'zone_text_inputs',
          name: 'Text & Email Zone',
          layout: 'column',
          responsiveWidth: {
            desktop: 'half',
            tablet: 'full',
            mobile: 'full',
          },
          elements: [
            {
              id: 'el_title_1',
              type: 'title',
              headingLevel: 2,
              content: 'Primary Fields',
            },
            {
              id: 'el_desc_1',
              type: 'description',
              content: 'This section demonstrates standard text inputs, email validation, and numeric fields.',
            },
            {
              id: 'el_text_1',
              type: 'text',
              name: 'Sample Text',
              reference: 'sample_text',
              isReferenceManual: false,
              dataType: 'text',
              label: 'Sample Text Field',
              placeholder: 'Enter text...',
              required: true,
              helperText: 'Single-line text input field',
            },
            {
              id: 'el_email_1',
              type: 'email',
              name: 'Email Address',
              reference: 'email_address',
              isReferenceManual: false,
              dataType: 'text',
              label: 'Email Address',
              placeholder: 'name@example.com',
              required: true,
              helperText: 'Validates standard email address format',
              validation: {
                enabled: true,
                pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
                errorMessage: 'Please enter a valid email format',
                successMessage: 'Email format is valid',
              },
            },
          ],
        },
        {
          id: 'zone_numeric_date',
          name: 'Numeric & Date Zone',
          layout: 'column',
          responsiveWidth: {
            desktop: 'half',
            tablet: 'full',
            mobile: 'full',
          },
          elements: [
            {
              id: 'el_number_1',
              type: 'number',
              name: 'Numeric Value',
              reference: 'numeric_value',
              isReferenceManual: false,
              dataType: 'number',
              label: 'Numeric Value',
              placeholder: '100',
              required: false,
              helperText: 'Accepts integer or decimal input',
            },
            {
              id: 'el_date_1',
              type: 'date',
              name: 'Date Field',
              reference: 'date_entry',
              isReferenceManual: false,
              dataType: 'date',
              label: 'Select Date',
              required: false,
              helperText: 'Calendar date picker field',
            },
          ],
        },
      ],
    },
    {
      id: 'sec_options_submission',
      name: 'Options & Actions',
      title: 'Section 2: Selection & Submission',
      layout: 'column',
      zones: [
        {
          id: 'zone_actions',
          name: 'Actions Zone',
          layout: 'column',
          responsiveWidth: {
            desktop: 'full',
            tablet: 'full',
            mobile: 'full',
          },
          elements: [
            {
              id: 'el_divider_1',
              type: 'divider',
            },
            {
              id: 'el_select_1',
              type: 'select',
              name: 'Choice Selection',
              reference: 'selected_option',
              isReferenceManual: false,
              dataType: 'text',
              label: 'Select Option',
              options: ['Option A', 'Option B', 'Option C'],
              required: true,
              helperText: 'Single selection dropdown list',
            },
            {
              id: 'el_textarea_1',
              type: 'textarea',
              name: 'Detailed Notes',
              reference: 'detailed_notes',
              isReferenceManual: false,
              dataType: 'text',
              label: 'Detailed Notes',
              placeholder: 'Enter additional text, notes, or comments here...',
              required: false,
            },
            {
              id: 'el_checkbox_1',
              type: 'checkbox',
              name: 'Confirmation Checkbox',
              reference: 'confirmation_flag',
              isReferenceManual: false,
              dataType: 'boolean',
              label: 'I confirm and acknowledge this entry',
              required: false,
            },
            {
              id: 'el_submit_btn',
              type: 'button',
              label: 'Submit Form',
              buttonText: 'Submit Form',
              buttonAction: 'submit',
            },
          ],
        },
      ],
    },
  ];

  const elements = extractAllElements(sections);

  return {
    formLayout: 'column',
    sections,
    elements,
  };
}

export function formatSubmissionData(
  elements: FormElement[],
  rawValues: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const el of elements) {
    if (!isDataField(el.type)) continue;
    const key = el.reference || el.id;
    const rawVal = rawValues[key] !== undefined ? rawValues[key] : (rawValues[el.id] !== undefined ? rawValues[el.id] : el.defaultValue);
    if (rawVal === undefined || rawVal === null || rawVal === '') continue;

    const dataType = el.dataType || getDataTypeForElementType(el.type);
    if (dataType === 'number') {
      const num = Number(rawVal);
      result[key] = !isNaN(num) ? num : rawVal;
    } else if (dataType === 'boolean') {
      result[key] = Boolean(rawVal);
    } else {
      result[key] = rawVal;
    }
  }
  return result;
}

export function getZoneFlexStyles(
  layout: LayoutDirection,
  alignment?: ZoneAlignment,
  horizontalAlign?: HorizontalAlignment,
  verticalAlign?: VerticalAlignment,
): { justifyContent?: string; alignItems?: string } {
  let justifyContent: string | undefined;
  let alignItems: string | undefined;

  if (alignment) {
    switch (alignment) {
      case 'top-left':
        justifyContent = 'flex-start';
        alignItems = 'flex-start';
        break;
      case 'top-center':
        justifyContent = layout === 'row' ? 'center' : 'flex-start';
        alignItems = layout === 'row' ? 'flex-start' : 'center';
        break;
      case 'top-right':
        justifyContent = layout === 'row' ? 'flex-end' : 'flex-start';
        alignItems = layout === 'row' ? 'flex-start' : 'flex-end';
        break;
      case 'center-left':
        justifyContent = layout === 'row' ? 'flex-start' : 'center';
        alignItems = layout === 'row' ? 'center' : 'flex-start';
        break;
      case 'center':
        justifyContent = 'center';
        alignItems = 'center';
        break;
      case 'center-right':
        justifyContent = layout === 'row' ? 'flex-end' : 'center';
        alignItems = layout === 'row' ? 'center' : 'flex-end';
        break;
      case 'bottom-left':
        justifyContent = layout === 'row' ? 'flex-start' : 'flex-end';
        alignItems = layout === 'row' ? 'flex-end' : 'flex-start';
        break;
      case 'bottom-center':
        justifyContent = layout === 'row' ? 'center' : 'flex-end';
        alignItems = layout === 'row' ? 'flex-end' : 'center';
        break;
      case 'bottom-right':
        justifyContent = 'flex-end';
        alignItems = 'flex-end';
        break;
    }
  } else {
    if (horizontalAlign) {
      if (layout === 'row') {
        justifyContent = horizontalAlign === 'start' ? 'flex-start' : horizontalAlign === 'end' ? 'flex-end' : horizontalAlign;
      } else {
        alignItems = horizontalAlign === 'start' ? 'flex-start' : horizontalAlign === 'end' ? 'flex-end' : horizontalAlign === 'center' ? 'center' : undefined;
      }
    }
    if (verticalAlign) {
      if (layout === 'row') {
        alignItems = verticalAlign === 'start' ? 'flex-start' : verticalAlign === 'end' ? 'flex-end' : verticalAlign;
      } else {
        justifyContent = verticalAlign === 'start' ? 'flex-start' : verticalAlign === 'end' ? 'flex-end' : verticalAlign === 'center' ? 'center' : undefined;
      }
    }
  }

  return { justifyContent, alignItems };
}

export function evaluateConditionGroup(
  conditions: FieldConditionGroup | undefined,
  formValues: Record<string, any>,
): boolean {
  if (!conditions || !conditions.rules || conditions.rules.length === 0) {
    return true;
  }

  const { action, matchType, rules } = conditions;

  const ruleResults = rules.map((rule) => {
    const rawVal = formValues[rule.fieldIdOrReference];
    const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
    const targetStr = rule.value !== undefined && rule.value !== null ? String(rule.value) : '';

    switch (rule.operator) {
      case 'equals':
        return valStr.trim().toLowerCase() === targetStr.trim().toLowerCase();
      case 'not_equals':
        return valStr.trim().toLowerCase() !== targetStr.trim().toLowerCase();
      case 'contains':
        return valStr.toLowerCase().includes(targetStr.toLowerCase());
      case 'not_contains':
        return !valStr.toLowerCase().includes(targetStr.toLowerCase());
      case 'greater_than':
        return Number(valStr) > Number(targetStr);
      case 'less_than':
        return Number(valStr) < Number(targetStr);
      case 'is_empty':
        return valStr.trim() === '' || (Array.isArray(rawVal) && rawVal.length === 0);
      case 'is_not_empty':
        return valStr.trim() !== '' && (!Array.isArray(rawVal) || rawVal.length > 0);
      default:
        return true;
    }
  });

  const isMatch =
    matchType === 'any' ? ruleResults.some(Boolean) : ruleResults.every(Boolean);

  return action === 'show' ? isMatch : !isMatch;
}

