import * as Sentry from '@sentry/nextjs';
import { prisma } from '@/lib/prisma';
import { checkReplyRisk } from '@/lib/reply-risk';
import type { PanelActor } from '@/lib/auth';
import type { Locale } from '@/lib/translations';
import { decryptToken, encryptToken } from '@/lib/google-token-crypto';
import { isGoogleTenantAllowed } from '@/lib/gbp-access';
import { rateLimit } from '@/lib/rate-limit';
import { timed } from '@/lib/server-timing';
import {
  PLACES_SEARCH_FIELD_MASK,
  PlacesApiError,
  classifyPlacesError,
  extractPlacesErrorMeta,
  isAbortError,
  normalizeSearchResults,
  type PlacesSearchResultRow,
} from '@/lib/google-places';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ACCOUNT_MANAGEMENT_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFORMATION_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const BUSINESS_PROFILE_V4_URL = 'https://mybusiness.googleapis.com/v4';

/**
 * Canonical Google review resource name:
 * `accounts/{accountId}/locations/{locationId}/reviews/{reviewId}`.
 *
 * Pinned to the URL-safe base64 charset Google actually emits. Shared by the
 * reply endpoint (request validation) and `updateGoogleReviewReply` (assert)
 * so the two can never drift — this is an authorization boundary, not cosmetics.
 */
export const GOOGLE_REVIEW_NAME_RE =
  /^accounts\/[A-Za-z0-9_-]+\/locations\/[A-Za-z0-9_-]+\/reviews\/[A-Za-z0-9_-]+$/;
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
  | 'GOOGLE_API_NOT_PROVISIONED'
  | 'GOOGLE_SERVER_ERROR'
  | 'GOOGLE_NETWORK_ERROR'
  | 'GOOGLE_API_ERROR'
  | 'GOOGLE_NOT_CONFIGURED'
  /** Workspace is not in GBP_ALLOWED_TENANTS (CLAUDE.md §53). */
  | 'GOOGLE_TENANT_NOT_ALLOWED';

/**
 * CLAUDE.md §38 audit Fix #7 — locale-aware error messages.
 * UI tarafında `isTr` switch yapıyordu; API artık locale'i tüketip
 * mesajı doğru dilde döner. Default 'tr' (CLAUDE.md §22.9).
 */
const GOOGLE_FAILURE_MESSAGES: Record<GoogleBusinessFailureCode, Record<Locale, string>> = {
  GOOGLE_REAUTH_REQUIRED: {
    tr: 'Google bağlantısı süresi doldu. Hesabı yeniden bağlayın.',
    en: 'Google connection expired. Reconnect the account.',
  },
  // Owner-facing copy: no quota / API / OAuth / server vocabulary (§38.233).
  // The owner panel maps these by `code` (google-owner-copy.ts); these strings
  // are the safe fallback for any consumer that does render `error`.
  GOOGLE_RATE_LIMITED: {
    tr: 'Google şu an yoğun. Birkaç dakika sonra tekrar dene.',
    en: 'Google is busy right now. Please try again in a few minutes.',
  },
  GOOGLE_API_NOT_PROVISIONED: {
    tr: 'Google, yorum yanıtlama erişimini Buaze için henüz açmadı. Hesabın doğru bağlı; ek bir işlem gerekmiyor.',
    en: "Google hasn't enabled review replies for Buaze yet. Your account is connected correctly; no action is needed.",
  },
  GOOGLE_SERVER_ERROR: {
    tr: 'Google geçici bir sorun yaşıyor. Biraz sonra tekrar dene.',
    en: 'Google is having a temporary problem. Please try again shortly.',
  },
  GOOGLE_NETWORK_ERROR: {
    tr: "Google'a şu an ulaşılamadı. Biraz sonra tekrar dene.",
    en: "Couldn't reach Google right now. Please try again shortly.",
  },
  GOOGLE_API_ERROR: {
    tr: "Google'dan beklenmeyen bir yanıt geldi. Biraz sonra tekrar dene.",
    en: 'Google sent an unexpected response. Please try again shortly.',
  },
  GOOGLE_NOT_CONFIGURED: {
    tr: 'Google hesabı bağlama şu an kullanılamıyor. Lütfen daha sonra tekrar dene.',
    en: "Connecting a Google account isn't available right now. Please try again later.",
  },
  GOOGLE_TENANT_NOT_ALLOWED: {
    tr: 'Google yorumları yakında. Bu özellik henüz hesabın için açık değil.',
    en: "Google reviews are coming soon. This isn't open for your account yet.",
  },
};

