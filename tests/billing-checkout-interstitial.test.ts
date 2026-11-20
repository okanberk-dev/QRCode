import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  INTERSTITIAL_SCRIPT,
  INTERSTITIAL_STYLE,
  htmlEscape,
  interstitialCsp,
  renderCheckoutInterstitial,
  type InterstitialInput,
} from '../src/lib/billing/checkout-interstitial';

// billing spec §15.2 `billing-checkout-interstitial.test.ts`: escaping, a constant hash-allowed script and
// style, the customer key only on saving payments, and the bfcache / noscript behaviour.

function input(over: Partial<InterstitialInput> = {}, summary: Partial<InterstitialInput['summary']> = {}): InterstitialInput {
  return {
    action: 'https://pos.test/Vpos',
    fields: { sx: 'SX', clientRefCode: 'p1', amount: '999.00', customerKey: '', hashDataV2: 'h==' },
    locale: 'tr',
    summary: { planName: 'Büyüme', cycle: 'monthly', amountMinor: 99900, saveCard: false, autoRenewFrom: null, intent: 'new', ...summary },
    backUrl: '/billing/tr/checkout?planId=p&cycle=monthly',
    ...over,
  };
}

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('base64');

describe('checkout hand-off page', () => {
  it('1. escapes every value (plan name, fields, back URL)', () => {
    const html = renderCheckoutInterstitial(
      input({ fields: { sx: '"><script>alert(1)</script>', note: "it's" } }, { planName: '"><script>x</script> O\'Brien' }),
    );
    assert.ok(!html.includes('<script>alert(1)</script>'));
    assert.ok(!html.includes('<script>x</script>'));
    assert.match(html, /&quot;&gt;&lt;script&gt;/);
    assert.match(html, /O&#39;Brien/);
    assert.equal(htmlEscape(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
    assert.throws(() => renderCheckoutInterstitial(input({ action: 'javascript:alert(1)' })));
    // An unsafe back URL never reaches the page.
    const evil = renderCheckoutInterstitial(input({ backUrl: '//evil.example/x' }));
    assert.ok(!evil.includes('evil.example'));
  });

  it('2. CSP: hashes of the constant script and style, form-action https:, no unsafe-inline, no nonce; script text is constant', () => {
    const csp = interstitialCsp();
    assert.ok(csp.includes(`script-src 'sha256-${sha(INTERSTITIAL_SCRIPT)}'`));
    assert.ok(csp.includes(`style-src 'sha256-${sha(INTERSTITIAL_STYLE)}'`));
    assert.match(csp, /form-action https:/);
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(csp, /unsafe-inline|nonce-/);
    for (const variant of [input(), input({ locale: 'en' }, { saveCard: true, intent: 'replace_card', planName: '<b>' })]) {
      const html = renderCheckoutInterstitial(variant);
      const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      assert.deepEqual(scripts, [INTERSTITIAL_SCRIPT]);
      const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
      assert.deepEqual(styles, [INTERSTITIAL_STYLE]);
      assert.doesNotMatch(html, /\sstyle="/, 'no style attribute (a hash does not cover attributes)');
    }
  });

  it('3. the customer key appears only when the payment saves a card, exactly once, in its hidden input', () => {
    const plain = renderCheckoutInterstitial(input());
    assert.match(plain, /<input type="hidden" name="customerKey" value="">/);
    const key = 'ABCDEFGHJK1';
    const saving = renderCheckoutInterstitial(
      input({ fields: { sx: 'SX', customerKey: key, csAutoSave: 'true', csCardAlias: 'Buaze-ABC123' } }, { saveCard: true }),
    );
    assert.equal(saving.split(key).length - 1, 1);
    assert.match(saving, new RegExp(`<input type="hidden" name="customerKey" value="${key}">`));
    assert.match(saving, /PayNKolay(?:'|&#39;)da saklanacak/);
  });

  it('4. auto-submit reads delay and back URL from data- attributes; pageshow goes back; noscript fallback', () => {
    const html = renderCheckoutInterstitial(input());
    assert.match(html, /<form id="pnk" method="post" action="https:\/\/pos\.test\/Vpos" data-delay="900" data-back="\/billing\/tr\/checkout\?planId=p&amp;cycle=monthly">/);
    assert.match(INTERSTITIAL_SCRIPT, /getAttribute\('data-delay'\)/);
    assert.match(INTERSTITIAL_SCRIPT, /getAttribute\('data-back'\)/);
    assert.match(INTERSTITIAL_SCRIPT, /pageshow/);
    assert.match(INTERSTITIAL_SCRIPT, /location\.replace\(back\)/);
    assert.doesNotMatch(INTERSTITIAL_SCRIPT, /disabled\s*=\s*false|removeAttribute\('disabled'\)/, 'never re-enables the form');
    assert.match(INTERSTITIAL_SCRIPT, /prefers-reduced-motion/);
    assert.match(html, /<noscript><p>Devam etmek için düğmeye basın\.<\/p><\/noscript>/);
  });
});
