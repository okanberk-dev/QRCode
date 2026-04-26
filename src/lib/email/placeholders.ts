// Phase 4 — Dynamic placeholder injection for admin-editable mail copy.
//
// Admin can write `${firstName}` literal in the CMS; at render time we
// substitute the runtime value. Whitelisted per template — typo'lu / izinsiz
// placeholder admin tarafına validation error olarak döner, runtime sessizce
// boş string'e indirgenir (graceful degradation).

import { escapeHtml } from './escape';

// Per-template whitelist. Yeni placeholder eklerken:
//   1) Bu listeye ekle
//   2) İlgili render fn'inde `vars` object'ine değeri map et
//   3) Editor `FieldDef.placeholders` array'ine ekle (UI hint için)
export const MAIL_PLACEHOLDERS = {
  welcome: ['firstName'],
  newsletter: ['firstName'],
  'trial-ending': ['firstName', 'restaurantName', 'daysLeft'],
  'forgot-password': ['firstName'],
  'low-rating-alert': ['restaurantName', 'customerName', 'rating', 'branch'],
  'new-review': ['restaurantName', 'customerName', 'rating'],
  'weekly-report': ['restaurantName', 'totalReviews', 'avgRating'],
  'customer-reply': ['customerFirstName', 'restaurantName', 'ownerName'],
  'form-confirmation': ['firstName'],
} as const;

export type MailTemplateKeyForPlaceholders = keyof typeof MAIL_PLACEHOLDERS;

export type PlaceholderVars = Record<string, string | number | null | undefined>;

const PLACEHOLDER_RE = /\$\{(\w+)\}/g;

/**
 * Replace `${key}` tokens in `text` with values from `vars`.
 *
 * - `mode: 'html'` (default): values are HTML-escaped before insertion.
 *   Templates render to HTML mail; without escaping a name like
 *   `<script>` would break out of the safe zone.
 * - `mode: 'text'`: plain-text version of the mail; no escaping.
 *
 * Unknown / missing keys → empty string. We don't leak the literal `${x}`
 * because that's worse UX (recipient sees raw token).
 */
export function substitutePlaceholders(
  text: string,
  vars: PlaceholderVars,
  mode: 'html' | 'text' = 'html',
): string {
  return text.replace(PLACEHOLDER_RE, (_, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null || v === '') return '';
    return mode === 'html' ? escapeHtml(v) : String(v);
  });
}

/**
 * Validate that all `${...}` placeholders in `text` are in `allowed`.
 * Used by API PATCH to reject typos before they reach the DB.
 */
export function validatePlaceholders(
  text: string,
  allowed: readonly string[],
): { valid: boolean; invalid: string[] } {
  const matches = text.matchAll(PLACEHOLDER_RE);
  const found: string[] = [];
  for (const m of matches) found.push(m[1]);
  const invalid = [...new Set(found.filter((p) => !allowed.includes(p)))];
  return { valid: invalid.length === 0, invalid };
}

/**
 * Recursively walk `value` and substitute placeholders in any string leaves.
 * Used after `loadMailCopy()` to wire admin overrides + inline defaults
 * with runtime values. Arrays + nested objects (welcome.steps, weekly-report
 * quotes, form-confirmation variants) are walked transparently; non-string
 * leaves passed through.
 */
export function deepSubstitute<T>(
  value: T,
  vars: PlaceholderVars,
  mode: 'html' | 'text' = 'html',
): T {
  if (typeof value === 'string') return substitutePlaceholders(value, vars, mode) as unknown as T;
  if (Array.isArray(value)) {
    return value.map((v) => deepSubstitute(v, vars, mode)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepSubstitute(v, vars, mode);
    }
    return out as unknown as T;
  }
  return value;
}

/**
 * Walk a content object (flat or nested form-confirmation) and collect
 * any invalid placeholders. Returns first violation for clean error.
 */
export function findInvalidPlaceholders(
  content: Record<string, unknown>,
  allowed: readonly string[],
): { field: string; invalid: string[] } | null {
  for (const [k, v] of Object.entries(content)) {
    if (typeof v === 'string') {
      const result = validatePlaceholders(v, allowed);
      if (!result.valid) return { field: k, invalid: result.invalid };
    } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      // form-confirmation nested variant
      for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
        if (typeof iv === 'string') {
          const result = validatePlaceholders(iv, allowed);
          if (!result.valid) return { field: `${k}.${ik}`, invalid: result.invalid };
        }
      }
    }
  }
  return null;
}
