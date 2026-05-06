/**
 * CLAUDE.md §38.99 — Customer campaign recipients helper unit tests.
 *
 * Pure function `dedupeAndShape` test'leri (Prisma'sız) + `maskEmail` PII
 * redaction + `deriveContactKey` Buaze §4.5 dedupe paterni. resolveSegmentRecipients
 * Prisma-bağımlı olduğu için integration test'te kapsanır; bu suite saf
 * helper'lara odaklanır.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dedupeAndShape,
  deriveContactKey,
  maskEmail,
} from '../src/lib/customer-campaign-recipients';

test('maskEmail: standard email masked', () => {
  assert.equal(maskEmail('ahmet@gmail.com'), 'a***@gmail.com');
});

test('maskEmail: short local part', () => {
  assert.equal(maskEmail('x@y.co'), 'x***@y.co');
});

test('maskEmail: empty fallback', () => {
  assert.equal(maskEmail(''), '');
});

test('maskEmail: no @ graceful fallback', () => {
  assert.equal(maskEmail('abcd'), 'a***');
});

test('deriveContactKey: email lowercased', () => {
  assert.equal(deriveContactKey({ email: 'AHMET@gmail.com', phone: null }), 'ahmet@gmail.com');
});

test('deriveContactKey: phone fallback when email null', () => {
  assert.equal(deriveContactKey({ email: null, phone: '+905551234567' }), '+905551234567');
});

test('deriveContactKey: anonim feedback returns null', () => {
  assert.equal(deriveContactKey({ email: null, phone: null }), null);
});

test('dedupeAndShape: filters non-marketing-consent rows', () => {
  const rows = [
    { email: 'a@x.com', phone: null, name: null, hasMarketingConsent: false, hasKvkkConsent: true },
    { email: 'b@x.com', phone: null, name: null, hasMarketingConsent: true, hasKvkkConsent: true },
  ];
  const result = dedupeAndShape(rows, 'rest1');
  assert.equal(result.length, 1);
  assert.equal(result[0].email, 'b@x.com');
});

test('dedupeAndShape: filters non-KVKK-consent rows (belt-and-suspenders)', () => {
  const rows = [
    { email: 'a@x.com', phone: null, name: null, hasMarketingConsent: true, hasKvkkConsent: false },
    { email: 'b@x.com', phone: null, name: null, hasMarketingConsent: true, hasKvkkConsent: true },
  ];
  const result = dedupeAndShape(rows, 'rest1');
  assert.equal(result.length, 1);
  assert.equal(result[0].email, 'b@x.com');
});

test('dedupeAndShape: filters rows without email', () => {
  const rows = [
    { email: null, phone: '+905', name: null, hasMarketingConsent: true, hasKvkkConsent: true },
    { email: 'b@x.com', phone: null, name: null, hasMarketingConsent: true, hasKvkkConsent: true },
  ];
  const result = dedupeAndShape(rows, 'rest1');
  assert.equal(result.length, 1);
  assert.equal(result[0].email, 'b@x.com');
});

test('dedupeAndShape: dedupe by lower(email) — first wins', () => {
  const rows = [
    {
      email: 'AHMET@gmail.com',
      phone: null,
      name: null,
      hasMarketingConsent: true,
      hasKvkkConsent: true,
    },
    {
      email: 'ahmet@gmail.com',
      phone: null,
      name: null,
      hasMarketingConsent: true,
      hasKvkkConsent: true,
    },
  ];
  const result = dedupeAndShape(rows, 'rest1');
  assert.equal(result.length, 1);
  // First row (most recent per caller orderBy desc) wins; email preserved as-is.
  assert.equal(result[0].email, 'AHMET@gmail.com');
  assert.equal(result[0].contactKey, 'ahmet@gmail.com');
});

test('dedupeAndShape: cross-restaurant key includes restaurantId prefix', () => {
  const rows = [
    {
      email: 'a@x.com',
      phone: null,
      name: null,
      hasMarketingConsent: true,
      hasKvkkConsent: true,
    },
  ];
  const result = dedupeAndShape(rows, 'rest-XYZ');
  assert.equal(result[0].key, 'rest-XYZ|a@x.com');
  assert.equal(result[0].restaurantId, 'rest-XYZ');
});

test('dedupeAndShape: empty input returns empty list', () => {
  assert.deepEqual(dedupeAndShape([], 'rest1'), []);
});

test('dedupeAndShape: hasMarketingConsent always true on output', () => {
  const rows = [
    {
      email: 'a@x.com',
      phone: null,
      name: null,
      hasMarketingConsent: true,
      hasKvkkConsent: true,
    },
  ];
  const result = dedupeAndShape(rows, 'rest1');
  assert.equal(result[0].hasMarketingConsent, true);
});
