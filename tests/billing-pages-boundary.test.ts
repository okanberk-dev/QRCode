import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BILLING_PAGE_REFERRER_POLICY, billingPageCsp, generateNonce, stripCspNonce } from '../src/lib/billing/page-csp';
import { billingFormOriginOk } from '../src/lib/billing/owner-guard';

// billing spec §15.2 `billing-pages-boundary.test.ts` (D12, §3.4): the billing pages load no third-party
// script, run under an enforced nonce CSP, and the middleware covers them.

const ROOT = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * The Fetch standard's "append a request Origin header" for a non-CORS (form) POST: with these policies
 * the Origin is serialised as `null` (no-referrer always; same-origin only for a cross-origin target;
 * the downgrade policies only from https to http). Mirrors https://fetch.spec.whatwg.org/#append-a-request-origin-header.
 */
function formPostOrigin(policy: string, from: string, to: string): string {
  const a = new URL(from);
  const b = new URL(to);
  const sameOrigin = a.origin === b.origin;
  const downgrade = a.protocol === 'https:' && b.protocol !== 'https:';
  switch (policy) {
    case 'no-referrer':
      return 'null';
    case 'no-referrer-when-downgrade':
    case 'strict-origin':
    case 'strict-origin-when-cross-origin':
      return downgrade ? 'null' : a.origin;
    case 'same-origin':
      return sameOrigin ? a.origin : 'null';
    default:
      return a.origin;
  }
}

describe('billing pages boundary', () => {
  it('1. the billing root layout renders RootHtml secure and imports no analytics, banner, contact or Vercel module', () => {
    const layout = read('src/app/billing/[locale]/layout.tsx');
    assert.match(layout, /<RootHtml[^>]*\bsecure\b/);
    assert.doesNotMatch(layout, /ConditionalAnalytics|CookieConsentBanner|ContactFloat|@vercel\//);
    for (const rel of [
      'src/app/billing/[locale]/checkout/page.tsx',
      'src/app/billing/[locale]/checkout/CheckoutReviewClient.tsx',
      'src/app/billing/[locale]/result/page.tsx',
      'src/app/billing/[locale]/result/ResultPoller.tsx',
      'src/app/billing/[locale]/card/page.tsx',
      'src/app/billing/[locale]/card/SavedCardClient.tsx',
    ]) {
      assert.doesNotMatch(read(rel), /ConditionalAnalytics|CookieConsentBanner|ContactFloat|@vercel\/|googletagmanager|mc\.yandex|<script/, rel);
    }
  });

  it('2. RootHtml returns before the analytics, banner and Vercel components when secure', () => {
    const src = read('src/components/root/RootHtml.tsx');
    const start = src.indexOf('if (secure) {');
    assert.ok(start > 0);
    const secureBranch = src.slice(start, src.indexOf('\n  }\n', start));
    assert.ok(secureBranch.includes('return ('), 'the secure branch returns early');
    assert.doesNotMatch(secureBranch, /ConditionalAnalytics|CookieConsentBanner|SpeedInsights|Analytics|prefetchDNS|<script/);
  });

  it('3. the page CSP: nonce + strict-dynamic, no https: script source, frame/base/object locked down', () => {
    const nonce = generateNonce();
    assert.equal(Buffer.from(nonce, 'base64').length, 16);
    assert.notEqual(generateNonce(), nonce);
    const csp = billingPageCsp(nonce);
    assert.ok(csp.includes(`script-src 'nonce-${nonce}' 'strict-dynamic'`));
    for (const d of ["connect-src 'self'", "frame-ancestors 'none'", "base-uri 'none'", "object-src 'none'", "form-action 'self'", "default-src 'self'"]) {
      assert.ok(csp.includes(d), d);
    }
    const scriptSrc = csp.split(';').find((p) => p.trim().startsWith('script-src')) ?? '';
    assert.doesNotMatch(scriptSrc, /https:|unsafe-inline|unsafe-eval/);
    assert.match(billingPageCsp(nonce, { dev: true }), /'unsafe-eval'/);
    assert.throws(() => billingPageCsp("x' 'unsafe-inline"));
    assert.equal(stripCspNonce(csp), stripCspNonce(billingPageCsp(generateNonce())));
  });

  it('4. the middleware matcher covers /billing/:path* and sets the CSP on the request and the response', () => {
    const mw = read('src/middleware.ts');
    assert.match(mw, /'\/billing\/:path\*'/);
    assert.match(mw, /requestHeaders\.set\('content-security-policy', csp\)/);
    assert.match(mw, /res\.headers\.set\('Content-Security-Policy', csp\)/);
    assert.match(mw, /res\.headers\.set\('Referrer-Policy', BILLING_PAGE_REFERRER_POLICY\)/);
    assert.match(read('src/app/billing/[locale]/layout.tsx'), /referrer: BILLING_PAGE_REFERRER_POLICY/);
    // Session Replay never records the billing pages; robots keep them out of search.
    assert.match(read('instrumentation-client.ts'), /startsWith\('\/billing\/'\)/);
    assert.match(read('src/app/robots.ts'), /'\/billing\/'/);
  });

  it('5. the review form POST keeps its real Origin, so the checkout origin check can pass (WEBSEC-1)', () => {
    const site = 'https://www.buaze.com';
    const page = `${site}/billing/tr/checkout?planId=p&cycle=monthly`;
    const action = `${site}/api/billing/paynkolay/checkout`;
    assert.equal(BILLING_PAGE_REFERRER_POLICY, 'same-origin');
    const origin = formPostOrigin(BILLING_PAGE_REFERRER_POLICY, page, action);
    assert.equal(origin, site);
    assert.equal(billingFormOriginOk(origin, 'same-origin', [site]), true);
    // The old policy: every checkout failed with origin_mismatch unless Sec-Fetch-Site vouches for it.
    assert.equal(formPostOrigin('no-referrer', page, action), 'null');
    assert.equal(billingFormOriginOk('null', null, [site]), false);
    assert.equal(billingFormOriginOk('null', 'same-origin', [site]), true);
    // Nothing reaches another origin: PayNKolay (or anyone) gets Origin null and no referrer from these pages.
    assert.equal(formPostOrigin(BILLING_PAGE_REFERRER_POLICY, page, 'https://paynkolay.nkolayislem.com.tr/Vpos'), 'null');
    // CSRF stays closed: a cross-site form, an opaque (sandboxed) origin or a missing Origin never passes.
    assert.equal(billingFormOriginOk('https://evil.example', 'cross-site', [site]), false);
    assert.equal(billingFormOriginOk('null', 'cross-site', [site]), false);
    assert.equal(billingFormOriginOk(null, 'same-origin', [site]), false);
    assert.equal(billingFormOriginOk('https://evil.example', 'same-origin', [site]), false);
  });
});
