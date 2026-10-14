// Surveys editor — pure state, validation and request-body logic (no React, no
// server imports) so the single-page editor stays thin and the rules are unit
// tested (tests/survey-editor-state.test.ts).
//
// The editor holds a "form" (title, texts, colours, contact switch, coupon and
// the question list). Stored questions keep their id (edit mode) so a save is
// lossless: the PATCH matches questions by id, and only questions the owner
// deliberately deleted are named in `removedQuestionIds`.

import {
  DESCRIPTION_MAX,
  MAX_QUESTIONS_PER_SURVEY,
  OPTIONS_MAX,
  OPTIONS_MIN,
  OPTION_TEXT_MAX,
  QUESTION_TEXT_MAX,
  SURVEY_QUESTION_TYPES,
  THANK_YOU_MAX,
  TITLE_MAX,
  findNewOptionDuplicates,
  isCouponLabelMissing,
  type SurveyQuestionType,
} from '@/lib/surveys';
import { normaliseHex } from '@/lib/qr-colors';
import {
  newLocalId,
  type InstantiatedSurveyTemplate,
  type SurveyTemplateLocale,
} from '@/lib/survey-templates';

export type EditorLocale = SurveyTemplateLocale;

// ── Types ───────────────────────────────────────────────────────────────────

/** One option row. `key` is a client-only React key (never sent). */
export interface EditorOption {
  key: string;
  text: string;
  /** An answered option: read-only and cannot be removed (rule R2). */
  locked: boolean;
}

export interface EditorQuestion {
  /** Client-only React key. Never sent to the server. */
  localId: string;
  /** Stored question id (edit mode); null for a question added in this session. */
  id: string | null;
  text: string;
  type: SurveyQuestionType;
  /** Rows for multiple_choice; ignored (kept) for other types. */
  options: EditorOption[];
  required: boolean;
  /** Answers recorded for this stored question (0 for new ones). */
  answerCount: number;
  /** Stored options that at least one response picked (exact text). */
  usedOptions: string[];
  /** Text as stored, to warn when an answered question is reworded. */
  originalText: string | null;
  /** Options as stored — the "previous" list for the duplicate rule (R3). */
  originalOptions: string[] | null;
  originalType: SurveyQuestionType | null;
}

export interface EditorForm {
  title: string;
  description: string;
  accentColor: string;
  thankYouMessage: string;
  collectContact: boolean;
  couponCode: string;
  couponLabel: string;
  questions: EditorQuestion[];
  /** Stored question ids the owner deleted in this session. */
  removedQuestionIds: string[];
}

/** A question as the edit page serialises it (SURVEY_EDIT_SELECT + usedOptions). */
export interface StoredEditorQuestion {
  id: string;
  text: string;
  type: SurveyQuestionType;
  options: string[] | null;
  required: boolean;
  answerCount: number;
  usedOptions: string[];
}

export interface StoredEditorSurvey {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  accentColor: string | null;
  thankYouMessage: string | null;
  collectContact: boolean;
  couponCode: string | null;
  couponLabel: string | null;
  /** All-time response count. */
  responseCount: number;
  questions: StoredEditorQuestion[];
}

// ── Constants ───────────────────────────────────────────────────────────────

export const DEFAULT_ACCENT = '#C6F24E';

/** The ink swatch (#0A0A0A) is gone on purpose: it made the intro CTA invisible. */
export const ACCENT_SWATCHES: ReadonlyArray<{ hex: string; tr: string; en: string }> = [
  { hex: '#C6F24E', tr: 'Limon yeşili', en: 'Lime' },
  { hex: '#1A73E8', tr: 'Mavi', en: 'Blue' },
  { hex: '#F97316', tr: 'Turuncu', en: 'Orange' },
  { hex: '#EF4444', tr: 'Kırmızı', en: 'Red' },
  { hex: '#10B981', tr: 'Yeşil', en: 'Green' },
  { hex: '#A855F7', tr: 'Mor', en: 'Purple' },
  { hex: '#0EA5E9', tr: 'Gök mavisi', en: 'Sky blue' },
];

export const QUESTION_TYPE_ORDER: ReadonlyArray<SurveyQuestionType> = SURVEY_QUESTION_TYPES;

