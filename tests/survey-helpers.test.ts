import { test } from 'node:test';
import assert from 'node:assert/strict';
import { surveyResponseShortId } from '../src/lib/surveys';

// Surveys Phase 0 — only `surveyResponseShortId` lives here so far (P0-3: the
// "Yanıt no" a customer sees on the thank-you screen is the last 6 chars of
// the REAL response id). Phase 1 appends slugifyTitle / validateOptionsForWrite
// / planQuestionSync … to this file.

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('surveyResponseShortId: last 6 characters of the id, uppercased', () => {
  // A real cuid from the local DB shape: c + timestamp + counter + random.
  assert.equal(surveyResponseShortId('cmv6y2p3g000d7dbe2780altg'), '80ALTG');
  assert.equal(surveyResponseShortId('cmv4a2k9q0001xyz123'), 'XYZ123');
});

test('surveyResponseShortId: uses the random tail, not the shared head', () => {
  const a = surveyResponseShortId('cmv6y2p3g000d7dbe2780altg');
  const b = surveyResponseShortId('cmv6y2p3g000d7dbe2780bbbb');
  assert.notEqual(a, b);
});

test('surveyResponseShortId: output is ASCII-only [A-Z0-9], at most 6 chars', () => {
  const ids = [
    'cmv6y2p3g000d7dbe2780altg',
    'ckx1abcdefghijklmnopqrstu',
    'CLX9ZZZZZZ0000000000AAAAA',
    '0123456789',
  ];
  for (const id of ids) {
    const code = surveyResponseShortId(id);
    assert.match(code, /^[A-Z0-9]{1,6}$/, id);
    assert.equal(code.length, 6, id);
  }
});

test('surveyResponseShortId: non-ASCII characters are dropped, never transliterated or expanded', () => {
  // 'ß'.toUpperCase() === 'SS' would add letters; Turkish ı/İ/ş/ğ/ç/ö/ü are not ASCII.
  assert.equal(surveyResponseShortId('abcçğıöşü-ß_ŉ 12345xyz'), '345XYZ');
  assert.equal(surveyResponseShortId('xxxxxßß'), 'XXXXX');
  assert.equal(surveyResponseShortId('şğıöüç'), '');
});

test('surveyResponseShortId: locale-independent (Turkish dotted/dotless i)', () => {
  // toLocaleUpperCase('tr-TR') would turn "i" into "İ" (non-ASCII).
  assert.equal(surveyResponseShortId('qqqqqqi'), 'QQQQQI');
  assert.equal(surveyResponseShortId('ıiıiıi'), 'III');
});

test('surveyResponseShortId: separators are ignored, so formatted ids still give 6 characters', () => {
  assert.equal(surveyResponseShortId('a1b2-c3d4-e5f6'), 'D4E5F6');
  assert.equal(surveyResponseShortId('cm_v6 y2'), 'CMV6Y2');
});

test('surveyResponseShortId: short, empty or missing ids give a short/empty code, never a made-up one', () => {
  assert.equal(surveyResponseShortId('ab1'), 'AB1');
  assert.equal(surveyResponseShortId(''), '');
  assert.equal(surveyResponseShortId('   '), '');
  assert.equal(surveyResponseShortId('---'), '');
  assert.equal(surveyResponseShortId(null), '');
  assert.equal(surveyResponseShortId(undefined), '');
  assert.equal(surveyResponseShortId(12345 as unknown as string), '');
});

test('surveyResponseShortId: deterministic — same id, same code, every time', () => {
  const rnd = mulberry32(99);
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 200; i++) {
    let id = 'c';
    for (let j = 0; j < 24; j++) id += alphabet[Math.floor(rnd() * alphabet.length)];
    const first = surveyResponseShortId(id);
    assert.equal(surveyResponseShortId(id), first);
    assert.equal(first, id.slice(-6).toUpperCase());
    assert.match(first, /^[A-Z0-9]{6}$/);
  }
});
