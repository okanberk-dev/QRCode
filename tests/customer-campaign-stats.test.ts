/**
 * CLAUDE.md §38.99 — Customer campaign stats helper unit tests.
 *
 * Pure compute helper'lar: aggregateLogStats / campaignStatusBadge /
 * campaignStatusLabel / logStatusBadge / logStatusLabel.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateLogStats,
  campaignStatusBadge,
  campaignStatusLabel,
  logStatusBadge,
  logStatusLabel,
} from '../src/lib/customer-campaign-stats';

test('aggregateLogStats: empty logs returns zero deliveryRate', () => {
  const result = aggregateLogStats([]);
  assert.equal(result.total, 0);
  assert.equal(result.sent, 0);
  assert.equal(result.failed, 0);
  assert.equal(result.unsubscribed, 0);
  assert.equal(result.pending, 0);
  assert.equal(result.deliveryRate, 0);
});

test('aggregateLogStats: all sent → 100% delivery rate', () => {
  const logs = [{ status: 'sent' }, { status: 'sent' }, { status: 'sent' }];
  const result = aggregateLogStats(logs);
  assert.equal(result.sent, 3);
  assert.equal(result.deliveryRate, 100);
});

test('aggregateLogStats: unsubscribed excluded from denominator', () => {
  const logs = [
    { status: 'sent' },
    { status: 'sent' },
    { status: 'unsubscribed' },
    { status: 'unsubscribed' },
  ];
  const result = aggregateLogStats(logs);
  // 2 sent / (4 - 2 unsubscribed) = 2/2 = 100%
  assert.equal(result.deliveryRate, 100);
  assert.equal(result.unsubscribed, 2);
});

test('aggregateLogStats: failed mixed with sent', () => {
  const logs = [
    { status: 'sent' },
    { status: 'sent' },
    { status: 'failed' },
    { status: 'failed' },
  ];
  const result = aggregateLogStats(logs);
  // 2 sent / 4 eligible = 50%
  assert.equal(result.sent, 2);
  assert.equal(result.failed, 2);
  assert.equal(result.deliveryRate, 50);
});

test('aggregateLogStats: pending bucket for unknown status', () => {
  const logs = [{ status: 'queued' }, { status: 'whatever' }];
  const result = aggregateLogStats(logs);
  assert.equal(result.pending, 2);
  assert.equal(result.deliveryRate, 0);
});

test('aggregateLogStats: recipientCount override (logs paginated)', () => {
  const logs = [{ status: 'sent' }];
  const result = aggregateLogStats(logs, 100);
  // 1 sent / 100 recipientCount = 1%
  assert.equal(result.total, 100);
  assert.equal(result.deliveryRate, 1);
});

test('aggregateLogStats: all unsubscribed → 0% (no eligible audience)', () => {
  const logs = [{ status: 'unsubscribed' }, { status: 'unsubscribed' }];
  const result = aggregateLogStats(logs);
  assert.equal(result.unsubscribed, 2);
  assert.equal(result.deliveryRate, 0);
});

test('campaignStatusBadge: status enum mapping', () => {
  assert.equal(campaignStatusBadge('sent'), 'ok');
  assert.equal(campaignStatusBadge('sending'), 'info');
  assert.equal(campaignStatusBadge('failed'), 'danger');
  assert.equal(campaignStatusBadge('draft'), 'ghost');
  assert.equal(campaignStatusBadge('unknown'), 'ghost'); // defensive default
});

test('campaignStatusLabel: TR/EN parity', () => {
  assert.equal(campaignStatusLabel('draft', 'tr'), 'Taslak');
  assert.equal(campaignStatusLabel('draft', 'en'), 'Draft');
  assert.equal(campaignStatusLabel('sending', 'tr'), 'Gönderiliyor');
  assert.equal(campaignStatusLabel('sending', 'en'), 'Sending');
  assert.equal(campaignStatusLabel('sent', 'tr'), 'Gönderildi');
  assert.equal(campaignStatusLabel('failed', 'en'), 'Failed');
});

test('campaignStatusLabel: unknown status returns raw key', () => {
  assert.equal(campaignStatusLabel('xyz'), 'xyz');
});

test('logStatusBadge: maps to Pulse Badge kind', () => {
  assert.equal(logStatusBadge('sent'), 'ok');
  assert.equal(logStatusBadge('failed'), 'danger');
  assert.equal(logStatusBadge('unsubscribed'), 'warn');
  assert.equal(logStatusBadge('pending'), 'ghost');
});

test('logStatusLabel: TR/EN parity', () => {
  assert.equal(logStatusLabel('sent', 'tr'), 'Teslim edildi');
  assert.equal(logStatusLabel('sent', 'en'), 'Delivered');
  assert.equal(logStatusLabel('unsubscribed', 'tr'), 'Pazarlama onayı yok');
  assert.equal(logStatusLabel('unsubscribed', 'en'), 'No marketing consent');
});
