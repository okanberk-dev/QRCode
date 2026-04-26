// Phase 6 — per-field length validation for mail template content.
//
// Goals:
//   - Stop spam-filter triggers: subject >100 chars makes Gmail truncate
//     and inflates spam score; preheader >200 same story.
//   - Stop layout breaks: a 300-char eyebrow wraps into 4 lines and
//     destroys the hero pulseLayout.
//   - Reasonable bodies: multiline intros are usually ≤300 chars; 1000
//     is generous breathing room without being a novel.
//
// Numbers are deliberately loose — the goal is to catch obvious abuse
// (admin paste-bombs an entire blog post into the eyebrow), not to nag
// over a 5-char overage.

export interface FieldValidation {
  maxLength?: number;
  minLength?: number;
}

/**
 * Per-key explicit overrides take priority. Field names that don't match
 * any explicit rule fall through to `getValidationByPattern()` which
 * inspects the key for hints (`*subject*`, `*Eyebrow*`, etc.) and
 * applies an appropriate cap.
 */
const EXPLICIT: Record<string, FieldValidation> = {
  subject: { maxLength: 100 },
  preheader: { maxLength: 200 },
  intro: { maxLength: 1000 },
  cta: { maxLength: 60 },
  primaryCta: { maxLength: 60 },
  secondaryCta: { maxLength: 60 },
  comparisonLink: { maxLength: 60 },
  exploreCta: { maxLength: 60 },
  demoLink: { maxLength: 80 },
  featuredOpen: { maxLength: 60 },
  // Single-line headlines (rendered as h1/h2) — wrap >80 chars looks bad.
  title: { maxLength: 80 },
  titleA: { maxLength: 80 },
  titleB: { maxLength: 80 },
  titleSub: { maxLength: 80 },
  titleSubA: { maxLength: 80 },
  titleSubB: { maxLength: 80 },
  titleSubItalic: { maxLength: 80 },
  titleAccent: { maxLength: 60 },
  titleEnd: { maxLength: 80 },
  titleHi: { maxLength: 80 },
  // Body / multiline.
  futureBody: { maxLength: 600 },
  detailSub: { maxLength: 400 },
  couponTitle: { maxLength: 200 },
  couponDescDefault: { maxLength: 400 },
  sideBodyA: { maxLength: 400 },
  sideBodyB: { maxLength: 400 },
};

/**
 * Pattern-based fallback when a key isn't in `EXPLICIT`. Order matters:
 * `Body` matches before `Eyebrow` so a hypothetical `bodyEyebrow` (none
 * exists today) gets the body rule.
 */
function getValidationByPattern(key: string): FieldValidation {
  const lower = key.toLowerCase();
  if (lower.includes('body')) return { maxLength: 400 };
  if (lower.includes('eyebrow') || lower === 'pillgroup') return { maxLength: 80 };
  if (lower.endsWith('cta') || lower.endsWith('link')) return { maxLength: 60 };
  if (lower.includes('label')) return { maxLength: 60 };
  if (lower.includes('title')) return { maxLength: 80 };
  // Default cap. Anything left is a chrome string (hint, badge, status
  // pill, side card eyebrow). 200 is generous; spam triggers don't apply.
  return { maxLength: 200 };
}

export function getFieldValidation(key: string): FieldValidation {
  return EXPLICIT[key] ?? getValidationByPattern(key);
}

/**
 * Validate one field; returns null when valid, structured error
 * otherwise. Empty values pass — empty means "fall back to inline
 * default" per the existing PATCH cleaner contract.
 */
export function validateField(
  key: string,
  value: string,
): { reason: 'too_long' | 'too_short'; max?: number; min?: number; actual: number } | null {
  if (value.length === 0) return null;
  const rules = getFieldValidation(key);
  if (rules.maxLength !== undefined && value.length > rules.maxLength) {
    return { reason: 'too_long', max: rules.maxLength, actual: value.length };
  }
  if (rules.minLength !== undefined && value.length < rules.minLength) {
    return { reason: 'too_short', min: rules.minLength, actual: value.length };
  }
  return null;
}

/**
 * Walk a content object (flat or form-confirmation nested) and return
 * the first invalid field. Stops at first violation so the API error
 * stays actionable; UI shows one issue at a time.
 */
export function findInvalidField(
  content: Record<string, unknown>,
): {
  field: string;
  reason: 'too_long' | 'too_short';
  max?: number;
  min?: number;
  actual: number;
} | null {
  for (const [k, v] of Object.entries(content)) {
    if (typeof v === 'string') {
      const result = validateField(k, v);
      if (result) return { field: k, ...result };
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      // form-confirmation nested
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        if (typeof iv === 'string') {
          const result = validateField(ik, iv);
          if (result) return { field: `${k}.${ik}`, ...result };
        }
      }
    }
  }
  return null;
}
