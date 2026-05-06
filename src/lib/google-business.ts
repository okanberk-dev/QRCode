import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import type { PanelActor } from '@/lib/auth';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ACCOUNT_MANAGEMENT_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFORMATION_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const BUSINESS_PROFILE_V4_URL = 'https://mybusiness.googleapis.com/v4';
// Stage 10 — Google Business Profile Q&A API (CLAUDE.md §38.80, §38.55
// PROFİL SAĞLIĞI backlog kapanışı). Separate endpoint family from the
// account-management / business-information / business-profile-v4 surfaces
// the rest of this module already calls. The Q&A API may be disabled by
// default in some Google Cloud projects — callers must tolerate a 403 from
// the wrapper as "API not enabled" and surface a `null` count rather than
// failing the parent endpoint.
const QANDA_API_URL = 'https://mybusinessq-and-a.googleapis.com/v1';

export const GOOGLE_BUSINESS_SCOPE = 'https://www.googleapis.com/auth/business.manage';

// Retry config for Google API calls (CLAUDE.md §5.4 Task 4).
//   - MAX_RETRIES = 2 → up to 3 attempts (initial + 2 retries) on transient errors
//   - Backoff: 1000ms, 2000ms (exponential)
// Worst-case: 1 + 1 + 2 = 4s extra latency on flaky leg. Owner UI button spinner OK.
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [1000, 2000] as const;
const REQUEST_TIMEOUT_MS = 15_000;
const TOKEN_REFRESH_TIMEOUT_MS = 10_000;

export type GoogleBusinessFailureCode =
  | 'GOOGLE_REAUTH_REQUIRED'
  | 'GOOGLE_RATE_LIMITED'
  | 'GOOGLE_SERVER_ERROR'
  | 'GOOGLE_NETWORK_ERROR'
  | 'GOOGLE_API_ERROR'
  | 'GOOGLE_NOT_CONFIGURED';

export interface GoogleBusinessFailure {
  ok: false;
  status: number;
  code: GoogleBusinessFailureCode;
  message: string;
  /**
   * True when the integration needs the owner to re-run OAuth. Callers
   * should surface a "reconnect Google" CTA instead of a generic 500.
   */
  requiresReauth?: boolean;
}

/**
 * Typed error so wrapper helpers (`fetchGoogleBusinessLocations`, ...) can
 * throw and let API routes detect reauth via `instanceof`.
 */
export class GoogleBusinessApiError extends Error {
  status: number;
  code: GoogleBusinessFailureCode;
  requiresReauth: boolean;

  constructor(failure: GoogleBusinessFailure) {
    super(failure.message);
    this.name = 'GoogleBusinessApiError';
    this.status = failure.status;
    this.code = failure.code;
    this.requiresReauth = Boolean(failure.requiresReauth);
  }
}

export interface GooglePlaceSearchResult {
  placeId: string;
  displayName: string;
  formattedAddress: string | null;
  googleMapsUri: string | null;
  businessStatus: string | null;
}

export interface GoogleBusinessAccount {
  name: string;
  accountName: string | null;
  type: string | null;
  role: string | null;
}

export interface GoogleBusinessLocation {
  accountName: string;
  accountId: string;
  locationName: string;
  locationId: string;
  title: string;
  address: string | null;
  placeId: string | null;
  mapsUri: string | null;
  newReviewUri: string | null;
}

export interface GoogleRestaurantLocationSelection extends GoogleBusinessLocation {
  selectedAt: string;
  lastReviewNotifiedAt?: string;
}

export interface GoogleLocationsCache {
  accounts: GoogleBusinessAccount[];
  locations: GoogleBusinessLocation[];
  restaurantLocations: Record<string, GoogleRestaurantLocationSelection>;
  syncedAt: string | null;
}

