/**
 * Kanonik görüntüleme saat dilimi (display timezone).
 *
 * Sorun: `new Date(iso).toLocaleTimeString('tr-TR')` çağrısı **çalıştığı
 * ortamın** saat dilimini kullanır. Vercel serverless process TZ = UTC,
 * tarayıcı ise kullanıcının cihaz TZ'si. Aynı yorum bu yüzden üç farklı
 * saat gösterebiliyordu:
 *   - düşük puan uyarı mailinde 11:32 (UTC — sunucuda render edildi)
 *   - panelde 14:32 (Türkiye'deki owner'ın tarayıcısı)
 *   - yurt dışındaki owner'ın panelinde 12:32
 * Owner "yorum saat kaçta geldi?" sorusunu güvenle yanıtlayamıyordu.
 *
 * Çözüm: yorum/aktivite zaman damgaları **işletmenin yerel saatinde**
 * gösterilir ve bu saat dilimi tek noktadan gelir. Böylece mail, panel ve
 * SSR/CSR aynı string'i üretir (hydration mismatch de kapanır).
 *
 * Not: `User.timezone` (§38.37) profil formunda saklanıyor ama gösterimde
 * kullanılmıyor — kasıtlı. Owner'ın kişisel TZ'si ile işletmenin saati
 * ayrışırsa mail ile panel yine farklı saat gösterirdi. Helper `pref`
 * parametresi kabul ediyor; restoran bazlı TZ alanı eklenirse tek callsite
 * değişikliğiyle devreye alınır.
 */

/** Buaze TR pazarı — işletmelerin varsayılan yerel saati. */
export const DEFAULT_DISPLAY_TIME_ZONE = 'Europe/Istanbul';

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Görüntüleme saat dilimini çöz. Öncelik: açık `pref` → env override
 * (`NEXT_PUBLIC_DISPLAY_TIMEZONE`) → `Europe/Istanbul`.
 * Geçersiz IANA değeri sessizce default'a düşer (mail/panel render'ı
 * asla `RangeError` ile kırılmaz).
 */
export function resolveDisplayTimeZone(pref?: string | null): string {
  if (pref && isValidTimeZone(pref)) return pref;
  const env = process.env.NEXT_PUBLIC_DISPLAY_TIMEZONE;
  if (env && isValidTimeZone(env)) return env;
  return DEFAULT_DISPLAY_TIME_ZONE;
}

function toDate(value: Date | string | number): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function localeTag(locale: 'tr' | 'en' | string): string {
  return locale === 'en' ? 'en-US' : 'tr-TR';
}

/** Hedef saat diliminde yıl/ay/gün parçaları — gün karşılaştırması için. */
function ymdInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** İki tarih hedef saat diliminde aynı güne mi düşüyor? */
export function isSameDayInTimeZone(
  a: Date | string | number,
  b: Date | string | number,
  timeZone: string = resolveDisplayTimeZone(),
): boolean {
  const da = toDate(a);
  const db = toDate(b);
  if (!da || !db) return false;
  return ymdInTimeZone(da, timeZone) === ymdInTimeZone(db, timeZone);
}

/** "14:32" (tr 24h / en 12h). */
export function formatClock(
  value: Date | string | number,
  locale: 'tr' | 'en' = 'tr',
  timeZone: string = resolveDisplayTimeZone(),
): string {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Kompakt damga: bugün → "14:32", bu yıl → "1 Eyl 14:32",
 * daha eski → "1 Eyl 2025 14:32". "Bugün" kararı hedef TZ'ye göre verilir.
 */
export function formatStampInTimeZone(
  value: Date | string | number,
  locale: 'tr' | 'en' = 'tr',
  timeZone: string = resolveDisplayTimeZone(),
): string {
  const d = toDate(value);
  if (!d) return '';
  const tag = localeTag(locale);
  const clock = formatClock(d, locale, timeZone);
  const now = new Date();
  if (isSameDayInTimeZone(d, now, timeZone)) return clock;

  const sameYear =
    ymdInTimeZone(d, timeZone).slice(0, 4) === ymdInTimeZone(now, timeZone).slice(0, 4);
  const datePart = new Intl.DateTimeFormat(tag, {
    timeZone,
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(d);
  return `${datePart} ${clock}`;
}

/** Tam damga: "1 Eylül 2026 14:32". Tooltip / detay başlığı / mail. */
export function formatFullDateTimeInTimeZone(
  value: Date | string | number,
  locale: 'tr' | 'en' = 'tr',
  timeZone: string = resolveDisplayTimeZone(),
): string {
  const d = toDate(value);
  if (!d) return '';
  const tag = localeTag(locale);
  const datePart = new Intl.DateTimeFormat(tag, {
    timeZone,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  return `${datePart} ${formatClock(d, locale, timeZone)}`;
}

/** Mail başlığı için kısa damga: "01.09 14:32" (tr) / "09/01 02:32 PM" (en). */
export function formatCompactStampInTimeZone(
  value: Date | string | number,
  locale: 'tr' | 'en' = 'tr',
  timeZone: string = resolveDisplayTimeZone(),
): string {
  const d = toDate(value);
  if (!d) return '';
  return new Intl.DateTimeFormat(localeTag(locale), {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
