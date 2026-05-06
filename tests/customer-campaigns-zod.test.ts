/**
 * CLAUDE.md §38.99 — Customer campaigns endpoint Zod schema tests.
 *
 * Mass assignment guard (.strict()) + field bounds + literal enforcement.
 * Schemas backend route'larında inline tanımlı (test'te yeniden export
 * etmek yerine pattern parity'sini doğrularız).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

// Mirror schemas from /api/customer-campaigns/* (must stay in sync).

const ListQuerySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  status: z.enum(['draft', 'sending', 'sent', 'failed']).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1).optional(),
});

const CreateBodySchema = z
  .object({
    restaurantId: z.string().min(1),
    subject: z.string().min(1).max(150),
    body: z.string().min(1).max(10000),
    locale: z.enum(['tr', 'en']).default('tr').optional(),
  })
  .strict();

const SendBodySchema = z
  .object({
    onlyMarketingConsent: z.literal(true),
  })
  .strict();

const PreviewSchema = z
  .object({
    restaurantId: z.string().min(1),
    onlyMarketingConsent: z.literal(true),
  })
  .strict();

// --- ListQuerySchema ---

test('list query: empty input passes (defaults)', () => {
  const r = ListQuerySchema.safeParse({});
  assert.equal(r.success, true);
});

test('list query: invalid status enum fails', () => {
  const r = ListQuerySchema.safeParse({ status: 'archived' });
  assert.equal(r.success, false);
});

test('list query: page coerces string to number', () => {
  const r = ListQuerySchema.safeParse({ page: '3' });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.page, 3);
});

test('list query: page negative rejects', () => {
  const r = ListQuerySchema.safeParse({ page: '-1' });
  assert.equal(r.success, false);
});

// --- CreateBodySchema ---

test('create body: valid payload passes', () => {
  const r = CreateBodySchema.safeParse({
    restaurantId: 'rest1',
    subject: 'Yeni menümüz',
    body: 'Merhaba, yeni menümüzü deneyebilirsin.',
  });
  assert.equal(r.success, true);
});

test('create body: subject too short fails', () => {
  const r = CreateBodySchema.safeParse({
    restaurantId: 'rest1',
    subject: '',
    body: 'body',
  });
  assert.equal(r.success, false);
});

test('create body: subject 151 chars fails', () => {
  const r = CreateBodySchema.safeParse({
    restaurantId: 'rest1',
    subject: 'x'.repeat(151),
    body: 'body',
  });
  assert.equal(r.success, false);
});

test('create body: body 10001 chars fails', () => {
  const r = CreateBodySchema.safeParse({
    restaurantId: 'rest1',
    subject: 'Subject',
    body: 'x'.repeat(10001),
  });
  assert.equal(r.success, false);
});

test('create body: invalid locale enum fails', () => {
  const r = CreateBodySchema.safeParse({
    restaurantId: 'rest1',
    subject: 'Subject',
    body: 'body',
    locale: 'fr',
  });
  assert.equal(r.success, false);
});

test('create body: mass assignment extra field fails (.strict)', () => {
  const r = CreateBodySchema.safeParse({
    restaurantId: 'rest1',
    subject: 'Subject',
    body: 'body',
    bypassConsent: true, // unknown field
  });
  assert.equal(r.success, false);
});

// --- SendBodySchema ---

test('send body: literal true passes', () => {
  const r = SendBodySchema.safeParse({ onlyMarketingConsent: true });
  assert.equal(r.success, true);
});

test('send body: false rejects', () => {
  const r = SendBodySchema.safeParse({ onlyMarketingConsent: false });
  assert.equal(r.success, false);
});

test('send body: missing field rejects', () => {
  const r = SendBodySchema.safeParse({});
  assert.equal(r.success, false);
});

test('send body: extra field rejects (.strict)', () => {
  const r = SendBodySchema.safeParse({
    onlyMarketingConsent: true,
    skipConsent: true,
  });
  assert.equal(r.success, false);
});

// --- PreviewSchema ---

test('preview body: valid payload passes', () => {
  const r = PreviewSchema.safeParse({
    restaurantId: 'rest1',
    onlyMarketingConsent: true,
  });
  assert.equal(r.success, true);
});

test('preview body: missing restaurantId rejects', () => {
  const r = PreviewSchema.safeParse({ onlyMarketingConsent: true });
  assert.equal(r.success, false);
});

test('preview body: extra field rejects (.strict)', () => {
  const r = PreviewSchema.safeParse({
    restaurantId: 'rest1',
    onlyMarketingConsent: true,
    segments: ['vip'], // future field, MVP rejects
  });
  assert.equal(r.success, false);
});
