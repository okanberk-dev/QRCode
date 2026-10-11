import type { Locale } from '@/lib/translations';
import {
  formatFullDateTimeInTimeZone,
  formatStampInTimeZone,
  resolveDisplayTimeZone,
} from '@/lib/timezone';

// Platform display helpers are shared with the admin inbox — one source.
export {
  INBOX_PLATFORM_FILTER_IDS,
  platformIconId,
  platformLabel,
} from '@/components/dashboard/feedbacks/inbox-format';

/**
 * Compact relative age: "12 sn" / "7 dk" / "7 sa" / "2 gün" (EN "7h", "2d").
 * Older than a week → a short date in the business timezone (§46) — never
 * the device timezone.
 */
export function timeAgo(dateStr: string, locale: Locale) {
  const isTr = locale === 'tr';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return isTr ? `${diff} sn` : `${diff}s`;
  if (diff < 3600) return isTr ? `${Math.floor(diff / 60)} dk` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return isTr ? `${Math.floor(diff / 3600)} sa` : `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return isTr ? `${days} gün` : `${days}d`;
  return new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
    timeZone: resolveDisplayTimeZone(),
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateStr));
}

/**
 * Sentence-case relative label for list rows and the detail meta line:
 * "az önce", "7 dk önce", "2 gün önce" / "just now", "7m ago", "2d ago".
 * Dates older than a week stay as-is ("3 Eki").
 */
export function timeAgoLabel(dateStr: string, locale: Locale) {
  const isTr = locale === 'tr';
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 60) return isTr ? 'az önce' : 'just now';
  const base = timeAgo(dateStr, locale);
  if (diff >= 7 * 86400) return base;
  return isTr ? `${base} önce` : `${base} ago`;
}

// §38.237 — Mutlak zaman damgası. `timeAgo` göreli ("3 sa") gösterir ama
// işletme sahibi "yorum tam olarak saat kaçta geldi?" sorusunu
// yanıtlayamıyordu. `formatStamp` liste satırında kompakt saat,
// `formatDateTime` tooltip + detay panelinde tam damga verir.

// Damgalar işletmenin yerel saatinde üretilir (CLAUDE.md §46). Cihaz TZ'sine
// bırakılınca aynı yorum sunucuda (UTC) 11:32, Türkiye'deki owner'da 14:32,
// yurt dışındaki owner'da bambaşka bir saat görünüyordu.

/** Kompakt damga: bugün → "14:32", bu yıl → "1 Eyl 14:32", eski → "1 Eyl 2025 14:32". */
export function formatStamp(dateStr: string, locale: Locale) {
  return formatStampInTimeZone(dateStr, locale === 'en' ? 'en' : 'tr');
}

/** Tam damga (tooltip + detay başlığı): "1 Eylül 2026 14:32". */
export function formatDateTime(dateStr: string, locale: Locale) {
  return formatFullDateTimeInTimeZone(dateStr, locale === 'en' ? 'en' : 'tr');
}
