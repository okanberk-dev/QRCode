// Denetim Merkezi — builder ↔ API soru eşlemesi (spec §5.4 + §4.4).
//
// Eski istemciler (wizard + edit) soru id'lerini bilerek atıyordu ("draft id
// yok sayılır"). Bu, her düzenlemeyi "hepsini sil + yeniden oluştur" gösterir
// ve yanıt almış denetimlerde `QUESTION_HAS_ANSWERS` ile patlardı. Yeni builder:
//
//   • her soruda `{ clientKey, persistedId? }` tutar. `clientKey` yalnız DnD
//     içindir ve ASLA gönderilmez; sunucudan gelen sorular `persistedId` taşır.
//   • `toPatchQuestions` `id`'yi YALNIZ `persistedId`'si olan sorulara koyar
//     (yeni sorular id'siz gider) → sunucu tarafı diff mümkün olur.
//   • `normalizeQuestionForSave` kaydetmeden önce boş seçenekleri atar,
//     `correctAnswer`'ı kalan seçeneklere göre budar, yes_no seçeneklerini
//     denetim dilindeki Evet/Hayır'a zorlar. Doğrulama yine mevcut
//     `AuditQuestionSchema` ile yapılır.
//
// Saf, DB'siz; hem builder hem `AuditQuestionEditor.handleSave` kullanır.

import { getYesNoDefaultOptions } from './options';
import type { AuditLocale, AuditQuestionType } from './types';

export type QuestionCorrectAnswer = string | string[] | number | null;

/** Builder'ın ve (eski) wizard'ın soru taslağını kapsayan yapısal tip. */
export interface QuestionDraftLike {
  /** DnD anahtarı (yeni builder). Sunucuya GİTMEZ. */
  clientKey?: string;
  /** Eski wizard'ın DnD id'si. Yok sayılır, sunucuya GİTMEZ. */
  id?: string;
  /** Sunucudan yüklenen sorunun kalıcı id'si. */
  persistedId?: string | null;
  type: AuditQuestionType;
  prompt: string;
  helpText?: string | null;
  options?: string[] | null;
  correctAnswer?: unknown;
  weight?: number;
  isRequired?: boolean;
  sortOrder?: number;
}

