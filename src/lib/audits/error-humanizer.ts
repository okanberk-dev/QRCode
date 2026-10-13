// CLAUDE.md §42 — Audit validation error humanizer (saf helper).
//
// Tüm audit endpoint'leri `validate.ts` üzerinden Zod hatasını
// `{ error: 'validation_error', issues: [{ path, message }] }` formatında
// döner. UI tarafında bunu kullanıcıya "questions.0.options: Bu soru tipi
// en az 2 seçenek gerektirir" gibi raw göstermek kötü UX — bu helper
// path + message ikilisini TR/EN okunabilir tek satıra çevirir.
//
// Kullanıcı tarafı kontratı:
//   • Bilinen path prefix → human-readable label (Atama → E-posta)
//   • Bilinen Zod default mesaj → Türkçe karşılık ("Invalid email" → "Geçerli bir e-posta girin")
//   • Sorular path numeralize → "1. Soru: Seçenekler"
//   • Bilinmeyen path → "Bilinmeyen alan: <ham path>" fallback
//
// CLAUDE.md §7 disipline: 3+ callsite (wizard / edit / question editor /
// public submit / admin detail) tek modülden tükettiği için abstraction
// kaçınma kuralı geçerli değil — kanonik helper.

import type { Locale } from '@/lib/translations';

export interface RawIssue {
  path: string;
  message: string;
}

// ─── Path label maps ────────────────────────────────────────────────────

const FIELD_LABEL_TR: Record<string, string> = {
  title: 'Başlık',
  description: 'Açıklama',
  sector: 'Sektör',
  categoryId: 'Kategori',
  locale: 'Dil',
  scoringMode: 'Skorlama modu',
  passingScore: 'Geçme puanı',
  publish: 'Yayın durumu',
  // Question level
  type: 'Soru tipi',
  prompt: 'Soru metni',
  helpText: 'Yardım metni',
  options: 'Seçenekler',
  correctAnswer: 'Doğru cevap',
  weight: 'Ağırlık',
  isRequired: 'Zorunlu',
  sortOrder: 'Sıra',
  // Assignment
  'assignment.assigneeType': 'Atama tipi',
  'assignment.assigneeTeamMemberId': 'Ekip üyesi',
  'assignment.assigneeName': 'Atama: Ad',
  'assignment.assigneeEmail': 'Atama: E-posta',
  'assignment.assigneePhone': 'Atama: Telefon',
  'assignment.dueAt': 'Atama: Son tarih',
  'assignment.recurrence': 'Atama: Tekrar',
  'assignment.internalNote': 'Atama: Dahili not',
  'assignment.enabled': 'Atama',
  // Public submit
  hasKvkkConsent: 'KVKK onayı',
  hasMarketingConsent: 'Pazarlama izni',
  respondentName: 'Ad',
  respondentEmail: 'E-posta',
  respondentPhone: 'Telefon',
  answers: 'Cevaplar',
};

const FIELD_LABEL_EN: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  sector: 'Sector',
  categoryId: 'Category',
  locale: 'Locale',
  scoringMode: 'Scoring mode',
  passingScore: 'Passing score',
  publish: 'Publish state',
  type: 'Question type',
  prompt: 'Question text',
  helpText: 'Help text',
  options: 'Options',
  correctAnswer: 'Correct answer',
  weight: 'Weight',
  isRequired: 'Required flag',
  sortOrder: 'Order',
  'assignment.assigneeType': 'Assignee type',
  'assignment.assigneeTeamMemberId': 'Team member',
  'assignment.assigneeName': 'Assignment: Name',
  'assignment.assigneeEmail': 'Assignment: Email',
  'assignment.assigneePhone': 'Assignment: Phone',
  'assignment.dueAt': 'Assignment: Due date',
  'assignment.recurrence': 'Assignment: Recurrence',
  'assignment.internalNote': 'Assignment: Internal note',
  'assignment.enabled': 'Assignment',
  hasKvkkConsent: 'KVKK consent',
  hasMarketingConsent: 'Marketing consent',
  respondentName: 'Name',
  respondentEmail: 'Email',
  respondentPhone: 'Phone',
  answers: 'Answers',
};

// ─── Message translation maps ───────────────────────────────────────────