export const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, { tr: string; en: string }> = {
  rating: { tr: 'Yıldız puanı', en: 'Star rating' },
  nps: { tr: 'Tavsiye skoru (0–10)', en: 'Recommend score (0–10)' },
  multiple_choice: { tr: 'Seçenekli', en: 'Multiple choice' },
  short_text: { tr: 'Kısa yazı', en: 'Short text' },
  long_text: { tr: 'Uzun yazı', en: 'Long text' },
};

/** Keep the add-chips and the type menu in the order the spec lists them. */
export const QUESTION_TYPE_MENU_ORDER: ReadonlyArray<SurveyQuestionType> = [
  'rating',
  'nps',
  'multiple_choice',
  'short_text',
  'long_text',
];

export { MAX_QUESTIONS_PER_SURVEY, OPTIONS_MAX, OPTIONS_MIN, OPTION_TEXT_MAX, QUESTION_TEXT_MAX };
export { DESCRIPTION_MAX, THANK_YOU_MAX, TITLE_MAX };

// ── Construction ────────────────────────────────────────────────────────────

let optionCounter = 0;
/** Client-only React key for an option row. */
export function newOptionKey(): string {
  optionCounter += 1;
  return `o_${optionCounter}`;
}

export function optionRow(text = '', locked = false, makeKey: () => string = newOptionKey): EditorOption {
  return { key: makeKey(), text, locked };
}

function emptyChoiceRows(makeKey: () => string): EditorOption[] {
  return Array.from({ length: OPTIONS_MIN }, () => optionRow('', false, makeKey));
}

/** A fresh, empty question of the given type (a new, never-saved one). */
export function blankEditorQuestion(
  type: SurveyQuestionType = 'rating',
  makeId: () => string = newLocalId,
  makeKey: () => string = newOptionKey,
): EditorQuestion {
  return {
    localId: makeId(),
    id: null,
    text: '',
    type,
    options: type === 'multiple_choice' ? emptyChoiceRows(makeKey) : [],
    required: true,
    answerCount: 0,
    usedOptions: [],
    originalText: null,
    originalOptions: null,
    originalType: null,
  };
}

/**
 * Copy of a question for "Duplicate": a brand-new question (no stored id, no
 * answers, no locks) with the same text, type, options and required flag.
 */
export function duplicateEditorQuestion(
  q: EditorQuestion,
  makeId: () => string = newLocalId,
  makeKey: () => string = newOptionKey,
): EditorQuestion {
  return {
    localId: makeId(),
    id: null,
    text: q.text,
    type: q.type,
    options: q.options.map((o) => optionRow(o.text, false, makeKey)),
    required: q.required,
    answerCount: 0,
    usedOptions: [],
    originalText: null,
    originalOptions: null,
    originalType: null,
  };
}

export function blankForm(
  makeId: () => string = newLocalId,
  makeKey: () => string = newOptionKey,
): EditorForm {
  return {
    title: '',
    description: '',
    accentColor: DEFAULT_ACCENT,
    thankYouMessage: '',
    collectContact: true,
    couponCode: '',
    couponLabel: '',
    questions: [blankEditorQuestion('rating', makeId, makeKey)],
    removedQuestionIds: [],
  };
}

/** Template → editor form. Every call mints new local ids. */
export function formFromTemplate(
  instantiated: InstantiatedSurveyTemplate,
  makeKey: () => string = newOptionKey,
): EditorForm {
  return {
    title: instantiated.title,
    description: instantiated.description,
    accentColor: DEFAULT_ACCENT,
    thankYouMessage: instantiated.thankYouMessage,
    collectContact: true,
    couponCode: '',
    couponLabel: '',
    questions: instantiated.questions.map((d) => ({
      localId: d.localId,
      id: null,
      text: d.text,
      type: d.type,
      options:
        d.type === 'multiple_choice'
          ? d.options.map((text) => optionRow(text, false, makeKey))
          : [],
      required: d.required,
      answerCount: 0,
      usedOptions: [],
      originalText: null,
      originalOptions: null,
      originalType: null,
    })),
    removedQuestionIds: [],
  };
}

