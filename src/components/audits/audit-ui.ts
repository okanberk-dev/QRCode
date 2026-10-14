// Denetim Merkezi — owner UI için saf yardımcılar (React yok, DB yok).
//
// Liste / detay / builder / paylaşım paneli aynı etiketleri ve aynı küçük
// kuralları kullanır; drift olmasın diye tek modül. `tests/audits-ui-helpers.
// test.ts` bu dosyayı kapsar.

import { isReusable, isUsedUp } from '@/lib/audits/assignment-state';
import type { AuditKind, AuditStatus } from '@/lib/audits/kind';
import type { AuditSector } from '@/lib/audits/types';
import { formatClock, formatStampInTimeZone, isSameDayInTimeZone } from '@/lib/timezone';
import { normalizeQuestionForSave, type AuditBuilderQuestion } from '@/lib/audits/question-normalize';
import type { AuditQuestionDraft } from '@/lib/audits/wizard-state';

export type UiLocale = 'tr' | 'en';

// ─── Etiketler ──────────────────────────────────────────────────────────

const KIND_LABEL: Record<AuditKind, { tr: string; en: string }> = {
  checklist: { tr: 'Kontrol listesi', en: 'Checklist' },
  quiz: { tr: 'Test', en: 'Test' },
};

const STATUS_LABEL: Record<AuditStatus, { tr: string; en: string }> = {
  archived: { tr: 'Arşivlendi', en: 'Archived' },
  live: { tr: 'Yayında', en: 'Live' },
  paused: { tr: 'Duraklatıldı', en: 'Paused' },
  draft: { tr: 'Taslak', en: 'Draft' },
};

export function kindLabel(kind: AuditKind, locale: UiLocale): string {
  return KIND_LABEL[kind][locale];
}

export function statusLabel(status: AuditStatus, locale: UiLocale): string {
  return STATUS_LABEL[status][locale];
}

/** Bölüm başlığı: kontrol listesinde "Maddeler", testte "Sorular". */
export function itemsHeading(kind: AuditKind, locale: UiLocale): string {
  if (kind === 'quiz') return locale === 'tr' ? 'Sorular' : 'Questions';
  return locale === 'tr' ? 'Maddeler' : 'Items';
}

/** "6 madde" / "1 item" / "6 items". Türkçede sayıdan sonra tekil. */
export function itemsCount(n: number, locale: UiLocale): string {
  if (locale === 'tr') return `${n} madde`;
  return `${n} ${n === 1 ? 'item' : 'items'}`;
}

/** "12 yanıt" / "1 response" / "12 responses". */
export function responsesCount(n: number, locale: UiLocale): string {
  if (locale === 'tr') return `${n} yanıt`;
  return `${n} ${n === 1 ? 'response' : 'responses'}`;
}

// ─── Paylaşım linki ─────────────────────────────────────────────────────

