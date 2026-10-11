import {
  formatFullDateTimeInTimeZone,
  formatStampInTimeZone,
  resolveDisplayTimeZone,
} from '@/lib/timezone';

// Platform display helpers are shared with the owner inbox — one source.
// Never `toUpperCase()` a storage key ("YEMEKSEPETI", "TRENDYOL_GO").
export {
  INBOX_PLATFORM_FILTER_IDS,
  platformIconId,
  platformLabel,
} from '@/components/dashboard/feedbacks/inbox-format';

/**
 * Compact relative age: "12 sn" / "7 dk" / "7 sa" / "2 gün" (EN "7h", "2d").
 * Older than a week → a short date in the business timezone (§46), never the
 * device timezone.
 */
export function timeAgo(iso: string, isTr: boolean) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 60) return isTr ? `${diff} sn` : `${diff}s`;
  if (diff < 3600) return isTr ? `${Math.floor(diff / 60)} dk` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return isTr ? `${Math.floor(diff / 3600)} sa` : `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return isTr ? `${days} gün` : `${days}d`;
  return new Intl.DateTimeFormat(isTr ? 'tr-TR' : 'en-US', {
    timeZone: resolveDisplayTimeZone(),
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

/**
 * Sentence-case relative label for list rows and the detail meta line:
 * "az önce", "7 dk önce", "2 gün önce" / "just now", "7m ago", "2d ago".
 * Dates older than a week stay as-is ("3 Eki").
 */
export function timeAgoLabel(iso: string, isTr: boolean) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diff < 60) return isTr ? 'az önce' : 'just now';
  const base = timeAgo(iso, isTr);
  if (diff >= 7 * 86400) return base;
  return isTr ? `${base} önce` : `${base} ago`;
}

// §38.237 / §46 — absolute stamps in the business timezone, so the operator
// panel, the owner panel and the alert mail show the same clock time.

/** Compact stamp: today → "14:32", this year → "1 Eyl 14:32", older → "1 Eyl 2025 14:32". */
export function formatStamp(iso: string, isTr: boolean) {
  return formatStampInTimeZone(iso, isTr ? 'tr' : 'en');
}

/** Full stamp (tooltip + detail header): "1 Eylül 2026 14:32". */
export function formatDateTime(iso: string, isTr: boolean) {
  return formatFullDateTimeInTimeZone(iso, isTr ? 'tr' : 'en');
}
