// Stage 98 — Survey system helpers (CLAUDE.md §42).
//
// Survey + question type literals, slug generation, validation helpers,
// and analytics aggregation. All pure functions — DB calls live in the
// route handlers, not here.

import type { Prisma } from '@prisma/client';

// Question type literal. Mirrors `SurveyQuestion.type` column. UI + Zod
// validation use this union. When adding a new type, update:
//   1. This array + literal type
//   2. /api/surveys/[id]/responses POST validation (answer shape per type)
//   3. SurveyQuestionEditor UI (input renderer)
//   4. PublicSurveyView (public form renderer)
//   5. /api/surveys/[id]/analytics aggregation switch
//   6. translations.ts `survey_question_type_*` keys
export const SURVEY_QUESTION_TYPES = [
  'rating',
  'nps',
  'short_text',
  'long_text',
  'multiple_choice',
] as const;

export type SurveyQuestionType = (typeof SURVEY_QUESTION_TYPES)[number];

export const SURVEY_TYPES = ['single', 'multi_step'] as const;
export type SurveyType = (typeof SURVEY_TYPES)[number];

// Numeric value bounds — server-side enforcement on submit.
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const NPS_MIN = 0;
export const NPS_MAX = 10;
export const SHORT_TEXT_MAX = 200;
export const LONG_TEXT_MAX = 2000;
export const OPTIONS_MIN = 2;
export const OPTIONS_MAX = 6;
export const TITLE_MAX = 140;
export const DESCRIPTION_MAX = 1000;
export const THANK_YOU_MAX = 600;
export const KVKK_TEXT_MAX = 4000;
export const QUESTION_TEXT_MAX = 280;
export const OPTION_TEXT_MAX = 80;
export const MAX_QUESTIONS_PER_SURVEY = 30;

/**
 * Slug üret: ASCII alfa-numerik + dash. TR karakterleri ASCII'ye fallback.
 * Çakışma kontrolü caller'da (server-side findUnique + retry suffix).
 */
export function slugifyTitle(input: string): string {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o',
    ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  };
  const normalized = input
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase();
  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'anket';
}

/**
 * Random 6-char suffix; çakışma durumunda eklenir.
 */
export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * NPS skoru formülü: %promoter (9-10) - %detractor (0-6).
 * Range: -100 ile +100 arası tamsayı.
 */
export function calculateNpsScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const promoters = scores.filter((s) => s >= 9 && s <= 10).length;
  const detractors = scores.filter((s) => s >= 0 && s <= 6).length;
  const total = scores.length;
  return Math.round(((promoters - detractors) / total) * 100);
}

/**
 * Validate options array for multiple_choice questions.
 */
export function validateOptions(opts: unknown): string[] | null {
  if (!Array.isArray(opts)) return null;
  const strings = opts
    .filter((v): v is string => typeof v === 'string')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= OPTION_TEXT_MAX);
  if (strings.length < OPTIONS_MIN || strings.length > OPTIONS_MAX) return null;
  return strings;
}

/**
 * Sırasını koruyarak unique slug üretir. Caller listOfTakenSlugs sağlar
 * (DB lookup'tan gelen Set<string>). Çakışma yoksa base slug döner;
 * varsa -2, -3, -4... ekler (max 50 deneme), sonra random suffix.
 */
export function resolveUniqueSlug(
  baseSlug: string,
  takenSlugs: Set<string>,
): string {
  if (!takenSlugs.has(baseSlug)) return baseSlug;
  for (let i = 2; i <= 50; i += 1) {
    const candidate = `${baseSlug}-${i}`;
    if (!takenSlugs.has(candidate)) return candidate;
  }
  return `${baseSlug}-${randomSuffix()}`;
}

/**
 * Defensive select shape for public /s/[slug] reads. KVKK-clean — sadece
 * public surface'a gidecek alanlar (no `ipAddress`, no `userId`).
 */
export const SURVEY_PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  type: true,
  isPublished: true,
  isActive: true,
  accentColor: true,
  thankYouMessage: true,
  // Stage B — kvkkText + collectMarketingConsent dropped from public read.
  // PublicSurveyView now links to Buaze-managed /kvkk + /acik-riza (§19.1).
  collectContact: true,
  couponCode: true,
  couponLabel: true,
  restaurantId: true,
  restaurant: {
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      isActive: true,
      // Admin master switch (feature-access). Public reads 404 when off.
      surveysEnabled: true,
    },
  },
  questions: {
    select: {
      id: true,
      text: true,
      type: true,
      options: true,
      required: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.SurveyDefaultArgs['select'];

/**
 * Owner panel detail select — analytics dışında her şey lazım.
 */
export const SURVEY_OWNER_SELECT = {
  id: true,
  slug: true,
  title: true,
  description: true,
  type: true,
  isActive: true,
  isPublished: true,
  publishedAt: true,
  accentColor: true,
  thankYouMessage: true,
  // Stage B — kvkkText + collectMarketingConsent removed from owner edit
  // flow. Schema columns kept @deprecated for legacy data; new writes
  // never touch them (CLAUDE.md §40.2 preview deploy safety).
  collectContact: true,
  couponCode: true,
  couponLabel: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
  questions: {
    select: {
      id: true,
      text: true,
      type: true,
      options: true,
      required: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  _count: {
    select: { responses: true },
  },
} satisfies Prisma.SurveyDefaultArgs['select'];
