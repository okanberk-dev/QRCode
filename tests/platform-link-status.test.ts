import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePlatformLinkStatuses,
  countTestableLinks,
  defaultPickerPlatformIds,
  describePlatformLinkStatus,
  formatRelativeTime,
  isPlatformLinkVisible,
  redirectThresholdLabel,
  sortPlatformLinkStatuses,
  summarizePlatformLinks,
  type LatestCheckLite,
  type PlatformLinkRow,
  type PlatformLinkStatus,
} from '../src/lib/platform-link-status';
import { getManageablePlatformByProvider, PLATFORM_LINKS_LABEL } from '../src/lib/platform-management';

const NOW = Date.parse('2026-10-11T12:00:00.000Z');

function row(overrides: Partial<PlatformLinkRow> = {}): PlatformLinkRow {
  return {
    category: 'Restoran',
    externalPlatformsEnabled: true,
    defaultRedirectPlatform: null,
    googleReviewUrl: null,
    googleEnabled: true,
    yemekSepetiUrl: null,
    yemekSepetiEnabled: true,
    getirYemekUrl: null,
    getirEnabled: true,
    trendyolYemekUrl: null,
    trendyolEnabled: true,
    tripAdvisorUrl: null,
    tripAdvisorEnabled: true,
    airbnbUrl: null,
    airbnbEnabled: true,
    bookingUrl: null,
    bookingEnabled: true,
    yandexUrl: null,
    yandexEnabled: true,
    yelpUrl: null,
    yelpEnabled: true,
    foursquareUrl: null,
    foursquareEnabled: true,
    instagramUrl: null,
    facebookUrl: null,
    whatsappUrl: null,
    ...overrides,
  };
}

function find(list: PlatformLinkStatus[], provider: string): PlatformLinkStatus {
  const status = list.find((item) => item.platform.provider === provider);
  assert.ok(status, `status for ${provider}`);
  return status;
}

const okCheck = (minutesAgo = 5): LatestCheckLite => ({
  ok: true,
  checkedAt: new Date(NOW - minutesAgo * 60_000).toISOString(),
  error: null,
  statusCode: 200,
});

const failCheck = (error = 'HTTP 503'): LatestCheckLite => ({
  ok: false,
  checkedAt: new Date(NOW - 2 * 3_600_000).toISOString(),
  error,
  statusCode: 503,
});

const GOOGLE_URL = 'https://search.google.com/local/writereview?placeid=ChIJ123';
const YS_URL = 'https://www.yemeksepeti.com/restaurant/abcd/mamas-burger';

test('platform-link-status: missing when the URL is empty or whitespace', () => {
  const list = computePlatformLinkStatuses(row({ googleReviewUrl: '   ' }), {});
  const google = find(list, 'google');
  assert.equal(google.state, 'missing');
  assert.equal(google.reason, 'no_url');
  assert.equal(google.url, null);
});

test('platform-link-status: connected + untested when URL is valid and never checked', () => {
  const list = computePlatformLinkStatuses(row({ googleReviewUrl: GOOGLE_URL }), {});
  const google = find(list, 'google');
  assert.equal(google.state, 'connected');
  assert.equal(google.reason, 'untested');
  assert.equal(
    describePlatformLinkStatus(google, 'tr', NOW),
    'Link kayıtlı · henüz kontrol edilmedi',
  );
});

test('platform-link-status: connected + tested_ok when the latest check passed', () => {
  const list = computePlatformLinkStatuses(row({ googleReviewUrl: GOOGLE_URL }), { google: okCheck(5) });
  const google = find(list, 'google');
  assert.equal(google.state, 'connected');
  assert.equal(google.reason, 'tested_ok');
  assert.equal(describePlatformLinkStatus(google, 'tr', NOW), 'Link çalışıyor · son kontrol 5 dk önce');
  assert.equal(describePlatformLinkStatus(google, 'en', NOW), 'Link works · checked 5 min ago');
});

test('platform-link-status: issue + test_failed when the latest check failed', () => {
  const list = computePlatformLinkStatuses(row({ yemekSepetiUrl: YS_URL }), { yemeksepeti: failCheck() });
  const ys = find(list, 'yemeksepeti');
  assert.equal(ys.state, 'issue');
  assert.equal(ys.reason, 'test_failed');
  assert.equal(describePlatformLinkStatus(ys, 'tr', NOW), 'Son kontrol başarısız (2 sa önce): HTTP 503');
});

test('platform-link-status: off when the owner switched a saved link off', () => {
  const list = computePlatformLinkStatuses(row({ yemekSepetiUrl: YS_URL, yemekSepetiEnabled: false }), {});
  const ys = find(list, 'yemeksepeti');
  assert.equal(ys.state, 'off');
  assert.equal(ys.reason, 'owner_off');
});

