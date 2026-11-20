import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { billingPageCsp, generateNonce, stripCspNonce } from '../src/lib/billing/page-csp';

// billing spec §15.2 `billing-pages-boundary.test.ts` (D12, §3.4): the billing pages load no third-party
// script, run under an enforced nonce CSP, and the middleware covers them.

const ROOT = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

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
    assert.match(mw, /res\.headers\.set\('Referrer-Policy', 'no-referrer'\)/);
    // Session Replay never records the billing pages; robots keep them out of search.
    assert.match(read('instrumentation-client.ts'), /startsWith\('\/billing\/'\)/);
    assert.match(read('src/app/robots.ts'), /'\/billing\/'/);
  });
});
