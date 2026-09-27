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
  tablet?: ZoneWidthPreset;
  tabletCustom?: number;
  mobile?: ZoneWidthPreset;
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
  responsiveWidth?: ResponsiveZoneWidth;
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

export type DeviceViewMode = 'desktop' | 'tablet' | 'mobile';
