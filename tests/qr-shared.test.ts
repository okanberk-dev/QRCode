import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QR_PLATFORM_LABELS,
  buildQrImageUrl,
  qrPlatformFilterOptions,
  safeQrFileName,
} from '../src/components/panel/qr/qr-shared';

test('qr labels cover all ten review platforms', () => {
  for (const p of ['google', 'yemeksepeti', 'getir', 'trendyol_go', 'tripadvisor', 'airbnb', 'booking', 'yandex', 'yelp', 'foursquare']) {
    assert.ok(QR_PLATFORM_LABELS[p], p);
  }
});

test('qr file name keeps dotless i and strips the rest', () => {
  assert.equal(safeQrFileName('Kadıköy · Masa 4'), 'Kadikoy-Masa-4');
  assert.equal(safeQrFileName('***'), 'qr');
});

test('qr platform filter is built from the codes that exist', () => {
  const options = qrPlatformFilterOptions(['yelp', null, 'google', 'google'], { all: 'All', general: 'Default' });
  assert.deepEqual(
    options.map((o) => o.value),
    ['all', 'general', 'google', 'yelp'],
  );
  assert.deepEqual(
    qrPlatformFilterOptions(['google'], { all: 'All', general: 'Default' }).map((o) => o.value),
    ['all', 'google'],
  );
});

test('qr image url carries table, platform, colours and plain style', () => {
  const url = buildQrImageUrl(
    { restaurantId: 'r1', tableNumber: 'A1', platform: 'google', darkColor: '#000000', lightColor: '#FFFFFF' },
    { format: 'png', width: 1080, style: 'plain' },
  );
  assert.equal(
    url,
    '/api/restaurants/r1/qr?format=png&table=A1&platform=google&dark=%23000000&light=%23FFFFFF&width=1080&style=plain',
  );
});
