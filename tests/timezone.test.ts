import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DISPLAY_TIME_ZONE,
  formatClock,
  formatCompactStampInTimeZone,
  formatFullDateTimeInTimeZone,
  formatStampInTimeZone,
  isSameDayInTimeZone,
  resolveDisplayTimeZone,
} from '../src/lib/timezone';

// Vercel serverless process TZ'si UTC. Bu testler damganın çalıştığı
// ortamın TZ'sine kaymadığını sabitler — asıl regresyon buydu.

test('default time zone is the business local zone', () => {
  assert.equal(DEFAULT_DISPLAY_TIME_ZONE, 'Europe/Istanbul');
  assert.equal(resolveDisplayTimeZone(), 'Europe/Istanbul');
});

test('resolveDisplayTimeZone honours a valid preference', () => {
  assert.equal(resolveDisplayTimeZone('Europe/London'), 'Europe/London');
});

test('resolveDisplayTimeZone falls back on invalid input', () => {
  assert.equal(resolveDisplayTimeZone('Not/AZone'), 'Europe/Istanbul');
  assert.equal(resolveDisplayTimeZone(''), 'Europe/Istanbul');
  assert.equal(resolveDisplayTimeZone(null), 'Europe/Istanbul');
});

test('formatClock renders the business-local hour, not UTC', () => {
  // 11:32 UTC = 14:32 in Istanbul (UTC+3, no DST since 2016).
  assert.equal(formatClock('2026-09-01T11:32:00.000Z', 'tr'), '14:32');
});

test('formatClock respects an explicit zone', () => {
  assert.equal(formatClock('2026-09-01T11:32:00.000Z', 'tr', 'UTC'), '11:32');
});

test('full date-time stamp uses the business zone', () => {
  const out = formatFullDateTimeInTimeZone('2026-09-01T11:32:00.000Z', 'tr');
  assert.match(out, /1 Eylül 2026/);
  assert.match(out, /14:32/);
});

test('compact mail stamp uses the business zone', () => {
  const out = formatCompactStampInTimeZone('2026-09-01T11:32:00.000Z', 'tr');
  assert.match(out, /14:32/);
  // Gün/ay ayırıcısı ICU sürümüne göre "." ya da "/" olabilir — sabitlemiyoruz.
  assert.match(out, /01[./]09/);
});

test('same-day comparison uses the business zone boundary', () => {
  // 22:30 UTC on Sep 1 is already 01:30 on Sep 2 in Istanbul.
  const late = '2026-09-01T22:30:00.000Z';
  const nextMorning = '2026-09-02T05:00:00.000Z';
  assert.equal(isSameDayInTimeZone(late, nextMorning), true);
  assert.equal(isSameDayInTimeZone(late, nextMorning, 'UTC'), false);
});

test('stamp of an older date includes the day and the clock', () => {
  const out = formatStampInTimeZone('2020-01-15T09:05:00.000Z', 'tr');
  assert.match(out, /2020/);
  assert.match(out, /12:05/); // UTC+3
});

test('invalid input degrades to an empty string, never throws', () => {
  assert.equal(formatClock('not-a-date', 'tr'), '');
  assert.equal(formatStampInTimeZone('', 'tr'), '');
  assert.equal(formatFullDateTimeInTimeZone('nope', 'en'), '');
  assert.equal(isSameDayInTimeZone('nope', new Date()), false);
});