test('platform-link-status: wrong domain is an issue with url_error', () => {
  const list = computePlatformLinkStatuses(row({ yemekSepetiUrl: 'https://example.com/foo' }), {});
  const ys = find(list, 'yemeksepeti');
  assert.equal(ys.state, 'issue');
  assert.equal(ys.reason, 'url_error');
  assert.ok(ys.urlCheck);
  assert.match(describePlatformLinkStatus(ys, 'tr', NOW), /Yemeksepeti/);
});

test('platform-link-status: a homepage URL is an issue with url_warning (save stays allowed elsewhere)', () => {
  const list = computePlatformLinkStatuses(row({ yemekSepetiUrl: 'https://www.yemeksepeti.com/' }), {});
  const ys = find(list, 'yemeksepeti');
  assert.equal(ys.state, 'issue');
  assert.equal(ys.reason, 'url_warning');
  assert.equal(ys.urlCheck?.severity, 'warning');
});

test('platform-link-status: admin gate locks external review platforms but not Google or social', () => {
  const list = computePlatformLinkStatuses(
    row({
      externalPlatformsEnabled: false,
      googleReviewUrl: GOOGLE_URL,
      yemekSepetiUrl: YS_URL,
      instagramUrl: 'https://instagram.com/mamas',
    }),
    { yemeksepeti: okCheck() },
  );
  const ys = find(list, 'yemeksepeti');
  assert.equal(ys.state, 'locked');
  assert.equal(ys.reason, 'admin_off');
  // URL kept untouched.
  assert.equal(ys.url, YS_URL);
  // Locked even without a URL.
  assert.equal(find(list, 'getir').state, 'locked');
  assert.equal(find(list, 'google').state, 'connected');
  assert.equal(find(list, 'instagram').state, 'connected');
  const summary = summarizePlatformLinks(list.filter((s) => s.platform.category === 'review'));
  // Locked rows count as "off", never as connected.
  assert.equal(summary.connected, 1);
  assert.equal(summary.off >= 1, true);
});

test('platform-link-status: out-of-sector review platform with a URL stays visible', () => {
  // Hotel sector does not include Yemeksepeti, but a saved link is still live
  // through the public resolver's any_active tier.
  const list = computePlatformLinkStatuses(row({ category: 'Otel', yemekSepetiUrl: YS_URL }), {});
  const ys = find(list, 'yemeksepeti');
  assert.equal(ys.inSector, false);
  assert.equal(ys.state, 'connected');
  assert.equal(isPlatformLinkVisible(ys), true);
  // Out-of-sector without a URL goes to the disclosure.
  const getir = find(list, 'getir');
  assert.equal(getir.inSector, false);
  assert.equal(isPlatformLinkVisible(getir), false);
  assert.equal(describePlatformLinkStatus(getir, 'tr', NOW), 'Sektörünüz için önerilmiyor.');
  // In-sector without a URL stays in the main list.
  const booking = find(list, 'booking');
  assert.equal(booking.inSector, true);
  assert.equal(isPlatformLinkVisible(booking), true);
});

test('platform-link-status: locked out-of-sector row with a URL is shown as off, not connected', () => {
  const list = computePlatformLinkStatuses(
    row({ category: 'Otel', externalPlatformsEnabled: false, yemekSepetiUrl: YS_URL }),
    {},
  );
  const ys = find(list, 'yemeksepeti');
  assert.equal(ys.state, 'locked');
  assert.equal(isPlatformLinkVisible(ys), true);
  assert.equal(summarizePlatformLinks([ys]).connected, 0);
  assert.equal(summarizePlatformLinks([ys]).off, 1);
});

test('platform-link-status: social and message channels are always in sector and have no off state', () => {
  const list = computePlatformLinkStatuses(row({ category: 'Hukuk' }), {}, { categories: ['social', 'message'] });
  assert.deepEqual(
    list.map((s) => s.platform.provider),
    ['instagram', 'facebook', 'whatsapp'],
  );
  for (const status of list) {
    assert.equal(status.inSector, true);
    assert.equal(status.state, 'missing');
    assert.equal(isPlatformLinkVisible(status), true);
  }
});

test('platform-link-status: webhook (coming soon) is never part of the owner list', () => {
  const list = computePlatformLinkStatuses(row(), {});
  assert.equal(list.some((s) => s.platform.slug === 'webhook'), false);
});

test('platform-link-status: isDefault follows defaultRedirectPlatform (trendyol_go provider id)', () => {
  const list = computePlatformLinkStatuses(
    row({ defaultRedirectPlatform: 'trendyol_go', trendyolYemekUrl: 'https://tgoapp.com/restaurant/abc' }),
    {},
  );
  assert.equal(find(list, 'trendyol_go').isDefault, true);
  assert.equal(find(list, 'google').isDefault, false);
});

