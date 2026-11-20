import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildHostedCheckout, cardAliasFor } from '../src/lib/payment/paynkolay';
import { sensitive } from '../src/lib/billing/sensitive';
import { cardSaveConsent, cardSaveConsentText, consentTextHash } from '../src/lib/billing/consent';
import { BILLING_COPY, billingText } from '../src/lib/billing/billing-copy';
import { cardAriaLabel, formatCardExpiry, formatTry } from '../src/lib/billing/billing-format';
import { billingResultPath } from '../src/lib/billing/return-flow';
import { renewalNoticeFor } from '../src/components/dashboard/billing/RenewalNotice';
import { safeRedirectPath } from '../src/lib/safe-redirect';
import { riskScoreUpdate } from '../src/lib/login-risk';
import { testConfig } from './fixtures/paynkolay-fakes';

// Saved-card helpers: the hosted form with a customer key (§15.2 paynkolay-cards case 1), the card-save
// consent text, copy parity, result URLs, the renewal banner rule, the login redirect sanitiser and the
// sign-in risk score.

describe('hosted checkout with a customer key (D13)', () => {
  it('hash covers the customer key; csAutoSave + csCardAlias only when saving; bad keys throw', () => {
    const cfg = testConfig();
    const at = new Date('2026-01-01T09:00:00Z'); // 12:00:00 Istanbul
    const { fields } = buildHostedCheckout(
      cfg,
      { clientRefCode: 'ref', amountMinor: 49900, successUrl: 'u', failUrl: 'u', customerKey: sensitive('ABCDEFGHJK1'), saveCard: true, cardAlias: 'Buaze-REF' },
      at,
    );
    const expected = createHash('sha512').update('SX|ref|499.00|u|u|01.01.2026 12:00:00|ABCDEFGHJK1|SECRET').digest('base64');
    assert.equal(fields.hashDataV2, expected);
    assert.equal(fields.customerKey, 'ABCDEFGHJK1');
    assert.equal(fields.csAutoSave, 'true');
    assert.equal(fields.csCardAlias, 'Buaze-REF');
    for (const bad of ['ABCDEFGHJK12', 'abcdefghjk1']) {
      assert.throws(() => buildHostedCheckout(cfg, { clientRefCode: 'ref', amountMinor: 1, successUrl: 'u', failUrl: 'u', customerKey: sensitive(bad) }, at));
    }
    assert.throws(() => buildHostedCheckout(cfg, { clientRefCode: 'ref', amountMinor: 1, successUrl: 'u', failUrl: 'u', saveCard: true, cardAlias: 'Buaze-1' }, at));
    const plain = buildHostedCheckout(cfg, { clientRefCode: 'ref', amountMinor: 1, successUrl: 'u', failUrl: 'u' }, at).fields;
    assert.equal(plain.customerKey, '');
    assert.equal(plain.csAutoSave, undefined);
    assert.match(cardAliasFor('ckz9q1w2e3r4t5y6'), /^Buaze-[A-Z0-9]{6}$/);
  });
});

describe('card-save consent and copy', () => {
  it('the consent text is versioned, NFC, hashed stably, names PayNKolay and the brand, never a company title', () => {
    for (const locale of ['tr', 'en'] as const) {
      const c = cardSaveConsent(locale);
      assert.equal(c.textVersion, 'cs-2026-12-v1');
      assert.equal(c.textHash, consentTextHash(cardSaveConsentText(locale)));
      assert.equal(c.text, c.text.normalize('NFC'));
      assert.match(c.text, /PayNKolay/);
      assert.match(c.text, /Buaze/);
      assert.doesNotMatch(c.text, /NEXTGEN|LİMİTED|LIMITED ŞİRKETİ|\{\{/);
    }
    assert.notEqual(cardSaveConsent('tr').textHash, cardSaveConsent('en').textHash);
  });

  it('every copy key has TR and EN with the same placeholders', () => {
    for (const [key, v] of Object.entries(BILLING_COPY)) {
      assert.ok(v.tr && v.en, key);
      const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
      assert.equal(ph(v.tr), ph(v.en), key);
    }
    assert.equal(billingText('pm.other', 'en', { last4: '1234' }), 'Unverified card •••• 1234');
  });

  it('formats amounts, expiries and the card label', () => {
    assert.match(formatTry(99900, 'tr'), /^₺999,00$/);
    assert.match(formatTry(99900, 'en'), /^₺999\.00$/);
    assert.equal(formatCardExpiry(8, 2028), '08/28');
    assert.equal(formatCardExpiry(null, 2028), '');
    assert.equal(cardAriaLabel({ brand: 'VISA', last4: '4242', expMonth: 8, expYear: 2028 }, 'tr'), 'Visa kart, son dört hane 4242, son kullanma 08/28');
  });
});

describe('result URLs, renewal banner, redirects, risk score', () => {
  it('result page path carries only the status and our payment id', () => {
    assert.equal(billingResultPath('tr', 'success', 'ckabc123'), '/billing/tr/result?payment=success&p=ckabc123');
    assert.equal(billingResultPath('en', null, 'ckabc123'), '/billing/en/result');
    assert.equal(billingResultPath('tr', 'failed', 'bad id!'), '/billing/tr/result?payment=failed');
  });

  it('one banner: danger > warn > info; reminder only within 7 days', () => {
    const now = new Date('2026-12-10T10:00:00Z');
    const r = (state: string, mode: 'auto' | 'reminder', periodEnd: string) => ({
      state: state as never,
      mode,
      periodEnd,
      nextAttemptAt: null,
      graceEndsAt: null,
      attempts: 0,
      maxAttempts: 3,
      lastFailureKind: null,
    });
    assert.equal(renewalNoticeFor({ renewal: r('needs_action', 'reminder', '2026-12-12T00:00:00Z'), status: 'past_due', renewsAt: null, canRenew: true, now })?.kind, 'danger');
    assert.equal(renewalNoticeFor({ renewal: null, status: 'past_due', renewsAt: '2026-12-09T00:00:00Z', canRenew: true, now })?.key, 'notice.pastDue');
    assert.equal(renewalNoticeFor({ renewal: r('scheduled', 'reminder', '2026-12-14T00:00:00Z'), status: 'active', renewsAt: null, canRenew: true, now })?.key, 'notice.reminder');
    assert.equal(renewalNoticeFor({ renewal: r('scheduled', 'reminder', '2026-12-30T00:00:00Z'), status: 'active', renewsAt: null, canRenew: true, now }), null);
    assert.equal(renewalNoticeFor({ renewal: null, status: 'active', renewsAt: null, canRenew: true, now }), null);
  });

  it('login redirect: same-origin paths only (the billing pages included)', () => {
    assert.equal(safeRedirectPath('/billing/tr/checkout?intent=renew', '/tr/dashboard'), '/billing/tr/checkout?intent=renew');
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/tr\n/x', null]) {
      assert.equal(safeRedirectPath(bad, '/tr/dashboard'), '/tr/dashboard');
    }
  });

  it('sign-in risk score: stored only when the assessment produced a score, clamped to [0, 1]', () => {
    const now = new Date();
    assert.equal(riskScoreUpdate({ ok: true }, now), null);
    assert.deepEqual(riskScoreUpdate({ ok: true, score: 0.7 }, now), { lastLoginRiskScore: 0.7, lastLoginRiskAt: now });
    assert.equal(riskScoreUpdate({ ok: true, score: 3 }, now)?.lastLoginRiskScore, 1);
  });
});