// Zod default mesajlarını TR'ye çeviriyoruz; tam eşleşme + prefix match.
const MESSAGE_OVERRIDES_TR: Array<{ test: (msg: string) => boolean; out: string }> = [
  { test: (m) => /invalid email/i.test(m), out: 'Geçerli bir e-posta girin' },
  { test: (m) => /required/i.test(m) && !/contain/i.test(m), out: 'Zorunlu alan' },
  { test: (m) => /must contain at least/i.test(m), out: 'Çok kısa' },
  { test: (m) => /must contain at most/i.test(m), out: 'Çok uzun' },
  { test: (m) => /expected number/i.test(m), out: 'Sayı bekleniyor' },
  { test: (m) => /expected string/i.test(m), out: 'Metin bekleniyor' },
  { test: (m) => /expected boolean/i.test(m), out: 'true/false bekleniyor' },
  { test: (m) => /invalid enum value/i.test(m), out: 'Geçersiz seçim' },
  { test: (m) => /unrecognized key/i.test(m), out: 'Bilinmeyen alan' },
  { test: (m) => /must be greater than 0/i.test(m), out: '0\'dan büyük olmalı' },
  { test: (m) => /must be a multiple of 1/i.test(m), out: 'Tam sayı olmalı' },
];

const MESSAGE_OVERRIDES_EN: Array<{ test: (msg: string) => boolean; out: string }> = [
  { test: (m) => /invalid email/i.test(m), out: 'Enter a valid email' },
  { test: (m) => /required/i.test(m) && !/contain/i.test(m), out: 'Required field' },
  { test: (m) => /must contain at least/i.test(m), out: 'Too short' },
  { test: (m) => /must contain at most/i.test(m), out: 'Too long' },
];

