import { FormElement, FormSection, LayoutDirection } from '../types/form-ast';
import { extractAllElements, getDataTypeForElementType, isDataField } from './form-traversal';

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
              label: 'Sample Text Input',
              placeholder: 'Enter text here...',
              required: true,
              helperText: 'A standard single line text input',
            },
            {
              id: 'el_email_1',
              type: 'email',
              name: 'Email Address',
              reference: 'email_address',
              isReferenceManual: false,
              dataType: 'text',
              label: 'Email Address',
              placeholder: 'user@example.com',
              required: true,
              helperText: 'Must be a valid email format',
              validation: {
                enabled: true,
                pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
                errorMessage: 'Please enter a valid email address',
                successMessage: 'Email format looks good!',
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
              id: 'el_num_1',
              type: 'number',
              name: 'Quantity',
              reference: 'quantity',
              isReferenceManual: false,
              dataType: 'number',
              label: 'Quantity / Number',
              placeholder: '10',
              required: false,
              helperText: 'Enter any numerical value',
              validation: {
                enabled: true,
                min: 1,
                max: 1000,
                errorMessage: 'Value must be between 1 and 1000',
              },
            },
            {
              id: 'el_date_1',
              type: 'date',
              name: 'Event Date',
              reference: 'event_date',
              isReferenceManual: false,
              dataType: 'date',
              label: 'Event Date',
              required: false,
              helperText: 'Pick an applicable date',
            },
          ],
        },
      ],
    },
    {
      id: 'sec_options_section',
      name: 'Options & Actions',
      title: 'Section 2: Choices & Confirmation',
      layout: 'column',
      zones: [
        {
          id: 'zone_choices',
          name: 'Dropdown & Textarea',
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
              name: 'Department',
              reference: 'department',
              isReferenceManual: false,
              dataType: 'text',
              label: 'Select Department',
              options: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales'],
              required: true,
              helperText: 'Select your organizational department',
            },
            {
              id: 'el_textarea_1',
              type: 'textarea',
              name: 'Additional Comments',
              reference: 'comments',
              isReferenceManual: false,
              dataType: 'text',
              label: 'Additional Comments',
              placeholder: 'Provide any additional details or notes...',
              required: false,
            },
            {
              id: 'el_check_1',
              type: 'checkbox',
              name: 'Terms Acceptance',
              reference: 'accept_terms',
              isReferenceManual: false,
              dataType: 'boolean',
              label: 'I confirm that the information provided is accurate',
              required: false,
            },
            {
              id: 'el_btn_submit',
              type: 'button',
              label: 'Submit Application',
              buttonText: 'Submit Application',
              buttonAction: 'submit',
            },
          ],
        },
      ],
    },
  ];

  return {
    formLayout: 'column',
    sections,
    elements: extractAllElements(sections),
  };
}

export function formatSubmissionData(
  elements: FormElement[],
  rawValues: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (!isDataField(el.type)) continue;
    const key = el.reference || el.id;
    const rawVal =
      rawValues[key] !== undefined
        ? rawValues[key]
        : rawValues[el.id] !== undefined
          ? rawValues[el.id]
          : el.defaultValue;
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
