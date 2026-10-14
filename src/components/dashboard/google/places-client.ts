/**
 * Browser-side helpers shared by the Google Places UI (picker + profile
 * section + the google-reviews page).
 *
 * Storage stance (CLAUDE.md §5.1.2): Places content (rating, review text,
 * reviewer names, address, hours …) is shown live and is NEVER written to any
 * browser storage API. What lives here:
 *   - a module-level in-memory `Map` copy of a profile response (10 minutes,
 *     lost on reload) so switching businesses back and forth does not re-bill
 *     a Details call;
 *   - a single-flight map so two simultaneous requests (React StrictMode
 *     double effect, two components) share ONE request;
 *   - ONE `sessionStorage` boolean per business that remembers "auto-search
 *     already ran this session" — a flag, never results.
 */

import { useCallback, useEffect, useState } from 'react';
import type { PlacesProfile, PlacesProfileResponse, PlacesReview } from '@/lib/google-places';
import { ownerGoogleMessage, ownerGoogleMessageForBody } from '@/lib/google-owner-copy';

export type UiLocale = 'tr' | 'en';

/** The business fields the picker / section need (a subset of the list row). */
export interface PlacesPickerRestaurant {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  googlePlaceId?: string | null;
  googleReviewUrl?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// Small defensive helpers
// ─────────────────────────────────────────────────────────────────────────

export function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** `res.json()` that never throws (an HTML error page is `null`). */
export async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** The machine `code` of a route error body (`{ error, code }`), or null. */
export function bodyCode(body: unknown): string | null {
  const code = asRecord(body)?.code;
  return typeof code === 'string' ? code : null;
}

/**
 * `AlertBanner`'s built-in dismiss button is 32 px; on touch screens the banners
 * of this feature grow it to a 44 px target without making the banner taller
 * (negative margin). Pass as the banner's `className`.
 */
export const BANNER_TOUCH_CLS =
  'max-sm:[&_.bz-btn-icon]:-my-2 max-sm:[&_.bz-btn-icon]:min-h-11 max-sm:[&_.bz-btn-icon]:min-w-11';

/**
 * Owner-safe text for a failed Google route response. Maps the body's machine
 * `warning` / `code` / `error` key; when none is known it uses `fallbackKey`
 * (itself a machine key of `google-owner-copy`) or the generic message. The
 * body's own `message` and free-text `error` are NEVER returned: server text
 * can carry developer vocabulary.
 */
export function ownerBodyMessage(body: unknown, locale: UiLocale, fallbackKey?: string): string {
  const mapped = ownerGoogleMessageForBody(body, locale);
  if (!fallbackKey || mapped !== ownerGoogleMessage(null, locale)) return mapped;
  return ownerGoogleMessage(fallbackKey, locale);
}

/** Like `ownerBodyMessage`, but an unknown body falls back to the caller's own owner-safe sentence. */
export function ownerBodyMessageOr(body: unknown, locale: UiLocale, fallbackText: string): string {
  const mapped = ownerGoogleMessageForBody(body, locale);
  return mapped === ownerGoogleMessage(null, locale) ? fallbackText : mapped;
}

function httpsOnly(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function httpOrHttps(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'https:' || protocol === 'http:' ? value : null;
  } catch {
    return null;
  }
}

/** Google Maps page of a Place ID (used when no `mapsUri` is available). */
export function placeMapsUrl(placeId: string): string {
  return `https://www.google.com/maps/search/?api=1&query=_&query_place_id=${encodeURIComponent(placeId)}`;
}

/** Hostname-only label of an https/http URL (for compact link text). */
export function hostLabel(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, '') || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Response validation (defence in depth: the server already normalises)
// ─────────────────────────────────────────────────────────────────────────

const PROFILE_STATES = new Set(['ok', 'not_linked', 'unavailable', 'not_found', 'error']);

function cleanReview(raw: unknown): PlacesReview | null {
  const r = asRecord(raw);
  if (!r) return null;
  const rating = typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5 ? r.rating : null;
  const text = typeof r.text === 'string' && r.text.trim() ? r.text : null;
  if (rating === null && text === null) return null;
  return {
    rating,
    text,
    publishedAt: typeof r.publishedAt === 'string' ? r.publishedAt : null,
    authorName: typeof r.authorName === 'string' && r.authorName.trim() ? r.authorName : null,
    authorUri: httpsOnly(r.authorUri),
    authorPhotoUri: httpsOnly(r.authorPhotoUri),
    mapsUri: httpsOnly(r.mapsUri),
  };
}

function cleanProfile(raw: unknown, placeId: string | null): PlacesProfile | null {
  const p = asRecord(raw);
  if (!p) return null;
  const status = p.businessStatus;
  return {
    v: 1,
    placeId: typeof p.placeId === 'string' ? p.placeId : (placeId ?? ''),
    name: typeof p.name === 'string' && p.name.trim() ? p.name : null,
    address: typeof p.address === 'string' && p.address.trim() ? p.address : null,
    mapsUri: httpsOnly(p.mapsUri),
    businessStatus:
      status === 'OPERATIONAL' || status === 'CLOSED_TEMPORARILY' || status === 'CLOSED_PERMANENTLY'
        ? status
        : 'UNKNOWN',
    category: typeof p.category === 'string' && p.category.trim() ? p.category : null,
    rating: typeof p.rating === 'number' && p.rating >= 1 && p.rating <= 5 ? p.rating : null,
    ratingCount:
      typeof p.ratingCount === 'number' && Number.isFinite(p.ratingCount) && p.ratingCount >= 0
        ? Math.floor(p.ratingCount)
        : null,
    phone: typeof p.phone === 'string' && p.phone.trim() ? p.phone : null,
    website: httpOrHttps(p.website),
    hasOpeningHours: p.hasOpeningHours === true,
    photoCount:
      typeof p.photoCount === 'number' && Number.isFinite(p.photoCount)
        ? Math.max(0, Math.min(10, Math.floor(p.photoCount)))
        : 0,
    attributions: Array.isArray(p.attributions)
      ? p.attributions
          .map((a) => {
            const rec = asRecord(a);
            const provider = typeof rec?.provider === 'string' ? rec.provider.trim() : '';
            return provider ? { provider, providerUri: httpsOnly(rec?.providerUri) } : null;
          })
          .filter((a): a is { provider: string; providerUri: string | null } => a !== null)
          .slice(0, 3)
      : [],
    reviews: Array.isArray(p.reviews)
      ? p.reviews
          .map(cleanReview)
          .filter((r): r is PlacesReview => r !== null)
          .slice(0, 5)
      : [],
  };
}

/** A usable `PlacesProfileResponse` or null (never throws). */
export function coerceProfileResponse(body: unknown): PlacesProfileResponse | null {
  const b = asRecord(body);
  if (!b || typeof b.state !== 'string' || !PROFILE_STATES.has(b.state)) return null;
  const placeId = typeof b.placeId === 'string' ? b.placeId : null;
  const base = {
    placeId,
    canWrite: b.canWrite !== false,
    hasManualLink: b.hasManualLink === true,
    placesConfigured: b.placesConfigured !== false,
  };

  if (b.state === 'ok') {
    const profile = cleanProfile(b.profile, placeId);
    if (!profile) return null;
    return {
      state: 'ok',
      ...base,
      profile,
      fetchedAt: typeof b.fetchedAt === 'string' ? b.fetchedAt : new Date().toISOString(),
    };
  }

  if (b.state === 'error') {
    const err = asRecord(b.error);
    const reason =
      err?.reason === 'limit_restaurant' || err?.reason === 'limit_global' ? err.reason : 'upstream';
    const retry =
      typeof err?.retryAfterSeconds === 'number' && err.retryAfterSeconds > 0
        ? Math.min(120, Math.ceil(err.retryAfterSeconds))
        : null;
    return {
      state: 'error',
      ...base,
      // A limit reason never carries a retry: the UI renders no retry button.
      error: { reason, retryAfterSeconds: reason === 'upstream' ? retry : null },
    };
  }

  return { state: b.state as 'not_linked' | 'unavailable' | 'not_found', ...base };
}

// ─────────────────────────────────────────────────────────────────────────
// In-memory profile copy + single-flight (never persisted)
// ─────────────────────────────────────────────────────────────────────────

/** How long a profile stays in this tab's memory. Lost on reload. */
export const PROFILE_MEMORY_TTL_MS = 10 * 60 * 1000;

interface MemoryEntry {
  at: number;
  value: PlacesProfileResponse;
}

const profileMemory = new Map<string, MemoryEntry>();

export type ProfileFetchResult =
  | { kind: 'response'; response: PlacesProfileResponse }
  | { kind: 'http'; status: number; body: unknown }
  | { kind: 'network' };

const profileInflight = new Map<string, Promise<ProfileFetchResult>>();

export function profileMemoryKey(restaurantId: string, placeId: string): string {
  return `${restaurantId}:${placeId}`;
}

/** A fresh in-memory copy, or null. Expired entries are dropped. */
export function readProfileMemory(
  restaurantId: string,
  placeId: string,
  nowMs: number = Date.now(),
): PlacesProfileResponse | null {
  const key = profileMemoryKey(restaurantId, placeId);
  const entry = profileMemory.get(key);
  if (!entry) return null;
  if (nowMs - entry.at > PROFILE_MEMORY_TTL_MS) {
    profileMemory.delete(key);
    return null;
  }
  return entry.value;
}

/** Forget the copy of one business (e.g. right after it picked another listing). */
export function forgetProfileMemory(restaurantId: string): void {
  const prefix = `${restaurantId}:`;
  for (const key of Array.from(profileMemory.keys())) {
    if (key.startsWith(prefix)) profileMemory.delete(key);
  }
}

/**
 * One request per business+place at a time. Only `ok` and `not_found`
 * responses are remembered: both are stable answers and re-asking costs a
 * billed Details call; `error` / `unavailable` are transient and re-ask.
 */
export function fetchPlacesProfile(restaurantId: string, placeId: string): Promise<ProfileFetchResult> {
  const key = profileMemoryKey(restaurantId, placeId);
  const running = profileInflight.get(key);
  if (running) return running;

  const promise = (async (): Promise<ProfileFetchResult> => {
    try {
      const res = await fetch(`/api/restaurants/${encodeURIComponent(restaurantId)}/google/places/profile`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const body = await readJson(res);
      const response = res.ok ? coerceProfileResponse(body) : null;
      if (response) {
        if (response.state === 'ok' || response.state === 'not_found') {
          profileMemory.set(key, { at: Date.now(), value: response });
        }
        return { kind: 'response', response };
      }
      return { kind: 'http', status: res.status, body };
    } catch {
      return { kind: 'network' };
    } finally {
      profileInflight.delete(key);
    }
  })();
  profileInflight.set(key, promise);
  return promise;
}

// ─────────────────────────────────────────────────────────────────────────
// "Auto-search already ran" flag (sessionStorage boolean, never results)
// ─────────────────────────────────────────────────────────────────────────

const AUTOSEARCH_PREFIX = 'buaze.places.autosearch.';

export function hasAutoSearched(restaurantId: string): boolean {
  try {
    return window.sessionStorage.getItem(`${AUTOSEARCH_PREFIX}${restaurantId}`) === '1';
  } catch {
    return false;
  }
}

export function markAutoSearched(restaurantId: string): void {
  try {
    window.sessionStorage.setItem(`${AUTOSEARCH_PREFIX}${restaurantId}`, '1');
  } catch {
    /* storage blocked: the in-component ref still guards this mount */
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────

function intlLocale(locale: UiLocale): string {
  return locale === 'en' ? 'en-US' : 'tr-TR';
}

export function formatCount(value: number, locale: UiLocale): string {
  return value.toLocaleString(intlLocale(locale));
}

/** "4,6" / "4.6" */
export function formatRating(value: number, locale: UiLocale): string {
  return value.toLocaleString(intlLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Relative time computed in the browser from an ISO timestamp (we never use
 * Google's locale-dependent `relativePublishTimeDescription`). Anything under
 * 45 seconds — and any timestamp from the future (clock skew) — is "just now".
 */
export function formatRelativeTime(
  iso: string | null | undefined,
  locale: UiLocale,
  nowMs: number = Date.now(),
): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const diffSec = Math.min(0, Math.round((ms - nowMs) / 1000)); // <= 0 (past)
  const abs = Math.abs(diffSec);
  if (abs < 45) return locale === 'en' ? 'just now' : 'az önce';

  const rtf = new Intl.RelativeTimeFormat(locale === 'en' ? 'en' : 'tr', { numeric: 'auto' });
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86_400 * 30) return rtf.format(Math.round(diffSec / 86_400), 'day');
  if (abs < 86_400 * 365) return rtf.format(Math.round(diffSec / (86_400 * 30)), 'month');
  return rtf.format(Math.round(diffSec / (86_400 * 365)), 'year');
}

// Turkish "possessive + genitive" suffix of a number (1'inin, 2'sinin, 3'ünün …)
// so the business-switcher summary reads correctly for any count.
const TR_ONES_SUFFIX: Record<number, string> = {
  1: 'inin',
  2: 'sinin',
  3: 'ünün',
  4: 'ünün',
  5: 'inin',
  6: 'sının',
  7: 'sinin',
  8: 'inin',
  9: 'unun',
};
const TR_TENS_SUFFIX: Record<number, string> = {
  10: 'unun',
  20: 'sinin',
  30: 'unun',
  40: 'ının',
  50: 'sinin',
  60: 'ının',
  70: 'inin',
  80: 'inin',
  90: 'ının',
};

export function trNumberGenitiveSuffix(n: number): string {
  if (n === 0) return 'ının';
  if (n === 100) return 'ünün';
  const ones = n % 10;
  if (ones) return TR_ONES_SUFFIX[ones] ?? 'inin';
  return TR_TENS_SUFFIX[n % 100] ?? 'inin';
}

/** "{n} işletmeden {k}'inin Google profili seçildi" / EN equivalent. */
export function formatBusinessSummary(selected: number, total: number, locale: UiLocale): string {
  if (locale === 'en') return `Google profile selected for ${selected} of ${total} businesses`;
  if (selected <= 0) return `${total} işletmeden hiçbirinin Google profili seçilmedi`;
  return `${total} işletmeden ${selected}'${trNumberGenitiveSuffix(selected)} Google profili seçildi`;
}

// ─────────────────────────────────────────────────────────────────────────
// Countdown hook (UI-side cooldowns; never a retry trigger)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Whole seconds left of a UI cooldown. `start(n)` begins an n-second
 * countdown; it only drives a disabled button label — it never retries.
 */
export function useCountdown(): { left: number; start: (seconds: number) => void; clear: () => void } {
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (until === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= until) setUntil(null);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [until]);

  const start = useCallback((seconds: number) => {
    if (!(seconds > 0)) {
      setUntil(null);
      return;
    }
    const t = Date.now();
    setNow(t);
    setUntil(t + seconds * 1000);
  }, []);
  const clear = useCallback(() => setUntil(null), []);

  const left = until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
  return { left, start, clear };
}
