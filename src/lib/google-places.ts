/**
 * Google Places API (New) — pure helpers.
 *
 * This module is imported by BOTH server routes and client components, so it
 * must stay free of `@/lib/prisma`, Sentry, `next/*` and any `process.env`
 * read at module scope. The few functions that talk to Google read the key
 * lazily, inside the call.
 *
 * What lives here:
 *   - Place ID validation + resolution from the free-text fields the owner
 *     panel stores (`googlePlaceId` is overloaded, see `resolvePlacesApiId`).
 *   - The Place Details field mask, the defensive payload normaliser and the
 *     error classifier (so a bad API key never looks like "place not found").
 *   - The 6-item profile checklist (all copy, TR + EN, so it is testable).
 *   - `resolveProfileState`: the profile route's decision logic with injected
 *     dependencies, so budget/limit ordering is unit-tested without a DB.
 *   - The TypeScript types of every request/response the UI calls.
 *
 * Compliance stance: Places content is shown live and is never
 * persisted by Buaze. Only the Place ID is durable. Nothing in this file
 * writes anywhere.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

export const PLACES_API_BASE = 'https://places.googleapis.com/v1';

/**
 * Single source for the Place Details field mask. The request is billed at
 * the highest-tier field in the mask, so every addition is a cost decision.
 * Deliberately absent: editorialSummary, reviewSummary, generativeSummary and
 * every `photos.*` sub-field (we only count photos, we never render them).
 */
export const PLACES_DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'googleMapsUri',
  'businessStatus',
  'primaryType',
  'primaryTypeDisplayName',
  'rating',
  'userRatingCount',
  'reviews',
  'regularOpeningHours',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'websiteUri',
  'photos',
  'attributions',
].join(',');

/** IDs-only mask: the verification call used by `places/select` (free SKU). */
export const PLACES_VERIFY_FIELD_MASK = 'id';

/** Text Search mask. `primaryTypeDisplayName` is the same Pro SKU as the rest. */
export const PLACES_SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.primaryTypeDisplayName',
].join(',');

const DETAILS_LANGUAGE = 'tr';
const DETAILS_REGION = 'TR';

export const PLACES_MAX_REVIEWS = 5;
export const PLACES_MAX_PHOTOS = 10;

const MAX_NAME = 200;
const MAX_ADDRESS = 300;
const MAX_REVIEW_TEXT = 2000;
const MAX_URL = 2048;
const MAX_PHONE = 40;
/** Raw review entries inspected at most (hostile-input bound; Google sends ≤5). */
const MAX_REVIEW_SCAN = 20;

// ─────────────────────────────────────────────────────────────────────────
// Types — Place payload
// ─────────────────────────────────────────────────────────────────────────

export type PlacesBusinessStatus =
  | 'OPERATIONAL'
  | 'CLOSED_TEMPORARILY'
  | 'CLOSED_PERMANENTLY'
  | 'UNKNOWN';

export interface PlacesAttribution {
  provider: string;
  providerUri: string | null;
}

export interface PlacesReview {
  rating: number | null;
  /** Google's `originalText` (what the reviewer wrote); falls back to `text`. */
  text: string | null;
  /** ISO publish time. Relative time is computed in the browser. */
  publishedAt: string | null;
  authorName: string | null;
  authorUri: string | null;
  authorPhotoUri: string | null;
  mapsUri: string | null;
}

/**
 * What the profile route returns (and what an optional future snapshot
 * layer would store). No locale-dependent strings: the payload is identical for every
 * viewer; `name`/`category` come from Google in Turkish and are display-only.
 */
export interface PlacesProfile {
  v: 1;
  placeId: string;
  name: string | null;
  address: string | null;
  mapsUri: string | null;
  businessStatus: PlacesBusinessStatus;
  category: string | null;
  rating: number | null;
  ratingCount: number | null;
  phone: string | null;
  /** `http:` or `https:` URL only (anything else is dropped). */
  website: string | null;
  hasOpeningHours: boolean;
  /** Capped at 10 — Google never returns more. */
  photoCount: number;
  attributions: PlacesAttribution[];
  reviews: PlacesReview[];
}

// ─────────────────────────────────────────────────────────────────────────
// Types — requests / responses the UI calls
// ─────────────────────────────────────────────────────────────────────────

export type PlacesLocale = 'tr' | 'en';

/** `GET /api/restaurants/[id]/google/places/profile` */
export type PlacesProfileState = 'ok' | 'not_linked' | 'unavailable' | 'not_found' | 'error';
export type PlacesProfileErrorReason = 'upstream' | 'limit_restaurant' | 'limit_global';

export interface PlacesProfileResponse {
  state: PlacesProfileState;
  placeId: string | null;
  profile?: PlacesProfile;
  /** ISO time the data was fetched from Google (only for `ok`). */
  fetchedAt?: string;
  /**
   * Only for `error`. `retryAfterSeconds` is `null` for the two limit reasons
   * (the UI must render NO retry button — a retry on a tripped limit would
   * loop) and for plain upstream failures it is `null` or a small number the
   * UI uses to disable "Tekrar dene" for that many seconds.
   */
  error?: { reason: PlacesProfileErrorReason; retryAfterSeconds: number | null };
  /** False for read-only team members (search/select answer 403). */
  canWrite: boolean;
  /** A review link is saved (so "found" may still be false: demo Mama's Burger). */
  hasManualLink: boolean;
  /** False when the deployment has no Places key (search + profile are off). */
  placesConfigured: boolean;
}

