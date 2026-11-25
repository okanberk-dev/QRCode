/**
 * Marketing pages retired in §57 (2026-11-25) and where they now point.
 * next.config turns each entry into a 301 for /tr and /en; the pages were
 * deleted, so the sitemap drops them on the next route generation.
 *
 * Why: 10 of Buaze's 12 businesses are restaurants. Thin sector pages that
 * repeated one template were merged into their closest kept page; sectors
 * Buaze does not focus on (or where review solicitation is restricted, e.g.
 * law firms under the Turkish bar's advertising rules) go to the sector hub.
 */
export interface RetiredPage {
  from: string;
  to: string;
}

export const RETIRED_PAGES: readonly RetiredPage[] = [
  // Merged into a kept sector page.
  { from: 'solutions/boutique-hotels', to: 'solutions/hotels' },
  { from: 'solutions/dentists', to: 'solutions/healthcare' },
  { from: 'solutions/aesthetic', to: 'solutions/healthcare' },
  { from: 'solutions/veterinary', to: 'solutions/healthcare' },
  { from: 'solutions/spa', to: 'solutions/beauty-salon' },
  // Not a focus sector → sector hub.
  { from: 'solutions/gym', to: 'solutions' },
  { from: 'solutions/schools', to: 'solutions' },
  { from: 'solutions/law-firms', to: 'solutions' },
  { from: 'solutions/hukuk', to: 'solutions' },
  { from: 'solutions/legal', to: 'solutions' },
  { from: 'solutions/real-estate', to: 'solutions' },
  { from: 'solutions/auto-service', to: 'solutions' },
  // Duplicates of /compare (it already covers static QR and spreadsheets).
  { from: 'vs/individual-qr', to: 'compare' },
  { from: 'vs/spreadsheet', to: 'compare' },
  // No open positions; the general-application note now lives on /about.
  { from: 'careers', to: 'about' },
];

export function retiredPageRedirects() {
  return RETIRED_PAGES.map((p) => ({
    source: `/:locale(tr|en)/${p.from}`,
    destination: `/:locale/${p.to}`,
    statusCode: 301 as const,
  }));
}