export interface GoogleReview {
  name: string;
  reviewId: string;
  reviewer?: {
    profilePhotoUrl?: string;
    displayName?: string;
    isAnonymous?: boolean;
  };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
  reviewReply?: {
    comment?: string;
    updateTime?: string;
    reviewReplyState?: string;
  };
}

export interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  averageRating: number | null;
  totalReviewCount: number;
  nextPageToken?: string;
}

type GoogleIntegrationRow = NonNullable<Awaited<ReturnType<typeof prisma.googleIntegration.findUnique>>>;

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function idFromResourceName(name: string): string {
  return name.split('/').pop() ?? name;
}

export function googleReviewUrlFromPlaceId(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

export function googleOwnerRef(actor: PanelActor): string {
  return actor.source === 'user' ? actor.id : `admin:${actor.id}`;
}

export function googleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googlePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export function parseGoogleLocationsCache(value: unknown): GoogleLocationsCache {
  const obj = asObject(value);
  const accounts = Array.isArray(obj?.accounts) ? obj.accounts : [];
  const locations = Array.isArray(obj?.locations) ? obj.locations : [];
  const restaurantLocations = asObject(obj?.restaurantLocations) ?? {};

  return {
    accounts: accounts.filter(isGoogleBusinessAccount),
    locations: locations.filter(isGoogleBusinessLocation),
    restaurantLocations: Object.fromEntries(
      Object.entries(restaurantLocations).filter((entry): entry is [string, GoogleRestaurantLocationSelection] =>
        typeof entry[0] === 'string' && isGoogleRestaurantLocationSelection(entry[1]),
      ),
    ),
    syncedAt: asString(obj?.syncedAt),
  };
}

function isGoogleBusinessAccount(value: unknown): value is GoogleBusinessAccount {
  const obj = asObject(value);
  return !!obj && typeof obj.name === 'string';
}

function isGoogleBusinessLocation(value: unknown): value is GoogleBusinessLocation {
  const obj = asObject(value);
  return !!obj && typeof obj.accountName === 'string' && typeof obj.locationName === 'string';
}

function isGoogleRestaurantLocationSelection(value: unknown): value is GoogleRestaurantLocationSelection {
  return isGoogleBusinessLocation(value) && typeof (value as { selectedAt?: unknown }).selectedAt === 'string';
}

export function selectedGoogleLocation(
  cache: GoogleLocationsCache,
  restaurantId: string,
): GoogleRestaurantLocationSelection | null {
  return cache.restaurantLocations[restaurantId] ?? null;
}

export function withSelectedGoogleLocation(
  cache: GoogleLocationsCache,
  restaurantId: string,
  location: GoogleBusinessLocation,
): GoogleLocationsCache {
  return {
    ...cache,
    restaurantLocations: {
      ...cache.restaurantLocations,
      [restaurantId]: {
        ...location,
        selectedAt: new Date().toISOString(),
      },
    },
  };
}

export async function getGoogleIntegrationForActor(actor: PanelActor) {
  return prisma.googleIntegration.findUnique({
    where: { userId: googleOwnerRef(actor) },
  });
}

export async function getGoogleIntegrationForRestaurant(
  actor: PanelActor,
  restaurantId: string,
) {
  const refs = [googleOwnerRef(actor)];
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { userId: true },
  });
  if (restaurant?.userId && !refs.includes(restaurant.userId)) {
    refs.push(restaurant.userId);
  }

  return prisma.googleIntegration.findFirst({
    where: { userId: { in: refs } },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function googleReviewManagementEnabled(restaurantId: string): Promise<boolean> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { googleReviewManagementEnabled: true },
  });
  return restaurant?.googleReviewManagementEnabled ?? false;
}

/**
 * Mask a Google API URL for safe logging — host + pathname only, with
 * id-shaped segments (numeric / uuid / locations) replaced. Strips query
 * strings (pageToken, pageSize) — not PII but reduce noise.
 *
 * Examples:
 *   "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews?pageSize=50"
 *     → "mybusiness.googleapis.com/v4/accounts/:id/locations/:id/reviews"
 *   "https://oauth2.googleapis.com/token"
 *     → "oauth2.googleapis.com/token"
 */
