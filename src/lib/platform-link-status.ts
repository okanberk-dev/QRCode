/**
 * Platform link status model — single source for the owner "Platform
 * bağlantıları" surfaces (overview list, provider page, settings summary,
 * business detail strip, onboarding step).
 *
 * Pure + DB-agnostic: callers pass the restaurant row subset and the latest
 * check map; nothing here touches Prisma or `fetch`. Covered by
 * `tests/platform-link-status.test.ts`.
 *
 * State rules (evaluated in order, first match wins):
 *   1. locked  / admin_off   — external review platform + admin gate closed
 *                             (CLAUDE.md §5.2). Saved URL is left untouched.
 *   2. missing / no_url      — URL empty.
 *   3. off     / owner_off   — URL set, owner switched the platform off.
 *   4. issue   / url_error | url_warning — checkProviderUrl() not ok
 *                             (§19.4 — warnings stay non-blocking on save;
 *                             here they only change the label).
 *   5. issue   / test_failed — latest automated/manual check failed.
 *   6. connected / tested_ok | untested.
 */
import type { PlatformId } from '@/components/ui';
import {
  checkProviderUrl,
  describeDomainError,
  type DomainCheckResult,
} from '@/lib/integration-domains';
import {
  MANAGEABLE_PLATFORM_DEFS,
  MANAGED_REVIEW_PLATFORMS,
  type ManageablePlatformDef,
  type ManagedPlatformCategory,
  type PlatformEnabledField,
  type PlatformUrlField,
} from '@/lib/platform-management';
import { detectSector, getSectorPlatforms, SECTOR_PLATFORMS } from '@/lib/sector-platforms';

export type PlatformLinkState = 'connected' | 'issue' | 'missing' | 'off' | 'locked';

export type PlatformLinkReason =
  | 'tested_ok'
  | 'untested'
  | 'test_failed'
  | 'url_error'
  | 'url_warning'
  | 'no_url'
  | 'owner_off'
  | 'admin_off';

export interface LatestCheckLite {
  ok: boolean;
  checkedAt: string;
  error: string | null;
  statusCode: number | null;
}

/**
 * Restaurant subset the helper needs. URL/enabled columns are optional so
 * callers that select only part of them still type-check; a missing URL is
 * "empty" and a missing enabled flag falls back to the schema default (true).
 */
export type PlatformLinkRow = {
  category: string | null;
  externalPlatformsEnabled?: boolean | null;
  defaultRedirectPlatform?: string | null;
} & Partial<Record<PlatformUrlField, string | null>> &
  Partial<Record<PlatformEnabledField, boolean | null>>;

export interface PlatformLinkStatus {
  platform: ManageablePlatformDef;
  state: PlatformLinkState;
  reason: PlatformLinkReason;
  /** Trimmed saved URL, `null` when empty. */
  url: string | null;
  /** Review platform in the business's sector list; social/message always true. */
  inSector: boolean;
  isDefault: boolean;
  lastCheck: LatestCheckLite | null;
  /** Domain/path check result when the URL failed it (url_error / url_warning). */
  urlCheck: DomainCheckResult | null;
}

export interface PlatformLinkSummary {
  connected: number;
  issue: number;
  missing: number;
  /** Owner-off and admin-locked rows together ("Kapalı"). */
  off: number;
}

function trimmedUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEnabled(row: PlatformLinkRow, platform: ManageablePlatformDef): boolean {
  if (!platform.enabledField) return true;
  const value = row[platform.enabledField];
  // undefined / null → schema default (true).
  return value !== false;
}

function isInSector(platform: ManageablePlatformDef, allowed: Set<PlatformId>): boolean {
  if (platform.category !== 'review') return true;
  if (!platform.uiPlatformId) return true;
  return allowed.has(platform.uiPlatformId);
}

export function computePlatformLinkStatus(
  platform: ManageablePlatformDef,
  row: PlatformLinkRow,
  checks: Record<string, LatestCheckLite> | null | undefined,
  allowed: Set<PlatformId> = getSectorPlatforms(row.category),
): PlatformLinkStatus {
  const url = trimmedUrl(row[platform.urlField]);
  const lastCheck = checks?.[platform.provider] ?? null;
  const base = {
    platform,
    url,
    inSector: isInSector(platform, allowed),
    isDefault: Boolean(row.defaultRedirectPlatform) && row.defaultRedirectPlatform === platform.provider,
    lastCheck,
    urlCheck: null as DomainCheckResult | null,
  };

  if (platform.externalReview && row.externalPlatformsEnabled === false) {
    return { ...base, state: 'locked', reason: 'admin_off' };
  }
  if (!url) {
    return { ...base, state: 'missing', reason: 'no_url' };
  }
  if (!isEnabled(row, platform)) {
    return { ...base, state: 'off', reason: 'owner_off' };
  }
  const urlCheck = checkProviderUrl(platform.provider, url);
  if (!urlCheck.ok) {
    return {
      ...base,
      urlCheck,
      state: 'issue',
      reason: urlCheck.severity === 'warning' ? 'url_warning' : 'url_error',
    };
  }
  if (lastCheck && lastCheck.ok === false) {
    return { ...base, state: 'issue', reason: 'test_failed' };
  }
  return { ...base, state: 'connected', reason: lastCheck?.ok ? 'tested_ok' : 'untested' };
}

