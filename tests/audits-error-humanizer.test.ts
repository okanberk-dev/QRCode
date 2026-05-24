/**
 * CLAUDE.md §42 — Audit error humanizer unit tests.
 *
 * Saf doğrulama; DB / fetch yok. humanizeAuditIssue + humanizeAuditIssues
 * + parseAuditErrorResponse + isLikelyEmail kapsanır.
 *
 * Run: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  humanizeAuditIssue,
  humanizeAuditIssues,
  parseAuditErrorResponse,
  summarizeAuditError,
  isLikelyEmail,
} from '../src/lib/audits/error-humanizer';

describe('humanizeAuditIssue (TR)', () => {
  it('translates assignment email path + invalid email message', () => {
    const out = humanizeAuditIssue(
      { path: 'assignment.assigneeEmail', message: 'Invalid email' },
      'tr',
    );
    assert.match(out, /Atama: E-posta/);
    assert.match(out, /Geçerli bir e-posta girin/);
  });

  it('numeralizes question index (questions.0 → 1. Soru)', () => {
    const out = humanizeAuditIssue(
      { path: 'questions.0.options', message: 'Bu soru tipi en az 2 seçenek gerektirir' },
      'tr',
    );
    assert.match(out, /1\. Soru/);
    assert.match(out, /Seçenekler/);
    assert.match(out, /en az 2 seçenek gerektirir/);
  });

  it('handles questions.N.options.M sub-index', () => {
    const out = humanizeAuditIssue(
      { path: 'questions.2.options.1', message: 'String must contain at most 200 characters' },
      'tr',
    );
    assert.match(out, /3\. Soru/);
    assert.match(out, /Seçenekler/);
    assert.match(out, /Çok uzun/);
  });

  it('falls back to raw path when unknown', () => {
    const out = humanizeAuditIssue(
      { path: 'whatever.thing', message: 'broken' },
      'tr',
    );
    assert.match(out, /whatever\.thing/);
  });

  it('preserves Turkish messages from Zod schema', () => {
    const out = humanizeAuditIssue(
      { path: 'restaurantId', message: 'Restoran seçilmedi' },
      'tr',
    );
    assert.match(out, /Restoran seçilmedi/);
  });

  it('passing score path', () => {
    const out = humanizeAuditIssue(
      { path: 'passingScore', message: 'Geçti/Kaldı modu için geçme puanı zorunlu' },
      'tr',
    );
    assert.match(out, /Geçme puanı/);
  });
});

describe('humanizeAuditIssue (EN)', () => {
  it('translates assignment email path', () => {
    const out = humanizeAuditIssue(
      { path: 'assignment.assigneeEmail', message: 'Invalid email' },
      'en',
    );
    assert.match(out, /Assignment: Email/);
    assert.match(out, /Enter a valid email/);
  });

  it('numeralizes question index in english', () => {
    const out = humanizeAuditIssue(
      { path: 'questions.4.prompt', message: 'String must contain at least 1 character' },
      'en',
    );
    assert.match(out, /Question 5/);
    assert.match(out, /Question text/);
    assert.match(out, /Too short/);
  });
});

describe('humanizeAuditIssues', () => {
  it('maps multiple issues', () => {
    const out = humanizeAuditIssues(
      [
        { path: 'title', message: 'String must contain at least 1 character' },
        { path: 'assignment.assigneeEmail', message: 'Invalid email' },
      ],
      'tr',
    );
    assert.equal(out.length, 2);
    assert.match(out[0], /Başlık/);
    assert.match(out[1], /Atama: E-posta/);
  });
});

describe('parseAuditErrorResponse', () => {
  function fakeRes(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('parses validation_error + issues into details bullets', async () => {
    const res = fakeRes(400, {
      error: 'validation_error',
      message: 'Request body failed validation.',
      issues: [
        { path: 'title', message: 'String must contain at least 1 character' },
        { path: 'questions.0.options', message: 'Bu soru tipi en az 2 seçenek gerektirir' },
      ],
    });
    const parsed = await parseAuditErrorResponse(res, 'tr');
    assert.equal(parsed.code, 'validation_error');
    assert.equal(parsed.details.length, 2);
    assert.match(parsed.title, /Bazı alanları kontrol et/);
  });

  it('maps PUBLISHED_LOCKED code → human title', async () => {
    const res = fakeRes(400, {
      error: 'Yayındaki şablon doğrudan düzenlenemez. Önce yayından kaldır (taslağa al).',
      code: 'PUBLISHED_LOCKED',
    });
    const parsed = await parseAuditErrorResponse(res, 'tr');
    assert.equal(parsed.code, 'PUBLISHED_LOCKED');
    assert.match(parsed.title, /yayında/);
  });

  it('handles 429 with rate_limited code', async () => {
    const res = fakeRes(429, { error: 'rate_limited', retryAfter: 60 });
    const parsed = await parseAuditErrorResponse(res, 'tr');
    assert.match(parsed.title, /Çok hızlı/);
  });

  it('handles 404 generic', async () => {
    const res = fakeRes(404, { error: 'not_found' });
    const parsed = await parseAuditErrorResponse(res, 'tr');
    assert.match(parsed.title, /ulaşılamıyor/);
  });

  it('handles already_completed 409', async () => {
    const res = fakeRes(409, { error: 'already_completed', message: 'Bu denetim zaten tamamlandı.' });
    const parsed = await parseAuditErrorResponse(res, 'tr');
    assert.match(parsed.title, /zaten tamamlandı/);
  });

  it('falls back to message field', async () => {
    const res = fakeRes(500, { message: 'Internal server boom' });
    const parsed = await parseAuditErrorResponse(res, 'tr');
    assert.match(parsed.title, /Internal server boom/);
  });

  it('handles non-json body gracefully', async () => {
    const res = new Response('plain text bork', {
      status: 500,
      headers: { 'content-type': 'text/plain' },
    });
    const parsed = await parseAuditErrorResponse(res, 'tr');
    assert.match(parsed.title, /başarısız/);
  });
});

describe('summarizeAuditError', () => {
  it('returns title only when no details', () => {
    const out = summarizeAuditError({ title: 'Hata', details: [], code: null });
    assert.equal(out, 'Hata');
  });

  it('inlines single detail', () => {
    const out = summarizeAuditError({
      title: 'Bazı alanları kontrol et',
      details: ['Başlık — Zorunlu alan'],
      code: 'validation_error',
    });
    assert.match(out, /Başlık/);
  });

  it('summarizes multiple details as count', () => {
    const out = summarizeAuditError({
      title: 'Bazı alanları kontrol et',
      details: ['A', 'B', 'C'],
      code: 'validation_error',
    });
    assert.match(out, /\(3\)/);
  });
});

describe('isLikelyEmail', () => {
  it('accepts empty (caller handles required check)', () => {
    assert.equal(isLikelyEmail(''), true);
    assert.equal(isLikelyEmail('   '), true);
  });

  it('accepts plausible emails', () => {
    assert.equal(isLikelyEmail('ada@buaze.com'), true);
    assert.equal(isLikelyEmail('a.b+c@x.co.uk'), true);
  });

  it('rejects obviously broken', () => {
    assert.equal(isLikelyEmail('abc'), false);
    assert.equal(isLikelyEmail('@buaze.com'), false);
    assert.equal(isLikelyEmail('abc@'), false);
    assert.equal(isLikelyEmail('abc@buaze'), false);
  });
});