export function googleFailureMessage(code: GoogleBusinessFailureCode, locale: Locale = 'tr'): string {
  return GOOGLE_FAILURE_MESSAGES[code][locale];
}

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
  /**
   * Google API'den gelen `Retry-After` (saniye). 429 RESOURCE_EXHAUSTED
   * durumunda dolu olur; UI buna göre "X saniye sonra tekrar dene" yazar.
   */
  retryAfterSeconds?: number;
}

/**
 * Typed error so wrapper helpers (`fetchGoogleBusinessLocations`, ...) can
 * throw and let API routes detect reauth via `instanceof`.
 */
export class GoogleBusinessApiError extends Error {
  status: number;
  code: GoogleBusinessFailureCode;
  requiresReauth: boolean;
  retryAfterSeconds: number | undefined;

  constructor(failure: GoogleBusinessFailure) {
    super(failure.message);
    this.name = 'GoogleBusinessApiError';
    this.status = failure.status;
    this.code = failure.code;
    this.requiresReauth = Boolean(failure.requiresReauth);
    this.retryAfterSeconds = failure.retryAfterSeconds;
  }
}

/**
 * One Places text-search row. Defined once in the pure `google-places`
 * module (client components import it from there); `category` is Google's
 * `primaryTypeDisplayName`, which tells two branches of a chain apart.
 */
export type GooglePlaceSearchResult = PlacesSearchResultRow;

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

/**
 * Resolve the Google integration a restaurant's panel surfaces should use.
 *
 * Precedence is deterministic and owner-first. It used to be
 * `findFirst({ userId: { in: [actorRef, ownerId] } , orderBy: updatedAt desc })`,
 * which let whoever refreshed last win: `/api/integrations/google/connect`
 * accepts ANY panel actor and keys the row on the actor's own id, so a team
 * member (or a Buaze admin) who connected their personal Google account
 * silently shadowed the owner's. Consequences were all silent — the owner's
 * selected location vanished, and picking a location from the wrong account
 * wrote that third party's `googleReviewUrl` onto the restaurant, so every
 * high-rating customer scanning the QR was redirected to a stranger's listing
 * (§19.4.3). The crons (`reputation/snapshot.ts`, `reputation/google-draft.ts`,
 * `cron/google-reviews-alert`) always resolved by `restaurant.userId` alone, so
 * the panel and the background jobs could disagree about which account was live.
 *
 * The owner's row now always wins; the actor's own row is used only to
 * bootstrap a workspace whose owner has never connected.
 */
