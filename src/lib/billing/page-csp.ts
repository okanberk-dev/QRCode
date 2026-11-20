/**
 * Content-Security-Policy of the billing pages under `/billing/{locale}/…`
 * (billing spec §3.4, D12): the review page, the result page and the
 * auto-renew-off confirmation. These pages start or end the hand-off to
 * PayNKolay's hosted card page, so they must not be open to script attacks
 * (PCI DSS SAQ A eligibility): no third-party script, an enforced nonce +
 * 'strict-dynamic' policy, nothing that can frame them.
 *
 * Imported by `src/middleware.ts` (edge runtime): no Node-only API here.
 * `'unsafe-inline'` is limited to styles (React style attributes need it; a
 * style cannot run script). The site-wide A-group CSP from next.config.ts
 * still applies and is intersected by the browser; both are compatible.
 */

/** Path prefix of the billing root layout (src/app/billing/[locale]/). */
export const BILLING_PAGE_PREFIX = '/billing/';

/**
 * Referrer policy of the billing pages (response header + `<meta name="referrer">`).
 * `same-origin`, NOT `no-referrer`: under `no-referrer` the Fetch standard
 * serialises the `Origin` of a non-CORS POST as `null`, so the review page's
 * native form post would fail the checkout route's origin check for every
 * owner. `same-origin` still sends nothing (no referrer, `Origin: null` on a
 * POST) to any other origin, so no billing URL or query leaves the site.
 */
export const BILLING_PAGE_REFERRER_POLICY = 'same-origin';

/** A 128-bit nonce, base64 (24 characters). Web Crypto: works on the edge and in Node. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

const NONCE_RE = /^[A-Za-z0-9+/]{22}==$/;

/**
 * The enforced policy for one response. `dev` adds `'unsafe-eval'` for the
 * Next.js development runtime only (React Refresh); production never has it.
 */
export function billingPageCsp(nonce: string, opts: { dev?: boolean } = {}): string {
  if (!NONCE_RE.test(nonce)) throw new Error('billing csp: invalid nonce');
  return [
    "default-src 'self'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** The policy with its nonce removed, for comparing a live header with the expected one (daily script inventory). */
export function stripCspNonce(csp: string): string {
  return csp.replace(/'nonce-[A-Za-z0-9+/=]+'/g, "'nonce'");
}

/** Supported locales of the billing pages; anything else is redirected to `tr`. */
export function billingLocaleOf(segment: string | null | undefined): 'tr' | 'en' | null {
  return segment === 'tr' || segment === 'en' ? segment : null;
}
