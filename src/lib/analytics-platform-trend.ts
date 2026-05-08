// Stage 66 §38.147 — HANDOFF AnalyticsDesktop main chart 30-day stacked area
// için saf helper. Tasarım kaynağı (.design-owner-2026/page-analytics.jsx
// SERIES line 30-39 birebir): 3-series stacked area (Google + Tripadvisor +
// Direkt QR/Buaze QR). Rating-agnostic volume metric (HANDOFF spec'inde
// rating filter yok, total review volume per platform/day).
//
// Buaze adapt:
// - `buazeQr` = `platform === null` (CLAUDE.md §38.34 "Buaze QR" UI runtime
//   label paterni reuse).
// - `other` bucket = Yemeksepeti/Getir/Trendyol/Yelp/Foursquare/Yandex/...
//   HANDOFF main chart 3-series sade kalır; "diğer" stacked area'da 4. seri
//   olarak görünür (owner farklı platform kullanırsa data kaybolmaz).
//
// Saf fonksiyon — Prisma çağrısı YOK (caller feedbacksWindow geçirir).
// SSR + test friendly.

export interface FeedbackForPlatformTrend {
  rating: number | null;
  platform: string | null;
  createdAt: Date;
}

export interface PlatformDailyPoint {
  /** Display label, dd/mm formatlı (locale-aware). */
  date: string;
  /** ISO YYYY-MM-DD raw key (test + cross-reference için). */
  isoDate: string;
  /** Google reviews count (platform === 'google'). */
  google: number;
  /** Tripadvisor reviews count (platform === 'tripadvisor'). */
  tripadvisor: number;
  /** Direkt QR (platform === null) — Buaze QR runtime label. */
  buazeQr: number;
  /**
   * Diğer platformlar (Yemeksepeti / Getir / Trendyol GO / Yandex / Yelp /
   * Foursquare / Booking / Airbnb). HANDOFF main chart 3-series sade kalır;
   * owner farklı platform kullanırsa "diğer" bucket'ında görünür (data
   * kaybolmaz).
   */
  other: number;
  /** Toplam (Google + Tripadvisor + BuazeQR + Other). */
  total: number;
}

export interface BuildPlatformDailyTrendOptions {
  windowDays: number;
  locale: 'tr' | 'en';
  /** Window end exclusive (default now). Test için override edilebilir. */
  now?: Date;
}

const KNOWN_PLATFORMS = new Set(['google', 'tripadvisor']);

/**
 * Window'daki feedback'leri günlük buckets'a böler, her gün için 4-bucket
 * platform breakdown üretir.
 *
 * Window: `[now - windowDays, now]` rolling. `windowDays=30` HANDOFF default.
 *
 * Özellikler:
 * - Rating-agnostic (volume metric — HANDOFF birebir).
 * - Tüm gün entry'leri eksik kombinasyonlar için 0 default.
 * - Date format locale-aware (tr-TR `dd/mm` veya en-GB `dd/mm`).
 * - SSR-safe — `new Date()` argument default ile deterministik.
 *
 * @param feedbacks Pre-filtered window feedback array (page.tsx'te zaten
 *   `feedbacksWindow` mevcut — direkt geçirilebilir).
 * @param options windowDays + locale + opsiyonel now override.
 */
export function buildPlatformDailyTrend(
  feedbacks: FeedbackForPlatformTrend[],
  options: BuildPlatformDailyTrendOptions,
): PlatformDailyPoint[] {
  const { windowDays, locale, now = new Date() } = options;
  if (windowDays <= 0) return [];

  const dateFmt = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
  });

  const points: PlatformDailyPoint[] = [];
  for (let i = 0; i < windowDays; i++) {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - (windowDays - 1 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    let google = 0;
    let tripadvisor = 0;
    let buazeQr = 0;
    let other = 0;

    for (const f of feedbacks) {
      if (f.createdAt < dayStart || f.createdAt >= dayEnd) continue;
      const platform = f.platform ? f.platform.toLowerCase() : null;
      if (platform === 'google') google += 1;
      else if (platform === 'tripadvisor') tripadvisor += 1;
      else if (platform === null || platform === 'buaze_qr') buazeQr += 1;
      else other += 1;
    }

    // Local TZ-safe ISO date (YYYY-MM-DD). `toISOString()` UTC dönüştürür,
    // local timezone'da day boundary'si farklı saat dilimlerinde drift
    // edebilir (örn. UTC+03 Turkey'de UTC midnight ≠ local midnight). Manuel
    // local date string compute test + production parity sağlar.
    const isoDate = `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`;
    points.push({
      date: dateFmt.format(dayStart),
      isoDate,
      google,
      tripadvisor,
      buazeQr,
      other,
      total: google + tripadvisor + buazeQr + other,
    });
  }
  return points;
}

/**
 * Aggregate sums (sidebar legend için): toplam Google + Tripadvisor + BuazeQR
 * + Other counts window genelinde. Saf fonksiyon, daily breakdown
 * generate edildikten sonra reduce.
 */
export function aggregatePlatformTotals(points: PlatformDailyPoint[]): {
  google: number;
  tripadvisor: number;
  buazeQr: number;
  other: number;
  total: number;
} {
  return points.reduce(
    (acc, p) => ({
      google: acc.google + p.google,
      tripadvisor: acc.tripadvisor + p.tripadvisor,
      buazeQr: acc.buazeQr + p.buazeQr,
      other: acc.other + p.other,
      total: acc.total + p.total,
    }),
    { google: 0, tripadvisor: 0, buazeQr: 0, other: 0, total: 0 },
  );
}

/** Whitelist export — yeni platform eklendiğinde bu set güncellenir. */
export const PLATFORM_TREND_KNOWN_KEYS = KNOWN_PLATFORMS;
