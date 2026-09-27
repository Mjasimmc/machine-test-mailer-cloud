import { FieldDataType, FormElement, FormElementType, FormSection } from '../types/form-ast';

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

const INTERACTIVE_SET = new Set<string>(INTERACTIVE_ELEMENT_TYPES);
const DATA_FIELD_SET = new Set<string>(INTERACTIVE_ELEMENT_TYPES.filter((t) => t !== 'button'));

export const NON_INTERACTIVE_ELEMENT_TYPES: readonly FormElementType[] = [
  'title',
  'description',
  'divider',
  'alert',
  'spacer',
] as const;

export function isInteractiveElement(type: FormElementType): boolean {
  return INTERACTIVE_SET.has(type);
}

export function isDataField(type: FormElementType): boolean {
  return DATA_FIELD_SET.has(type);
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

export function generateElementId(type: string): string {
  return `el_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateZoneId(): string {
  return `zone_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateSectionId(): string {
  return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateReference(name: string): string {
  if (!name || !name.trim()) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function generateFieldReference(label: string): string {
  return generateReference(label).substring(0, 32);
}

export function extractAllElements(sections: FormSection[]): FormElement[] {
  const elements: FormElement[] = [];
  if (!sections) return elements;
  for (let s = 0; s < sections.length; s++) {
    const sec = sections[s];
    if (!sec?.zones) continue;
    for (let z = 0; z < sec.zones.length; z++) {
      const zone = sec.zones[z];
      if (!zone?.elements) continue;
      for (let e = 0; e < zone.elements.length; e++) {
        elements.push(zone.elements[e]);
      }
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

  for (let i = 0; i < dataElements.length; i++) {
    const el = dataElements[i];
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
