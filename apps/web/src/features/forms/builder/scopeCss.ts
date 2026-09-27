import { sanitizeCustomCss } from '@saas/shared';

const scopedCssCache = new Map<string, string>();
const MAX_CACHE_SIZE = 150;

/**
 * Safely scope CSS rules to a specific container selector to prevent
 * user-defined custom styles from leaking into the builder UI or other forms.
 * Features an internal LRU-bounded cache for rapid re-renders.
 */
export function scopeCss(rawCss: string, scopeSelector: string): string {
  if (!rawCss || !rawCss.trim()) return '';

  const trimmedScope = scopeSelector.trim();
  const cacheKey = `${trimmedScope}:::${rawCss}`;

  const cached = scopedCssCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const cleanCss = sanitizeCustomCss(rawCss).trim();

  // Helper to prefix comma-separated selectors
  const prefixSelectors = (selectors: string): string => {
    if (!selectors) return '';
    const parts = selectors.split(',');
    let out = '';
    for (let j = 0; j < parts.length; j++) {
      const s = parts[j].trim();
      if (!s) continue;
      let prefixed: string;
      if (s === ':root' || s === '&' || s === trimmedScope) {
        prefixed = trimmedScope;
      } else if (s.charCodeAt(0) === 38 /* '&' */) {
        prefixed = `${trimmedScope}${s.slice(1)}`;
      } else {
        prefixed = `${trimmedScope} ${s}`;
      }
      out = out ? `${out}, ${prefixed}` : prefixed;
    }
    return out;
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

  if (scopedCssCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = scopedCssCache.keys().next().value;
    if (oldestKey) scopedCssCache.delete(oldestKey);
  }
  scopedCssCache.set(cacheKey, result);

  return result;
}