/**
 * Status for every manageable platform (Webhook / comingSoon excluded), in
 * MANAGEABLE_PLATFORM_DEFS order. `opts.categories` narrows the list
 * (e.g. `['review']` for the onboarding step / business detail strip).
 */
export function computePlatformLinkStatuses(
  row: PlatformLinkRow,
  checks: Record<string, LatestCheckLite> | null | undefined,
  opts?: { categories?: ManagedPlatformCategory[] },
): PlatformLinkStatus[] {
  const allowed = getSectorPlatforms(row.category);
  const categories = opts?.categories ? new Set(opts.categories) : null;
  return MANAGEABLE_PLATFORM_DEFS.filter((platform) => !categories || categories.has(platform.category)).map(
    (platform) => computePlatformLinkStatus(platform, row, checks, allowed),
  );
}

export function summarizePlatformLinks(list: PlatformLinkStatus[]): PlatformLinkSummary {
  const summary: PlatformLinkSummary = { connected: 0, issue: 0, missing: 0, off: 0 };
  for (const status of list) {
    if (status.state === 'connected') summary.connected += 1;
    else if (status.state === 'issue') summary.issue += 1;
    else if (status.state === 'missing') summary.missing += 1;
    else summary.off += 1; // off + locked
  }
  return summary;
}

/**
 * Main-list visibility. Social/message rows always show. A review platform
 * shows when it is in the business's sector list OR already has a saved URL
 * — the public resolver's `any_active` tier (§19.4.3) can still send
 * customers to an out-of-sector link, so the owner must be able to see and
 * remove it. Out-of-sector review platforms without a URL go into the
 * "Diğer platformlar" disclosure.
 */
export function isPlatformLinkVisible(status: PlatformLinkStatus): boolean {
  if (status.platform.category !== 'review') return true;
  return status.inSector || status.url !== null;
}

const STATE_ORDER: Record<PlatformLinkState, number> = {
  issue: 0,
  connected: 1,
  missing: 2,
  off: 3,
  locked: 3,
};

/**
 * Sort: issue → connected → missing → off/locked, then by the sector's
 * platform priority (SECTOR_PLATFORMS), then catalogue order. Stable.
 */
export function sortPlatformLinkStatuses(
  list: PlatformLinkStatus[],
  category: string | null | undefined,
): PlatformLinkStatus[] {
  const sectorOrder = SECTOR_PLATFORMS[detectSector(category)];
  const catalogueIndex = new Map(MANAGEABLE_PLATFORM_DEFS.map((platform, index) => [platform.slug, index]));
  const sectorIndex = (status: PlatformLinkStatus) => {
    const id = status.platform.uiPlatformId;
    const index = id ? sectorOrder.indexOf(id) : -1;
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...list].sort((a, b) => {
    const byState = STATE_ORDER[a.state] - STATE_ORDER[b.state];
    if (byState !== 0) return byState;
    const bySector = sectorIndex(a) - sectorIndex(b);
    if (bySector !== 0) return bySector;
    return (catalogueIndex.get(a.platform.slug) ?? 0) - (catalogueIndex.get(b.platform.slug) ?? 0);
  });
}

/**
 * UI platform ids offered by the default-platform picker: in-sector review
 * platforms that are usable (URL + enabled + not admin-gated), plus the
 * stored default even when it is outside the sector list — the public
 * resolver honours the default regardless of sector, so it must not be
 * flagged as an orphan.
 */
export function defaultPickerPlatformIds(row: PlatformLinkRow): PlatformId[] {
  const allowed = getSectorPlatforms(row.category);
  const storedDefault = row.defaultRedirectPlatform ?? null;
  return MANAGED_REVIEW_PLATFORMS.filter((platform) => {
    if (!platform.uiPlatformId) return false;
    const isStoredDefault = storedDefault !== null && platform.provider === storedDefault;
    if (!allowed.has(platform.uiPlatformId) && !isStoredDefault) return false;
    if (platform.externalReview && row.externalPlatformsEnabled === false) return false;
    return Boolean(trimmedUrl(row[platform.urlField])) && isEnabled(row, platform);
  }).map((platform) => platform.uiPlatformId as PlatformId);
}

/**
 * Accepted active link count for "Tümünü kontrol et": links the retest
 * endpoint will actually test (URL + enabled + not gated).
 */
export function countTestableLinks(list: PlatformLinkStatus[]): number {
  return list.filter((status) => status.state === 'connected' || status.state === 'issue').length;
}

