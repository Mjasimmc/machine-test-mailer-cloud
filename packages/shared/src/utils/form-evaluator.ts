import {
  DeviceViewMode,
  FieldConditionGroup,
  HorizontalAlignment,
  LayoutDirection,
  ResponsiveZoneWidth,
  VerticalAlignment,
  ZoneAlignment,
  ZoneWidthPreset,
} from '../types/form-ast';

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

export function getZoneResponsiveWidthStyle(
  responsiveWidth?: ResponsiveZoneWidth,
  device: DeviceViewMode = 'desktop',
): { width: string; flexBasis: string; maxWidth: string; boxSizing: 'border-box' } {
  if (!responsiveWidth) {
    return {
      width: '100%',
      flexBasis: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box',
    };
  }

  let preset: ZoneWidthPreset = 'full';
  let custom: number | undefined;

  if (device === 'mobile') {
    preset = responsiveWidth.mobile || 'full';
    custom = responsiveWidth.mobileCustom;
  } else if (device === 'tablet') {
    preset = responsiveWidth.tablet || 'full';
    custom = responsiveWidth.tabletCustom;
  } else {
    preset = responsiveWidth.desktop || 'full';
    custom = responsiveWidth.desktopCustom;
  }

  const num = getZoneWidthPercent(preset, custom);
  const widthVal = `${num}%`;

  return {
    width: widthVal,
    flexBasis: widthVal,
    maxWidth: '100%',
    boxSizing: 'border-box',
  };
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
        justifyContent =
          horizontalAlign === 'start'
            ? 'flex-start'
            : horizontalAlign === 'end'
              ? 'flex-end'
              : horizontalAlign;
      } else {
        alignItems =
          horizontalAlign === 'start'
            ? 'flex-start'
            : horizontalAlign === 'end'
              ? 'flex-end'
              : horizontalAlign === 'center'
                ? 'center'
                : undefined;
      }
    }
    if (verticalAlign) {
      if (layout === 'row') {
        alignItems =
          verticalAlign === 'start'
            ? 'flex-start'
            : verticalAlign === 'end'
              ? 'flex-end'
              : verticalAlign;
      } else {
        justifyContent =
          verticalAlign === 'start'
            ? 'flex-start'
            : verticalAlign === 'end'
              ? 'flex-end'
              : verticalAlign === 'center'
                ? 'center'
                : undefined;
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
  const isAny = matchType === 'any';

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const rawVal = formValues[rule.fieldIdOrReference];
    const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal) : '';
    const targetStr = rule.value !== undefined && rule.value !== null ? String(rule.value) : '';

    let matched = true;
    switch (rule.operator) {
      case 'equals':
        matched = valStr.trim().toLowerCase() === targetStr.trim().toLowerCase();
        break;
      case 'not_equals':
        matched = valStr.trim().toLowerCase() !== targetStr.trim().toLowerCase();
        break;
      case 'contains':
        matched = valStr.toLowerCase().includes(targetStr.toLowerCase());
        break;
      case 'not_contains':
        matched = !valStr.toLowerCase().includes(targetStr.toLowerCase());
        break;
      case 'greater_than':
        matched = Number(valStr) > Number(targetStr);
        break;
      case 'less_than':
        matched = Number(valStr) < Number(targetStr);
        break;
      case 'is_empty':
        matched = valStr.trim() === '' || (Array.isArray(rawVal) && rawVal.length === 0);
        break;
      case 'is_not_empty':
        matched = valStr.trim() !== '' && (!Array.isArray(rawVal) || rawVal.length > 0);
        break;
      default:
        matched = true;
    }

    if (isAny && matched) {
      return action === 'show';
    }
    if (!isAny && !matched) {
      return action !== 'show';
    }
  }

  const isMatch = !isAny;
  return action === 'show' ? isMatch : !isMatch;
}
