import React from 'react';
import {
  FormSection,
  FormElement,
  LayoutDirection,
  getZoneWidthPercent,
  getZoneFlexStyles,
  evaluateConditionGroup,
} from '@saas/shared';
import { FieldElement } from '../../../components';
import { scopeCss } from '../builder/scopeCss';
import './PublicFormView.scss';

export interface PublicFormViewProps {
  formLayout?: LayoutDirection;
  sections?: FormSection[];
  elements?: FormElement[];
  values: Record<string, any>;
  onChange: (fieldKey: string, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  isSubmitting?: boolean;
  customCss?: string;
  formId?: string;
  onSubmit: (e: React.FormEvent) => void;
  previewDevice?: 'desktop' | 'tablet' | 'mobile';
}

export const PublicFormView: React.FC<PublicFormViewProps> = ({
  formLayout = 'column',
  sections = [],
  elements = [],
  values,
  onChange,
  errors = {},
  disabled = false,
  isSubmitting = false,
  customCss = '',
  formId,
  onSubmit,
  previewDevice = 'desktop',
}) => {
  const scopeClass = formId ? `form-scope-${formId}` : 'form-scope-public';
  const scopedStyles = React.useMemo(() => {
    return customCss ? scopeCss(customCss, `.${scopeClass}`) : '';
  }, [customCss, scopeClass]);

  // Check if schema already contains an interactive submit button
  const allElements =
    sections.length > 0
      ? sections.flatMap((s) => s.zones.flatMap((z) => z.elements))
      : elements;

  const hasExplicitSubmitButton = allElements.some(
    (el) => el.type === 'button' && (el.buttonAction === 'submit' || !el.buttonAction),
  );

  return (
    <div className={`public-form-root ${scopeClass} public-form-root--device-${previewDevice}`}>
      {/* Scoped Custom CSS */}
      {scopedStyles && <style dangerouslySetInnerHTML={{ __html: scopedStyles }} />}

      <form onSubmit={onSubmit} noValidate className="public-form-body">
        {sections.length > 0 ? (
          <div className={`public-sections-container public-sections-container--${formLayout}`}>
            {sections
              .filter((section) => evaluateConditionGroup(section.conditions, values))
              .map((section) => (
                <div
                  key={section.id}
                  className="public-section-card"
                  style={{
                    width: section.customWidth || undefined,
                    maxWidth: '100%',
                    minHeight: section.customHeight || undefined,
                    boxSizing: 'border-box',
                  }}
                >
                  {section.title && (
                    <h2 className="public-section-title">
                      {section.title}
                    </h2>
                  )}

                  <div className={`public-zones-container public-zones-container--${section.layout}`}>
                    {section.zones
                      .filter((zone) => evaluateConditionGroup(zone.conditions, values))
                      .map((zone) => {
                        const preset = zone.responsiveWidth[previewDevice] || 'full';
                        const customVal =
                          previewDevice === 'desktop'
                            ? zone.responsiveWidth.desktopCustom
                            : previewDevice === 'tablet'
                            ? zone.responsiveWidth.tabletCustom
                            : zone.responsiveWidth.mobileCustom;

                        const widthPercent = getZoneWidthPercent(preset, customVal);
                        const gapRatio = (1 - widthPercent / 100).toFixed(4);
                        const calcWidth =
                          widthPercent >= 100
                            ? '100%'
                            : `calc(${widthPercent}% - (var(--space-3) * ${gapRatio}))`;

                        const zoneFlex = getZoneFlexStyles(
                          zone.layout,
                          zone.alignment,
                          zone.horizontalAlign,
                          zone.verticalAlign,
                        );

                        const zoneStyle: React.CSSProperties = {
                          ...(section.layout === 'row'
                            ? { flex: `0 0 ${calcWidth}`, width: calcWidth, maxWidth: calcWidth }
                            : { width: '100%' }),
                          minHeight: zone.customHeight || undefined,
                          boxSizing: 'border-box',
                          ...zoneFlex,
                        };

                        return (
                          <div key={zone.id} className="public-zone-card" style={zoneStyle}>
                            <div className={`public-elements-container public-elements-container--${zone.layout}`}>
                              {zone.elements
                                .filter((element) => evaluateConditionGroup(element.conditions, values))
                                .map((element) => {
                                  const fieldKey = element.reference || element.id;
                                  const rawVal = values[fieldKey] !== undefined ? values[fieldKey] : values[element.id];
                                  const fieldValue = rawVal !== undefined ? rawVal : element.defaultValue;
                                  const fieldError = errors[fieldKey] || errors[element.id];

                                  return (
                                    <div
                                      key={element.id}
                                      className="public-element-wrapper"
                                      style={{
                                        width: element.customWidth || '100%',
                                        maxWidth: '100%',
                                        minHeight: element.customHeight || undefined,
                                        boxSizing: 'border-box',
                                      }}
                                    >
                                      <FieldElement
                                        element={element}
                                        value={fieldValue}
                                        onChange={(val) => onChange(fieldKey, val)}
                                        error={fieldError}
                                        disabled={disabled || isSubmitting}
                                        onButtonClick={
                                          element.type === 'button' && element.buttonAction === 'submit'
                                            ? undefined
                                            : () => {}
                                        }
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="public-elements-container public-elements-container--column">
            {elements
              .filter((element) => evaluateConditionGroup(element.conditions, values))
              .map((element) => {
                const fieldKey = element.reference || element.id;
                const rawVal = values[fieldKey] !== undefined ? values[fieldKey] : values[element.id];
                const fieldValue = rawVal !== undefined ? rawVal : element.defaultValue;
                const fieldError = errors[fieldKey] || errors[element.id];

                return (
                  <div
                    key={element.id}
                    className="public-element-wrapper"
                    style={{
                      width: element.customWidth || '100%',
                      maxWidth: '100%',
                      minHeight: element.customHeight || undefined,
                      boxSizing: 'border-box',
                    }}
                  >
                    <FieldElement
                      element={element}
                      value={fieldValue}
                      onChange={(val) => onChange(fieldKey, val)}
                      error={fieldError}
                      disabled={disabled || isSubmitting}
                    />
                  </div>
                );
              })}
          </div>
        )}

        {/* Fallback Submit Button if form schema does not have one embedded */}
        {!hasExplicitSubmitButton && (
          <div className="public-form-submit-row">
            <button
              type="submit"
              disabled={disabled || isSubmitting}
              className="public-form-submit-btn"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Form'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
