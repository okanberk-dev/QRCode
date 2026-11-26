// Client-safe plan module catalogue (no Prisma). Server helpers: plan-modules.ts.

/**
 * Package modules (CLAUDE.md §5.2). A plan with `modulesManaged = true`
 * decides each feature switch of every business its owner has; the admin
 * per-business switches (`/admin/restaurants/[id]` → Paket Özellikleri) stay
 * available as an override until the plan is applied again.
 */
export const PLAN_MODULES = [
  { key: 'googleReviews', field: 'googleReviewManagementEnabled', tr: 'Google yorum yönetimi', en: 'Google review management' },
  { key: 'pulseAi', field: 'pulseAiEnabled', tr: 'Pulse AI yanıt taslakları', en: 'Pulse AI reply drafts' },
  { key: 'aiAnalytics', field: 'aiAnalyticsEnabled', tr: 'AI analitik', en: 'AI analytics' },
  { key: 'menu', field: 'menuEnabled', tr: 'Dijital menü', en: 'Digital menu' },
  { key: 'surveys', field: 'surveysEnabled', tr: 'Anketler', en: 'Surveys' },
  { key: 'loyalty', field: 'loyaltyEnabled', tr: 'Sadakat kartı', en: 'Loyalty card' },
  { key: 'externalPlatforms', field: 'externalPlatformsEnabled', tr: 'Google dışı platformlar', en: 'Non-Google platforms' },
] as const;

export type PlanModuleKey = (typeof PLAN_MODULES)[number]['key'];
export type PlanModuleField = (typeof PLAN_MODULES)[number]['field'];

const KEYS = new Set<string>(PLAN_MODULES.map((m) => m.key));

export function isPlanModuleKey(value: unknown): value is PlanModuleKey {
  return typeof value === 'string' && KEYS.has(value);
}

/** Known keys only, de-duplicated, catalogue order. */
export function normalizeModuleKeys(values: unknown): PlanModuleKey[] {
  const wanted = new Set(Array.isArray(values) ? values.filter(isPlanModuleKey) : []);
  return PLAN_MODULES.filter((m) => wanted.has(m.key)).map((m) => m.key);
}

/** Restaurant switch values for a module list. */
export function moduleSwitches(keys: readonly string[]): Record<PlanModuleField, boolean> {
  const on = new Set(keys);
  const out = {} as Record<PlanModuleField, boolean>;
  for (const m of PLAN_MODULES) out[m.field] = on.has(m.key);
  return out;
}