export async function getGoogleIntegrationForRestaurant(
  actor: PanelActor,
  restaurantId: string,
) {
  const actorRef = googleOwnerRef(actor);
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { userId: true },
  });

  const refs = [actorRef];
  if (restaurant?.userId && !refs.includes(restaurant.userId)) {
    refs.push(restaurant.userId);
  }

  // One query, resolved in JS — keeps the round-trip count where it was
  // (CLAUDE.md §40.1) while making the winner independent of `updatedAt`.
  const rows = await prisma.googleIntegration.findMany({
    where: { userId: { in: refs } },
  });
  if (rows.length === 0) return null;

  const ownerRow = restaurant?.userId
    ? rows.find((row) => row.userId === restaurant.userId)
    : undefined;
  return ownerRow ?? rows.find((row) => row.userId === actorRef) ?? null;
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
  retryAfterSeconds?: number,
): GoogleBusinessFailure {
  return { ok: false, status, code, message, requiresReauth, retryAfterSeconds };
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
  // §53 — tenant gate. Every Business Profile request passes here, so a
  // workspace outside GBP_ALLOWED_TENANTS can never reach Google, whichever
  // route, cron or page asked.
  if (!(await isGoogleTenantAllowed(integration.userId))) {
    return {
      ok: false,
      code: 'GOOGLE_TENANT_NOT_ALLOWED',
      message: googleFailureMessage('GOOGLE_TENANT_NOT_ALLOWED'),
    };
  }

  // §53 — tokens issued for another OAuth client (the deploy moved to a new
  // Google Cloud project) cannot be refreshed with the current client and
  // must not be used against its quota. Mark once, ask for a reconnect.
  const currentClientId = process.env.GOOGLE_CLIENT_ID ?? null;
  if (!currentClientId || integration.clientId !== currentClientId) {
    if (currentClientId && integration.invalidReason !== 'client_changed') {
      await markGoogleIntegrationInvalid(integration, 'client_changed');
    }
    return {
      ok: false,
      code: currentClientId ? 'GOOGLE_REAUTH_REQUIRED' : 'GOOGLE_NOT_CONFIGURED',
      message: googleFailureMessage(currentClientId ? 'GOOGLE_REAUTH_REQUIRED' : 'GOOGLE_NOT_CONFIGURED'),
    };
  }
  if (integration.invalidReason === 'revoked') {
    return {
      ok: false,
      code: 'GOOGLE_REAUTH_REQUIRED',
      message: googleFailureMessage('GOOGLE_REAUTH_REQUIRED'),
    };
  }

  // Fix #6 — token decrypt (backward-compat: plain text row'lar olduğu
  // gibi döner — `decryptToken` v1: prefix yoksa passthrough).
  if (!accessTokenNeedsRefresh(integration.expiresAt)) {
    try {
      return { ok: true, accessToken: decryptToken(integration.accessToken) };
    } catch {
      // decrypt fail (key mismatch / corruption) → reauth tetikle
      return {
        ok: false,
        code: 'GOOGLE_REAUTH_REQUIRED',
        message: googleFailureMessage('GOOGLE_REAUTH_REQUIRED'),
      };
    }
  }
  if (!integration.refreshToken) {
    return {
      ok: false,
      code: 'GOOGLE_REAUTH_REQUIRED',
      message: googleFailureMessage('GOOGLE_REAUTH_REQUIRED'),
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      code: 'GOOGLE_NOT_CONFIGURED',
      message: googleFailureMessage('GOOGLE_NOT_CONFIGURED'),
    };
  }

  let refreshTokenPlain: string;
  try {
    refreshTokenPlain = decryptToken(integration.refreshToken);
  } catch {
    return {
      ok: false,
      code: 'GOOGLE_REAUTH_REQUIRED',
      message: googleFailureMessage('GOOGLE_REAUTH_REQUIRED'),
    };
  }

  // 1 retry on transient (network / 5xx / 429). Only a dead grant is terminal.
  for (let attempt = 0; attempt <= 1; attempt++) {
    const outcome = await requestGoogleTokenRefresh({
      clientId,
      clientSecret,
      refreshToken: refreshTokenPlain,
    });

    if (outcome.kind === 'ok') {
      const expiresAt = new Date(Date.now() + outcome.expiresInSeconds * 1000);
      // Fix #6 — yeni access token encrypt'lenerek DB'ye yazılır.
      const encryptedAccess = encryptToken(outcome.accessToken);
      await prisma.googleIntegration.update({
        where: { id: integration.id },
        data: { accessToken: encryptedAccess, expiresAt },
      });
      integration.accessToken = encryptedAccess;
      integration.expiresAt = expiresAt;
      return { ok: true, accessToken: outcome.accessToken };
    }

    if (outcome.kind === 'missing_token') {
      return {
        ok: false,
        code: 'GOOGLE_REAUTH_REQUIRED',
        message: googleFailureMessage('GOOGLE_REAUTH_REQUIRED'),
      };
    }

    // The old code nulled `refreshToken` for EVERY 4xx. Google's token
    // endpoint also answers 4xx for transient conditions — most importantly
    // 429 during a quota spike (§5.1.1). Only `invalid_grant` /
    // `invalid_client` / `unauthorized_client` mean the refresh token will
    // never work again.
    if (outcome.kind === 'dead_grant') {
      // §53 — "broken": keep the row (and every cached review) so pages keep
      // showing the last good data and the panel can say why.
      await markGoogleIntegrationInvalid(integration, 'revoked', { dropRefreshToken: true });
      return {
        ok: false,
        code: 'GOOGLE_REAUTH_REQUIRED',
        message: googleFailureMessage('GOOGLE_REAUTH_REQUIRED'),
      };
    }

    // Other 4xx, or 429 on the last attempt → transient failure WITHOUT
    // touching the stored refresh token, so the connection survives.
    if (outcome.kind === 'client_error' || (outcome.kind === 'rate_limited' && attempt === 1)) {
      return {
        ok: false,
        code: 'GOOGLE_RATE_LIMITED',
        message: googleFailureMessage('GOOGLE_RATE_LIMITED'),
      };
    }

    // 429 on the first attempt, 5xx, network → retry once.
    if (attempt === 0) {
      await sleep(1000);
    }
  }

  return {
    ok: false,
    code: 'GOOGLE_NETWORK_ERROR',
    message: googleFailureMessage('GOOGLE_NETWORK_ERROR'),
  };
}

