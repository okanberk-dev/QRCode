/**
 * Canonical public origin for Buaze — single source of truth.
 *
 * Buaze serves marketing + public surfaces on the **www** host; the apex
 * (`buaze.com`) 301s to it at the hosting layer. Every canonical tag,
 * hreflang alternate, sitemap entry, JSON-LD `url` and outbound link that
 * we publish must therefore use the www host. Declaring the apex while the
 * apex redirects back to www is a canonical loop: Google resolves neither
 * and drops the page from the index (this is what happened before — 143
 * pages sat in "alternate page with proper canonical tag" / "duplicate
 * without user-selected canonical").
 *
 * Override per-environment with `NEXT_PUBLIC_SITE_URL` (no trailing slash);
 * preview deployments can point it at their own origin so canonicals stay
 * self-referencing there too.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') || 'https://www.buaze.com';

/** Host portion only — used by `robots.txt`'s `Host:` directive. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
