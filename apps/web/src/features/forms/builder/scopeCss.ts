import { sanitizeCustomCss } from '@saas/shared';

/**
 * Safely scope CSS rules to a specific container selector to prevent
 * user-defined custom styles from leaking into the builder UI or other forms.
 */
export function scopeCss(rawCss: string, scopeSelector: string): string {
  if (!rawCss || !rawCss.trim()) return '';

  const cleanCss = sanitizeCustomCss(rawCss).trim();
  const trimmedScope = scopeSelector.trim();

  // Helper to prefix comma-separated selectors
  const prefixSelectors = (selectors: string): string => {
    return selectors
      .split(',')
      .map((sel) => {
        const s = sel.trim();
        if (!s) return '';
        // If the selector targets the root or self container directly
        if (s === ':root' || s === '&' || s === trimmedScope) {
          return trimmedScope;
        }
        if (s.startsWith('&')) {
          return `${trimmedScope}${s.slice(1)}`;
        }
        return `${trimmedScope} ${s}`;
      })
      .filter(Boolean)
      .join(', ');
  };

  // Process rules token by token
  let result = '';
  let i = 0;
  const len = cleanCss.length;

  while (i < len) {
    // Skip comments
    if (cleanCss.slice(i, i + 2) === '/*') {
      const closeComment = cleanCss.indexOf('*/', i + 2);
      if (closeComment === -1) {
        break;
      }
      i = closeComment + 2;
      continue;
    }

    // Find next block open '{'
    const openBrace = cleanCss.indexOf('{', i);
    if (openBrace === -1) {
      break;
    }

    const prelude = cleanCss.slice(i, openBrace).trim();
    i = openBrace + 1;

    // Check for @-rules
    if (prelude.startsWith('@')) {
      if (prelude.startsWith('@keyframes') || prelude.startsWith('@font-face') || prelude.startsWith('@import')) {
        // Find matching closing brace for keyframes / font-face
        let braceCount = 1;
        const blockStart = i;
        while (i < len && braceCount > 0) {
          if (cleanCss[i] === '{') braceCount++;
          else if (cleanCss[i] === '}') braceCount--;
          i++;
        }
        const blockContent = cleanCss.slice(blockStart, i - 1);
        result += `${prelude} { ${blockContent} }\n`;
        continue;
      }

      if (prelude.startsWith('@media') || prelude.startsWith('@supports')) {
        // Inside @media, find matching closing brace
        let braceCount = 1;
        const blockStart = i;
        while (i < len && braceCount > 0) {
          if (cleanCss[i] === '{') braceCount++;
          else if (cleanCss[i] === '}') braceCount--;
          i++;
        }
        const innerContent = cleanCss.slice(blockStart, i - 1);
        // Recursively scope the inner rules of @media
        const scopedInner = scopeCss(innerContent, trimmedScope);
        result += `${prelude} {\n${scopedInner}\n}\n`;
        continue;
      }
    }

    // Normal CSS rule
    let braceCount = 1;
    const bodyStart = i;
    while (i < len && braceCount > 0) {
      if (cleanCss[i] === '{') braceCount++;
      else if (cleanCss[i] === '}') braceCount--;
      i++;
    }
    const declarations = cleanCss.slice(bodyStart, i - 1).trim();
    const scopedSelector = prefixSelectors(prelude);
    if (scopedSelector && declarations) {
      result += `${scopedSelector} {\n  ${declarations}\n}\n`;
    }
  }

  return result;
}