/**
 * Flags a connection as needing a reconnect. Best effort: a failed write
 * must not hide the reauth signal from the caller.
 */
async function markGoogleIntegrationInvalid(
  integration: GoogleIntegrationRow,
  reason: 'revoked' | 'client_changed',
  opts: { dropRefreshToken?: boolean } = {},
): Promise<void> {
  const invalidatedAt = new Date();
  await prisma.googleIntegration
    .update({
      where: { id: integration.id },
      data: {
        invalidatedAt,
        invalidReason: reason,
        ...(opts.dropRefreshToken ? { refreshToken: null } : {}),
      },
    })
    .catch(() => {});
  integration.invalidatedAt = invalidatedAt;
  integration.invalidReason = reason;
  if (opts.dropRefreshToken) integration.refreshToken = null;
}

/**
 * Global Business Profile request budget per minute, shared by every tenant
 * (`GBP_GLOBAL_RPM`, default 120). Google's per-project limit for the
 * Account Management API is 300/min; a typo or non-positive value falls back
 * to the default instead of removing the ceiling.
 */
export function gbpGlobalRequestsPerMinute(raw: string | undefined = process.env.GBP_GLOBAL_RPM): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n <= 300 ? n : 120;
}

/** Access tokens are reused while they have more than this left. */
export const ACCESS_TOKEN_REUSE_MARGIN_MS = 60_000;

/** True when the stored access token must be refreshed before use. */
export function accessTokenNeedsRefresh(expiresAt: Date, now: number = Date.now()): boolean {
  return expiresAt.getTime() <= now + ACCESS_TOKEN_REUSE_MARGIN_MS;
}

export type GoogleTokenRefreshOutcome =
  | { kind: 'ok'; accessToken: string; expiresInSeconds: number }
  /** 200 without an access_token — treated as a dead connection. */
  | { kind: 'missing_token' }
  /** invalid_grant / invalid_client / unauthorized_client — never retry. */
  | { kind: 'dead_grant' }
  | { kind: 'rate_limited' }
  /** Any other 4xx. The stored refresh token is kept. */
  | { kind: 'client_error' }
  /** 5xx, network error or timeout. */
  | { kind: 'transient' };

/**
 * One refresh_token → access_token exchange, classified. No DB access and no
 * retries, so it is unit-testable with a fake `fetch`. Never logs and never
 * returns the refresh token, the client secret or Google's error text.
 */