/** Katılımcıya verilen tam adres: `<appUrl>/audits/<token>`. */
export function buildShareUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/+$/, '')}/audits/${token}`;
}

/** WhatsApp'ta "Başlık: link" metniyle yeni mesaj açar. */
export function buildWhatsAppHref(title: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${title}: ${url}`)}`;
}

/** Sahibin kendi e-posta uygulamasını açar (Buaze mail göndermez). */
export function buildMailtoHref(title: string, url: string, locale: UiLocale): string {
  const body =
    locale === 'tr'
      ? `Denetimi telefonundan doldurmak için bu linki aç: ${url}`
      : `Open this link to fill in the audit on your phone: ${url}`;
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

export interface LinkLike {
  id: string;
  status: string;
  recurrence: string;
  tokenRevoked: boolean;
  token?: string | null;
  createdAt: string;
}

/** Çalışan (iptal edilmemiş, token'ı olan) linkler, en eski önce. */
export function activeShareLinks<T extends LinkLike>(rows: readonly T[] | null | undefined): T[] {
  return (rows ?? [])
    .filter((a) => !a.tokenRevoked && a.status !== 'cancelled' && Boolean(a.token))
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/**
 * "Varsayılan link": ilk (en eski) çalışan SÜREKLİ link. Tek seferlik bir link
 * (ör. adaya özel) genel ekip linki yerine geçmez; kullanılmış tek seferlik
 * link de asla varsayılan olmaz.
 */
export function pickDefaultLink<T extends LinkLike>(rows: readonly T[] | null | undefined): T | null {
  const hit = activeShareLinks(rows).find(
    (a) => isReusable(a.recurrence) && !isUsedUp({ status: a.status, recurrence: a.recurrence }),
  );
  return hit ?? null;
}

/** Link satırı için sahibe görünen ad (katılımcıya gösterilmez). */
export function shareLinkLabel(
  a: {
    assigneeType: string;
    assigneeName: string | null;
    assigneeEmail: string | null;
  },
  locale: UiLocale,
): string {
  const name = a.assigneeName?.trim();
  if (name) return name;
  const email = a.assigneeEmail?.trim();
  if (email) return email;
  if (a.assigneeType === 'team_member') return locale === 'tr' ? 'Ekip üyesi (eski)' : 'Team member (legacy)';
  if (a.assigneeType === 'candidate') return locale === 'tr' ? 'Aday (eski)' : 'Candidate (legacy)';
  if (a.assigneeType === 'self') return locale === 'tr' ? 'Kendim (eski)' : 'Myself (legacy)';
  return locale === 'tr' ? 'Adsız link' : 'Unnamed link';
}

// ─── Hazır şablon listesi ───────────────────────────────────────────────

const CHECKLIST_FIRST_SECTORS: ReadonlySet<AuditSector> = new Set<AuditSector>([
  'food',
  'hotel',
  'health',
]);

export interface CatalogSortable {
  title: string;
  kind: AuditKind;
}

/**
 * Hazır şablon sırası: restoran / otel / klinik için kontrol listeleri önce,
 * sonra başlık (Türkçe harf sırası). Girdiyi değiştirmez.
 */
export function sortCatalogRows<T extends CatalogSortable>(
  rows: readonly T[],
  businessSector: AuditSector,
): T[] {
  const checklistsFirst = CHECKLIST_FIRST_SECTORS.has(businessSector);
  return rows.slice().sort((a, b) => {
    if (checklistsFirst && a.kind !== b.kind) return a.kind === 'checklist' ? -1 : 1;
    return a.title.localeCompare(b.title, 'tr');
  });
}

/**
 * "Tüm sektörler" görünümü için gruplar: önce işletmenin sektörü, sonra
 * kalanlar `AuditSector` sırasıyla. Boş gruplar atılır.
 */
export function groupCatalogBySector<T extends CatalogSortable & { sector: AuditSector }>(
  rows: readonly T[],
  businessSector: AuditSector,
  sectorOrder: readonly AuditSector[],
): Array<{ sector: AuditSector; rows: T[] }> {
  const order = [businessSector, ...sectorOrder.filter((s) => s !== businessSector)];
  const groups: Array<{ sector: AuditSector; rows: T[] }> = [];
  for (const sector of order) {
    const inSector = rows.filter((r) => r.sector === sector);
    if (inSector.length > 0) groups.push({ sector, rows: sortCatalogRows(inSector, businessSector) });
  }
  return groups;
}

/** Arama kutusunun görünmesi için en az liste uzunluğu (spec §3.1). */
export const SEARCH_MIN_AUDITS = 8;

/** Başlıkta arama (Türkçe büyük/küçük harf farkı gözetmez). */
export function matchesAuditQuery(title: string, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('tr-TR');
  if (!q) return true;
  return title.toLocaleLowerCase('tr-TR').includes(q);
}


// ─── Rozetler ───────────────────────────────────────────────────────────

export type AuditBadgeKind = 'ok' | 'warn' | 'ghost' | 'info';

/** Durum çipinin `Badge` türü (spec §3.0). */
export function statusBadgeKind(status: AuditStatus): AuditBadgeKind {
  switch (status) {
    case 'live':
      return 'ok';
    case 'paused':
      return 'warn';
    case 'archived':
    case 'draft':
    default:
      return 'ghost';
  }
}

/** Tür çipi: Test dikkat çeker (info), kontrol listesi nötr (ghost). */
export function kindBadgeKind(kind: AuditKind): AuditBadgeKind {
  return kind === 'quiz' ? 'info' : 'ghost';
}

// ─── Tarih / özet satırları ─────────────────────────────────────────────

/**
 * Yanıt zamanı: bugün → "Bugün 14:32", aksi halde "11 Eki 23:18". Saat dilimi
 * her zaman işletmenin yerel saati (CLAUDE.md §46) — sunucu ve tarayıcı aynı
 * metni üretir. `now` yalnız test içindir.
 */
export function formatResponseStamp(
  iso: string | null | undefined,
  locale: UiLocale,
  now: Date = new Date(),
): string {
  if (!iso) return '';
  if (isSameDayInTimeZone(iso, now)) {
    const clock = formatClock(iso, locale);
    return locale === 'tr' ? `Bugün ${clock}` : `Today ${clock}`;
  }
  return formatStampInTimeZone(iso, locale);
}

/** "Son yanıt: 11 Eki 23:18" veya "Henüz yanıt yok". */
export function lastResponseLine(
  iso: string | null | undefined,
  locale: UiLocale,
  now: Date = new Date(),
): string {
  const stamp = formatResponseStamp(iso, locale, now);
  if (!stamp) return locale === 'tr' ? 'Henüz yanıt yok' : 'No responses yet';
  return locale === 'tr' ? `Son yanıt: ${stamp}` : `Last response: ${stamp}`;
}

/** "6 madde · 2 yanıt". */
export function metaLine(items: number, responses: number, locale: UiLocale): string {
  return `${itemsCount(items, locale)} · ${responsesCount(responses, locale)}`;
}

/** Detay özeti: "6 madde · 2 yanıt · son yanıt 11 Eki 23:18". */
export function summaryLine(
  items: number,
  responses: number,
  lastIso: string | null | undefined,
  locale: UiLocale,
  now: Date = new Date(),
): string {
  const base = metaLine(items, responses, locale);
  const stamp = formatResponseStamp(lastIso, locale, now);
  if (!stamp) return base;
  const label = locale === 'tr' ? 'son yanıt' : 'last response';
  return `${base} · ${label} ${stamp.charAt(0).toLocaleLowerCase(locale === 'tr' ? 'tr-TR' : 'en-US')}${stamp.slice(1)}`;
}

// ─── Hızlı madde ekleme ─────────────────────────────────────────────────

export type QuickAddType = 'yes_no' | 'scale' | 'single' | 'text' | 'file';

/** Hızlı ekleme çiplerinin sırası (spec §3.4). `multi` yalnız "Detay"dan seçilir. */
export const QUICK_ADD_TYPES: readonly QuickAddType[] = ['yes_no', 'scale', 'single', 'text', 'file'];

const QUICK_ADD_LABEL: Record<QuickAddType, { tr: string; en: string }> = {
  yes_no: { tr: 'Evet/Hayır', en: 'Yes/No' },
  scale: { tr: '1-5 puan', en: '1-5 rating' },
  single: { tr: 'Seçenekli', en: 'Choice' },
  text: { tr: 'Not', en: 'Note' },
  file: { tr: 'Fotoğraf', en: 'Photo' },
};

export function quickAddLabel(type: QuickAddType, locale: UiLocale): string {
  return QUICK_ADD_LABEL[type][locale];
}

/** Varsayılan çip: kontrol listesi → Evet/Hayır, test → Seçenekli. */
export function defaultQuickAddType(kind: AuditKind): QuickAddType {
  return kind === 'quiz' ? 'single' : 'yes_no';
}

/** Uygun/doğru cevap etiketi: kontrol listesinde "Uygun cevap", testte "Doğru cevap". */
export function expectedAnswerLabel(kind: AuditKind, locale: UiLocale): string {
  if (kind === 'quiz') return locale === 'tr' ? 'Doğru cevap' : 'Correct answer';
  return locale === 'tr' ? 'Uygun cevap' : 'Expected answer';
}

/** Soru listesindeki sıra rozeti için hızlı özet: seçenekli sorularda seçenekler. */
export function optionsPreview(options: readonly string[] | null | undefined): string {
  return (options ?? [])
    .map((o) => o.trim())
    .filter(Boolean)
    .join(' · ');
}

// ─── Onay metinleri (dürüst; spec §3.0 / §3.2) ──────────────────────────

export interface ConfirmCopy {
  title: string;
  body: string;
  confirm: string;
}

/** Silme: yanıt varsa "arşivlenir", yoksa "kalıcı silinir". */
export function deleteConfirmCopy(hasResponses: boolean, locale: UiLocale): ConfirmCopy {
  if (locale === 'tr') {
    return hasResponses
      ? {
          title: 'Denetimi sil',
          body: 'Bu denetim yanıt aldığı için silinmez, arşivlenir. Linkler kapanır, yanıtlar korunur.',
          confirm: 'Arşivle',
        }
      : { title: 'Denetimi sil', body: 'Bu denetim kalıcı olarak silinir.', confirm: 'Sil' };
  }
  return hasResponses
    ? {
        title: 'Delete audit',
        body: 'This audit has responses, so it is archived instead of deleted. Its links close; responses are kept.',
        confirm: 'Archive',
      }
    : { title: 'Delete audit', body: 'This audit will be permanently deleted.', confirm: 'Delete' };
}

export function pauseConfirmCopy(locale: UiLocale): ConfirmCopy {
  return locale === 'tr'
    ? {
        title: 'Denetimi duraklat',
        body: 'Duraklatınca paylaştığın linkler açılmaz. İstediğin zaman yeniden başlatabilirsin.',
        confirm: 'Duraklat',
      }
    : {
        title: 'Pause audit',
        body: 'While paused, the links you shared will not open. You can restart it any time.',
        confirm: 'Pause',
      };
}

/** "Hazır şablona geri dön" — reset rotası denetimi duraklatır (isPublished=false). */
export function restoreConfirmCopy(locale: UiLocale): ConfirmCopy {
  return locale === 'tr'
    ? {
        title: 'Hazır şablona geri dön',
        body: "Sorular hazır şablonun son haline döner ve denetim duraklatılır; hazır olunca 'Yeniden başlat'a bas. Linkler o zamana kadar açılmaz.",
        confirm: 'Geri dön',
      }
    : {
        title: 'Restore the ready-made version',
        body: "Items go back to the latest ready-made version and the audit is paused; press 'Restart' when you are ready. Links stay closed until then.",
        confirm: 'Restore',
      };
}

export function revokeLinkConfirmCopy(locale: UiLocale): ConfirmCopy {
  return locale === 'tr'
    ? {
        title: 'Linki kapat',
        body: 'Bu link çalışmayı bırakır. Geçmiş yanıtlar korunur.',
        confirm: 'Linki kapat',
      }
    : {
        title: 'Close link',
        body: 'This link stops working. Past responses are kept.',
        confirm: 'Close link',
      };
}

// ─── Geçme puanı girişi ─────────────────────────────────────────────────

/**
 * Geçme puanı kutusunun ham metni → 0-100 tam sayı veya null (boş). Sayı
 * değilse null; aralık dışı sıkıştırılır (Zod `.int().min(0).max(100)` katı).
 */
export function parsePassingScoreInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Math.floor(Number(trimmed));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}


// ─── Builder soru durumu ↔ AuditQuestionEditor taslağı ──────────────────

/** Builder sorusunu (clientKey + persistedId) editörün `AuditQuestionDraft`'ına çevirir. */
export function questionToDraft(q: AuditBuilderQuestion): AuditQuestionDraft {
  return {
    id: q.clientKey,
    persistedId: q.persistedId ?? null,
    type: q.type,
    prompt: q.prompt,
    helpText: q.helpText,
    options: q.options,
    correctAnswer: q.correctAnswer,
    weight: q.weight,
    isRequired: q.isRequired,
    sortOrder: q.sortOrder,
  };
}

/**
 * Editörden dönen taslağı builder sorusuna uygular; kimlik (`clientKey`,
 * `persistedId`) ve sıra builder'da KALIR.
 */
export function applyDraftToQuestion(
  prev: AuditBuilderQuestion,
  d: AuditQuestionDraft,
): AuditBuilderQuestion {
  return {
    ...prev,
    type: d.type,
    prompt: d.prompt,
    helpText: d.helpText ?? null,
    options: d.options ?? null,
    correctAnswer: d.correctAnswer ?? null,
    weight: d.weight,
    isRequired: d.isRequired,
  };
}

/**
 * Denetim dili değişince Evet/Hayır sorularının seçenekleri ve uygun cevabı
 * yeni dile taşınır (Evet ↔ Yes, Hayır ↔ No); diğer sorulara dokunulmaz.
 */
export function localizeYesNoQuestions(
  questions: readonly AuditBuilderQuestion[],
  loc: 'tr' | 'en',
): AuditBuilderQuestion[] {
  return questions.map((q) => {
    if (q.type !== 'yes_no') return q;
    const n = normalizeQuestionForSave(q, loc);
    return { ...q, options: n.options, correctAnswer: n.correctAnswer };
  });
}

/** Evet/Hayır sorusunun seçili uygun cevabı: 0 = Evet, 1 = Hayır, -1 = yok / tanınmıyor (iki dilde). */
export function yesNoCorrectIndex(correct: unknown): 0 | 1 | -1 {
  if (typeof correct !== 'string') return -1;
  const n = correct.trim().toLowerCase();
  if (n === 'evet' || n === 'yes') return 0;
  if (n === 'hayır' || n === 'hayir' || n === 'no') return 1;
  return -1;
}