export function maskGoogleUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').map((segment) => {
      if (!segment) return segment;
      // numeric ids (Google account/location)
      if (/^\d{4,}$/.test(segment)) return ':id';
      // UUID-like
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return ':id';
      // long alphanumeric resource ids (Google ChIJ-style place ids etc.)
      if (segment.length >= 16 && /^[A-Za-z0-9_-]+$/.test(segment)) return ':id';
      return segment;
    });
    return `${parsed.host}${segments.join('/')}`;
  } catch {
    return 'invalid-url';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function failure(
  status: number,
  code: GoogleBusinessFailureCode,
  message: string,
  requiresReauth = false,
): GoogleBusinessFailure {
  return { ok: false, status, code, message, requiresReauth };
}

/**
 * Capture a single contextual Sentry event for a Google Business API
 * failure. Tagged with `integration: 'google-business'`. PII-free —
 * caller URL is masked, no tokens / bodies / headers logged.
 */
function captureGoogleBusinessFailure(
  failureValue: GoogleBusinessFailure,
  context: { url: string; attempts: number; method?: string },
): void {
  Sentry.captureMessage('Google Business API failure', {
    level: failureValue.requiresReauth ? 'warning' : 'error',
    tags: {
      integration: 'google-business',
      reason: failureValue.code,
      status: String(failureValue.status),
    },
    extra: {
      urlPath: maskGoogleUrl(context.url),
      attempts: context.attempts,
      method: context.method ?? 'GET',
    },
  });
}

export type GoogleAccessTokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; code: GoogleBusinessFailureCode; message: string };

/**
 * Attempts to deliver a fresh access token for the given integration.
 * - Returns the cached token if it still has >60s of life.
 * - Refreshes via OAuth otherwise. Single retry on network/5xx with 1s
 *   backoff. 4xx (invalid_grant) is treated as terminal: the dead refresh
 *   token is cleared from DB and the caller gets `GOOGLE_REAUTH_REQUIRED`.
 * - Never logs the token. Sentry capture is the boundary's responsibility.
 */
export async function getFreshGoogleAccessToken(
  integration: GoogleIntegrationRow,
): Promise<GoogleAccessTokenResult> {
  if (integration.expiresAt.getTime() > Date.now() + 60_000) {
    return { ok: true, accessToken: integration.accessToken };
  }
  if (!integration.refreshToken) {
    return {
      ok: false,
      code: 'GOOGLE_REAUTH_REQUIRED',
      message: 'Google bağlantısı yenilenemedi. Hesabı yeniden bağlayın.',
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      code: 'GOOGLE_NOT_CONFIGURED',
      message: 'Google OAuth client config eksik.',
    };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: integration.refreshToken,
    grant_type: 'refresh_token',
  });

  // 1 retry on transient (network / 5xx). 4xx is terminal (refresh dead).
  for (let attempt = 0; attempt <= 1; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TOKEN_REFRESH_TIMEOUT_MS);
    try {
      const res = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });

      if (res.ok) {
        const data = (await res.json()) as { access_token?: string; expires_in?: number };
        if (!data.access_token) {
          return {
            ok: false,
            code: 'GOOGLE_REAUTH_REQUIRED',
            message: 'Google access token üretilemedi.',
          };
        }
        const expiresAt = new Date(Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000);
        await prisma.googleIntegration.update({
          where: { id: integration.id },
          data: { accessToken: data.access_token, expiresAt },
        });
        integration.accessToken = data.access_token;
        integration.expiresAt = expiresAt;
        return { ok: true, accessToken: data.access_token };
      }

      // 4xx → refresh token dead, mark integration unusable
      if (res.status >= 400 && res.status < 500) {
        await prisma.googleIntegration
          .update({
            where: { id: integration.id },
            data: { refreshToken: null },
          })
          .catch(() => {
            // best-effort cleanup; failure here shouldn't mask reauth signal
          });
        integration.refreshToken = null;
        return {
          ok: false,
          code: 'GOOGLE_REAUTH_REQUIRED',
          message: 'Google bağlantısı geçersiz. Hesabı yeniden bağlayın.',
        };
      }
      // 5xx → fall through to retry
    } catch {
      // network / abort → fall through to retry
    } finally {
      clearTimeout(timer);
    }

    if (attempt === 0) {
      await sleep(1000);
    }
  }

  return {
    ok: false,
    code: 'GOOGLE_NETWORK_ERROR',
    message: 'Google token sunucusuna ulaşılamadı.',
  };
}