/** Yeni builder'ın soru durumu. */
export interface AuditBuilderQuestion extends QuestionDraftLike {
  clientKey: string;
  persistedId?: string | null;
  type: AuditQuestionType;
  prompt: string;
  helpText: string | null;
  options: string[] | null;
  correctAnswer: QuestionCorrectAnswer;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

/** `AuditQuestionSchema`'ya girecek (kaydedilmeye hazır) soru. */
export interface NormalizedQuestion {
  type: AuditQuestionType;
  prompt: string;
  helpText: string | null;
  options: string[] | null;
  correctAnswer: QuestionCorrectAnswer;
  weight: number;
  isRequired: boolean;
  sortOrder: number;
}

export interface PatchQuestionPayload extends NormalizedQuestion {
  /** Yalnız kalıcı (sunucudan gelen) sorularda. */
  id?: string;
}

// ─── Client key ─────────────────────────────────────────────────────────

let keyCounter = 0;
/** DnD için benzersiz istemci anahtarı (`q_xxxxxx`). Kriptografik değil. */
export function makeClientKey(): string {
  keyCounter += 1;
  return `q_${Date.now().toString(36)}${keyCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

// ─── Defaults (spec §4.4) ───────────────────────────────────────────────

/**
 * Yeni soru varsayılanları:
 *   - yes_no : seçenekler denetim dilinde Evet/Hayır, doğru cevap = ilk seçenek
 *              (kontrol listesi anlamı), zorunlu
 *   - scale  : doğru cevap yok (Likert 1-5 → 20-100), zorunlu
 *   - single / multi : seçenekler `['', '']` (UI'da "Seçenek 1/2" placeholder'ı;
 *              placeholder asla değer olarak kaydedilmez), doğru cevap yok, zorunlu
 *   - text / file : opsiyonel, puanlanmaz
 */
export function makeDefaultQuestion(
  type: AuditQuestionType,
  locale: AuditLocale = 'tr',
  overrides: Partial<AuditBuilderQuestion> = {},
): AuditBuilderQuestion {
  const base: AuditBuilderQuestion = {
    clientKey: makeClientKey(),
    persistedId: null,
    type,
    prompt: '',
    helpText: null,
    options: null,
    correctAnswer: null,
    weight: 1,
    isRequired: true,
    sortOrder: 0,
  };
  switch (type) {
    case 'yes_no': {
      const opts = getYesNoDefaultOptions(locale);
      base.options = opts;
      base.correctAnswer = opts[0];
      break;
    }
    case 'single':
    case 'multi':
      base.options = ['', ''];
      break;
    case 'text':
    case 'file':
      base.isRequired = false;
      break;
    case 'scale':
    default:
      break;
  }
  return { ...base, ...overrides };
}

// ─── Normalization ──────────────────────────────────────────────────────

function cleanString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** 'evet'/'yes' → 0, 'hayır'/'hayir'/'no' → 1, aksi -1 (iki dilde de tanır). */
function yesNoIndex(value: string): 0 | 1 | -1 {
  const n = value.trim().toLowerCase();
  if (n === 'evet' || n === 'yes') return 0;
  if (n === 'hayır' || n === 'hayir' || n === 'no') return 1;
  return -1;
}

function matchOption(value: unknown, options: readonly string[]): string | null {
  if (typeof value !== 'string') return null;
  const t = value.trim().toLowerCase();
  if (!t) return null;
  const hit = options.find((o) => o.toLowerCase() === t);
  return hit ?? null;
}

/**
 * Kaydetmeden önce soruyu temizler (asla throw etmez):
 *   - prompt / helpText / seçenekler trim edilir, boş seçenekler atılır
 *   - yes_no seçenekleri denetim dilindeki Evet/Hayır'a ZORLANIR; doğru cevap
 *     iki dilde de tanınıp (Evet↔Yes, Hayır↔No) pozisyonla eşlenir
 *   - single/multi: `correctAnswer` kalan seçeneklerde olmayan değerlerden arındırılır
 *   - scale / text / file: seçenek yok; correctAnswer tipe uygun değilse null
 *   - weight 1-10 tam sayıya sıkıştırılır
 */
export function normalizeQuestionForSave(
  q: QuestionDraftLike,
  locale: AuditLocale = 'tr',
): NormalizedQuestion {
  const prompt = cleanString(q.prompt);
  const helpText = cleanString(q.helpText) || null;
  const weightNum = Math.round(Number(q.weight));
  const weight = Number.isFinite(weightNum) ? Math.max(1, Math.min(10, weightNum)) : 1;
  const isRequired = typeof q.isRequired === 'boolean' ? q.isRequired : true;
  const sortOrder =
    typeof q.sortOrder === 'number' && Number.isFinite(q.sortOrder) ? q.sortOrder : 0;

  let options: string[] | null = null;
  let correctAnswer: QuestionCorrectAnswer = null;
  const rawCorrect = q.correctAnswer;

  switch (q.type) {
    case 'yes_no': {
      options = getYesNoDefaultOptions(locale);
      if (typeof rawCorrect === 'string') {
        const idx = yesNoIndex(rawCorrect);
        correctAnswer = idx >= 0 ? options[idx] : matchOption(rawCorrect, options);
      }
      break;
    }

    case 'single':
    case 'multi': {
      const kept = (Array.isArray(q.options) ? q.options : [])
        .map((o) => cleanString(o))
        .filter((o) => o.length > 0);
      options = kept;
      if (q.type === 'single') {
        if (typeof rawCorrect === 'string') {
          correctAnswer = matchOption(rawCorrect, kept);
        } else if (Array.isArray(rawCorrect) && rawCorrect.length === 1) {
          correctAnswer = matchOption(rawCorrect[0], kept);
        }
      } else {
        const wanted: unknown[] = Array.isArray(rawCorrect)
          ? rawCorrect
          : typeof rawCorrect === 'string'
            ? [rawCorrect]
            : [];
        const mapped: string[] = [];
        for (const w of wanted) {
          const hit = matchOption(w, kept);
          if (hit && !mapped.includes(hit)) mapped.push(hit);
        }
        correctAnswer = mapped.length > 0 ? mapped : null;
      }
      break;
    }

    case 'scale': {
      correctAnswer =
        typeof rawCorrect === 'number' && Number.isFinite(rawCorrect) ? rawCorrect : null;
      break;
    }

    case 'text': {
      const t = cleanString(rawCorrect);
      correctAnswer = t ? t : null;
      break;
    }

    case 'file':
    default:
      break;
  }

  return {
    type: q.type,
    prompt,
    helpText,
    options,
    correctAnswer,
    weight,
    isRequired,
    sortOrder,
  };
}

// ─── Validation (friendly, pre-Zod) ─────────────────────────────────────

export type QuestionCheck =
  | { ok: true; question: NormalizedQuestion }
  | { ok: false; field: 'prompt' | 'options'; message: string };

/**
 * Normalize eder, sonra Zod'dan ÖNCE kullanıcıya dönük iki hatayı yakalar:
 *   - boş madde metni
 *   - single/multi için en az 2 dolu seçenek yok → "En az 2 seçenek yaz."
 * Geri kalan (uzunluk sınırları vb.) mevcut `AuditQuestionSchema`'ya bırakılır;
 * çağıran normalize edilmiş soruyu o şemadan geçirir.
 */
export function checkQuestionForSave(
  q: QuestionDraftLike,
  locale: AuditLocale = 'tr',
): QuestionCheck {
  const isTr = locale !== 'en';
  const question = normalizeQuestionForSave(q, locale);
  if (!question.prompt) {
    return {
      ok: false,
      field: 'prompt',
      message: isTr ? 'Madde metni boş olamaz.' : 'Item text is required.',
    };
  }
  if ((question.type === 'single' || question.type === 'multi') && (question.options?.length ?? 0) < 2) {
    return {
      ok: false,
      field: 'options',
      message: isTr ? 'En az 2 seçenek yaz.' : 'Write at least 2 options.',
    };
  }
  return { ok: true, question };
}

// ─── Payload builders ───────────────────────────────────────────────────

type QuestionsInput = readonly QuestionDraftLike[] | { questions: readonly QuestionDraftLike[]; locale?: AuditLocale };

function unpack(
  input: QuestionsInput,
  locale?: AuditLocale,
): { questions: readonly QuestionDraftLike[]; locale: AuditLocale } {
  if (Array.isArray(input)) {
    return { questions: input as readonly QuestionDraftLike[], locale: locale ?? 'tr' };
  }
  const state = input as { questions: readonly QuestionDraftLike[]; locale?: AuditLocale };
  return { questions: state.questions, locale: locale ?? state.locale ?? 'tr' };
}

/**
 * `PATCH` gövdesi için sorular. `id` YALNIZ `persistedId`'si olan sorulara
 * eklenir; yeni sorular id'siz gider (sunucu üretir). `clientKey` / eski
 * draft `id` asla gönderilmez. Sıra = dizi sırası: `sortOrder = (i+1)*10`.
 */
export function toPatchQuestions(input: QuestionsInput, locale?: AuditLocale): PatchQuestionPayload[] {
  const { questions, locale: loc } = unpack(input, locale);
  return questions.map((q, i) => {
    const n = normalizeQuestionForSave(q, loc);
    const out: PatchQuestionPayload = { ...n, sortOrder: (i + 1) * 10 };
    if (typeof q.persistedId === 'string' && q.persistedId.length > 0) out.id = q.persistedId;
    return out;
  });
}

/** `POST` (oluşturma) gövdesi için sorular — hiç id yok. */
export function toCreateQuestions(input: QuestionsInput, locale?: AuditLocale): NormalizedQuestion[] {
  const { questions, locale: loc } = unpack(input, locale);
  return questions.map((q, i) => ({
    ...normalizeQuestionForSave(q, loc),
    sortOrder: (i + 1) * 10,
  }));
}

// ─── Server row → builder state ─────────────────────────────────────────

export interface ServerQuestionRow {
  id: string;
  type: string;
  prompt: string;
  helpText?: string | null;
  options?: unknown;
  correctAnswer?: unknown;
  weight?: number | null;
  isRequired?: boolean | null;
  sortOrder?: number | null;
}

/**
 * API/Prisma satırını builder durumuna çevirir; `persistedId` doldurulur ki
 * kaydetmede `id` gönderilsin. Json alanları defansif okunur.
 */
export function fromServerQuestion(row: ServerQuestionRow): AuditBuilderQuestion {
  const options = Array.isArray(row.options)
    ? (row.options as unknown[]).filter((o): o is string => typeof o === 'string')
    : null;
  let correctAnswer: QuestionCorrectAnswer = null;
  const c = row.correctAnswer;
  if (typeof c === 'string' || typeof c === 'number') correctAnswer = c;
  else if (Array.isArray(c)) correctAnswer = c.filter((x): x is string => typeof x === 'string');
  return {
    clientKey: makeClientKey(),
    persistedId: row.id,
    type: row.type as AuditQuestionType,
    prompt: row.prompt,
    helpText: row.helpText ?? null,
    options: options && options.length > 0 ? options : null,
    correctAnswer,
    weight: typeof row.weight === 'number' ? row.weight : 1,
    isRequired: row.isRequired ?? true,
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : 0,
  };
}