export async function requestGoogleTokenRefresh(
  params: { clientId: string; clientSecret: string; refreshToken: string },
  opts: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<GoogleTokenRefreshOutcome> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? TOKEN_REFRESH_TIMEOUT_MS);
  try {
    const res = await doFetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        refresh_token: params.refreshToken,
        grant_type: 'refresh_token',
      }),
      signal: controller.signal,
    });

    if (res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { access_token?: unknown; expires_in?: unknown }
        | null;
      // Unparseable success body: retry like a 5xx (the old code's behaviour).
      if (!data) return { kind: 'transient' };
      const accessToken = typeof data.access_token === 'string' ? data.access_token : '';
      if (!accessToken) return { kind: 'missing_token' };
      const expiresIn =
        typeof data.expires_in === 'number' && Number.isFinite(data.expires_in)
          ? data.expires_in
          : 3600;
      return { kind: 'ok', accessToken, expiresInSeconds: Math.max(60, expiresIn) };
    }

    if (res.status >= 400 && res.status < 500) {
      const errBody = (await res.json().catch(() => null)) as { error?: unknown } | null;
      const oauthError = typeof errBody?.error === 'string' ? errBody.error : '';
      if (
        oauthError === 'invalid_grant' ||
        oauthError === 'invalid_client' ||
        oauthError === 'unauthorized_client'
      ) {
        return { kind: 'dead_grant' };
      }
      return res.status === 429 ? { kind: 'rate_limited' } : { kind: 'client_error' };
    }
    return { kind: 'transient' };
  } catch {
    return { kind: 'transient' };
  } finally {
    clearTimeout(timer);
  }
}