/** One row of `POST …/google/places/search` (both the scoped and unscoped route). */
export type PlacesSearchBusinessStatus = 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';

export interface PlacesSearchResultRow {
  placeId: string;
  displayName: string;
  formattedAddress: string | null;
  /** `https:` only, else null. */
  googleMapsUri: string | null;
  businessStatus: PlacesSearchBusinessStatus | null;
  /** Google's `primaryTypeDisplayName` (e.g. "Kafe"); disambiguates branches. */
  category: string | null;
}

export interface PlacesSearchResponse {
  places: PlacesSearchResultRow[];
}

/** Request body of both search routes. */
export type PlacesSearchRequest = z.infer<typeof placesSearchBodySchema>;

/**
 * Standard error body of the Google routes (`ApiErrors`): `error` is already
 * owner-safe text but the UI must still map by `code`, never render it.
 * Codes the Places routes can answer with, by HTTP status:
 *   400 GOOGLE_PLACES_NOT_CONFIGURED | validation_error (`error: 'validation_error'`)
 *   401 UNAUTHORIZED    403 FORBIDDEN
 *   422 PLACE_NOT_FOUND (select only; nothing was written)
 *   429 DAILY_LIMIT (per business / per actor) | RATE_LIMITED (burst)
 *   500 INTERNAL_SERVER_ERROR (search failed)
 *   503 GOOGLE_PLACES_BUSY (search, global cap) | GOOGLE_UNAVAILABLE (select, Google could not verify)
 */
export type PlacesRouteErrorCode =
  | 'GOOGLE_PLACES_NOT_CONFIGURED'
  | 'DAILY_LIMIT'
  | 'GOOGLE_PLACES_BUSY'
  | 'PLACE_NOT_FOUND'
  | 'GOOGLE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'INTERNAL_SERVER_ERROR';

export interface PlacesRouteErrorBody {
  error: string;
  code?: PlacesRouteErrorCode | string;
}

/** Request body of `POST …/google/places/select`. */
export type PlacesSelectRequest = z.infer<typeof placesSelectBodySchema>;

/** Response of `POST …/google/places/select`. The UI then calls the profile GET. */
export interface PlacesSelectResponse {
  restaurant: {
    id: string;
    googlePlaceId: string | null;
    googleReviewUrl: string | null;
    googleEnabled: boolean;
  };
  /** True when a different resolvable Place ID was previously saved. */
  replaced: boolean;
}

/**
 * Platform-level availability of the optional reply feature (Business Profile
 * sign-in). `not_provisioned`: Google quota is 0 project-wide; `disabled`:
 * the operator switched it off. Both mean: show no connect button.
 */
/** `coming_soon` = this workspace is outside GBP_ALLOWED_TENANTS (§53). */
export type GoogleReplyAvailability = 'available' | 'not_provisioned' | 'disabled' | 'coming_soon';

export interface GoogleSelectedLocationSummary {
  accountName: string;
  accountId: string;
  locationName: string;
  locationId: string;
  title: string;
  address: string | null;
  placeId: string | null;
  mapsUri: string | null;
  newReviewUri: string | null;
  selectedAt: string;
}

/** `GET /api/restaurants/[id]/google/business/status` */
export interface GoogleBusinessStatusResponse {
  googleReviewManagementEnabled: boolean;
  googleAiEnabled: boolean;
  placesConfigured: boolean;
  oauthConfigured: boolean;
  connected: boolean;
  expiresAt: string | null;
  hasRefreshToken: boolean;
  selectedLocation: GoogleSelectedLocationSummary | null;
  syncedAt: string | null;
  hasBusinessProfile: boolean | null;
  accountCount: number;
  locationCount: number;
  replyAvailability: GoogleReplyAvailability;
}