function translateMessage(message: string, locale: Locale): string {
  // Türkçe mesajlar (Zod schema'sında elle yazılı) — aynen geç.
  if (/[çğıöşü]/.test(message) || /[ÇĞİÖŞÜ]/.test(message)) {
    return message;
  }
  const table = locale === 'tr' ? MESSAGE_OVERRIDES_TR : MESSAGE_OVERRIDES_EN;
  for (const rule of table) {
    if (rule.test(message)) return rule.out;
  }
  return message;
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Tek bir Zod issue'yu user-friendly tek satıra çevirir.
 * Örnek:
 *   { path: 'assignment.assigneeEmail', message: 'Invalid email' }
 *   → 'Atama: E-posta — Geçerli bir e-posta girin'
 *   { path: 'questions.2.options', message: 'Bu soru tipi en az 2 seçenek gerektirir' }
 *   → '3. Soru: Seçenekler — Bu soru tipi en az 2 seçenek gerektirir'
 */
export function humanizeAuditIssue(issue: RawIssue, locale: Locale = 'tr'): string {
  const isTr = locale === 'tr';
  const labels = isTr ? FIELD_LABEL_TR : FIELD_LABEL_EN;
  const message = translateMessage(issue.message, locale);
  const path = issue.path;

  // Question path: "questions.N.fieldName" → "N+1. Soru: fieldLabel"
  const qMatch = path.match(/^questions\.(\d+)(?:\.(.+))?$/);
  if (qMatch) {
    const idx = Number(qMatch[1]);
    const field = qMatch[2];
    const qLabel = isTr ? `${idx + 1}. Soru` : `Question ${idx + 1}`;
    if (!field) return `${qLabel} — ${message}`;
    // Options sub-index: "options.1" → just say "Options"
    const root = field.split('.')[0];
    const fieldLabel = labels[root] ?? root;
    return `${qLabel}: ${fieldLabel} — ${message}`;
  }

  // Answers path: "answers.N.value" → "N+1. cevap"
  const aMatch = path.match(/^answers\.(\d+)(?:\.(.+))?$/);
  if (aMatch) {
    const idx = Number(aMatch[1]);
    const aLabel = isTr ? `${idx + 1}. Cevap` : `Answer ${idx + 1}`;
    return `${aLabel} — ${message}`;
  }

  // Assignment sub-fields: full path lookup first, then root fallback
  if (path.startsWith('assignment.')) {
    const fieldLabel = labels[path] ?? labels[path.replace('assignment.', '')] ?? path;
    return `${fieldLabel} — ${message}`;
  }

  // Flat field
  const fieldLabel = labels[path] ?? path;
  return `${fieldLabel} — ${message}`;
}

/**
 * Issues array'i → human-friendly satır array'i.
 * UI bunu `<ul>` veya joined ile render eder.
 */
export function humanizeAuditIssues(issues: RawIssue[], locale: Locale = 'tr'): string[] {
  return issues.map((i) => humanizeAuditIssue(i, locale));
}

// ─── Response parser ───────────────────────────────────────────────────

export interface ParsedAuditError {
  /** Top-level friendly title; UI banner başlığı için */
  title: string;
  /** Bullet list — boş olabilir, sadece title varsa banner inline metni */
  details: string[];
  /** Backend code (PUBLISHED_LOCKED, RESPONSES_LOCK_QUESTIONS, NO_QUESTIONS, INVALID_CATEGORY, INVALID_DUE_AT, MISSING_REQUIRED, NO_KVKK_CONSENT vb.) */
  code: string | null;
}

const CODE_MESSAGES_TR: Record<string, string> = {
  PUBLISHED_LOCKED: 'Bu şablon yayında. Düzenlemek için önce yayından kaldır.',
  RESPONSES_LOCK_QUESTIONS: 'Yanıt almış şablonun soruları değiştirilemez. Yeni versiyon için çoğalt.',
  NO_QUESTIONS: 'Yayın için en az 1 soru gerekli.',
  INVALID_CATEGORY: 'Seçilen kategori artık geçerli değil.',
  INVALID_DUE_AT: 'Geçersiz son tarih biçimi.',
  MISSING_REQUIRED: 'Zorunlu soru(lar) yanıtsız bırakılmış.',
  NO_KVKK_CONSENT: 'KVKK onayı zorunlu.',
  INVALID_QUESTION_ID: 'Bu şablona ait olmayan bir soru gönderildi.',
  UNIQUE_VIOLATION: 'Çakışan kayıt mevcut. Lütfen sayfayı yenile.',
  FK_VIOLATION: 'İlişkili bir kayıt bulunamadı.',
  // Canlı düzenleme (spec §6.3) — yayındaki denetim linkleri kapatılmadan düzenlenir.
  QUESTION_LOCKED:
    'Bu maddeye yanıt verilmiş. Metnini değiştirebilirsin; türünü, seçeneklerini, doğru cevabını veya puan ağırlığını değiştirmek için denetimi kopyala.',
  QUESTION_HAS_ANSWERS: 'Yanıt almış madde silinemez.',
  DUPLICATE_QUESTION_ID: 'Aynı madde birden fazla kez gönderildi. Sayfayı yenileyip tekrar dene.',
  STALE_EDIT: 'Bu denetim sen düzenlerken değişti. Sayfayı yenileyip tekrar dene.',
  ARCHIVED: 'Bu denetim arşivlendi; düzenlenemez.',
  // Public gönderim (spec §6.8)
  PHOTO_TOO_LARGE: 'Fotoğraf çok büyük. Daha küçük bir fotoğraf dene.',
  PAYLOAD_TOO_LARGE: 'Gönderilen veri çok büyük. Fotoğrafları azaltıp tekrar dene.',
  INVALID_ANSWER: 'Bir cevap geçersiz. Cevapları kontrol edip tekrar dene.',
  INVALID_PHOTO: 'Fotoğraf geçersiz. Yeniden çekip tekrar dene.',
  rate_limited: 'Çok hızlı denedin. Lütfen biraz bekleyip tekrar dene.',
  not_found: 'Bu denetime ulaşılamıyor.',
  already_completed: 'Bu denetim zaten tamamlandı.',
};

/** `rate_limited` + `scope: 'daily'` (link günlük sınırı) için ayrı metin. */
const DAILY_CAP_MESSAGE_TR =
  'Bu link bugün çok fazla yanıt aldı. Yarın tekrar dene veya işletmeyle iletişime geç.';
const DAILY_CAP_MESSAGE_EN =
  'This link received too many responses today. Try again tomorrow or contact the business.';

/** `details.itemNumber` taşıyan hata kodları (madde numarası başlığın altına satır olarak eklenir). */
const ITEM_NUMBER_CODES = new Set([
  'QUESTION_LOCKED',
  'QUESTION_HAS_ANSWERS',
  'DUPLICATE_QUESTION_ID',
]);

const CODE_MESSAGES_EN: Record<string, string> = {
  PUBLISHED_LOCKED: 'Template is published. Unpublish it first to edit.',
  RESPONSES_LOCK_QUESTIONS: 'Cannot change questions after responses. Duplicate to create a new version.',
  NO_QUESTIONS: 'At least 1 question is required to publish.',
  INVALID_CATEGORY: 'Selected category is no longer valid.',
  INVALID_DUE_AT: 'Invalid due date format.',
  MISSING_REQUIRED: 'Some required questions are unanswered.',
  NO_KVKK_CONSENT: 'KVKK consent is required.',
  INVALID_QUESTION_ID: 'A question that does not belong to this template was submitted.',
  UNIQUE_VIOLATION: 'A conflicting record exists. Please refresh the page.',
  FK_VIOLATION: 'A related record was not found.',
  QUESTION_LOCKED:
    'This item already has answers. You can edit its text; to change its type, options, correct answer or weight, copy the audit.',
  QUESTION_HAS_ANSWERS: 'An item with answers cannot be deleted.',
  DUPLICATE_QUESTION_ID: 'The same item was sent more than once. Refresh the page and try again.',
  STALE_EDIT: 'This audit changed while you were editing. Refresh the page and try again.',
  ARCHIVED: 'This audit is archived and cannot be edited.',
  PHOTO_TOO_LARGE: 'The photo is too large. Try a smaller one.',
  PAYLOAD_TOO_LARGE: 'The submission is too large. Remove some photos and try again.',
  INVALID_ANSWER: 'An answer is invalid. Check your answers and try again.',
  INVALID_PHOTO: 'The photo is invalid. Retake it and try again.',
  rate_limited: 'Too many requests. Please wait a moment and try again.',
  not_found: 'This audit is not available.',
  already_completed: 'This audit was already completed.',
};

/**
 * Audit endpoint'lerinden gelen `Response`'u (fetch sonrası) parse eder.
 * Generic — `error`, `code`, `message`, `issues` alanlarının herhangi bir
 * kombinasyonunu okur. Default fallback locale-aware.
 *
 * Kullanım:
 *   if (!res.ok) {
 *     const err = await parseAuditErrorResponse(res, locale);
 *     setError(err);  // {title, details, code}
 *     return;
 *   }
 */
export async function parseAuditErrorResponse(
  res: Response,
  locale: Locale = 'tr',
): Promise<ParsedAuditError> {
  const isTr = locale === 'tr';
  const fallbackTitle = isTr ? 'İşlem başarısız' : 'Operation failed';
  const codeMap = isTr ? CODE_MESSAGES_TR : CODE_MESSAGES_EN;

  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    return {
      title:
        res.status === 429
          ? codeMap.rate_limited
          : res.status === 404
            ? codeMap.not_found
            : fallbackTitle,
      details: [],
      code: null,
    };
  }

  const codeField = typeof json.code === 'string' ? json.code : null;
  const errorField = typeof json.error === 'string' ? json.error : null;
  const messageField = typeof json.message === 'string' ? json.message : null;
  const issues = Array.isArray(json.issues) ? (json.issues as RawIssue[]) : [];
  const code = codeField ?? (errorField && codeMap[errorField] ? errorField : null);

  // Validation error — issues humanize edilir, top-level başlık generic
  if (errorField === 'validation_error') {
    const details = humanizeAuditIssues(issues, locale);
    return {
      title: isTr ? 'Bazı alanları kontrol et' : 'Some fields need attention',
      details,
      code: 'validation_error',
    };
  }

  // Known backend code — code map'ten oku
  if (code && codeMap[code]) {
    // 429 + scope:'daily' → link günlük sınırı için ayrı metin.
    const daily = code === 'rate_limited' && json.scope === 'daily';
    const title = daily ? (isTr ? DAILY_CAP_MESSAGE_TR : DAILY_CAP_MESSAGE_EN) : codeMap[code];
    // QUESTION_LOCKED vb. `details.itemNumber` taşır → "3. madde" satırı.
    const rawDetails =
      json.details && typeof json.details === 'object' && !Array.isArray(json.details)
        ? (json.details as Record<string, unknown>)
        : null;
    const itemNumber =
      rawDetails && typeof rawDetails.itemNumber === 'number' && rawDetails.itemNumber > 0
        ? Math.floor(rawDetails.itemNumber)
        : null;
    const details =
      itemNumber !== null && ITEM_NUMBER_CODES.has(code)
        ? [isTr ? `${itemNumber}. madde` : `Item ${itemNumber}`]
        : [];
    return { title, details, code };
  }

  // Plain error string ("Yayın için en az 1 soru gerekli", "Geçersiz kategori")
  // — backend'in Türkçe mesajı zaten user-friendly, aynen göster.
  if (errorField && !codeMap[errorField]) {
    return { title: errorField, details: [], code };
  }

  if (messageField) {
    return { title: messageField, details: [], code };
  }

  return {
    title:
      res.status === 429
        ? codeMap.rate_limited
        : res.status === 404
          ? codeMap.not_found
          : res.status === 401 || res.status === 403
            ? isTr
              ? 'Yetkisiz erişim'
              : 'Unauthorized'
            : fallbackTitle,
    details: [],
    code,
  };
}

/**
 * Tek satırlık özet üretir (banner tek-satır mod için).
 * Title + ilk detay var ise " — " ile birleştir.
 */
export function summarizeAuditError(err: ParsedAuditError): string {
  if (err.details.length === 0) return err.title;
  if (err.details.length === 1) return `${err.title}: ${err.details[0]}`;
  return `${err.title} (${err.details.length})`;
}

// ─── Client-side validation helpers ────────────────────────────────────

/**
 * Hafif e-posta regex (Zod'un native `.email()` ile uyumlu — RFC 5322
 * lite). Wizard / public form'da onBlur kontrolü için.
 */
export function isLikelyEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return true; // boş = caller'a bırak (required vs optional)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
