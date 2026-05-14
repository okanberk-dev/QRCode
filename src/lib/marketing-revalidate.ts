/**
 * Stage 83 §38.163 — marketing content cache invalidation helpers.
 *
 * Marketing pages now ship as ISR (`revalidate=3600` from
 * `[locale]/layout.tsx`, `revalidate=86400` for legal/corporate). Without
 * an explicit invalidation hook the customer-facing copy could be stale
 * for up to 1 hour (or 1 day for legal pages) after admin saves. These
 * helpers surface the canonical `revalidatePath` calls so save endpoints
 * can wire them in one line and stay DRY.
 *
 * Pattern parity: `src/lib/menu-access.ts:touchMenuUpdated` (CLAUDE.md
 * §38.103). All helpers are fail-soft — `revalidatePath` errors are
 * swallowed so admin save flows never break if the cache layer is
 * unreachable.
 */

import { revalidatePath } from 'next/cache';

/**
 * Map legal document key → marketing route slug.
 *
 * The two slugs in each pair (TR + EN) reuse the same DB key but render
 * at different paths. We only need to invalidate the marketing slug here
 * since the layout-level ISR cascades to both locales when any locale's
 * page is regenerated.
 *
 * Adding a new legal doc:
 *   1. Add the DB key here paired with its public slug.
 *   2. Add `export const revalidate = 86400` to the page (CLAUDE.md
 *      §38.163 Phase 2).
 *   3. The save endpoint already calls `revalidateLegalDocument(key)` —
 *      no further wiring needed.
 */
const LEGAL_KEY_TO_SLUG: Record<string, string> = {
  'kvkk-aydinlatma': 'kvkk',
  'gizlilik-politikasi': 'gizlilik',
  'cerez-politikasi': 'cookie',
  'ticari-ileti': 'ticari-ileti',
  'kullanim-sozlesmesi': 'kullanim-sozlesmesi',
  'kabul-edilebilir-kullanim': 'kabul-edilebilir-kullanim',
  'mesafeli-hizmet-sozlesmesi': 'mesafeli-hizmet-sozlesmesi',
  'iade-iptal-politikasi': 'iade-iptal-politikasi',
  'veri-isleyici-sozlesmesi': 'veri-isleyici-sozlesmesi',
  'veri-ihlali-mudahale': 'veri-ihlali-mudahale',
  'icerik-moderasyon': 'icerik-moderasyon',
  'acik-riza': 'acik-riza',
  'privacy-policy': 'privacy',
  'terms-of-service': 'terms',
};

/**
 * Invalidate a single legal doc page after admin save / revert.
 * Both /tr/{slug} and /en/{slug} are revalidated since both render the
 * same Prisma row keyed by `key`.
 */
export function revalidateLegalDocument(key: string): void {
  const slug = LEGAL_KEY_TO_SLUG[key];
  if (!slug) return;
  try {
    revalidatePath(`/tr/${slug}`);
    revalidatePath(`/en/${slug}`);
  } catch (error) {
    console.error('[revalidateLegalDocument]', error);
  }
}

/**
 * Invalidate the blog list + all blog detail pages (both locales).
 * Called from /api/admin/blog POST/PATCH/DELETE.
 */
export function revalidateBlog(slug?: string): void {
  try {
    revalidatePath('/tr/blog');
    revalidatePath('/en/blog');
    if (slug) {
      revalidatePath(`/tr/blog/${slug}`);
      revalidatePath(`/en/blog/${slug}`);
    } else {
      // No specific slug → invalidate all detail pages via the dynamic
      // segment pattern. Next.js will lazily regenerate as visitors hit.
      revalidatePath('/tr/blog/[slug]', 'page');
      revalidatePath('/en/blog/[slug]', 'page');
    }
  } catch (error) {
    console.error('[revalidateBlog]', error);
  }
}

/**
 * Invalidate the entire marketing layout (TR + EN) — used when site
 * settings change (logo, default title, description) since those
 * appear on every marketing page chrome via `getSiteSettings()`.
 */
export function revalidateMarketingChrome(): void {
  try {
    revalidatePath('/tr', 'layout');
    revalidatePath('/en', 'layout');
  } catch (error) {
    console.error('[revalidateMarketingChrome]', error);
  }
}

/**
 * Invalidate the pricing page (TR + EN) after admin plan save/delete.
 * Without this, the SubscriptionPlan changes admin made would be stale
 * for up to 1h (ISR `revalidate=3600`) — including annual price override
 * (CLAUDE.md §15.2 `priceYearlyTry`/`Usd`) drift.
 */
export function revalidatePricing(): void {
  try {
    revalidatePath('/tr/pricing');
    revalidatePath('/en/pricing');
  } catch (error) {
    console.error('[revalidatePricing]', error);
  }
}
