// Stage 98 — Survey system helpers (CLAUDE.md §42).
//
// Survey + question type literals, slug generation, validation helpers,
// and analytics aggregation. All pure functions — DB calls live in the
// route handlers, not here.

import type { Prisma } from '@prisma/client';
import { npsBreakdown } from '@/lib/survey-analytics';

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
 * Apostrophe look-alikes. They are DELETED from slugs, not turned into a dash:
 * "Mama's Burger" must read `mamas-burger`, never `mama-s-burger` (the slug is
 * the link the customer sees). U+0027, U+2019, U+0060, U+00B4 per the spec,
 * plus U+2018 and U+02BC — the same family that phone keyboards produce.
 */
const APOSTROPHES = /['\u2019\u2018`\u00B4\u02BC]/g;

/**
 * Slug üret: ASCII alfa-numerik + dash. TR karakterleri ASCII'ye fallback,
 * kesme işaretleri silinir (tireye çevrilmez). Boş sonuç → `anket`.
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
    .toLowerCase()
    .replace(APOSTROPHES, '');
  // Trim dashes AFTER the length cut: slicing at 60 can land right behind one.
  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '');
  return slug || 'anket';
}

/**
 * Random 6-char suffix; çakışma durumunda eklenir.
 */
export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * NPS skoru: -100..+100. Tek formül `npsBreakdown` içindedir
 * (survey-analytics.ts): skor = round(%destekçi) − round(%eleştirmen), böylece
 * ekranda görülen yüzdelerle kart skoru tutar. Burada ikinci bir formül YOK.
 */
export function calculateNpsScore(scores: number[]): number {
  return npsBreakdown(scores).score;
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
 * Müşterinin teşekkür ekranında gördüğü "Yanıt no": GERÇEK yanıt kimliğinin
 * (`SurveyResponse.id`, cuid) son 6 karakteri, BÜYÜK harf. İşletme aynı kodla
 * yanıtı bulur (Yanıtlar sekmesi `id endsWith` araması, CSV `id`).
 *
 * - ASCII-safe: yalnız [A-Za-z0-9] karakterleri değerlendirilir, çıktı
 *   `/^[A-Z0-9]{0,6}$/`. Latin-dışı karakter (ş, ı, ß …) atılır — `ß`.toUpperCase()
 *   iki harfe ("SS") dönüşüp uzunluğu bozabilirdi.
 * - Deterministik + yerelden bağımsız: `toUpperCase()` (toLocaleUpperCase DEĞİL) —
 *   tr-TR yerelinde `i` → `İ` olmaz.
 * - Kimlik yoksa / çok kısaysa kısa (veya boş) döner; çağıran boşsa satırı hiç
 *   göstermez, ASLA uydurma kod üretmez.
 */
export function surveyResponseShortId(id: string | null | undefined): string {
  if (typeof id !== 'string') return '';
  return id.replace(/[^A-Za-z0-9]/g, '').slice(-6).toUpperCase();
}

// ── Survey type (derived, never chosen) ─────────────────────────────────────

/**
 * The survey "type" is not a decision the owner makes any more: a single
 * question is a one-screen survey, anything else runs step by step. The server
 * derives it on every write; a client-supplied `type` is still accepted for
 * backward compatibility and ignored.
 */
export function deriveSurveyType(questionCount: number): SurveyType {
  return questionCount === 1 ? 'single' : 'multi_step';
}

/**
 * Non-fatal note for a POST that sent a `type` the server did not use. The
 * stored type always follows the question count, so an old client that picked
 * one ("single" with three questions) is told what was stored instead of being
 * ignored silently. `null` when nothing was sent or the guess was right.
 */
export function surveyTypeIgnoredWarning(
  sent: SurveyType | undefined,
  stored: SurveyType,
): { code: 'type_ignored'; message: string } | null {
  if (!sent || sent === stored) return null;
  return {
    code: 'type_ignored',
    message: `The survey type is derived from the number of questions. "${sent}" was ignored and "${stored}" was stored.`,
  };
}

// ── Contact fields on the public form ───────────────────────────────────────

/** Same limits the submit route enforces (z.string().email().max(200) / .max(40)). */
export const CONTACT_EMAIL_MAX = 200;
export const CONTACT_PHONE_MAX = 40;

/**
 * Identical to the pattern Zod's `z.string().email()` applies in the submit
 * route (zod/v4/core/regexes `email`), so the form never accepts an address the
 * server would reject and never blocks one it would accept. Pinned against Zod
 * itself in tests/survey-helpers.test.ts.
 */
const CONTACT_EMAIL_PATTERN =
  /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

/** Surrounding spaces are ignored — the form trims before it sends. */
export function isValidContactEmail(value: string): boolean {
  const email = value.trim();
  return email.length > 0 && email.length <= CONTACT_EMAIL_MAX && CONTACT_EMAIL_PATTERN.test(email);
}

// ── Duration shown to owners and customers (one function, 3.5-17) ───────────

/** ~9 s per question plus 12 s to read the intro and send. */
export function estimateSurveySeconds(questionCount: number): number {
  const n = Number.isFinite(questionCount) ? questionCount : 0;
  return n * 9 + 12;
}

/**
 * Coarse, honest wording: `~20 sn`, `~45 sn`, `~1 dk`, then whole minutes.
 * The public intro, the editor summary and the template cards all use this, so
 * an owner never sees "~39 sn" while the customer reads "~45 sn".
 */
export function formatSurveyDuration(seconds: number, locale: 'tr' | 'en'): string {
  const tr = locale === 'tr';
  if (seconds < 30) return tr ? '~20 sn' : '~20 sec';
  if (seconds < 60) return tr ? '~45 sn' : '~45 sec';
  if (seconds < 90) return tr ? '~1 dk' : '~1 min';
  const minutes = Math.round(seconds / 60);
  return tr ? `~${minutes} dk` : `~${minutes} min`;
}

// ── Public link ─────────────────────────────────────────────────────────────

/** Used when NEXT_PUBLIC_APP_URL is missing or points at a local machine. */
export const SURVEY_PUBLIC_FALLBACK_BASE_URL = 'https://www.buaze.com';

/**
 * Origin the customer link (`<base>/s/<slug>`) and the QR code are built on.
 * A localhost value (dev env) must never end up in a link the owner copies or
 * prints, so it falls back to the public site. Trailing slashes are removed.
 */
export function getSurveyPublicBaseUrl(
  envUrl: string | undefined = process.env.NEXT_PUBLIC_APP_URL,
): string {
  const normalized = envUrl?.trim().replace(/\/+$/, '');
  const isLocal = normalized ? /localhost|127\.0\.0\.1/i.test(normalized) : false;
  return normalized && !isLocal ? normalized : SURVEY_PUBLIC_FALLBACK_BASE_URL;
}

// ── Coupon ──────────────────────────────────────────────────────────────────

export const COUPON_LABEL_REQUIRED_MESSAGE = 'Kupon koduna bir açıklama ekle.';

/**
 * A bare code reads like an unconditional offer, so a code needs a description
 * of its terms. Shared by POST, PATCH and the editor.
 */
export function isCouponLabelMissing(
  code: string | null | undefined,
  label: string | null | undefined,
): boolean {
  return Boolean(code?.trim()) && !label?.trim();
}

// ── Options: duplicates (R3) and locks (R1 / R2) ────────────────────────────
//
// Single definition for the editor UI, planQuestionSync and the tests:
//   R1  answerCount > 0           → the question type is frozen.
//   R2  answerCount > 0 + choice  → only options that at least one response
//                                   picked (`usedOptions`, exact text) are
//                                   frozen; unused ones stay free, new ones too.
//   R3  duplicates are checked ONLY for new or changed options, so old
//       production surveys that already hold `İyi` + `iyi` can still be edited.

/** Comparison key: trimmed, inner whitespace collapsed, Turkish lower-casing. */
export function optionKey(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

/**
 * Positions (indexes into `options`) of options that break R3. A key may appear
 * as often as it did in `previous` (and at least once); every occurrence
 * beyond that is flagged. Blank options are ignored (the editor reports empty
 * rows separately). No `previous` = strict (new question).
 */
export function findNewOptionDuplicates(
  options: ReadonlyArray<string>,
  previous?: unknown,
): number[] {
  const previousCounts = new Map<string, number>();
  if (Array.isArray(previous)) {
    for (const entry of previous) {
      if (typeof entry !== 'string') continue;
      const key = optionKey(entry);
      if (key) previousCounts.set(key, (previousCounts.get(key) ?? 0) + 1);
    }
  }

  const positions = new Map<string, number[]>();
  options.forEach((option, index) => {
    const key = optionKey(option);
    if (!key) return;
    const list = positions.get(key);
    if (list) list.push(index);
    else positions.set(key, [index]);
  });

  const flagged: number[] = [];
  for (const [key, list] of positions) {
    const allowed = Math.max(previousCounts.get(key) ?? 0, 1);
    if (list.length > allowed) flagged.push(...list.slice(allowed));
  }
  return flagged.sort((a, b) => a - b);
}

/**
 * `validateOptions` + R3. `previous` = the options currently stored for this
 * question (PATCH); omit it for a brand-new question (POST), which is strict.
 * Returns the trimmed list, or null when the count is outside 2–6 or a new /
 * changed option repeats another one.
 */
export function validateOptionsForWrite(opts: unknown, previous?: unknown): string[] | null {
  const valid = validateOptions(opts);
  if (!valid) return null;
  return findNewOptionDuplicates(valid, previous).length === 0 ? valid : null;
}

/** R1 — the type of a question that already has answers cannot change. */
export function isQuestionTypeLocked(question: { answerCount: number }): boolean {
  return question.answerCount > 0;
}

/** R2 — an option that at least one response picked cannot change or go away. */
export function isOptionLocked(
  question: { answerCount: number; usedOptions: ReadonlyArray<string> },
  option: string,
): boolean {
  return question.answerCount > 0 && question.usedOptions.includes(option);
}

// ── Question sync for PATCH /api/surveys/[id] ───────────────────────────────

/** A question currently stored for the survey, with what the answers tell us. */
export interface PlanExistingQuestion {
  id: string;
  type: string;
  /** Prisma Json column — a string[] for multiple_choice. */
  options: unknown;
  /** Answers recorded for this question. */
  answerCount: number;
  /** Options (exact text) that at least one response picked. */
  usedOptions: string[];
}

export interface PlanIncomingQuestion {
  /** Id of a stored question, absent for a brand-new one. */
  id?: string | null;
  text: string;
  type: SurveyQuestionType;
  options?: string[] | null;
  required?: boolean;
}

export interface PlannedQuestionWrite {
  text: string;
  type: SurveyQuestionType;
  /** Validated list for multiple_choice, null for every other type. */
  options: string[] | null;
  required: boolean;
  /** Position × 10, as everywhere else. */
  sortOrder: number;
}

export interface PlannedQuestionUpdate extends PlannedQuestionWrite {
  id: string;
}

export type QuestionPlanFailureCode =
  | 'unknown_question'
  | 'question_locked'
  | 'removal_not_confirmed'
  | 'invalid_options';

export interface QuestionPlanFailure {
  ok: false;
  code: QuestionPlanFailureCode;
  /** Owner-safe Turkish fallback; the editor shows its own localised text. */
  message: string;
  questionId?: string;
  questionIds?: string[];
  /** invalid_options: text of the offending question. */
  question?: string;
}

export interface QuestionPlanSuccess {
  ok: true;
  /** Stored questions to rewrite in place (their answers stay). */
  update: PlannedQuestionUpdate[];
  /** Brand-new questions. */
  create: PlannedQuestionWrite[];
  /** Questions the caller explicitly asked to delete (their answers go with them). */
  remove: Array<{ id: string; answerCount: number }>;
}

export type QuestionPlan = QuestionPlanSuccess | QuestionPlanFailure;

export const STALE_SURVEY_MESSAGE =
  'Bu anket başka bir yerde değiştirilmiş. Sayfayı yenileyip tekrar dene.';
export const QUESTION_TYPE_LOCKED_MESSAGE = 'Yanıtı olan sorunun tipi değiştirilemez.';
export const OPTION_LOCKED_MESSAGE = 'Yanıt almış bir seçenek değiştirilemez veya silinemez.';
export const OPTIONS_DUPLICATE_MESSAGE = 'Seçenekler birbirinden farklı olmalı (2–6 seçenek).';
export const OPTIONS_COUNT_MESSAGE = `Seçenekli soru için ${OPTIONS_MIN}–${OPTIONS_MAX} seçenek gerekli.`;

/**
 * Decide how a PATCH replaces a survey's questions WITHOUT losing answers
 * (SurveyAnswer rows cascade away with their question, so deleting a question
 * is the only way an answer disappears).
 *
 *  (a) every incoming `id` must be a current question of THIS survey, once —
 *      otherwise the editor is stale (another tab removed it) → unknown_question.
 *  (d) a stored question missing from `incoming` is deleted only when its id is
 *      in `removedQuestionIds` (the user's deliberate delete); otherwise
 *      removal_not_confirmed. This stops a stale tab (a question added
 *      elsewhere is absent from its payload) and a caller that sends no ids
 *      (every stored question looks "removed") from wiping answers silently.
 *  (b) R1 — an answered question keeps its type → question_locked.
 *  (c) R2 — an answered choice question keeps every option that was picked.
 *  (e) a question without answers is free: type and options may change.
 *
 * Option lists are validated with `validateOptionsForWrite` against the stored
 * list (R3); failures are `invalid_options` (HTTP 400, the others are 409).
 * Check order is (a), (d), (b)/(c), options, so a stale payload is reported as
 * stale before anything else.
 *
 * Pure: the route reads `existing` (with counts) inside its transaction, after
 * locking the question rows, and writes `update` / `create` / `remove`.
 */
export function planQuestionSync(
  existing: ReadonlyArray<PlanExistingQuestion>,
  incoming: ReadonlyArray<PlanIncomingQuestion>,
  removedQuestionIds: ReadonlyArray<string> = [],
): QuestionPlan {
  const byId = new Map(existing.map((q) => [q.id, q] as const));

  // (a)
  const seen = new Set<string>();
  const stale: string[] = [];
  for (const q of incoming) {
    if (!q.id) continue;
    if (!byId.has(q.id) || seen.has(q.id)) stale.push(q.id);
    seen.add(q.id);
  }
  if (stale.length > 0) {
    return {
      ok: false,
      code: 'unknown_question',
      message: STALE_SURVEY_MESSAGE,
      questionIds: [...new Set(stale)],
    };
  }

  // (d)
  const requestedRemoval = new Set(removedQuestionIds);
  const removed = existing.filter((q) => !seen.has(q.id));
  const unconfirmed = removed.filter((q) => !requestedRemoval.has(q.id));
  if (unconfirmed.length > 0) {
    return {
      ok: false,
      code: 'removal_not_confirmed',
      message: STALE_SURVEY_MESSAGE,
      questionIds: unconfirmed.map((q) => q.id),
    };
  }

  // (b) + (c)
  for (const q of incoming) {
    if (!q.id) continue;
    const current = byId.get(q.id);
    if (!current || !isQuestionTypeLocked(current)) continue;
    if (current.type !== q.type) {
      return {
        ok: false,
        code: 'question_locked',
        message: QUESTION_TYPE_LOCKED_MESSAGE,
        questionId: current.id,
      };
    }
    if (current.type === 'multiple_choice') {
      const next = validateOptions(q.options);
      if (next && current.usedOptions.some((used) => !next.includes(used))) {
        return {
          ok: false,
          code: 'question_locked',
          message: OPTION_LOCKED_MESSAGE,
          questionId: current.id,
        };
      }
    }
  }

  // options (R3) + assemble, in the order the owner arranged the questions
  const update: PlannedQuestionUpdate[] = [];
  const create: PlannedQuestionWrite[] = [];
  for (let index = 0; index < incoming.length; index += 1) {
    const q = incoming[index];
    const current = q.id ? byId.get(q.id) : undefined;

    let options: string[] | null = null;
    if (q.type === 'multiple_choice') {
      const previous = current?.type === 'multiple_choice' ? current.options : undefined;
      const valid = validateOptionsForWrite(q.options, previous);
      if (!valid) {
        return {
          ok: false,
          code: 'invalid_options',
          message: validateOptions(q.options) ? OPTIONS_DUPLICATE_MESSAGE : OPTIONS_COUNT_MESSAGE,
          questionId: current?.id,
          question: q.text,
        };
      }
      options = valid;
    }

    const write: PlannedQuestionWrite = {
      text: q.text.trim(),
      type: q.type,
      options,
      required: q.required ?? true,
      sortOrder: index * 10,
    };
    if (current) update.push({ id: current.id, ...write });
    else create.push(write);
  }

  return {
    ok: true,
    update,
    create,
    remove: removed.map((q) => ({ id: q.id, answerCount: q.answerCount })),
  };
}

/**
 * HTTP shape of a failed plan: stale/locked/unconfirmed → 409 (the editor must
 * reload or back off), invalid options → 400. `unknown_question` is published
 * as `stale_survey`.
 */
export function planFailureToHttp(failure: QuestionPlanFailure): {
  status: 400 | 409;
  body: Record<string, unknown>;
} {
  const detail = {
    message: failure.message,
    ...(failure.questionId ? { questionId: failure.questionId } : {}),
    ...(failure.questionIds ? { questionIds: failure.questionIds } : {}),
  };
  switch (failure.code) {
    case 'unknown_question':
      return { status: 409, body: { error: 'stale_survey', ...detail } };
    case 'removal_not_confirmed':
      return { status: 409, body: { error: 'removal_not_confirmed', ...detail } };
    case 'question_locked':
      return { status: 409, body: { error: 'question_locked', ...detail } };
    case 'invalid_options':
      return {
        status: 400,
        body: {
          error: 'invalid_options',
          ...detail,
          ...(failure.question ? { question: failure.question } : {}),
        },
      };
  }
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

/**
 * Owner edit page: the detail shape plus, per question, how many answers it
 * has (drives the type lock and the "N responses" warnings). `usedOptions` is
 * not a column — the page derives it from a `surveyAnswer.groupBy`. The plain
 * SURVEY_OWNER_SELECT above stays as it is for POST / GET / duplicate / detail,
 * which do not need the per-question count.
 */
export const SURVEY_EDIT_SELECT = {
  ...SURVEY_OWNER_SELECT,
  questions: {
    select: {
      ...SURVEY_OWNER_SELECT.questions.select,
      _count: { select: { answers: true } },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
} satisfies Prisma.SurveyDefaultArgs['select'];
