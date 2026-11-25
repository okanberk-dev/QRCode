import {
  Utensils,
  Hotel,
  Stethoscope,
  Scissors,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Single source of truth for the "Related Solutions" cross-link strip
 * used both by `SolutionPageLayout` (the layout-using sector pages) and
 * by the seven custom sector pages that don't use the layout
 * (restaurants, delivery, beauty-salon, healthcare, hotels, law-firms,
 * retail). Lifting this list out of `SolutionPageLayout` lets all eight
 * surfaces emit the same set of cross-links and keep them in sync when
 * a new sector ships.
 *
 * Adding a sector: append here, then make sure a /solutions/<slug>
 * route exists. Renaming a slug requires updating REDIRECT_ALIASES in
 * `src/lib/seo/route-discovery.ts` so old links stay valid.
 */
export interface RelatedSolution {
  /** Page slug under /solutions — must match a real route. */
  slug: string;
  /** Lucide icon component reference; render with `<entry.Icon size={16} />`. */
  Icon: LucideIcon;
  /** Turkish display label for the chip. */
  tr: string;
  /** English display label for the chip. */
  en: string;
}

export const RELATED_SOLUTIONS_LIST: readonly RelatedSolution[] = [
  { slug: 'restaurants', Icon: Utensils, tr: 'Restoranlar ve kafeler', en: 'Restaurants and cafés' },
  { slug: 'delivery', Icon: Truck, tr: 'Paket servis', en: 'Delivery' },
  { slug: 'hotels', Icon: Hotel, tr: 'Oteller', en: 'Hotels' },
  { slug: 'healthcare', Icon: Stethoscope, tr: 'Sağlık klinikleri', en: 'Healthcare clinics' },
  { slug: 'beauty-salon', Icon: Scissors, tr: 'Güzellik salonları', en: 'Beauty salons' },
  { slug: 'retail', Icon: ShoppingBag, tr: 'Perakende mağazalar', en: 'Retail stores' },
];

/**
 * Closest neighbours per sector, most relevant first. Pages link to these
 * before anything else, so every sector page gets links from its siblings
 * (the old "first 4 of the list" strip left 10 pages with no sibling links).
 */
const SECTOR_NEIGHBOURS: Record<string, readonly string[]> = {
  restaurants: ['delivery', 'hotels', 'retail'],
  delivery: ['restaurants', 'retail', 'hotels'],
  hotels: ['restaurants', 'beauty-salon', 'delivery'],
  healthcare: ['beauty-salon', 'retail', 'hotels'],
  'beauty-salon': ['healthcare', 'retail', 'hotels'],
  retail: ['restaurants', 'beauty-salon', 'delivery'],
};

/**
 * Returns up to N related solutions for a sector page: its closest
 * neighbours first, then the rest of the list (starting after the current
 * sector, so the fill rotates instead of always repeating the first
 * entries). Never includes the current slug.
 */
export function getRelatedSolutions(currentSlug: string, take = 4): RelatedSolution[] {
  const bySlug = new Map(RELATED_SOLUTIONS_LIST.map((s) => [s.slug, s] as const));
  const picked: RelatedSolution[] = [];
  const add = (slug: string) => {
    const entry = bySlug.get(slug);
    if (!entry || entry.slug === currentSlug || picked.includes(entry)) return;
    picked.push(entry);
  };
  for (const slug of SECTOR_NEIGHBOURS[currentSlug] ?? []) add(slug);
  const start = RELATED_SOLUTIONS_LIST.findIndex((s) => s.slug === currentSlug);
  for (let i = 1; i <= RELATED_SOLUTIONS_LIST.length; i++) {
    add(RELATED_SOLUTIONS_LIST[(Math.max(start, 0) + i) % RELATED_SOLUTIONS_LIST.length].slug);
  }
  return picked.slice(0, take);
}

/** Number of sector pages — use this instead of hard-coding "14" or "15". */
export const SECTOR_COUNT = RELATED_SOLUTIONS_LIST.length;
