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
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function timeAgo(iso: string, isTr: boolean) {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return isTr ? `${diff} sn` : `${diff}s`;
  if (diff < 3600) return isTr ? `${Math.floor(diff / 60)} dk` : `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return isTr ? `${Math.floor(diff / 3600)} sa` : `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return isTr ? `${days} gün` : `${days}d`;
  return new Date(iso).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
  });
}

// §38.237 — Mutlak zaman damgası. `timeAgo` göreli ("3 sa") gösterir ama
// operatör "yorum tam olarak saat kaçta geldi?" sorusunu yanıtlayamıyordu.
// `formatStamp` liste satırında kompakt saat, `formatDateTime` tooltip +
// detay panelinde tam damga verir. Locale-aware (tr-TR 24h / en-US 12h).

// İşletmenin yerel saatinde damga (CLAUDE.md §46) — operatör paneli ile
// owner paneli ve uyarı maili aynı saati göstermeli.

/** Kompakt damga: bugün → "14:32", bu yıl → "1 Eyl 14:32", eski → "1 Eyl 2025 14:32". */
export function formatStamp(iso: string, isTr: boolean) {
  return formatStampInTimeZone(iso, isTr ? 'tr' : 'en');
}

/** Tam damga (tooltip + detay başlığı): "1 Eylül 2026 14:32". */
export function formatDateTime(iso: string, isTr: boolean) {
  return formatFullDateTimeInTimeZone(iso, isTr ? 'tr' : 'en');
}