interface RawFetchOutcome {
  status: number;
  ok: boolean;
  text: string;
  body: string | null;
  /** True when the fetch promise itself rejected (network / abort). */
  networkError: boolean;
  /**
   * Response başlığından parse edilen `Retry-After` (saniye). RFC 7231
   * delta-seconds VEYA HTTP-date olabilir; ikinci durumu da çevirir.
   * 429 dışında undefined kalır.
   */
  retryAfterSeconds?: number;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const trimmed = header.trim();
  if (!trimmed) return undefined;
  // delta-seconds (integer)
  const asNum = Number(trimmed);
  if (Number.isFinite(asNum) && asNum >= 0) return Math.ceil(asNum);
  // HTTP-date
  const asDate = Date.parse(trimmed);
  if (!Number.isFinite(asDate)) return undefined;
  const diff = Math.ceil((asDate - Date.now()) / 1000);
  return diff > 0 ? diff : undefined;
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
      retryAfterSeconds:
        res.status === 429 ? parseRetryAfter(res.headers.get('retry-after')) : undefined,
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

/**
 * Google "API enabled ama quota=0" (henüz provision edilmemiş) durumunu
 * tespit eder. Bu durumda accounts.list/locations.list 429
 * RESOURCE_EXHAUSTED + `quota_limit_value:"0"` döner. KALICI bir durumdur:
 * owner farklı Google hesabıyla bağlansa da aynı sonucu alır çünkü quota
 * proje-geneli (`consumer: projects/<n>`). Sadece Google Cloud Console'da
 * quota artışı (operatör aksiyonu, CLAUDE.md §5.1.1) çözer. Geçici rate
 * limit'ten (quota_limit_value > 0) ayırt edilir.
 */
function isQuotaNotProvisioned(text: string): boolean {
  return /"quota_limit_value"\s*:\s*"0"/.test(text);
}

function isRetriableStatus(status: number, networkError: boolean): boolean {
  if (networkError) return true;
  // §38.231 — 429 RETRY EDİLMEZ. Google Business quota dakika-bazlı
  // (1/min/proje); 1-2s backoff aynı dakika içinde yine 429 döndürür +
  // proje-geneli quota'yı her denemede yeniden tüketir (1 çağrı → 3 burn).
  // Negative cache (§38.209) "tekrar dene"yi zaten 90s sonraya erteliyor;
  // quota=0 (provision edilmemiş) durumunda retry tümüyle anlamsız.
  if (status >= 500 && status < 600) return true;
  return false;
}

function classifyOutcome(outcome: RawFetchOutcome): GoogleBusinessFailureCode {
  if (outcome.networkError) return 'GOOGLE_NETWORK_ERROR';
  if (outcome.status === 429) {
    return isQuotaNotProvisioned(outcome.text)
      ? 'GOOGLE_API_NOT_PROVISIONED'
      : 'GOOGLE_RATE_LIMITED';
  }
  if (outcome.status >= 500) return 'GOOGLE_SERVER_ERROR';
  return 'GOOGLE_API_ERROR';
}

function outcomeMessage(outcome: RawFetchOutcome): string {
  // Never carry Google's raw error body: it can hold project numbers, quota
  // metric names and other text that must not travel to a client, a log line
  // or a cron response. The failure `code` + `status` are the diagnostic data
  // (Sentry already gets them); the message is the fixed, owner-safe copy.
  return googleFailureMessage(classifyOutcome(outcome));
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
export function googleBusinessFetch<T>(
  integration: GoogleIntegrationRow,
  url: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | GoogleBusinessFailure> {
  // Server-Timing `google` (CLAUDE.md §56).
  return timed('google', () => googleBusinessFetchImpl<T>(integration, url, init));
}

async function googleBusinessFetchImpl<T>(
  integration: GoogleIntegrationRow,
  url: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | GoogleBusinessFailure> {
  const method = (init.method ?? 'GET').toUpperCase();

  const tokenResult = await getFreshGoogleAccessToken(integration);
  if (!tokenResult.ok) {
    const requiresReauth = tokenResult.code === 'GOOGLE_REAUTH_REQUIRED';
    const fail = failure(
      requiresReauth
        ? 401
        : tokenResult.code === 'GOOGLE_TENANT_NOT_ALLOWED'
          ? 403
          : tokenResult.code === 'GOOGLE_NOT_CONFIGURED'
            ? 503
            : 502,
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
    // §53 — every tenant shares ONE Google Cloud project quota. A global
    // per-minute budget keeps all callers (panel, crons, review refresh
    // queue) together well under it; over budget we answer "busy" without
    // spending a Google request.
    const budget = await rateLimit('gbp:global', gbpGlobalRequestsPerMinute(), 60_000);
    if (!budget.allowed) {
      const fail = failure(
        429,
        'GOOGLE_RATE_LIMITED',
        googleFailureMessage('GOOGLE_RATE_LIMITED'),
        false,
        Math.max(1, budget.retryAfterSeconds),
      );
      captureGoogleBusinessFailure(fail, { url, attempts: attempt + 1, method });
      return fail;
    }

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
        const fail = failure(outcome.status, 'GOOGLE_API_ERROR', googleFailureMessage('GOOGLE_API_ERROR'));
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
      const fail = failure(401, 'GOOGLE_REAUTH_REQUIRED', googleFailureMessage('GOOGLE_REAUTH_REQUIRED'), true);
      captureGoogleBusinessFailure(fail, { url, attempts: attempt + 1, method });
      return fail;
    }

    // Non-retriable 4xx → return immediately
    if (!isRetriableStatus(outcome.status, outcome.networkError)) {
      const fail = failure(
        outcome.status,
        classifyOutcome(outcome),
        outcomeMessage(outcome),
        false,
        outcome.retryAfterSeconds,
      );
      captureGoogleBusinessFailure(fail, { url, attempts: attempt + 1, method });
      return fail;
    }

    // Retriable: backoff if more attempts left. 429 ise Google'ın
    // önerdiği Retry-After'a saygı duy (max 30 saniye'e clamp; çok uzun
    // bekleme worker timeout'u tetikler).
    if (attempt < MAX_RETRIES) {
      const defaultBackoff = RETRY_BACKOFF_MS[attempt] ?? 2000;
      const respectedRetry =
        outcome.status === 429 && outcome.retryAfterSeconds
          ? Math.min(outcome.retryAfterSeconds * 1000, 30_000)
          : defaultBackoff;
      await sleep(respectedRetry);
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
    false,
    finalOutcome.retryAfterSeconds,
  );
  captureGoogleBusinessFailure(fail, { url, attempts: MAX_RETRIES + 1, method });
  return fail;
}

/** Text Search timeout. Details uses the same 6 s ceiling. */
const PLACES_SEARCH_TIMEOUT_MS = 6000;

/**
 * Places API (New) text search. Throws `PlacesApiError` (a fixed code string
 * as its message — never Google's text) so routes can report the failure
 * class without ever touching a raw error body.
 */
export async function searchGooglePlaces(
  query: string,
  locale: 'tr' | 'en' = 'tr',
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch; apiKey?: string } = {},
): Promise<GooglePlaceSearchResult[]> {
  const key = opts.apiKey ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new PlacesApiError({ code: 'FORBIDDEN', reason: 'NO_API_KEY' });

  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? PLACES_SEARCH_TIMEOUT_MS);

  try {
    const res = await doFetch(PLACES_SEARCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': PLACES_SEARCH_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        languageCode: locale,
        regionCode: 'TR',
        maxResultCount: 6,
      }),
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new PlacesApiError({
        code: classifyPlacesError(res.status, text),
        status: res.status,
        ...extractPlacesErrorMeta(text),
      });
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new PlacesApiError({ code: 'BAD_RESPONSE' });
    }
    return normalizeSearchResults(json);
  } catch (err) {
    if (err instanceof PlacesApiError) throw err;
    throw new PlacesApiError({ code: timedOut || isAbortError(err) ? 'TIMEOUT' : 'NETWORK' });
  } finally {
    clearTimeout(timer);
  }
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

/**
 * Thrown when a reply would reach Google with profanity, insults, threats,
 * hate, pressure, personal data or hidden characters (CLAUDE.md §48, §54).
 * Last line of defence: routes and the bulk queue check first, but nothing
 * that calls `updateGoogleReviewReply` can bypass this.
 */
export class ReplyContentBlockedError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super('reply content blocked');
    this.name = 'ReplyContentBlockedError';
    this.issues = issues;
  }
}