/**
 * Stored survey → editor form. `fallbackAccent` is what customers already see
 * when the survey has no colour of its own (the business colour).
 */
export function formFromStored(
  survey: StoredEditorSurvey,
  fallbackAccent: string,
  makeId: () => string = newLocalId,
  makeKey: () => string = newOptionKey,
): EditorForm {
  return {
    title: survey.title,
    description: survey.description ?? '',
    accentColor: normaliseHex(survey.accentColor ?? '') ?? normaliseHex(fallbackAccent) ?? DEFAULT_ACCENT,
    thankYouMessage: survey.thankYouMessage ?? '',
    collectContact: survey.collectContact,
    couponCode: survey.couponCode ?? '',
    couponLabel: survey.couponLabel ?? '',
    questions: survey.questions.map((q) => {
      const stored = q.type === 'multiple_choice' ? (q.options ?? []) : null;
      const used = new Set(q.answerCount > 0 ? q.usedOptions : []);
      return {
        localId: makeId(),
        id: q.id,
        text: q.text,
        type: q.type,
        options:
          q.type === 'multiple_choice'
            ? (stored ?? []).map((text) => optionRow(text, used.has(text), makeKey))
            : [],
        required: q.required,
        answerCount: q.answerCount,
        usedOptions: q.usedOptions,
        originalText: q.text,
        originalOptions: stored,
        originalType: q.type,
      };
    }),
    removedQuestionIds: [],
  };
}

// ── Question list operations ────────────────────────────────────────────────

