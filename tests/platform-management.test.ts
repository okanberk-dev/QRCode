import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getManageablePlatform,
  getManagedPlatform,
  MANAGEABLE_PLATFORM_DEFS,
  MANAGED_PLATFORM_DEFS,
} from '../src/lib/platform-management';

test('platform management: trendyol slug maps to trendyol_go provider', () => {
  const platform = getManageablePlatform('trendyol');
  assert.ok(platform);
  assert.equal(platform.provider, 'trendyol_go');
  assert.equal(platform.urlField, 'trendyolYemekUrl');
  assert.equal(platform.enabledField, 'trendyolEnabled');
});

test('platform management: google fields map to restaurant API fields', () => {
  const platform = getManageablePlatform('google');
  assert.ok(platform);
  assert.equal(platform.provider, 'google');
  assert.equal(platform.urlField, 'googleReviewUrl');
  assert.equal(platform.enabledField, 'googleEnabled');
});

test('platform management: webhook is visible but not directly manageable', () => {
  const webhook = getManagedPlatform('webhook');
  assert.ok(webhook);
  assert.equal(webhook.comingSoon, true);
  assert.equal(getManageablePlatform('webhook'), null);
  assert.equal(MANAGEABLE_PLATFORM_DEFS.some((platform) => platform.slug === 'webhook'), false);
});

test('platform management: every manageable provider has a URL field', () => {
  assert.equal(MANAGEABLE_PLATFORM_DEFS.length > 0, true);
  for (const platform of MANAGEABLE_PLATFORM_DEFS) {
    assert.equal(typeof platform.urlField, 'string');
    assert.equal(platform.comingSoon, undefined);
  }
});

test('platform management: visible definitions include manageable plus planned platforms', () => {
  assert.equal(
    MANAGED_PLATFORM_DEFS.length,
    MANAGEABLE_PLATFORM_DEFS.length + 1,
  );
});
