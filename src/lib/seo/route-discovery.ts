import PUBLIC_ROUTES from './public-routes.generated.json';
import { ROUTE_OVERRIDES, type ChangeFreq } from './route-overrides';

// Public marketing routes under src/app/[locale]/ for sitemap.xml.
//
// The route list is generated at build time by
// scripts/generate-public-routes.mjs (runs before `next build`) and bundled
// as JSON. It used to be a filesystem walk at request time, which silently
// returned nothing on Vercel (src/ is not deployed with the function), so
// the live sitemap had no homepage / pricing / features / solutions rows.
// Exclusions (auth, dashboard, redirect aliases, noindex pages) live in the
// generator script.

export type DiscoveredRoute = {
  path: string;
  priority: number;
  changefreq: ChangeFreq;
  /** Locales this route is canonical in. Omitted → both tr and en. */
  locales?: ReadonlyArray<'tr' | 'en'>;
};

// The privacy policy is served at two slugs; each locale has one canonical
// (TR /gizlilik, EN /privacy) and the other slug 301s to it (next.config).
const LOCALE_ONLY: Record<string, ReadonlyArray<'tr' | 'en'>> = {
  gizlilik: ['tr'],
  privacy: ['en'],
};

const DEFAULT_PRIORITY = 0.7;
const DEFAULT_CHANGEFREQ: ChangeFreq = 'monthly';

function inferMetadata(routePath: string): { priority: number; changefreq: ChangeFreq } {
  const override = ROUTE_OVERRIDES[routePath];
  // Sector landing pages (solutions/*) are the main commercial pages.
  const heuristicPriority = routePath.startsWith('solutions/') ? 0.9 : DEFAULT_PRIORITY;
  return {
    priority: override?.priority ?? heuristicPriority,
    changefreq: override?.changefreq ?? DEFAULT_CHANGEFREQ,
  };
}

export function discoverPublicRoutes(): DiscoveredRoute[] {
  return (PUBLIC_ROUTES as string[]).map((routePath) => {
    const locales = LOCALE_ONLY[routePath];
    return { path: routePath, ...inferMetadata(routePath), ...(locales ? { locales } : {}) };
  });
}