/** Move a question one step. Out-of-range moves return the same list. */
export function moveQuestion(
  questions: ReadonlyArray<EditorQuestion>,
  index: number,
  direction: -1 | 1,
): EditorQuestion[] {
  const target = index + direction;
  if (index < 0 || index >= questions.length || target < 0 || target >= questions.length) {
    return [...questions];
  }
  const next = [...questions];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

/** Insert a copy right below the question it was made from. */
export function insertDuplicate(
  questions: ReadonlyArray<EditorQuestion>,
  index: number,
  copy: EditorQuestion,
): EditorQuestion[] {
  const next = [...questions];
  next.splice(index + 1, 0, copy);
  return next;
}

/**
 * Remove a question. A stored one (it has an id) is recorded in
 * `removedQuestionIds` — the server deletes nothing the owner did not name.
 * The last remaining question cannot be removed.
 */
export function removeQuestionFromForm(form: EditorForm, localId: string): EditorForm {
  if (form.questions.length <= 1) return form;
  const target = form.questions.find((q) => q.localId === localId);
  if (!target) return form;
  return {
    ...form,
    questions: form.questions.filter((q) => q.localId !== localId),
    removedQuestionIds:
      target.id && !form.removedQuestionIds.includes(target.id)
        ? [...form.removedQuestionIds, target.id]
        : form.removedQuestionIds,
  };
}

/** Switch a question's type; a choice question always has at least 2 rows. */
export function changeQuestionType(
  q: EditorQuestion,
  type: SurveyQuestionType,
  makeKey: () => string = newOptionKey,
): EditorQuestion {
  if (q.type === type) return q;
  const options =
    type === 'multiple_choice' && q.options.length < OPTIONS_MIN
      ? [...q.options, ...emptyChoiceRows(makeKey).slice(q.options.length)]
      : q.options;
  return { ...q, type, options };
}

/** The type of an answered stored question cannot change (rule R1). */
export function isTypeLocked(q: Pick<EditorQuestion, 'id' | 'answerCount'>): boolean {
  return q.id !== null && q.answerCount > 0;
}

/** Text of the options that count (non-blank, trimmed). */
export function filledOptionTexts(q: Pick<EditorQuestion, 'options'>): string[] {
  return q.options.map((o) => o.text.trim()).filter((t) => t.length > 0);
}

/** Does reworded text apply to an answered question (soft warning, not a block)? */
export function isAnsweredTextChanged(q: EditorQuestion): boolean {
  return q.id !== null && q.answerCount > 0 && q.originalText !== null && q.text.trim() !== q.originalText.trim();
}

// ── Snapshot (unsaved-changes detection) ────────────────────────────────────

/**
 * Stable string of everything the owner can change. Local ids and option keys
 * are left out (they are regenerated), so reopening the same data compares
 * equal and a re-ordering / re-wording compares different.
 */
export function editorSnapshot(form: EditorForm): string {
  return JSON.stringify({
    t: form.title,
    d: form.description,
    a: form.accentColor.toUpperCase(),
    y: form.thankYouMessage,
    c: form.collectContact,
    cc: form.couponCode,
    cl: form.couponLabel,
    r: [...form.removedQuestionIds].sort(),
    q: form.questions.map((q) => [
      q.id,
      q.text,
      q.type,
      q.required,
      q.type === 'multiple_choice' ? q.options.map((o) => o.text) : null,
    ]),
  });
}

// ── Validation ──────────────────────────────────────────────────────────────

export type FocusTarget =
  | { kind: 'title' }
  | { kind: 'questions' }
  | { kind: 'question'; localId: string }
  | { kind: 'option'; localId: string; index: number }
  | { kind: 'coupon' };

export interface QuestionErrors {
  text: string | null;
  /** "Write at least 2 options" (row-independent). */
  options: string | null;
  /** Rows (indexes into `options`) that repeat another option. */
  duplicateRows: number[];
}

export interface EditorValidation {
  ok: boolean;
  /** Number of things to fix (shown in the action bar). */
  count: number;
  titleError: string | null;
  questionsError: string | null;
  couponError: string | null;
  questionErrors: Record<string, QuestionErrors>;
  first: FocusTarget | null;
}

export interface ValidateContext {
  locale: EditorLocale;
  /**
   * Coupon values as stored. A legacy survey may hold a bare code (no
   * description); that is only reported once the owner touches the coupon.
   * Omit in create mode (always checked).
   */
  initialCoupon?: { code: string; label: string };
}

const TEXT = {
  title: { tr: 'Anket başlığını yaz.', en: 'Add a survey title.' },
  noQuestions: { tr: 'En az 1 soru olmalı.', en: 'At least 1 question is required.' },
  tooMany: {
    tr: `En fazla ${MAX_QUESTIONS_PER_SURVEY} soru ekleyebilirsin.`,
    en: `You can add up to ${MAX_QUESTIONS_PER_SURVEY} questions.`,
  },
  questionText: { tr: 'Soruyu yaz.', en: 'Write the question.' },
  options: { tr: 'En az 2 seçenek yaz.', en: 'Write at least 2 options.' },
  duplicate: { tr: 'Aynı seçeneği iki kez yazmışsın.', en: 'You entered the same option twice.' },
  coupon: { tr: 'Kupon koduna bir açıklama ekle.', en: 'Add a description for the coupon code.' },
} as const;

export function validateEditor(form: EditorForm, ctx: ValidateContext): EditorValidation {
  const { locale } = ctx;
  let count = 0;
  let first: FocusTarget | null = null;
  const note = (target: FocusTarget) => {
    count += 1;
    if (!first) first = target;
  };

  const titleError = form.title.trim() ? null : TEXT.title[locale];
  if (titleError) note({ kind: 'title' });

  let questionsError: string | null = null;
  if (form.questions.length < 1) questionsError = TEXT.noQuestions[locale];
  else if (form.questions.length > MAX_QUESTIONS_PER_SURVEY) questionsError = TEXT.tooMany[locale];
  if (questionsError) note({ kind: 'questions' });

  const questionErrors: Record<string, QuestionErrors> = {};
  for (const q of form.questions) {
    const entry: QuestionErrors = { text: null, options: null, duplicateRows: [] };
    if (!q.text.trim()) {
      entry.text = TEXT.questionText[locale];
      note({ kind: 'question', localId: q.localId });
    }
    if (q.type === 'multiple_choice') {
      if (filledOptionTexts(q).length < OPTIONS_MIN) {
        entry.options = TEXT.options[locale];
        const blankIndex = q.options.findIndex((o) => !o.text.trim() && !o.locked);
        note(
          blankIndex >= 0
            ? { kind: 'option', localId: q.localId, index: blankIndex }
            : { kind: 'question', localId: q.localId },
        );
      }
      const dupes = findNewOptionDuplicates(
        q.options.map((o) => o.text),
        q.originalType === 'multiple_choice' ? q.originalOptions : undefined,
      );
      entry.duplicateRows = dupes;
      for (const row of dupes) note({ kind: 'option', localId: q.localId, index: row });
    }
    questionErrors[q.localId] = entry;
  }

  const couponTouched =
    !ctx.initialCoupon ||
    form.couponCode !== ctx.initialCoupon.code ||
    form.couponLabel !== ctx.initialCoupon.label;
  const couponError =
    couponTouched && isCouponLabelMissing(form.couponCode, form.couponLabel)
      ? TEXT.coupon[locale]
      : null;
  if (couponError) note({ kind: 'coupon' });

  return {
    ok: count === 0,
    count,
    titleError,
    questionsError,
    couponError,
    questionErrors,
    first,
  };
}

// ── Request bodies ──────────────────────────────────────────────────────────

interface QuestionBody {
  id?: string;
  text: string;
  type: SurveyQuestionType;
  options?: string[];
  required: boolean;
}

function questionBody(q: EditorQuestion, withId: boolean): QuestionBody {
  const body: QuestionBody = {
    text: q.text.trim(),
    type: q.type,
    required: q.required,
  };
  if (q.type === 'multiple_choice') body.options = filledOptionTexts(q);
  if (withId && q.id) return { id: q.id, ...body };
  return body;
}

/** POST /api/surveys body. `type` is derived by the server and never sent. */
export function buildCreateBody(form: EditorForm, restaurantId: string, isPublished: boolean) {
  return {
    restaurantId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    accentColor: normaliseHex(form.accentColor) ?? DEFAULT_ACCENT,
    thankYouMessage: form.thankYouMessage.trim() || null,
    collectContact: form.collectContact,
    couponCode: form.couponCode.trim() || null,
    couponLabel: form.couponLabel.trim() || null,
    isPublished,
    questions: form.questions.map((q) => questionBody(q, false)),
  };
}

/**
 * PATCH /api/surveys/[id] body. Stored questions go with their id; the ones
 * the owner deleted are named in `removedQuestionIds` (the server refuses any
 * other removal). Colour and coupon are only sent when they changed — an old
 * survey with a bare coupon code, or no colour of its own, stays editable
 * without being rewritten.
 */
export function buildPatchBody(form: EditorForm, initial: EditorForm) {
  const body: Record<string, unknown> = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    thankYouMessage: form.thankYouMessage.trim() || null,
    collectContact: form.collectContact,
    questions: form.questions.map((q) => questionBody(q, true)),
    removedQuestionIds: form.removedQuestionIds,
  };
  if (form.accentColor.toUpperCase() !== initial.accentColor.toUpperCase()) {
    body.accentColor = normaliseHex(form.accentColor) ?? DEFAULT_ACCENT;
  }
  if (form.couponCode !== initial.couponCode || form.couponLabel !== initial.couponLabel) {
    body.couponCode = form.couponCode.trim() || null;
    body.couponLabel = form.couponLabel.trim() || null;
  }
  return body;
}

