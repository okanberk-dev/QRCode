import { prisma } from '@/lib/prisma';
import type { PanelActor } from '@/lib/auth';

const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ACCOUNT_MANAGEMENT_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BUSINESS_INFORMATION_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const BUSINESS_PROFILE_V4_URL = 'https://mybusiness.googleapis.com/v4';

export const GOOGLE_BUSINESS_SCOPE = 'https://www.googleapis.com/auth/business.manage';

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

export async function getFreshGoogleAccessToken(integration: GoogleIntegrationRow): Promise<string | null> {
  if (integration.expiresAt.getTime() > Date.now() + 60_000) {
    return integration.accessToken;
  }
  if (!integration.refreshToken) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) return null;

  const expiresAt = new Date(Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000);
  await prisma.googleIntegration.update({
    where: { id: integration.id },
    data: { accessToken: data.access_token, expiresAt },
  });
  integration.accessToken = data.access_token;
  integration.expiresAt = expiresAt;
  return data.access_token;
}

export async function googleBusinessFetch<T>(
  integration: GoogleIntegrationRow,
  url: string,
  init: RequestInit = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const token = await getFreshGoogleAccessToken(integration);
  if (!token) {
    return { ok: false, status: 401, message: 'Google bağlantısı yenilenemedi. Hesabı yeniden bağlayın.' };
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return {
      ok: false,
      status: res.status,
      message: text.slice(0, 500) || `Google API HTTP ${res.status}`,
    };
  }

  return { ok: true, data: (await res.json()) as T };
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
  if (!accountsRes.ok) throw new Error(accountsRes.message);

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
      if (!locRes.ok) throw new Error(locRes.message);

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
  if (!res.ok) throw new Error(res.message);
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
  if (!res.ok) throw new Error(res.message);
  return res.data;
}
