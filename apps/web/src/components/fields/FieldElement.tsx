import React, { useId } from 'react';
import { FormElement } from '@saas/shared';
import {
  FormField,
  FormLabel,
  Input,
  Select,
  Textarea,
  Button,
} from '../index';

export interface FieldElementProps {
  element: FormElement;
  value?: any;
  onChange?: (val: any) => void;
  disabled?: boolean;
  error?: string;
  onButtonClick?: () => void;
}

export const FieldElement: React.FC<FieldElementProps> = ({
  element,
  value,
  onChange,
  disabled = false,
  error,
  onButtonClick,
}) => {
  const radioGroupId = useId();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    if (!onChange) return;
    if (element.type === 'checkbox') {
      onChange((e.target as HTMLInputElement).checked);
    } else if (element.type === 'file') {
      const files = (e.target as HTMLInputElement).files;
      onChange(files && files.length > 0 ? files[0].name : '');
    } else {
      onChange(e.target.value);
    }
  };

  // Validation Status & Feedback
  let validationStatus: 'valid' | 'invalid' | null = null;
  let validationMessage: string | null = null;

  if (error) {
    validationStatus = 'invalid';
    validationMessage = error;
  } else if (
    element.validation?.enabled &&
    element.validation.pattern &&
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ''
  ) {
    try {
      const reg = new RegExp(element.validation.pattern);
      if (reg.test(String(value))) {
        validationStatus = 'valid';
        validationMessage = element.validation.successMessage || 'Field is valid';
      } else {
        validationStatus = 'invalid';
        validationMessage = element.validation.errorMessage || 'Field format is invalid';
      }
    } catch {
      // ignore regex error
    }
  }

  // Non-Interactive Elements
  if (element.type === 'title') {
    const level = element.headingLevel || 2;
    const content = element.content || element.label || 'Section Heading';
    if (level === 1) {
      return (
        <h1
          style={{
            margin: 'var(--space-2) 0 var(--space-1) 0',
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.02em',
          }}
        >
          {content}
        </h1>
      );
    }
    if (level === 3) {
      return (
        <h3
          style={{
            margin: 'var(--space-2) 0 var(--space-1) 0',
            fontSize: 'var(--font-size-base)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
          }}
        >
          {content}
        </h3>
      );
    }
    return (
      <h2
        style={{
          margin: 'var(--space-2) 0 var(--space-1) 0',
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}
      >
        {content}
      </h2>
    );
  }

  if (element.type === 'description') {
    return (
      <p
        style={{
          margin: 'var(--space-1) 0 var(--space-2) 0',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}
      >
        {element.content || element.label || 'Instructive text or notes.'}
      </p>
    );
  }

  if (element.type === 'divider') {
    return (
      <hr
        style={{
          border: 'none',
          borderTop: '0.0625rem solid var(--color-border)',
          margin: 'var(--space-3) 0',
        }}
      />
    );
  }

  if (element.type === 'spacer') {
    return <div style={{ height: 'var(--space-6)', width: '100%' }} />;
  }

  if (element.type === 'alert') {
    const variant = element.alertVariant || 'info';
    const bgMap = {
      info: 'rgba(2, 132, 199, 0.08)',
      warning: 'rgba(217, 119, 6, 0.08)',
      success: 'rgba(5, 150, 105, 0.08)',
    };
    const borderMap = {
      info: 'rgba(2, 132, 199, 0.3)',
      warning: 'rgba(217, 119, 6, 0.3)',
      success: 'rgba(5, 150, 105, 0.3)',
    };
    const iconMap = {
      info: 'info',
      warning: 'warning',
      success: 'check_circle',
    };
    const colorMap = {
      info: '#0284c7',
      warning: '#d97706',
      success: '#059669',
    };

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: bgMap[variant],
          border: `1px solid ${borderMap[variant]}`,
          borderRadius: 'var(--radius-md)',
          margin: 'var(--space-2) 0',
        }}
      >
        <span className="material-icon" style={{ color: colorMap[variant], fontSize: '20px', flexShrink: 0 }}>
          {iconMap[variant]}
        </span>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
          {element.content || element.label || 'Notice'}
        </div>
      </div>
    );
  }

  // Interactive Button Element
  if (element.type === 'button') {
    const btnAction = element.buttonAction || 'submit';
    const btnText = element.buttonText || element.label || (btnAction === 'submit' ? 'Submit' : 'Click');
    const isPrimary = btnAction === 'submit';

    return (
      <div style={{ margin: 'var(--space-2) 0' }}>
        <Button
          type={btnAction === 'submit' ? 'submit' : 'button'}
          variant={isPrimary ? 'primary' : 'secondary'}
          disabled={disabled}
          onClick={onButtonClick}
          style={{ width: '100%' }}
        >
          {btnText}
        </Button>
      </div>
    );
  }

  // Interactive Form Data Fields
  const fieldId = `field_${element.id}`;
  const labelText = element.label || element.name || 'Untitled Field';

  const fieldStyle: React.CSSProperties = {
    margin: 0,
    width: element.customWidth || '100%',
    maxWidth: '100%',
    minHeight: element.customHeight || undefined,
    boxSizing: 'border-box',
  };

  // Determine effective value:
  // If `value` prop is explicitly provided (not undefined and not null), use it.
  // Otherwise, fall back to element.defaultValue.
  const hasProvidedValue = value !== undefined && value !== null;
  const effectiveValue = hasProvidedValue
    ? value
    : (element.defaultValue !== undefined && element.defaultValue !== null ? element.defaultValue : '');

  return (
    <FormField style={fieldStyle}>
      <FormLabel htmlFor={fieldId} required={element.required}>
        {labelText}
      </FormLabel>

      {/* TEXT / EMAIL / NUMBER / PHONE */}
      {(element.type === 'text' ||
        element.type === 'email' ||
        element.type === 'number' ||
        element.type === 'phone') && (
        <Input
          id={fieldId}
          type={element.type === 'number' ? 'number' : element.type === 'email' ? 'email' : element.type === 'phone' ? 'tel' : 'text'}
          placeholder={element.placeholder || ''}
          value={effectiveValue}
          onChange={handleChange}
          disabled={disabled}
          required={element.required}
          min={element.validation?.min}
          max={element.validation?.max}
          minLength={element.validation?.minLength}
          maxLength={element.validation?.maxLength}
          style={{
            height: element.customHeight || undefined,
            borderColor: validationStatus === 'invalid' ? 'var(--color-danger)' : validationStatus === 'valid' ? 'var(--color-success)' : undefined,
          }}
        />
      )}

      {/* TEXTAREA */}
      {element.type === 'textarea' && (
        <Textarea
          id={fieldId}
          placeholder={element.placeholder || ''}
          value={effectiveValue}
          onChange={handleChange}
          disabled={disabled}
          required={element.required}
          rows={3}
          style={{
            borderColor: validationStatus === 'invalid' ? 'var(--color-danger)' : validationStatus === 'valid' ? 'var(--color-success)' : undefined,
          }}
        />
      )}

      {/* SELECT (SINGLE & MULTI) */}
      {element.type === 'select' && !element.multiple && (
        <Select
          id={fieldId}
          value={effectiveValue}
          onChange={handleChange}
          disabled={disabled}
          required={element.required}
          style={{
            borderColor: validationStatus === 'invalid' ? 'var(--color-danger)' : validationStatus === 'valid' ? 'var(--color-success)' : undefined,
          }}
        >
          <option value="">{element.placeholder || 'Select an option...'}</option>
          {(element.options || ['Option 1', 'Option 2', 'Option 3']).map((opt, idx) => (
            <option key={idx} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      )}

      {element.type === 'select' && element.multiple && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
          {(element.options || ['Option 1', 'Option 2', 'Option 3']).map((opt, idx) => {
            const rawMulti = hasProvidedValue ? value : element.defaultValue;
            const selectedList: string[] = Array.isArray(rawMulti)
              ? rawMulti
              : (rawMulti !== undefined && rawMulti !== null && rawMulti !== '')
              ? [String(rawMulti)]
              : [];
            const isSelected = selectedList.includes(opt);
            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!onChange) return;
                  const updated = isSelected
                    ? selectedList.filter((item) => item !== opt)
                    : [...selectedList, opt];
                  onChange(updated);
                }}
                style={{
                  padding: 'var(--space-1.5) var(--space-3)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'var(--color-bg-secondary)',
                  color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <span className="material-icon" style={{ fontSize: '14px' }}>check</span>}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* DATE */}
      {element.type === 'date' && (
        <Input
          id={fieldId}
          type="date"
          value={effectiveValue}
          onChange={handleChange}
          disabled={disabled}
          required={element.required}
          style={{
            borderColor: validationStatus === 'invalid' ? 'var(--color-danger)' : validationStatus === 'valid' ? 'var(--color-success)' : undefined,
          }}
        />
      )}

      {/* FILE */}
      {element.type === 'file' && (
        <div
          style={{
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-4)',
            textAlign: 'center',
            backgroundColor: 'var(--color-bg-secondary)',
          }}
        >
          <span className="material-icon" style={{ fontSize: '24px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            cloud_upload
          </span>
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
            {value ? `Selected file: ${value}` : element.defaultValue ? `Default file: ${element.defaultValue}` : 'Upload file from device'}
          </div>
          <input
            id={fieldId}
            type="file"
            onChange={handleChange}
            disabled={disabled}
            required={element.required}
            style={{ fontSize: 'var(--size-xs, 12px)' }}
          />
        </div>
      )}

      {/* RADIO */}
      {element.type === 'radio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
          {(element.options || ['Option 1', 'Option 2']).map((opt, idx) => {
            const currentRadioVal = hasProvidedValue ? value : element.defaultValue;
            const isChecked = currentRadioVal === opt;
            return (
              <label
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-text-primary)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="radio"
                  name={radioGroupId}
                  value={opt}
                  checked={isChecked}
                  onChange={() => onChange && onChange(opt)}
                  disabled={disabled}
                  required={element.required && !currentRadioVal}
                  style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {/* CHECKBOX */}
      {element.type === 'checkbox' && (
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-primary)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            marginTop: 'var(--space-1)',
          }}
        >
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(hasProvidedValue ? value : (element.defaultValue !== undefined ? element.defaultValue : false))}
            onChange={handleChange}
            disabled={disabled}
            required={element.required}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          <span>{element.placeholder || 'Confirm / Acknowledge'}</span>
        </label>
      )}

      {/* Validation Message / Error */}
      {validationMessage && (
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: validationStatus === 'valid' ? 'var(--color-success)' : 'var(--color-danger)',
            marginTop: 'var(--space-1)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span className="material-icon" style={{ fontSize: '13px' }}>
            {validationStatus === 'valid' ? 'check_circle' : 'error'}
          </span>
          <span>{validationMessage}</span>
        </div>
      )}

      {/* Helper Text */}
      {element.helperText && !validationMessage && (
        <div
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
            marginTop: 'var(--space-1)',
          }}
        >
          {element.helperText}
        </div>
      )}
    </FormField>
  );
};