/**
 * After a PATCH succeeded but a follow-up step (publish) failed, the editor
 * stays open: adopt the stored ids so the next save matches them, and treat
 * everything as saved. `savedIds` are the question ids in the saved order.
 */
export function rebaseAfterSave(form: EditorForm, savedIds: ReadonlyArray<string>): EditorForm {
  return {
    ...form,
    removedQuestionIds: [],
    questions: form.questions.map((q, index) => {
      const id = savedIds[index] ?? q.id;
      const stored = q.type === 'multiple_choice' ? filledOptionTexts(q) : null;
      return {
        ...q,
        id,
        originalText: q.text,
        originalType: q.type,
        originalOptions: stored,
        // A question that was only just created has no answers yet.
        answerCount: q.id ? q.answerCount : 0,
        usedOptions: q.id ? q.usedOptions : [],
      };
    }),
  };
}

// ── Accent helpers ──────────────────────────────────────────────────────────

/** Swatches + the business colour (when it is not one of the swatches). */
export function accentChoices(brandColor: string | null | undefined): {
  swatches: ReadonlyArray<{ hex: string; tr: string; en: string }>;
  brand: string | null;
} {
  const brand = brandColor ? normaliseHex(brandColor) : null;
  const known = new Set(ACCENT_SWATCHES.map((s) => s.hex));
  return { swatches: ACCENT_SWATCHES, brand: brand && !known.has(brand) ? brand : null };
}