export function formatRelativeTime(iso: string, locale: 'tr' | 'en', nowMs: number): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return locale === 'tr' ? 'az önce' : 'just now';
  const diff = nowMs - ts;
  const mins = Math.floor(diff / 60000);
  if (diff < 0 || mins < 1) return locale === 'tr' ? 'az önce' : 'just now';
  if (mins < 60) return locale === 'tr' ? `${mins} dk önce` : `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return locale === 'tr' ? `${hours} sa önce` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return locale === 'tr' ? `${days} gün önce` : `${days}d ago`;
}

function shortError(error: string | null): string | null {
  if (!error) return null;
  const clean = error.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return clean.length > 140 ? `${clean.slice(0, 139)}…` : clean;
}

/** One-line, owner-facing explanation of a status (row sub-copy). */
export function describePlatformLinkStatus(
  status: PlatformLinkStatus,
  locale: 'tr' | 'en',
  nowMs: number,
): string {
  const isTr = locale === 'tr';
  const rel = status.lastCheck ? formatRelativeTime(status.lastCheck.checkedAt, locale, nowMs) : '';
  switch (status.reason) {
    case 'tested_ok':
      return isTr ? `Link çalışıyor · son kontrol ${rel}` : `Link works · checked ${rel}`;
    case 'untested':
      return isTr ? 'Link kayıtlı · henüz kontrol edilmedi' : 'Link saved · not checked yet';
    case 'test_failed': {
      const error = shortError(status.lastCheck?.error ?? null);
      if (isTr) return error ? `Son kontrol başarısız (${rel}): ${error}` : `Son kontrol başarısız (${rel})`;
      return error ? `Last check failed (${rel}): ${error}` : `Last check failed (${rel})`;
    }
    case 'url_error':
    case 'url_warning':
      return status.urlCheck
        ? describeDomainError(status.platform.provider, status.urlCheck, locale)
        : isTr
          ? 'Link doğrulanamadı.'
          : 'Link could not be verified.';
    case 'no_url':
      if (status.platform.category !== 'review') {
        return isTr
          ? 'Müşteri sayfanızda gösterilir — linki ekleyin.'
          : 'Shown on your customer page — add the link.';
      }
      return status.inSector
        ? isTr
          ? 'Müşterileriniz bu platformda yorum bırakabilir — linki ekleyin.'
          : 'Customers can review you here — add the link.'
        : isTr
          ? 'Sektörünüz için önerilmiyor.'
          : 'Not typical for your sector.';
    case 'owner_off':
      return isTr
        ? 'Kapattınız — link kayıtlı ama müşterilere önerilmiyor.'
        : 'You turned this off — the link is saved but not offered to customers.';
    case 'admin_off':
      return isTr
        ? 'Bu platform hesabınızda kapalı. Kayıtlı link korunur.'
        : 'This platform is off for your account. The saved link is kept.';
    default:
      return '';
  }
}

/** Owner-facing threshold label (mirrors RedirectThresholdPicker copy). */
export function redirectThresholdLabel(value: number | null | undefined, locale: 'tr' | 'en'): string {
  const n = value === 4 ? 4 : 5;
  if (locale === 'tr') return n === 5 ? 'Yalnızca 5 yıldız' : '4 ve 5 yıldız';
  return n === 5 ? '5 stars only' : '4 and 5 stars';
}

/**
 * Review-link summary shared by the settings "Platform bağlantıları" tab,
 * the business detail strip and the platforms overview context card: the
 * review rows the overview lists (in-sector OR configured — see
 * isPlatformLinkVisible), summarised. Keeping one definition means the three
 * surfaces never show different counts for the same business.
 */
export function summarizeReviewPlatformLinks(
  row: PlatformLinkRow,
  checks: Record<string, LatestCheckLite> | null | undefined,
): PlatformLinkSummary {
  return summarizePlatformLinks(
    computePlatformLinkStatuses(row, checks, { categories: ['review'] }).filter(isPlatformLinkVisible),
  );
}

/**
 * Normalise a `GET /api/restaurants/[id]/integrations/checks` body
 * (`{ checks: { [provider]: {...} } }`) into the status helper's check map.
 * Anything malformed reads as "no checks" (= untested), never throws.
 */
export function parseLatestChecksPayload(payload: unknown): Record<string, LatestCheckLite> {
  const raw =
    payload && typeof payload === 'object' && 'checks' in payload
      ? (payload as { checks?: unknown }).checks
      : null;
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, LatestCheckLite> = {};
  for (const [provider, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const entry = value as Record<string, unknown>;
    if (typeof entry.ok !== 'boolean' || typeof entry.checkedAt !== 'string') continue;
    out[provider] = {
      ok: entry.ok,
      checkedAt: entry.checkedAt,
      error: typeof entry.error === 'string' ? entry.error : null,
      statusCode: typeof entry.statusCode === 'number' ? entry.statusCode : null,
    };
  }
  return out;
}
