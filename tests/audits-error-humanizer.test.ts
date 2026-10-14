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

// ─── Spec §6.3 / §6.8 — new codes ───────────────────────────────────────

describe('parseAuditErrorResponse — live edit codes (spec §6.3)', () => {
  function fakeRes(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('QUESTION_LOCKED → human message + "N. madde" detail (TR)', async () => {
    const res = fakeRes(400, {
      error: 'Bu maddeye yanıt verilmiş.',
      code: 'QUESTION_LOCKED',
      details: { itemNumber: 3, fields: ['options'] },
    });
    const parsed = await parseAuditErrorResponse(res, 'tr');
    assert.equal(parsed.code, 'QUESTION_LOCKED');
    assert.match(parsed.title, /yanıt verilmiş/);
    assert.match(parsed.title, /kopyala/);
    assert.deepEqual(parsed.details, ['3. madde']);
    assert.match(summarizeAuditError(parsed), /3\. madde/);
  });

  it('QUESTION_LOCKED (EN) names the item as "Item N"', async () => {
    const res = fakeRes(400, { code: 'QUESTION_LOCKED', details: { itemNumber: 2 } });
    const parsed = await parseAuditErrorResponse(res, 'en');
    assert.match(parsed.title, /already has answers/);
    assert.deepEqual(parsed.details, ['Item 2']);
  });

  it('QUESTION_HAS_ANSWERS / DUPLICATE_QUESTION_ID carry the item number too', async () => {
    const has = await parseAuditErrorResponse(
      fakeRes(400, { code: 'QUESTION_HAS_ANSWERS', details: { itemNumber: 5 } }),
      'tr',
    );
    assert.match(has.title, /silinemez/);
    assert.deepEqual(has.details, ['5. madde']);

    const dup = await parseAuditErrorResponse(
      fakeRes(400, { code: 'DUPLICATE_QUESTION_ID', details: { itemNumber: 1 } }),
      'en',
    );
    assert.match(dup.title, /more than once/);
    assert.deepEqual(dup.details, ['Item 1']);
  });

  it('item number is ignored when absent, zero or not a number', async () => {
    for (const details of [undefined, {}, { itemNumber: 0 }, { itemNumber: 'x' }, ['3']]) {
      const parsed = await parseAuditErrorResponse(fakeRes(400, { code: 'QUESTION_LOCKED', details }), 'tr');
      assert.deepEqual(parsed.details, []);
    }
  });

  it('STALE_EDIT (409) tells the owner to refresh', async () => {
    const tr = await parseAuditErrorResponse(fakeRes(409, { code: 'STALE_EDIT' }), 'tr');
    assert.equal(tr.code, 'STALE_EDIT');
    assert.match(tr.title, /sen düzenlerken değişti/);
    assert.match(tr.title, /Sayfayı yenile/);
    const en = await parseAuditErrorResponse(fakeRes(409, { code: 'STALE_EDIT' }), 'en');
    assert.match(en.title, /changed while you were editing/);
  });

  it('ARCHIVED (409) says the audit cannot be edited', async () => {
    const tr = await parseAuditErrorResponse(fakeRes(409, { code: 'ARCHIVED' }), 'tr');
    assert.match(tr.title, /arşivlendi/);
    const en = await parseAuditErrorResponse(fakeRes(409, { code: 'ARCHIVED' }), 'en');
    assert.match(en.title, /archived/);
  });

  it('NO_QUESTIONS (publish an empty draft) is still humanized', async () => {
    const parsed = await parseAuditErrorResponse(fakeRes(400, { code: 'NO_QUESTIONS' }), 'tr');
    assert.match(parsed.title, /en az 1 soru/);
  });

  it('the legacy locked codes keep their messages (the admin route still returns them)', async () => {
    const pub = await parseAuditErrorResponse(fakeRes(400, { code: 'PUBLISHED_LOCKED' }), 'en');
    assert.match(pub.title, /published/i);
    const resp = await parseAuditErrorResponse(fakeRes(400, { code: 'RESPONSES_LOCK_QUESTIONS' }), 'tr');
    assert.match(resp.title, /Yanıt almış/);
  });
});

describe('parseAuditErrorResponse — public submit codes (spec §6.8)', () => {
  function fakeRes(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  it('PHOTO_TOO_LARGE / INVALID_PHOTO / INVALID_ANSWER / PAYLOAD_TOO_LARGE in TR', async () => {
    const photo = await parseAuditErrorResponse(fakeRes(400, { error: 'x', code: 'PHOTO_TOO_LARGE' }), 'tr');
    assert.match(photo.title, /Fotoğraf çok büyük/);
    const badPhoto = await parseAuditErrorResponse(fakeRes(400, { code: 'INVALID_PHOTO' }), 'tr');
    assert.match(badPhoto.title, /Fotoğraf geçersiz/);
    const answer = await parseAuditErrorResponse(fakeRes(400, { code: 'INVALID_ANSWER' }), 'tr');
    assert.match(answer.title, /cevap geçersiz/);
    const big = await parseAuditErrorResponse(fakeRes(413, { code: 'PAYLOAD_TOO_LARGE' }), 'tr');
    assert.match(big.title, /çok büyük/);
    assert.match(big.title, /Fotoğrafları azaltıp/);
  });

  it('the same codes in EN', async () => {
    const photo = await parseAuditErrorResponse(fakeRes(400, { code: 'PHOTO_TOO_LARGE' }), 'en');
    assert.match(photo.title, /photo is too large/i);
    const badPhoto = await parseAuditErrorResponse(fakeRes(400, { code: 'INVALID_PHOTO' }), 'en');
    assert.match(badPhoto.title, /photo is invalid/i);
    const answer = await parseAuditErrorResponse(fakeRes(400, { code: 'INVALID_ANSWER' }), 'en');
    assert.match(answer.title, /answer is invalid/i);
    const big = await parseAuditErrorResponse(fakeRes(413, { code: 'PAYLOAD_TOO_LARGE' }), 'en');
    assert.match(big.title, /too large/i);
  });

  it("a plain 429 keeps the generic wait message; scope 'daily' gets the daily-cap message", async () => {
    const plain = await parseAuditErrorResponse(fakeRes(429, { error: 'rate_limited', retryAfter: 30 }), 'tr');
    assert.match(plain.title, /Çok hızlı/);

    const daily = await parseAuditErrorResponse(
      fakeRes(429, { error: 'rate_limited', scope: 'daily', retryAfter: 3600 }),
      'tr',
    );
    assert.equal(daily.code, 'rate_limited');
    assert.equal(
      daily.title,
      'Bu link bugün çok fazla yanıt aldı. Yarın tekrar dene veya işletmeyle iletişime geç.',
    );

    const dailyEn = await parseAuditErrorResponse(
      fakeRes(429, { error: 'rate_limited', scope: 'daily' }),
      'en',
    );
    assert.match(dailyEn.title, /too many responses today/);
  });

  it("scope 'daily' on a non-rate-limit code does not hijack the message", async () => {
    const parsed = await parseAuditErrorResponse(fakeRes(400, { code: 'INVALID_ANSWER', scope: 'daily' }), 'tr');
    assert.match(parsed.title, /cevap geçersiz/);
  });

  it('none of the new owner/respondent messages leaks developer jargon', async () => {
    const codes = [
      'QUESTION_LOCKED',
      'QUESTION_HAS_ANSWERS',
      'DUPLICATE_QUESTION_ID',
      'STALE_EDIT',
      'ARCHIVED',
      'PHOTO_TOO_LARGE',
      'PAYLOAD_TOO_LARGE',
      'INVALID_ANSWER',
      'INVALID_PHOTO',
    ];
    for (const locale of ['tr', 'en'] as const) {
      for (const code of codes) {
        const parsed = await parseAuditErrorResponse(fakeRes(400, { code }), locale);
        assert.ok(!/payload|json|token|assignment|schema|uuid|null|undefined/i.test(parsed.title), `${locale} ${code}: ${parsed.title}`);
        assert.ok(!parsed.title.includes(code), `${locale} ${code} must not echo the raw code`);
      }
    }
  });
});