export async function updateGoogleReviewReply(
  integration: GoogleIntegrationRow,
  reviewName: string,
  comment: string,
): Promise<{ comment: string; updateTime?: string; reviewReplyState?: string }> {
  // Hard assert, not a sanitiser. `reviewName` is concatenated into the URL and
  // `fetch()` resolves `..` dot-segments (WHATWG URL), so a name that merely
  // *starts with* the caller's own location prefix can still target another
  // account. Stripping leading slashes never addressed that. Callers must pass
  // a canonical resource name they rebuilt from a trusted selection.
  if (!GOOGLE_REVIEW_NAME_RE.test(reviewName)) {
    throw new Error('invalid Google review resource name');
  }
  // Links are checked by the callers against the business's own hosts.
  const risk = checkReplyRisk(comment, { linksAsWarning: true });
  if (risk.blocked) throw new ReplyContentBlockedError(risk.issues);
  const url = `${BUSINESS_PROFILE_V4_URL}/${reviewName}/reply`;
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

/**
 * Removes the business's public reply from a review (CLAUDE.md §54). A
 * reply that is already gone (404) counts as removed. Same canonical-name
 * rule as `updateGoogleReviewReply`.
 */
export async function deleteGoogleReviewReply(
  integration: GoogleIntegrationRow,
  reviewName: string,
): Promise<void> {
  if (!GOOGLE_REVIEW_NAME_RE.test(reviewName)) {
    throw new Error('invalid Google review resource name');
  }
  const res = await googleBusinessFetch<Record<string, never>>(
    integration,
    `${BUSINESS_PROFILE_V4_URL}/${reviewName}/reply`,
    { method: 'DELETE' },
  );
  if (!res.ok && res.status !== 404) throw new GoogleBusinessApiError(res);
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
