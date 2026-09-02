import type { Locale } from '@/lib/translations';
import type { PlatformId } from '@/components/ui';
import { formatFullDateTimeInTimeZone, formatStampInTimeZone } from '@/lib/timezone';

export const PLATFORM_OPTIONS: PlatformId[] = [
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
];

export function initials(name: string | null) {
  if (!name) return 'B';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function timeAgo(dateStr: string, locale: Locale) {
  const isTr = locale === 'tr';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return isTr ? `${diff} sn` : `${diff}s`;
  if (diff < 3600) return isTr ? `${Math.floor(diff / 60)} dk` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return isTr ? `${Math.floor(diff / 3600)} sa` : `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return isTr ? `${days} gün` : `${days}d`;
  return new Date(dateStr).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
  });
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