// ─────────────────────────────────────────────────────────────────────────
// Small defensive helpers
// ─────────────────────────────────────────────────────────────────────────

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Non-empty string (original, un-trimmed value) or null. */
function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** Cut to `max` UTF-16 units without splitting a surrogate pair. */
function clampText(value: string, max: number): string {
  if (value.length <= max) return value;
  let out = value.slice(0, max);
  const last = out.charCodeAt(out.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
  return out;
}

function clampNullable(value: string | null, max: number): string | null {
  if (value === null) return null;
  const clamped = clampText(value.trim(), max);
  return clamped || null;
}

/** Control characters never belong in a URL we render as a link. */
const URL_CONTROL_RE = /[\u0000-\u001f\u007f]/;

function safeUrl(value: unknown, protocols: ReadonlyArray<'https:' | 'http:'>): string | null {
  const raw = asString(value);
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length > MAX_URL || URL_CONTROL_RE.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (!protocols.includes(url.protocol as 'https:' | 'http:')) return null;
  // Credentials in a link are never legitimate for a business website.
  if (url.username || url.password) {
    url.username = '';
    url.password = '';
    return url.toString();
  }
  return trimmed;
}

function httpsUrl(value: unknown): string | null {
  return safeUrl(value, ['https:']);
}

function httpOrHttpsUrl(value: unknown): string | null {
  return safeUrl(value, ['https:', 'http:']);
}

function validRating(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5
    ? value
    : null;
}

function isoOrNull(value: unknown): string | null {
  const raw = asString(value);
  if (raw === null) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Hostname of a website without a leading `www.` (for the checklist row). */
export function placesWebsiteHost(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const host = new URL(website).hostname.replace(/^www\./i, '');
    return host || null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Place IDs
// ─────────────────────────────────────────────────────────────────────────

/**
 * Charset + length of a Places API (New) ID. The 512 upper bound is a guess:
 * address-style `Eh…`/`Ei…` IDs can be long and Google documents no maximum.
 * The verification call in `places/select` is what actually decides validity.
 */
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{20,512}$/;
const PLACE_ID_PREFIX_RE = /^(?:ChIJ|GhIJ|Eh|Ei)/;

/** Strict shape check (no trimming). A 25-char junk string fails on the prefix. */
export function isValidPlacesApiId(value: unknown): boolean {
  return typeof value === 'string' && PLACE_ID_RE.test(value) && PLACE_ID_PREFIX_RE.test(value);
}

/**
 * `googlePlaceId` is overloaded: it can hold a raw Place ID, a Maps URL, a
 * `g.page/r/…` short link or a write-review URL. Places API (New) needs a real
 * Place ID, so this returns one only when it can PROVE the value is one:
 *   - the trimmed value passes `isValidPlacesApiId`, or
 *   - it is an http(s) URL whose `placeid` / `place_id` query value does.
 * `g.page/…`, `maps.app.goo.gl/…`, `cid=…` numbers, `0x…:0x…` ftids and the
 * demo `ChIJ123` all return null.
 */
export function resolvePlacesApiId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isValidPlacesApiId(trimmed)) return trimmed;
  if (trimmed.length > MAX_URL || !/^https?:\/\//i.test(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  for (const [name, val] of url.searchParams) {
    const key = name.toLowerCase();
    if (key === 'placeid' || key === 'place_id') {
      const candidate = val.trim();
      if (isValidPlacesApiId(candidate)) return candidate;
    }
  }
  return null;
}

export interface PlacesLinkFields {
  googlePlaceId?: string | null;
  googleReviewUrl?: string | null;
}

/** The resolvable Place ID of a restaurant row (ID field first, then the link). */
export function resolveRestaurantPlaceId(row: PlacesLinkFields): string | null {
  return resolvePlacesApiId(row.googlePlaceId) ?? resolvePlacesApiId(row.googleReviewUrl);
}

/** A review link is saved (whether or not it resolves to a Place ID). */
export function hasManualReviewLink(row: PlacesLinkFields): boolean {
  return typeof row.googleReviewUrl === 'string' && row.googleReviewUrl.trim().length > 0;
}

/**
 * Business option state, computed from the row alone — no server
 * call. `found`: a resolvable Place ID; `unmatched`: a review link is saved
 * but it does not resolve; `not-selected`: nothing saved.
 */
export type PlacesOptionState = 'found' | 'unmatched' | 'not-selected';

export function placesOptionState(row: PlacesLinkFields): PlacesOptionState {
  if (resolveRestaurantPlaceId(row)) return 'found';
  if (hasManualReviewLink(row)) return 'unmatched';
  return 'not-selected';
}

const OPTION_STATE_LABELS: Record<PlacesOptionState, Record<PlacesLocale, string>> = {
  found: { tr: "Google'da bulundu", en: 'Found on Google' },
  unmatched: { tr: 'Eşleşmedi', en: 'Not matched' },
  'not-selected': { tr: 'Henüz seçilmedi', en: 'Not selected yet' },
};

export function placesOptionStateLabel(state: PlacesOptionState, locale: PlacesLocale = 'tr'): string {
  return OPTION_STATE_LABELS[state][locale === 'en' ? 'en' : 'tr'];
}

/** Server `select` body. The SAME validator as the resolver, so junk can never overwrite a working link. */
export const placesSelectBodySchema = z
  .object({
    placeId: z.string().trim().refine(isValidPlacesApiId, 'invalid_place_id'),
  })
  .strict();

/** Server `search` body (shared by the scoped and the unscoped route). */
export const placesSearchBodySchema = z
  .object({
    query: z.string().trim().min(2).max(180),
    locale: z.enum(['tr', 'en']).optional(),
  })
  .strict();

/**
 * Default search text for the picker: business name + area (NOT the street
 * address — long street text makes Text Search miss). Fits the server's
 * 180-character limit.
 */
export function defaultPlacesSearchQuery(name: string | null | undefined, city: string | null | undefined): string {
  const parts = [name, city]
    .map((p) => (typeof p === 'string' ? p.replace(/\s+/g, ' ').trim() : ''))
    .filter(Boolean);
  return clampText(parts.join(' '), 180).trim();
}

// ─────────────────────────────────────────────────────────────────────────
// Normalising Google payloads
// ─────────────────────────────────────────────────────────────────────────

const KNOWN_STATUSES: ReadonlySet<string> = new Set([
  'OPERATIONAL',
  'CLOSED_TEMPORARILY',
  'CLOSED_PERMANENTLY',
]);

function normalizeStatus(value: unknown): PlacesBusinessStatus {
  return typeof value === 'string' && KNOWN_STATUSES.has(value)
    ? (value as PlacesBusinessStatus)
    : 'UNKNOWN';
}

function normalizeReview(raw: unknown): PlacesReview | null {
  const r = asObject(raw);
  if (!r) return null;

  const original = asString(asObject(r.originalText)?.text);
  const translated = asString(asObject(r.text)?.text);
  const author = asObject(r.authorAttribution);

  const review: PlacesReview = {
    rating: validRating(r.rating),
    text: clampNullable(original ?? translated, MAX_REVIEW_TEXT),
    publishedAt: isoOrNull(r.publishTime),
    authorName: clampNullable(asString(author?.displayName), MAX_NAME),
    authorUri: httpsUrl(author?.uri),
    authorPhotoUri: httpsUrl(author?.photoUri),
    mapsUri: httpsUrl(r.googleMapsUri),
  };
  // A row with neither stars nor words has nothing to show.
  return review.rating === null && review.text === null ? null : review;
}

function normalizeAttributions(raw: unknown): PlacesAttribution[] {
  if (!Array.isArray(raw)) return [];
  const out: PlacesAttribution[] = [];
  for (const item of raw) {
    const a = asObject(item);
    const provider = clampNullable(asString(a?.provider), MAX_NAME);
    if (!provider) continue;
    out.push({ provider, providerUri: httpsUrl(a?.providerUri) });
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * Defensive mapper from a Place Details response to our payload. Never
 * throws; anything unexpected becomes null / [] / 0. Clamps: names ≤200,
 * address ≤300, review text ≤2000, ≤5 reviews, rating only if finite and
 * 1–5, `mapsUri`/author URLs only if https, website only if http(s).
 */
export function normalizePlaceDetails(raw: unknown, placeId: string): PlacesProfile {
  const o = asObject(raw) ?? {};

  const hours = asObject(o.regularOpeningHours);
  const hasOpeningHours =
    (Array.isArray(hours?.weekdayDescriptions) && hours.weekdayDescriptions.length > 0) ||
    (Array.isArray(hours?.periods) && hours.periods.length > 0);

  // Up to 5 usable reviews. Google never sends more than 5, so scanning a
  // bounded window (rather than the whole array) only matters for hostile input.
  const reviews: PlacesReview[] = [];
  if (Array.isArray(o.reviews)) {
    for (const item of o.reviews.slice(0, MAX_REVIEW_SCAN)) {
      const review = normalizeReview(item);
      if (review) reviews.push(review);
      if (reviews.length >= PLACES_MAX_REVIEWS) break;
    }
  }

  const ratingCount =
    typeof o.userRatingCount === 'number' && Number.isFinite(o.userRatingCount) && o.userRatingCount >= 0
      ? Math.floor(o.userRatingCount)
      : null;

  return {
    v: 1,
    placeId,
    name: clampNullable(asString(asObject(o.displayName)?.text), MAX_NAME),
    address: clampNullable(asString(o.formattedAddress), MAX_ADDRESS),
    mapsUri: httpsUrl(o.googleMapsUri),
    businessStatus: normalizeStatus(o.businessStatus),
    category: clampNullable(asString(asObject(o.primaryTypeDisplayName)?.text), MAX_NAME),
    rating: validRating(o.rating),
    ratingCount,
    phone: clampNullable(asString(o.nationalPhoneNumber) ?? asString(o.internationalPhoneNumber), MAX_PHONE),
    website: httpOrHttpsUrl(o.websiteUri),
    hasOpeningHours,
    photoCount: Array.isArray(o.photos) ? Math.min(o.photos.length, PLACES_MAX_PHOTOS) : 0,
    attributions: normalizeAttributions(o.attributions),
    reviews,
  };
}

/**
 * Defensive mapper from a `places:searchText` response. Rows whose ID is not a
 * valid Places API ID are dropped: they could never be selected (the select
 * route would answer 400), so showing them would only lead to a dead end.
 */
export function normalizeSearchResults(raw: unknown): PlacesSearchResultRow[] {
  const places = asObject(raw)?.places;
  if (!Array.isArray(places)) return [];

  const rows: PlacesSearchResultRow[] = [];
  for (const item of places) {
    const p = asObject(item);
    if (!p) continue;
    const id = typeof p.id === 'string' ? p.id.trim() : '';
    if (!isValidPlacesApiId(id)) continue;

    const status = typeof p.businessStatus === 'string' && KNOWN_STATUSES.has(p.businessStatus)
      ? (p.businessStatus as PlacesSearchBusinessStatus)
      : null;

    rows.push({
      placeId: id,
      displayName: clampNullable(asString(asObject(p.displayName)?.text), MAX_NAME) ?? 'Google işletmesi',
      formattedAddress: clampNullable(asString(p.formattedAddress), MAX_ADDRESS),
      googleMapsUri: httpsUrl(p.googleMapsUri),
      businessStatus: status,
      category: clampNullable(asString(asObject(p.primaryTypeDisplayName)?.text), MAX_NAME),
    });
    if (rows.length >= 20) break;
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────
// Error classification (internal — never serialised to a client)
// ─────────────────────────────────────────────────────────────────────────

export type PlacesErrorCode =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'BAD_CONFIG'
  | 'RATE_LIMITED'
  | 'UPSTREAM'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'BAD_RESPONSE';

/** Machine-only details of a failed call, for Sentry tags. Contains no Google text. */
export interface PlacesFailureInfo {
  code: PlacesErrorCode;
  status?: number;
  googleStatus?: string;
  reason?: string;
}

interface ParsedErrorBody {
  googleStatus: string | null;
  reason: string | null;
  message: string;
}

const MACHINE_TOKEN_RE = /^[A-Z0-9_]{1,80}$/;

function parseErrorBody(bodyText: string): ParsedErrorBody | null {
  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return null;
  }
  const err = asObject(asObject(json)?.error);
  if (!err) return null;

  const rawStatus = typeof err.status === 'string' ? err.status.trim().toUpperCase() : '';
  let reason: string | null = null;
  if (Array.isArray(err.details)) {
    for (const detail of err.details) {
      const r = asObject(detail)?.reason;
      if (typeof r === 'string' && MACHINE_TOKEN_RE.test(r)) {
        reason = r;
        break;
      }
    }
  }
  return {
    googleStatus: MACHINE_TOKEN_RE.test(rawStatus) ? rawStatus : null,
    reason,
    message: typeof err.message === 'string' ? err.message : '',
  };
}

/**
 * Machine-readable details of a Google error body: the `status` enum
 * (e.g. `INVALID_ARGUMENT`) and the first `ErrorInfo.reason`
 * (e.g. `API_KEY_INVALID`). Only strings matching `[A-Z0-9_]{1,80}` survive,
 * so free-text can never leak through this channel.
 */
export function extractPlacesErrorMeta(bodyText: string): { googleStatus?: string; reason?: string } {
  const parsed = parseErrorBody(bodyText);
  return {
    ...(parsed?.googleStatus ? { googleStatus: parsed.googleStatus } : {}),
    ...(parsed?.reason ? { reason: parsed.reason } : {}),
  };
}

/** A wrong field mask / unknown field would otherwise look like "place not found" for every business. */
const REQUEST_SHAPE_RE =
  /field\s*mask|fieldmask|x-goog-fieldmask|unknown (?:field|name)|cannot find matching fields|invalid (?:field|path|language|region)|language\s*code|region\s*code/i;

/**
 * Classify a failed Places response:
 *   NOT_FOUND    404, or a 400 INVALID_ARGUMENT that is not a key / request-shape
 *                problem (a malformed or obsolete Place ID is a 400 or a 404).
 *   FORBIDDEN    403 / PERMISSION_DENIED / SERVICE_DISABLED / billing, or a 400
 *                whose reason starts with API_KEY (a bad key is ALSO a 400).
 *   BAD_CONFIG   400 whose message mentions the field mask / an unknown field.
 *   RATE_LIMITED 429 / RESOURCE_EXHAUSTED.
 *   UPSTREAM     5xx and anything we cannot place (including a non-JSON 400,
 *                which means something other than Google answered).
 * `TIMEOUT` / `NETWORK` / `BAD_RESPONSE` are produced by the fetch layer.
 *
 * A 400/403 caused by a key, billing or disabled-API problem must never be
 * shown as "listing not found" for a healthy stored ID — that is the whole
 * point of this function.
 */
export function classifyPlacesError(status: number, bodyText: string): PlacesErrorCode {
  const meta = parseErrorBody(typeof bodyText === 'string' ? bodyText : '');
  const reason = meta?.reason ?? '';
  const googleStatus = meta?.googleStatus ?? '';
  const message = (meta?.message ?? '').toLowerCase();

  if (status === 429 || googleStatus === 'RESOURCE_EXHAUSTED' || /RATE_LIMIT|QUOTA/.test(reason)) {
    return 'RATE_LIMITED';
  }
  if (status === 404 || googleStatus === 'NOT_FOUND') return 'NOT_FOUND';
  if (
    status === 401 ||
    status === 403 ||
    googleStatus === 'PERMISSION_DENIED' ||
    googleStatus === 'UNAUTHENTICATED' ||
    googleStatus === 'FAILED_PRECONDITION' ||
    /^(?:API_KEY|SERVICE_DISABLED|BILLING|CONSUMER|ACCESS_TOKEN)/.test(reason)
  ) {
    return 'FORBIDDEN';
  }
  if (status === 400) {
    if (reason.startsWith('API_KEY') || /api key/.test(message)) return 'FORBIDDEN';
    if (REQUEST_SHAPE_RE.test(message)) return 'BAD_CONFIG';
    // Only a JSON error body from Google is trusted to mean "bad Place ID".
    return meta ? 'NOT_FOUND' : 'UPSTREAM';
  }
  return 'UPSTREAM';
}

/** Typed error thrown by `searchGooglePlaces`. The message is a fixed code string, never Google's text. */
export class PlacesApiError extends Error {
  readonly code: PlacesErrorCode;
  readonly status?: number;
  readonly googleStatus?: string;
  readonly reason?: string;

  constructor(failure: PlacesFailureInfo) {
    super(`google_places_${failure.code.toLowerCase()}`);
    this.name = 'PlacesApiError';
    this.code = failure.code;
    this.status = failure.status;
    this.googleStatus = failure.googleStatus;
    this.reason = failure.reason;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Talking to Google (details + ID verification)
// ─────────────────────────────────────────────────────────────────────────

export interface PlacesFetchOptions {
  timeoutMs?: number;
  /** Injected in tests. Evaluated at call time so a mocked `globalThis.fetch` works too. */
  fetchImpl?: typeof fetch;
  /** Defaults to `process.env.GOOGLE_MAPS_API_KEY`, read lazily. */
  apiKey?: string;
}

export type PlacesDetailsResult =
  | { ok: true; profile: PlacesProfile }
  | ({ ok: false } & PlacesFailureInfo);

export type PlacesVerifyResult = { ok: true } | ({ ok: false } & PlacesFailureInfo);

/** True for a `fetch` rejection caused by an aborted request (timeout or navigation). */
export function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    ((err as { name?: unknown }).name === 'AbortError' || (err as { code?: unknown }).code === 20)
  );
}

type PlacesGetOutcome =
  | { kind: 'ok'; text: string }
  | { kind: 'fail'; failure: PlacesFailureInfo };

async function placesGet(
  placeId: string,
  fieldMask: string,
  opts: PlacesFetchOptions,
  defaultTimeoutMs: number,
): Promise<PlacesGetOutcome> {
  const apiKey = opts.apiKey ?? (typeof process !== 'undefined' ? process.env.GOOGLE_MAPS_API_KEY : undefined);
  if (!apiKey) return { kind: 'fail', failure: { code: 'FORBIDDEN', reason: 'NO_API_KEY' } };

  const doFetch = opts.fetchImpl ?? globalThis.fetch;
  const url =
    `${PLACES_API_BASE}/places/${encodeURIComponent(placeId)}` +
    `?languageCode=${DETAILS_LANGUAGE}&regionCode=${DETAILS_REGION}`;

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? defaultTimeoutMs);

  try {
    const res = await doFetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      signal: controller.signal,
    });
    const text = await res.text();
    if (res.ok) return { kind: 'ok', text };

    return {
      kind: 'fail',
      failure: {
        code: classifyPlacesError(res.status, text),
        status: res.status,
        ...extractPlacesErrorMeta(text),
      },
    };
  } catch (err) {
    return {
      kind: 'fail',
      failure: { code: timedOut || isAbortError(err) ? 'TIMEOUT' : 'NETWORK' },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Place Details with the billed field mask. Never throws; the result carries
 * only machine codes (no key, no Google text). Default timeout 6 s.
 */
export async function fetchGooglePlaceDetails(
  placeId: string,
  opts: PlacesFetchOptions = {},
): Promise<PlacesDetailsResult> {
  const outcome = await placesGet(placeId, PLACES_DETAILS_FIELD_MASK, opts, 6000);
  if (outcome.kind === 'fail') return { ok: false, ...outcome.failure };

  let json: unknown;
  try {
    json = JSON.parse(outcome.text);
  } catch {
    return { ok: false, code: 'BAD_RESPONSE' };
  }
  if (!asObject(json)) return { ok: false, code: 'BAD_RESPONSE' };
  return { ok: true, profile: normalizePlaceDetails(json, placeId) };
}

/**
 * Cheap existence check used by `places/select`: the IDs-only mask is the
 * free SKU. `ok: false` with `NOT_FOUND` is the only outcome that means "this
 * is not a place"; everything else means "Google could not tell us".
 * Default timeout 3 s.
 */
export async function verifyPlaceId(
  placeId: string,
  opts: PlacesFetchOptions = {},
): Promise<PlacesVerifyResult> {
  const outcome = await placesGet(placeId, PLACES_VERIFY_FIELD_MASK, opts, 3000);
  if (outcome.kind === 'fail') return { ok: false, ...outcome.failure };

  // A 200 that is not a JSON object with an `id` is not Google (proxy / WAF page).
  let json: unknown;
  try {
    json = JSON.parse(outcome.text);
  } catch {
    return { ok: false, code: 'BAD_RESPONSE' };
  }
  return typeof asObject(json)?.id === 'string' ? { ok: true } : { ok: false, code: 'BAD_RESPONSE' };
}

// ─────────────────────────────────────────────────────────────────────────
// Profile checklist (copy lives here so it is testable)
// ─────────────────────────────────────────────────────────────────────────

export type PlacesChecklistItemId = 'phone' | 'website' | 'hours' | 'photos' | 'status' | 'category';
export type PlacesChecklistState = 'done' | 'todo' | 'critical';

export interface PlacesChecklistItem {
  id: PlacesChecklistItemId;
  label: string;
  state: PlacesChecklistState;
  /** What Google shows (number, host, "10+", …); null when there is nothing. */
  value: string | null;
  /** Concrete next step; present only when the item is not done. */
  help: string | null;
  /** For `website`: the external http(s) URL the value links to. */
  href: string | null;
}

export interface PlacesChecklistTip {
  id: 'few_reviews';
  text: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface PlacesChecklist {
  items: PlacesChecklistItem[];
  /** Count of items in state `done`. A count, not a score. */
  done: number;
  total: number;
  /** Optional, uncounted tips. */
  tips: PlacesChecklistTip[];
}

interface ChecklistCopy {
  labels: Record<PlacesChecklistItemId, string>;
  hoursValue: string;
  operatingValue: string;
  help: {
    phone: string;
    website: string;
    hours: string;
    photosNone: string;
    photosFew: string;
    statusTemp: string;
    statusPerm: string;
    category: string;
  };
  tip: (count: number) => string;
  tipCta: string;
}

const CHECKLIST_COPY: Record<PlacesLocale, ChecklistCopy> = {
  tr: {
    labels: {
      phone: 'Telefon',
      website: 'Web sitesi',
      hours: 'Çalışma saatleri',
      photos: 'Fotoğraflar',
      status: 'İşletme durumu',
      category: 'Kategori',
    },
    hoursValue: 'Girilmiş',
    operatingValue: 'Faaliyette',
    help: {
      phone: 'Müşteriler seni arayamıyor. Telefon numaranı Google profiline ekle.',
      website: 'Müşteriler web sitene buradan ulaşır. Bir bağlantı ekle.',
      hours: 'Saatler görünmüyor; müşteriler açık olup olmadığını göremiyor. Çalışma saatlerini ekle.',
      photosNone: 'Henüz fotoğraf yok. Dış cephe, iç mekan ve hizmetlerinden birkaç fotoğraf ekle.',
      photosFew: 'Birkaç fotoğraf daha ekle (en az 4 öneriyoruz).',
      statusTemp: 'Google\'da “Geçici olarak kapalı” görünüyor. Açıksan durumu Google\'da güncelle.',
      statusPerm: 'Google\'da “Kalıcı olarak kapandı” görünüyor. Doğru değilse Google\'a bildir.',
      category: 'Google profilinde ana kategori görünmüyor. Doğru kategoriyi seç.',
    },
    tip: (n) =>
      `Yorum sayın az (${n}). QR kodunu müşterilerin kolayca görebileceği bir yere koy; yorum bırakmak kolaylaşır.`,
    tipCta: 'QR oluştur',
  },
  en: {
    labels: {
      phone: 'Phone',
      website: 'Website',
      hours: 'Opening hours',
      photos: 'Photos',
      status: 'Business status',
      category: 'Category',
    },
    hoursValue: 'Set',
    operatingValue: 'Operating',
    help: {
      phone: 'Customers can\'t call you. Add your phone number to your Google profile.',
      website: 'Customers reach your website from here. Add a link.',
      hours: 'Hours aren\'t shown, so customers can\'t tell if you\'re open. Add your opening hours.',
      photosNone: 'No photos yet. Add a few of the exterior, interior and your services.',
      photosFew: 'Add a few more photos (we suggest at least 4).',
      statusTemp: 'Google shows “Temporarily closed”. If you\'re open, update it on Google.',
      statusPerm: 'Google shows “Permanently closed”. If that\'s wrong, report it to Google.',
      category: 'Your Google profile shows no main category. Pick the right one.',
    },
    tip: (n) =>
      `You have few reviews (${n}). Put your QR code where customers can easily see it to make leaving a review easy.`,
    tipCta: 'Create QR code',
  },
};

/** Photos needed for the "done" state. Google returns at most 10. */
export const PLACES_PHOTOS_TARGET = 4;
/** Below this review count the optional tip card is shown. */
export const PLACES_FEW_REVIEWS_BELOW = 10;

/**
 * The six-item profile check. A plain count of what Google shows —
 * not a score, no percentage. The status item is left out of the count when
 * Google sends no usable status.
 */
export function buildPlacesChecklist(profile: PlacesProfile, locale: PlacesLocale = 'tr'): PlacesChecklist {
  const copy = CHECKLIST_COPY[locale === 'en' ? 'en' : 'tr'];
  const items: PlacesChecklistItem[] = [];

  items.push(
    profile.phone
      ? { id: 'phone', label: copy.labels.phone, state: 'done', value: profile.phone, help: null, href: null }
      : { id: 'phone', label: copy.labels.phone, state: 'todo', value: null, help: copy.help.phone, href: null },
  );

  const host = placesWebsiteHost(profile.website);
  items.push(
    profile.website && host
      ? {
          id: 'website',
          label: copy.labels.website,
          state: 'done',
          value: host,
          help: null,
          href: profile.website,
        }
      : { id: 'website', label: copy.labels.website, state: 'todo', value: null, help: copy.help.website, href: null },
  );

  items.push(
    profile.hasOpeningHours
      ? { id: 'hours', label: copy.labels.hours, state: 'done', value: copy.hoursValue, help: null, href: null }
      : { id: 'hours', label: copy.labels.hours, state: 'todo', value: null, help: copy.help.hours, href: null },
  );

  const photos = Math.max(0, Math.floor(profile.photoCount));
  if (photos >= PLACES_PHOTOS_TARGET) {
    items.push({
      id: 'photos',
      label: copy.labels.photos,
      state: 'done',
      value: photos >= PLACES_MAX_PHOTOS ? `${PLACES_MAX_PHOTOS}+` : String(photos),
      help: null,
      href: null,
    });
  } else if (photos === 0) {
    items.push({
      id: 'photos',
      label: copy.labels.photos,
      state: 'critical',
      value: null,
      help: copy.help.photosNone,
      href: null,
    });
  } else {
    items.push({
      id: 'photos',
      label: copy.labels.photos,
      state: 'todo',
      value: String(photos),
      help: copy.help.photosFew,
      href: null,
    });
  }

  if (profile.businessStatus === 'OPERATIONAL') {
    items.push({
      id: 'status',
      label: copy.labels.status,
      state: 'done',
      value: copy.operatingValue,
      help: null,
      href: null,
    });
  } else if (profile.businessStatus === 'CLOSED_TEMPORARILY') {
    items.push({
      id: 'status',
      label: copy.labels.status,
      state: 'critical',
      value: null,
      help: copy.help.statusTemp,
      href: null,
    });
  } else if (profile.businessStatus === 'CLOSED_PERMANENTLY') {
    items.push({
      id: 'status',
      label: copy.labels.status,
      state: 'critical',
      value: null,
      help: copy.help.statusPerm,
      href: null,
    });
  }
  // UNKNOWN → item omitted (and not counted).

  items.push(
    profile.category
      ? { id: 'category', label: copy.labels.category, state: 'done', value: profile.category, help: null, href: null }
      : { id: 'category', label: copy.labels.category, state: 'todo', value: null, help: copy.help.category, href: null },
  );

  // Google omits `userRatingCount` when a place has no ratings, so an absent
  // count is zero reviews — not an unknown.
  const reviewCount = profile.ratingCount ?? 0;
  const tips: PlacesChecklistTip[] =
    reviewCount < PLACES_FEW_REVIEWS_BELOW
      ? [
          {
            id: 'few_reviews',
            text: copy.tip(reviewCount),
            ctaLabel: copy.tipCta,
            ctaHref: `/${locale === 'en' ? 'en' : 'tr'}/dashboard/qr`,
          },
        ]
      : [];

  return {
    items,
    done: items.filter((i) => i.state === 'done').length,
    total: items.length,
    tips,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Profile route decision logic (injected dependencies → unit-testable)
// ─────────────────────────────────────────────────────────────────────────

export interface PlacesReserveOutcome {
  allowed: boolean;
  /**
   * True when the denial is not "this business used its quota" but a
   * platform-level condition (cap configured as 0, database error: the guard
   * fails closed). Reported to the owner with the global-limit copy.
   */
  systemic?: boolean;
}

export interface ResolveProfileStateDeps {
  /** Reserve ONE billed Details call against the given daily counter. */
  reserve(scope: 'restaurant' | 'global'): Promise<PlacesReserveOutcome>;
  fetchDetails(placeId: string): Promise<PlacesDetailsResult>;
  now(): Date;
}

export interface ResolveProfileStateInput {
  /** Already resolved with `resolveRestaurantPlaceId`. */
  placeId: string | null;
  hasManualLink: boolean;
  placesConfigured: boolean;
  canWrite: boolean;
  deps: ResolveProfileStateDeps;
}

export interface ResolveProfileStateResult {
  /** The only thing the route may serialise. */
  body: PlacesProfileResponse;
  /** Machine-only details for Sentry; `null` for expected states. Never serialised. */
  failure: PlacesFailureInfo | null;
}

/** Retry cooldown the UI applies after Google itself answered "slow down". */
const GOOGLE_RATE_LIMITED_RETRY_SECONDS = 30;

/**
 * Decide the profile response. Order matters:
 *   1. not configured → `unavailable` (no reservation, no fetch)
 *   2. no resolvable ID → `not_linked` (no reservation, no fetch)
 *   3. reserve the restaurant counter, THEN the global one; a denial of
 *      either → `error` limit_* and NO Google call
 *   4. fetch; map NOT_FOUND → `not_found`, FORBIDDEN/BAD_CONFIG →
 *      `unavailable`, anything else → `error` upstream.
 */
export async function resolveProfileState(input: ResolveProfileStateInput): Promise<ResolveProfileStateResult> {
  const { placeId, hasManualLink, placesConfigured, canWrite, deps } = input;
  const base = { placeId, canWrite, hasManualLink, placesConfigured };

  if (!placesConfigured) {
    return { body: { state: 'unavailable', ...base }, failure: null };
  }
  if (!placeId) {
    return { body: { state: 'not_linked', ...base }, failure: null };
  }

  const limited = (reason: 'limit_restaurant' | 'limit_global'): ResolveProfileStateResult => ({
    body: { state: 'error', ...base, error: { reason, retryAfterSeconds: null } },
    failure: null,
  });

  const restaurantSlot = await deps.reserve('restaurant');
  if (!restaurantSlot.allowed) return limited(restaurantSlot.systemic ? 'limit_global' : 'limit_restaurant');
  const globalSlot = await deps.reserve('global');
  if (!globalSlot.allowed) return limited('limit_global');

  const result = await deps.fetchDetails(placeId);
  if (result.ok) {
    return {
      body: { state: 'ok', ...base, profile: result.profile, fetchedAt: deps.now().toISOString() },
      failure: null,
    };
  }

  // Copy only the machine fields: even if a dependency hands back more (a
  // message, a body), none of it can reach the response or the logs.
  const failure: PlacesFailureInfo = {
    code: result.code,
    ...(result.status !== undefined ? { status: result.status } : {}),
    ...(result.googleStatus ? { googleStatus: result.googleStatus } : {}),
    ...(result.reason ? { reason: result.reason } : {}),
  };

  if (result.code === 'NOT_FOUND') {
    return { body: { state: 'not_found', ...base }, failure: null };
  }
  if (result.code === 'FORBIDDEN' || result.code === 'BAD_CONFIG') {
    return { body: { state: 'unavailable', ...base }, failure };
  }
  return {
    body: {
      state: 'error',
      ...base,
      error: {
        reason: 'upstream',
        retryAfterSeconds: result.code === 'RATE_LIMITED' ? GOOGLE_RATE_LIMITED_RETRY_SECONDS : null,
      },
    },
    failure,
  };
}
