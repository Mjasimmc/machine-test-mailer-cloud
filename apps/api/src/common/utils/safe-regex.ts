export interface SafeRegexResult {
  matches: boolean;
  error?: string;
}

// Patterns containing dangerous nested quantifiers prone to catastrophic backtracking
const DANGEROUS_NESTED_QUANTIFIERS = [
  /\([^)]*(\+|\*)\)[+*]/,          // e.g. (a+)+ or (x*)*
  /\([^)]*(\+|\*)\)\{[0-9]+,\}/,    // e.g. (a+){2,}
  /\[[^\]]*\](\+|\*)\{[0-9]+,\}/,
];

export function validateRegexPattern(pattern: string): { isValid: boolean; reason?: string } {
  if (!pattern || pattern.length > 250) {
    return { isValid: false, reason: 'Regex pattern is too long (maximum 250 characters)' };
  }

  for (const dangerous of DANGEROUS_NESTED_QUANTIFIERS) {
    if (dangerous.test(pattern)) {
      return { isValid: false, reason: 'Regex pattern contains potentially dangerous nested quantifiers (ReDoS risk)' };
    }
  }

  try {
    new RegExp(pattern);
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, reason: `Malformed regex pattern: ${err.message}` };
  }
}

const REGEX_CACHE_MAX = 200;
const compiledRegexCache = new Map<string, RegExp>();

function getCompiledRegex(pattern: string): RegExp {
  let cached = compiledRegexCache.get(pattern);
  if (!cached) {
    if (compiledRegexCache.size >= REGEX_CACHE_MAX) {
      const firstKey = compiledRegexCache.keys().next().value;
      if (firstKey) compiledRegexCache.delete(firstKey);
    }
    cached = new RegExp(pattern);
    compiledRegexCache.set(pattern, cached);
  }
  return cached;
}

export function safeRegexTest(pattern: string, input: string, maxInputLength = 1000): SafeRegexResult {
  if (input.length > maxInputLength) {
    return { matches: false, error: `Input exceeds maximum length of ${maxInputLength} characters` };
  }

  const validation = validateRegexPattern(pattern);
  if (!validation.isValid) {
    return { matches: false, error: validation.reason };
  }

  try {
    const regex = getCompiledRegex(pattern);
    const matches = regex.test(input);
    return { matches };
  } catch (err: any) {
    return { matches: false, error: `Evaluation error: ${err.message}` };
  }
}
