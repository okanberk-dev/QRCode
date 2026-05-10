import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCreateBusinessPlatformIds,
  isValidBusinessSlug,
} from '../src/lib/create-business-wizard';

test('isValidBusinessSlug accepts canonical lowercase slugs', () => {
  assert.equal(isValidBusinessSlug('maya-klinik'), true);
  assert.equal(isValidBusinessSlug('restoran-42'), true);
});

test('isValidBusinessSlug rejects empty, uppercase, and repeated separators', () => {
  assert.equal(isValidBusinessSlug(''), false);
  assert.equal(isValidBusinessSlug('Maya'), false);
  assert.equal(isValidBusinessSlug('maya--klinik'), false);
  assert.equal(isValidBusinessSlug('-maya'), false);
});

test('getCreateBusinessPlatformIds hides food delivery platforms for clinics', () => {
  const clinicPlatforms = getCreateBusinessPlatformIds('Klinik');
  assert.deepEqual(clinicPlatforms, ['google', 'yandex']);
});

test('getCreateBusinessPlatformIds keeps food delivery platforms for restaurants', () => {
  const restaurantPlatforms = getCreateBusinessPlatformIds('Restoran');
  assert.equal(restaurantPlatforms.includes('google'), true);
  assert.equal(restaurantPlatforms.includes('getir'), true);
  assert.equal(restaurantPlatforms.includes('yemeksepeti'), true);
  assert.equal(restaurantPlatforms.includes('trendyol'), true);
});

