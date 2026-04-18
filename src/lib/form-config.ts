/**
 * Feedback form field customisation per restaurant.
 *
 * Stored on Restaurant.formConfig as JSON (nullable string column so the
 * migration is additive). `null` means "use defaults" — this keeps every
 * existing restaurant working without any data backfill.
 */

export type FormFieldKey =
  | 'comment'      // Free-text comment (always enabled conceptually; can be required)
  | 'name'         // Customer name
  | 'email'        // Customer email
  | 'phone'        // Customer phone
  | 'serviceType'  // Dine-in / takeaway / delivery
  | 'aspects'      // Food / service / atmosphere sub-ratings
  | 'marketing';   // Marketing consent checkbox

export interface FormFieldSetting {
  enabled: boolean;
  required: boolean;
}

export type FormConfig = Partial<Record<FormFieldKey, FormFieldSetting>>;

export const DEFAULT_FORM_CONFIG: Required<Record<FormFieldKey, FormFieldSetting>> = {
  comment:     { enabled: true,  required: true  },
  name:        { enabled: false, required: false },
  email:       { enabled: false, required: false },
  phone:       { enabled: false, required: false },
  serviceType: { enabled: false, required: false },
  aspects:     { enabled: false, required: false },
  marketing:   { enabled: false, required: false },
};

export const FORM_FIELD_KEYS: FormFieldKey[] = [
  'comment', 'name', 'email', 'phone', 'serviceType', 'aspects', 'marketing',
];

/**
 * Parse a possibly-null stored JSON string into a resolved config, merging
 * with defaults so consumers always get a complete object.
 */
export function resolveFormConfig(raw: string | null | undefined): Required<Record<FormFieldKey, FormFieldSetting>> {
  const merged = { ...DEFAULT_FORM_CONFIG };
  if (!raw) return merged;
  try {
    const parsed = JSON.parse(raw) as FormConfig;
    for (const key of FORM_FIELD_KEYS) {
      const override = parsed[key];
      if (override && typeof override === 'object') {
        merged[key] = {
          enabled: typeof override.enabled === 'boolean' ? override.enabled : merged[key].enabled,
          required: typeof override.required === 'boolean' ? override.required : merged[key].required,
        };
      }
    }
  } catch {
    // Bad JSON in DB — silently fall back to defaults.
  }
  // Invariant: `comment` is always enabled; a feedback with no rating AND no
  // comment would be meaningless. The `required` flag is still respected.
  merged.comment.enabled = true;
  return merged;
}

/**
 * Normalise user-provided config into a minimal JSON string for storage.
 * Returns `null` when the config matches defaults (saves a few bytes and
 * lets us distinguish "never customised" from "explicitly default").
 */
export function serializeFormConfig(config: FormConfig | null | undefined): string | null {
  if (!config) return null;
  const cleaned: FormConfig = {};
  for (const key of FORM_FIELD_KEYS) {
    const field = config[key];
    if (field && typeof field === 'object') {
      cleaned[key] = {
        enabled: !!field.enabled,
        required: !!field.required,
      };
    }
  }
  if (Object.keys(cleaned).length === 0) return null;
  return JSON.stringify(cleaned);
}