interface RawFetchOutcome {
  status: number;
  ok: boolean;
  text: string;
  body: string | null;
  /** True when the fetch promise itself rejected (network / abort). */
  networkError: boolean;
}

async function rawFetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<RawFetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text().catch(() => '');
    return {
      status: res.status,
      ok: res.ok,
      text,
      body: text || null,
      networkError: false,
    };
  } catch {
    return {
      status: 0,
      ok: false,
      text: '',
      body: null,
      networkError: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

function isRetriableStatus(status: number, networkError: boolean): boolean {
  if (networkError) return true;
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

function classifyOutcome(outcome: RawFetchOutcome): GoogleBusinessFailureCode {
  if (outcome.networkError) return 'GOOGLE_NETWORK_ERROR';
  if (outcome.status === 429) return 'GOOGLE_RATE_LIMITED';
  if (outcome.status >= 500) return 'GOOGLE_SERVER_ERROR';
  return 'GOOGLE_API_ERROR';
}

function outcomeMessage(outcome: RawFetchOutcome): string {
  if (outcome.networkError) return 'Google API isteği ağ hatası nedeniyle başarısız.';
  // Body snippet may include Google's error JSON. Limit to 500 chars and never
  // include caller-provided request body / Authorization header.
  return outcome.text.slice(0, 500) || `Google API HTTP ${outcome.status}`;
}

/**
 * Single hardened wrapper for all Google Business Profile API calls.
 *   - Refreshes the access token when expired.
 *   - On mid-flight 401: force-refresh and retry once. Persistent 401
 *     surfaces as `GOOGLE_REAUTH_REQUIRED`.
 *   - On 429 / 5xx / network error: up to 2 retries with exponential
 *     backoff (1s, 2s). 4xx (other) returns immediately.
 *   - Final failures emit a single Sentry event tagged
 *     `integration: 'google-business'`. PII-free — caller URL is masked,
 *     tokens / Authorization headers / request bodies are never logged.
 *
 * Backward compatible: the success shape (`{ ok: true, data: T }`) is
 * unchanged. The failure shape is widened with `code` and an optional
 * `requiresReauth` flag; existing callers that only inspect
 * `result.ok` / `result.message` keep working.
 */
export async function googleBusinessFetch<T>(
  integration: GoogleIntegrationRow,
  url: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | GoogleBusinessFailure> {
  const method = (init.method ?? 'GET').toUpperCase();

  const tokenResult = await getFreshGoogleAccessToken(integration);
  if (!tokenResult.ok) {
    const requiresReauth = tokenResult.code === 'GOOGLE_REAUTH_REQUIRED';
    const fail = failure(
      requiresReauth ? 401 : tokenResult.code === 'GOOGLE_NOT_CONFIGURED' ? 503 : 502,
      tokenResult.code,
      tokenResult.message,
      requiresReauth,
    );
    captureGoogleBusinessFailure(fail, { url, attempts: 1, method });
    return fail;
  }

  let lastOutcome: RawFetchOutcome | null = null;
  let refreshedAfter401 = false;
  let token = tokenResult.accessToken;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const outcome = await rawFetchWithTimeout(
      url,
      {
        ...init,
        method,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
      REQUEST_TIMEOUT_MS,
    );

    if (outcome.ok) {
      // Successful response. Parse JSON; if empty body, return {} as T.
      let data: T;
      try {
        data = outcome.text ? (JSON.parse(outcome.text) as T) : ({} as T);
      } catch {
        const fail = failure(outcome.status, 'GOOGLE_API_ERROR', 'Google API yanıtı çözümlenemedi.');
        captureGoogleBusinessFailure(fail, { url, attempts: attempt + 1, method });
        return fail;
      }
      return { ok: true, data };
    }

    lastOutcome = outcome;

    // Mid-flight 401: token may have expired between refresh and request.
    // Force-refresh once, retry. Persistent 401 → reauth.
    if (outcome.status === 401 && !refreshedAfter401) {
      refreshedAfter401 = true;
      // Force refresh by zeroing the cached expiry, then re-running token resolver
      integration.expiresAt = new Date(0);
      const refreshed = await getFreshGoogleAccessToken(integration);
      if (!refreshed.ok) {
        const fail = failure(401, refreshed.code, refreshed.message, refreshed.code === 'GOOGLE_REAUTH_REQUIRED');
        captureGoogleBusinessFailure(fail, { url, attempts: attempt + 2, method });
        return fail;
      }
      token = refreshed.accessToken;
      continue;
    }
    if (outcome.status === 401) {
      const fail = failure(401, 'GOOGLE_REAUTH_REQUIRED', 'Google bağlantısı süresi doldu. Hesabı yeniden bağlayın.', true);
      captureGoogleBusinessFailure(fail, { url, attempts: attempt + 1, method });
      return fail;
    }

    // Non-retriable 4xx → return immediately
    if (!isRetriableStatus(outcome.status, outcome.networkError)) {
      const fail = failure(outcome.status, classifyOutcome(outcome), outcomeMessage(outcome));
      captureGoogleBusinessFailure(fail, { url, attempts: attempt + 1, method });
      return fail;
    }

    // Retriable: backoff if more attempts left
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BACKOFF_MS[attempt] ?? 2000);
    }
  }

  // Retries exhausted
  const finalOutcome = lastOutcome ?? {
    status: 0,
    ok: false,
    text: '',
    body: null,
    networkError: true,
  };
  const code = classifyOutcome(finalOutcome);
  const fail = failure(
    finalOutcome.networkError ? 504 : finalOutcome.status,
    code,
    outcomeMessage(finalOutcome),
  );
  captureGoogleBusinessFailure(fail, { url, attempts: MAX_RETRIES + 1, method });
  return fail;
}

export async function searchGooglePlaces(
  query: string,
  locale: 'tr' | 'en' = 'tr',
): Promise<GooglePlaceSearchResult[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY env var is not configured.');

  const res = await fetch(PLACES_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.formattedAddress',
        'places.googleMapsUri',
        'places.businessStatus',
      ].join(','),
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: locale,
      regionCode: 'TR',
      maxResultCount: 6,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text.slice(0, 300) || `Google Places HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    places?: Array<{
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      googleMapsUri?: string;
      businessStatus?: string;
    }>;
  };

  return (data.places ?? [])
    .filter((place) => typeof place.id === 'string' && place.id.trim())
    .map((place) => ({
      placeId: place.id as string,
      displayName: place.displayName?.text || place.id || 'Google işletmesi',
      formattedAddress: place.formattedAddress ?? null,
      googleMapsUri: place.googleMapsUri ?? null,
      businessStatus: place.businessStatus ?? null,
    }));
}

function formatAddress(address: unknown): string | null {
  const obj = asObject(address);
  if (!obj) return null;
  const lines = Array.isArray(obj.addressLines)
    ? obj.addressLines.filter((x): x is string => typeof x === 'string')
    : [];
  const rest = [obj.locality, obj.administrativeArea, obj.postalCode]
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
  const formatted = [...lines, rest.join(' ')].filter(Boolean).join(', ');
  return formatted || null;
}

export async function fetchGoogleBusinessLocations(
  integration: GoogleIntegrationRow,
): Promise<GoogleLocationsCache> {
  const accountsRes = await googleBusinessFetch<{ accounts?: GoogleBusinessAccount[] }>(
    integration,
    `${ACCOUNT_MANAGEMENT_URL}/accounts?pageSize=20`,
  );
  if (!accountsRes.ok) throw new GoogleBusinessApiError(accountsRes);

  const accounts = (accountsRes.data.accounts ?? []).map((account) => ({
    name: account.name,
    accountName: account.accountName ?? null,
    type: account.type ?? null,
    role: account.role ?? null,
  }));

  const locations: GoogleBusinessLocation[] = [];
  for (const account of accounts) {
    let pageToken = '';
    do {
      const url = new URL(`${BUSINESS_INFORMATION_URL}/${account.name}/locations`);
      url.searchParams.set('pageSize', '100');
      url.searchParams.set('readMask', 'name,title,storefrontAddress,metadata');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const locRes = await googleBusinessFetch<{
        locations?: Array<{
          name?: string;
          title?: string;
          storefrontAddress?: unknown;
          metadata?: {
            placeId?: string;
            mapsUri?: string;
            newReviewUri?: string;
          };
        }>;
        nextPageToken?: string;
      }>(integration, url.toString());
      if (!locRes.ok) throw new GoogleBusinessApiError(locRes);

      for (const loc of locRes.data.locations ?? []) {
        if (!loc.name) continue;
        locations.push({
          accountName: account.name,
          accountId: idFromResourceName(account.name),
          locationName: loc.name,
          locationId: idFromResourceName(loc.name),
          title: loc.title || 'Google işletmesi',
          address: formatAddress(loc.storefrontAddress),
          placeId: loc.metadata?.placeId ?? null,
          mapsUri: loc.metadata?.mapsUri ?? null,
          newReviewUri: loc.metadata?.newReviewUri ?? null,
        });
      }

      pageToken = locRes.data.nextPageToken ?? '';
    } while (pageToken);
  }

  return {
    accounts,
    locations,
    restaurantLocations: parseGoogleLocationsCache(integration.locationsJson).restaurantLocations,
    syncedAt: new Date().toISOString(),
  };
}

export async function listGoogleReviews(
  integration: GoogleIntegrationRow,
  selection: GoogleBusinessLocation,
  pageToken?: string | null,
): Promise<GoogleReviewsResponse> {
  const parent = `accounts/${selection.accountId}/locations/${selection.locationId}`;
  const url = new URL(`${BUSINESS_PROFILE_V4_URL}/${parent}/reviews`);
  url.searchParams.set('pageSize', '50');
  url.searchParams.set('orderBy', 'updateTime desc');
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const res = await googleBusinessFetch<GoogleReviewsResponse>(integration, url.toString());
  if (!res.ok) throw new GoogleBusinessApiError(res);
  return {
    reviews: res.data.reviews ?? [],
    averageRating: typeof res.data.averageRating === 'number' ? res.data.averageRating : null,
    totalReviewCount: res.data.totalReviewCount ?? 0,
    nextPageToken: res.data.nextPageToken,
  };
}

export async function updateGoogleReviewReply(
  integration: GoogleIntegrationRow,
  reviewName: string,
  comment: string,
): Promise<{ comment: string; updateTime?: string; reviewReplyState?: string }> {
  const safeReviewName = reviewName.replace(/^\/+/, '');
  const url = `${BUSINESS_PROFILE_V4_URL}/${safeReviewName}/reply`;
  const res = await googleBusinessFetch<{
    comment: string;
    updateTime?: string;
    reviewReplyState?: string;
  }>(integration, url, {
    method: 'PUT',
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) throw new GoogleBusinessApiError(res);
  return res.data;
}

// Stage 10 — Google Business Profile media + Q&A helpers (CLAUDE.md §38.80,
// §38.55 PROFİL SAĞLIĞI backlog kapanışı). Both back the per-restaurant
// `/api/restaurants/[id]/google/business/profile-stats` endpoint that feeds
// the owner panel "PROFİL SAĞLIĞI" gauge. The wrapper retry / reauth /
// Sentry capture (CLAUDE.md §5.4 Task 4) is reused as-is.

export interface GoogleLocationMediaSummary {
  /**
   * Total media item count (photos + videos) on the location's profile.
   * Falls back to the page slice length when Google omits totalMediaItemCount
   * (rare, but documented behaviour for very small profiles).
   */
  count: number;
}

/**
 * Fetch a single page of media for the selected Google Business location and
 * return a count summary. We only need the count for the PROFİL SAĞLIĞI
 * heuristic, so a single page (size 100) is enough — busy profiles with
 * >100 photos still report the canonical `totalMediaItemCount` field.
 */
export async function listLocationMedia(
  integration: GoogleIntegrationRow,
  selection: GoogleBusinessLocation,
): Promise<GoogleLocationMediaSummary> {
  const parent = `accounts/${selection.accountId}/locations/${selection.locationId}`;
  const url = new URL(`${BUSINESS_PROFILE_V4_URL}/${parent}/media`);
  url.searchParams.set('pageSize', '100');

  const res = await googleBusinessFetch<{
    mediaItems?: unknown[];
    totalMediaItemCount?: number;
  }>(integration, url.toString());
  if (!res.ok) throw new GoogleBusinessApiError(res);

  const total =
    typeof res.data.totalMediaItemCount === 'number' ? res.data.totalMediaItemCount : null;
  const pageLength = Array.isArray(res.data.mediaItems) ? res.data.mediaItems.length : 0;
  return { count: total ?? pageLength };
}

export interface GoogleLocationQuestionsSummary {
  totalCount: number;
  unansweredCount: number;
}

/**
 * Fetch a single page of Q&A questions for the selected location and return
 * answered/unanswered counts. The Q&A API is a separate Google product
 * surface (`mybusinessq-and-a.googleapis.com`) and may be disabled in the
 * caller's Google Cloud project; the parent endpoint must tolerate this
 * helper's failure and degrade to `null` counts rather than 5xx.
 *
 * `answersPerQuestion=0` is enough for the count heuristic — we only need
 * `totalAnswerCount` per question, which is returned regardless. Avoiding
 * the answer payload keeps the call fast and PII-free.
 */
export async function listLocationQuestions(
  integration: GoogleIntegrationRow,
  selection: GoogleBusinessLocation,
): Promise<GoogleLocationQuestionsSummary> {
  // Q&A API addresses locations directly (no `accounts/{id}/` prefix), unlike
  // the reviews / media endpoints. Using the location's resource name keeps
  // us aligned with Google's documented locator format.
  const parent = `locations/${selection.locationId}`;
  const url = new URL(`${QANDA_API_URL}/${parent}/questions`);
  url.searchParams.set('pageSize', '50');
  url.searchParams.set('answersPerQuestion', '0');

  const res = await googleBusinessFetch<{
    questions?: Array<{ totalAnswerCount?: number }>;
    totalSize?: number;
  }>(integration, url.toString());
  if (!res.ok) throw new GoogleBusinessApiError(res);

  const questions = Array.isArray(res.data.questions) ? res.data.questions : [];
  const unansweredCount = questions.filter(
    (q) => !q.totalAnswerCount || q.totalAnswerCount <= 0,
  ).length;
  const totalCount =
    typeof res.data.totalSize === 'number' ? res.data.totalSize : questions.length;
  return { totalCount, unansweredCount };
}
