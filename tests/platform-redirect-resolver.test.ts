import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveBestRedirectPlatform,
  type ResolveRestaurantInput,
} from '../src/lib/platform-redirect-resolver';

// Helper — varsayılan "boş" restoran (tüm URL'ler null, hepsi enabled).
// Test her case için sadece değiştirdiği field'ı override eder.
function makeRestaurant(
  overrides: Partial<ResolveRestaurantInput> = {},
): ResolveRestaurantInput {
  return {
    category: 'Restoran',
    defaultRedirectPlatform: null,
    googleReviewUrl: null,
    yemekSepetiUrl: null,
    getirYemekUrl: null,
    trendyolYemekUrl: null,
    tripAdvisorUrl: null,
    airbnbUrl: null,
    bookingUrl: null,
    yandexUrl: null,
    googleEnabled: true,
    yemekSepetiEnabled: true,
    getirEnabled: true,
    trendyolEnabled: true,
    tripAdvisorEnabled: true,
    airbnbEnabled: true,
    bookingEnabled: true,
    yandexEnabled: true,
    ...overrides,
  };
}

test('requested provider — URL var, enabled → kullan', () => {
  const restaurant = makeRestaurant({ googleReviewUrl: 'https://g.page/r/abc' });
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google',
  });
  assert.equal(result.provider, 'google');
  assert.equal(result.url, 'https://g.page/r/abc');
  assert.equal(result.reason, 'requested');
  assert.equal(result.fallback, false);
});

test('requested provider — URL yok → default fallback', () => {
  const restaurant = makeRestaurant({
    yemekSepetiUrl: 'https://www.yemeksepeti.com/restaurant/foo',
    defaultRedirectPlatform: 'yemeksepeti',
  });
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google', // Google URL yok
  });
  assert.equal(result.provider, 'yemeksepeti');
  assert.equal(result.reason, 'default');
  assert.equal(result.fallback, true);
});

test('requested provider — disabled → default fallback', () => {
  const restaurant = makeRestaurant({
    googleReviewUrl: 'https://g.page/r/abc',
    googleEnabled: false,
    yemekSepetiUrl: 'https://www.yemeksepeti.com/restaurant/foo',
    defaultRedirectPlatform: 'yemeksepeti',
  });
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google',
  });
  assert.equal(result.provider, 'yemeksepeti');
  assert.equal(result.reason, 'default');
});

test('requested + default kullanılamaz → sector priority', () => {
  // Food sektörü: google → yemeksepeti → getir → trendyol → tripadvisor → yandex
  const restaurant = makeRestaurant({
    category: 'Restoran',
    getirYemekUrl: 'https://getir.com/yemek/restaurant/foo',
  });
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google',
  });
  assert.equal(result.provider, 'getir');
  assert.equal(result.reason, 'sector_priority');
  assert.equal(result.fallback, true);
});

test('sector priority — hospitality sektörü için tripadvisor öncelikli', () => {
  // Hospitality: google → tripadvisor → booking → airbnb → yandex
  const restaurant = makeRestaurant({
    category: 'Otel',
    tripAdvisorUrl: 'https://www.tripadvisor.com/Hotel_Review-foo.html',
    bookingUrl: 'https://www.booking.com/hotel/tr/foo.html',
  });
  const result = resolveBestRedirectPlatform({ restaurant });
  assert.equal(result.provider, 'tripadvisor');
  assert.equal(result.reason, 'sector_priority');
});

test('any_active fallback — sektör whitelist dışı bir platform doluysa', () => {
  // Legal sektörü: sadece google whitelist'te. Owner tripadvisor doldurmuş.
  const restaurant = makeRestaurant({
    category: 'Hukuk Bürosu',
    tripAdvisorUrl: 'https://www.tripadvisor.com/Restaurant_Review-foo.html',
  });
  const result = resolveBestRedirectPlatform({ restaurant });
  assert.equal(result.provider, 'tripadvisor');
  assert.equal(result.reason, 'any_active');
  assert.equal(result.fallback, true);
});

test('hiçbir platform yok → no_platform', () => {
  const restaurant = makeRestaurant();
  const result = resolveBestRedirectPlatform({ restaurant });
  assert.equal(result.provider, null);
  assert.equal(result.url, null);
  assert.equal(result.reason, 'no_platform');
});