/** Is `hex` one of the preset swatches or the business colour? */
export function isPresetAccent(hex: string, brandColor: string | null | undefined): boolean {
  const value = normaliseHex(hex);
  if (!value) return false;
  const { swatches, brand } = accentChoices(brandColor);
  return swatches.some((s) => s.hex === value) || brand === value;
}

// ── Server error messages ───────────────────────────────────────────────────

export type SaveErrorKind = 'stale' | 'disabled' | 'generic';

export interface SaveErrorInfo {
  kind: SaveErrorKind;
  message: string;
}

const STALE_MESSAGE = {
  tr: 'Bu anket başka bir yerde değiştirilmiş. Kaydetmek yanıtlı soruları silebileceği için sayfayı yenilemen gerekiyor. Önce yazdığın metinleri kopyalamak isteyebilirsin.',
  en: 'This survey was changed somewhere else. Reload the page before saving, so answered questions aren\'t removed. You may want to copy your text first.',
} as const;

const EN_ERRORS: Record<string, string> = {
  surveys_disabled: 'The Surveys module is turned off by Buaze for this business.',
  rate_limit: 'Too many requests. Please wait a moment and try again.',
  question_locked: "A question that already has responses can't change its type, and its answered options can't change or be removed.",
  invalid_options: 'Multiple-choice questions need 2–6 different options.',
  coupon_label_required: 'Add a description for the coupon code.',
  validation_error: 'Some fields are not valid. Check the form and try again.',
  no_questions: 'Add at least one question before publishing.',
};

const TR_FALLBACKS: Record<string, string> = {
  validation_error: 'Bazı alanlar geçersiz. Formu kontrol edip tekrar dene.',
};

/**
 * Owner-language message for a failed save. `body` is the parsed JSON (or
 * null). Raw error codes never reach the screen; the server's own Turkish
 * `message` is used for Turkish panels, known codes are mapped for English.
 */
export function describeSaveError(
  status: number,
  body: { error?: unknown; message?: unknown; question?: unknown } | null,
  locale: EditorLocale,
): SaveErrorInfo {
  const code = typeof body?.error === 'string' ? body.error : '';
  if (code === 'stale_survey' || code === 'removal_not_confirmed') {
    return { kind: 'stale', message: STALE_MESSAGE[locale] };
  }
  const disabled = code === 'surveys_disabled';
  const kind: SaveErrorKind = disabled ? 'disabled' : 'generic';
  const serverMessage =
    typeof body?.message === 'string' && body.message.trim() ? body.message.trim() : '';
  const question =
    typeof body?.question === 'string' && body.question.trim()
      ? ` "${body.question.trim().slice(0, 60)}"`
      : '';

  if (locale === 'en') {
    const known = EN_ERRORS[code];
    if (known) return { kind, message: code === 'invalid_options' ? `${known}${question ? ` (${question.trim()})` : ''}` : known };
    if (status === 401) return { kind, message: 'Your session expired. Sign in again.' };
    if (status === 403) return { kind, message: "You don't have permission to do this." };
    if (status === 404) return { kind, message: 'Survey not found. Reload the page.' };
    return { kind, message: 'Something went wrong. Please try again.' };
  }

  if (serverMessage && code !== 'validation_error') {
    return {
      kind,
      message: code === 'invalid_options' && question ? `${serverMessage}${question}` : serverMessage,
    };
  }
  const fallback = TR_FALLBACKS[code];
  if (fallback) return { kind, message: fallback };
  if (status === 401) return { kind, message: 'Oturumun sona ermiş. Tekrar giriş yap.' };
  if (status === 403) return { kind, message: 'Bu işlem için yetkin yok.' };
  if (status === 404) return { kind, message: 'Anket bulunamadı. Sayfayı yenile.' };
  if (status === 429) return { kind, message: 'Çok fazla istek. Biraz bekleyip tekrar dene.' };
  return { kind, message: 'Bir şeyler ters gitti. Tekrar dene.' };
}
