/**
 * Denetim Merkezi — "denetim tamamlandı" sahip e-postası (spec §6.8).
 *
 * Skor `null` olabilir (puanlanabilir soru yok) ve sorunlu madde sayısı
 * ("N madde sorunlu") gösterilebilir. DB'ye gitmemek için mail metni
 * `setMailCopyDraft` ile boş draft'a (= inline varsayılanlar) sabitlenir.
 *
 * Run: npm test
 */

import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { clearMailCopyDraft, setMailCopyDraft } from '../src/lib/email/copy-loader';
import { renderAuditCompleted } from '../src/lib/email/templates/audit-completed';

const base = {
  restaurantName: 'Mamas Burger Kadikoy',
  auditTitle: 'Günlük mutfak açılış kontrol listesi',
  respondentName: 'Ayşe',
  passingScore: null,
  panelUrl: 'https://www.buaze.com/tr/dashboard/audits/abc/results',
};

describe('renderAuditCompleted', () => {
  beforeEach(() => {
    setMailCopyDraft('audit-completed', 'tr', {});
    setMailCopyDraft('audit-completed', 'en', {});
  });
  afterEach(() => {
    clearMailCopyDraft('audit-completed', 'tr');
    clearMailCopyDraft('audit-completed', 'en');
  });

  it('scored response: "/100" in the subject, preheader and score block', async () => {
    const r = await renderAuditCompleted({ ...base, score: 67, passed: false, passingScore: 80 }, 'tr');
    assert.equal(r.subject, 'Denetim tamamlandı · Günlük mutfak açılış kontrol listesi · 67/100');
    assert.match(r.html, /67<span[^>]*>\/100<\/span>/);
    assert.match(r.html, /Kaldı/);
    assert.match(r.html, /Eşik 80/);
    assert.match(r.text, /Toplam puan: 67\/100 \(eşik 80\)/);
    assert.match(r.text, /https:\/\/www\.buaze\.com\/tr\/dashboard\/audits\/abc\/results/);
  });

  it('unscored response (score null): no "/100" anywhere, "Puanlanmıyor" pill instead of digits', async () => {
    const r = await renderAuditCompleted({ ...base, score: null, passed: null }, 'tr');
    assert.equal(r.subject, 'Denetim tamamlandı · Günlük mutfak açılış kontrol listesi');
    assert.ok(!r.subject.includes('/100'));
    assert.ok(!r.html.includes('/100</span>'), 'no big score digits');
    assert.ok(!/null/.test(r.html), 'never prints the word null');
    assert.ok(!/NaN/.test(r.html));
    assert.match(r.html, /Puanlanmıyor/);
    assert.match(r.text, /Toplam puan: Puanlanmıyor/);
    assert.ok(!r.text.includes('/100'));
    // preheader (hidden div) is also free of the score
    assert.ok(!/ile \d+\/100/.test(r.html));
  });

  it('English: "Not scored" and no "/100" when unscored', async () => {
    const r = await renderAuditCompleted({ ...base, score: null, passed: null }, 'en');
    assert.equal(r.subject, 'Audit completed · Günlük mutfak açılış kontrol listesi');
    assert.match(r.html, /Not scored/);
    assert.match(r.text, /Total score: Not scored/);
  });

  it('attention line: "N madde sorunlu" (TR) / "N items need attention" (EN), singular for 1', async () => {
    const tr = await renderAuditCompleted({ ...base, score: 80, passed: null, attentionCount: 3 }, 'tr');
    assert.match(tr.html, /3 madde sorunlu/);
    assert.match(tr.text, /3 madde sorunlu/);

    const en3 = await renderAuditCompleted({ ...base, score: 80, passed: null, attentionCount: 3 }, 'en');
    assert.match(en3.html, /3 items need attention/);
    const en1 = await renderAuditCompleted({ ...base, score: 80, passed: null, attentionCount: 1 }, 'en');
    assert.match(en1.html, /1 item needs attention/);
    assert.ok(!/1 items/.test(en1.html));
  });

  it('no attention line when the count is 0 / missing / garbage', async () => {
    for (const attentionCount of [0, undefined, null, -2, NaN]) {
      const r = await renderAuditCompleted({ ...base, score: 100, passed: null, attentionCount }, 'tr');
      assert.ok(!/madde sorunlu/.test(r.html), String(attentionCount));
      assert.ok(!/madde sorunlu/.test(r.text), String(attentionCount));
    }
  });

  it('an unscored response can still carry an attention line (checklist without correct answers is never listed, but a manual flag could)', async () => {
    const r = await renderAuditCompleted({ ...base, score: null, passed: null, attentionCount: 2 }, 'tr');
    assert.match(r.html, /Puanlanmıyor/);
    assert.match(r.html, /2 madde sorunlu/);
  });

  it('the preheader mentions the attention count', async () => {
    const r = await renderAuditCompleted({ ...base, score: 60, passed: false, attentionCount: 2 }, 'tr');
    assert.match(r.html, /60\/100 ile tamamladı\. 2 madde sorunlu\./);
  });

  it('respondent name and title are sanitized before reaching the subject / preheader', async () => {
    const r = await renderAuditCompleted(
      {
        ...base,
        auditTitle: 'Başlık\r\nBcc: x@evil.test',
        respondentName: '<script>alert(1)</script>\nAyşe',
        score: 50,
        passed: null,
      },
      'tr',
    );
    assert.ok(!/[\r\n]/.test(r.subject), 'subject must be a single line');
    assert.ok(!r.html.includes('<script>alert(1)</script>'));
  });

  it('anonymous respondent gets a neutral fallback label', async () => {
    const tr = await renderAuditCompleted({ ...base, respondentName: null, score: 100, passed: null }, 'tr');
    assert.match(tr.html, /Bir katılımcı/);
    const en = await renderAuditCompleted({ ...base, respondentName: '  ', score: 100, passed: null }, 'en');
    assert.match(en.html, /Someone/);
  });

  it('passed block: Geçti / Kaldı / hidden when unscored', async () => {
    const pass = await renderAuditCompleted({ ...base, score: 90, passed: true, passingScore: 80 }, 'tr');
    assert.match(pass.html, /Geçti/);
    const unknown = await renderAuditCompleted({ ...base, score: 90, passed: null }, 'tr');
    assert.match(unknown.html, /Puan hesaplandı/);
    const unscored = await renderAuditCompleted({ ...base, score: null, passed: null }, 'tr');
    assert.ok(!/Puan hesaplandı/.test(unscored.html));
  });
});