test('broken-skip — son 24 saatte fail olan provider atlanır', () => {
  const now = new Date('2026-05-01T12:00:00Z');
  const recentFail = new Date('2026-05-01T10:00:00Z'); // 2 sa önce
  const restaurant = makeRestaurant({
    googleReviewUrl: 'https://g.page/r/abc',
    yemekSepetiUrl: 'https://www.yemeksepeti.com/restaurant/foo',
    defaultRedirectPlatform: 'google',
  });
  const latestChecks = new Map([
    ['google', { ok: false, checkedAt: recentFail }],
  ]);
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google',
    latestChecks,
    now,
  });
  assert.notEqual(result.provider, 'google');
  // Sektör priority'den ikinci usable: yemeksepeti
  assert.equal(result.provider, 'yemeksepeti');
  assert.equal(result.reason, 'sector_priority');
});

test('broken-skip — 25 saat önce fail eski sayılır, kullanılır', () => {
  const now = new Date('2026-05-01T12:00:00Z');
  const oldFail = new Date('2026-04-30T10:00:00Z'); // 26 sa önce
  const restaurant = makeRestaurant({
    googleReviewUrl: 'https://g.page/r/abc',
  });
  const latestChecks = new Map([['google', { ok: false, checkedAt: oldFail }]]);
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google',
    latestChecks,
    now,
  });
  // Eski fail ignored — Google kullanılır
  assert.equal(result.provider, 'google');
  assert.equal(result.reason, 'requested');
});

test('broken-skip — son test ok ise atlanmaz', () => {
  const now = new Date('2026-05-01T12:00:00Z');
  const recentOk = new Date('2026-05-01T10:00:00Z');
  const restaurant = makeRestaurant({
    googleReviewUrl: 'https://g.page/r/abc',
  });
  const latestChecks = new Map([['google', { ok: true, checkedAt: recentOk }]]);
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google',
    latestChecks,
    now,
  });
  assert.equal(result.provider, 'google');
  assert.equal(result.reason, 'requested');
});

test('PlatformId trendyol → trendyol_go normalization', () => {
  const restaurant = makeRestaurant({
    trendyolYemekUrl: 'https://tgoapp.com/restaurant/foo',
  });
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'trendyol',
  });
  assert.equal(result.provider, 'trendyol_go');
  assert.equal(result.reason, 'requested');
});

test('unknown requested provider → null normalize, default fallback', () => {
  const restaurant = makeRestaurant({
    googleReviewUrl: 'https://g.page/r/abc',
    defaultRedirectPlatform: 'google',
  });
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'evil-spoof',
  });
  assert.equal(result.provider, 'google');
  assert.equal(result.reason, 'default');
});

test('boş latestChecks → broken skip yapılmaz', () => {
  const restaurant = makeRestaurant({
    googleReviewUrl: 'https://g.page/r/abc',
  });
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google',
    latestChecks: new Map(),
  });
  assert.equal(result.provider, 'google');
  assert.equal(result.reason, 'requested');
});

test('default same as requested — fallback flag korunur', () => {
  const restaurant = makeRestaurant({
    googleReviewUrl: 'https://g.page/r/abc',
    defaultRedirectPlatform: 'google',
  });
  const result = resolveBestRedirectPlatform({
    restaurant,
    requestedProvider: 'google',
  });
  // Requested usable → fallback false
  assert.equal(result.provider, 'google');
  assert.equal(result.fallback, false);
  assert.equal(result.reason, 'requested');
});

test('default disabled + sektör fallback', () => {
  const restaurant = makeRestaurant({
    googleReviewUrl: 'https://g.page/r/abc',
    googleEnabled: false,
    defaultRedirectPlatform: 'google',
    yemekSepetiUrl: 'https://www.yemeksepeti.com/restaurant/foo',
  });
  const result = resolveBestRedirectPlatform({ restaurant });
  // Default Google disabled → sektör 2.: yemeksepeti
  assert.equal(result.provider, 'yemeksepeti');
  assert.equal(result.reason, 'sector_priority');
});