test('platform-link-status: summary counts and testable links', () => {
  const list = computePlatformLinkStatuses(
    row({ googleReviewUrl: GOOGLE_URL, yemekSepetiUrl: YS_URL, getirYemekUrl: 'https://getir.com/yemek/restaurant/x', getirEnabled: false }),
    { yemeksepeti: failCheck() },
    { categories: ['review'] },
  );
  const visible = list.filter(isPlatformLinkVisible);
  const summary = summarizePlatformLinks(visible);
  assert.equal(summary.connected, 1); // google
  assert.equal(summary.issue, 1); // yemeksepeti failed check
  assert.equal(summary.off, 1); // getir switched off
  assert.equal(summary.missing, visible.length - 3);
  assert.equal(countTestableLinks(list), 2);
});

test('platform-link-status: sort puts issues first, then connected, then missing, then off', () => {
  const list = computePlatformLinkStatuses(
    row({
      googleReviewUrl: GOOGLE_URL,
      yemekSepetiUrl: YS_URL,
      tripAdvisorUrl: 'https://www.tripadvisor.com/Restaurant_Review-g1-d2',
      tripAdvisorEnabled: false,
    }),
    { yemeksepeti: failCheck() },
    { categories: ['review'] },
  ).filter(isPlatformLinkVisible);
  const sorted = sortPlatformLinkStatuses(list, 'Restoran');
  assert.equal(sorted[0].platform.provider, 'yemeksepeti');
  assert.equal(sorted[1].platform.provider, 'google');
  assert.equal(sorted[sorted.length - 1].platform.provider, 'tripadvisor');
  // Missing rows follow the food sector priority: getir before trendyol.
  const missing = sorted.filter((s) => s.state === 'missing').map((s) => s.platform.provider);
  assert.ok(missing.indexOf('getir') < missing.indexOf('trendyol_go'));
});

test('platform-link-status: default picker ids keep an out-of-sector stored default visible', () => {
  const ids = defaultPickerPlatformIds(
    row({
      category: 'Klinik',
      defaultRedirectPlatform: 'tripadvisor',
      googleReviewUrl: GOOGLE_URL,
      tripAdvisorUrl: 'https://www.tripadvisor.com/Restaurant_Review-g1-d2',
      yemekSepetiUrl: YS_URL,
    }),
  );
  assert.deepEqual(ids, ['google', 'tripadvisor']);
});

test('platform-link-status: default picker ids drop gated and switched-off platforms', () => {
  const ids = defaultPickerPlatformIds(
    row({
      externalPlatformsEnabled: false,
      googleReviewUrl: GOOGLE_URL,
      yemekSepetiUrl: YS_URL,
    }),
  );
  assert.deepEqual(ids, ['google']);
  const offIds = defaultPickerPlatformIds(row({ googleReviewUrl: GOOGLE_URL, googleEnabled: false }));
  assert.deepEqual(offIds, []);
});

test('platform-link-status: relative time + threshold labels', () => {
  assert.equal(formatRelativeTime(new Date(NOW - 30_000).toISOString(), 'tr', NOW), 'az önce');
  assert.equal(formatRelativeTime(new Date(NOW - 3 * 86_400_000).toISOString(), 'en', NOW), '3d ago');
  assert.equal(formatRelativeTime('not-a-date', 'tr', NOW), 'az önce');
  assert.equal(redirectThresholdLabel(4, 'tr'), '4 ve 5 yıldız');
  assert.equal(redirectThresholdLabel(null, 'tr'), 'Yalnızca 5 yıldız');
  assert.equal(redirectThresholdLabel(5, 'en'), '5 stars only');
});

test('platform-management: provider lookup + canonical label', () => {
  assert.equal(getManageablePlatformByProvider('trendyol_go')?.slug, 'trendyol');
  assert.equal(getManageablePlatformByProvider('other'), null);
  assert.equal(getManageablePlatformByProvider(null), null);
  assert.equal(PLATFORM_LINKS_LABEL.tr.toLocaleUpperCase('tr-TR'), 'PLATFORM BAĞLANTILARI');
});

test('localizeCheckError shows a stored check message in the viewer language', async () => {
  const { localizeCheckError } = await import('../src/lib/platform-link-messages');
  assert.equal(localizeCheckError('Erişilemedi.', 'en'), 'Unreachable.');
  assert.equal(localizeCheckError('Unreachable.', 'tr'), 'Erişilemedi.');
  assert.equal(localizeCheckError('5 saniyede yanıt alınamadı.', 'en'), 'No response within 5 seconds.');
  assert.equal(localizeCheckError('Some custom provider text', 'en'), 'Some custom provider text');
});
