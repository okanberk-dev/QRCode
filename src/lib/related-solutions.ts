import {
  Utensils,
  Hotel,
  Stethoscope,
  Scissors,
  Dumbbell,
  Scale,
  Home as HomeIcon,
  Car,
  Sparkles,
  GraduationCap,
  PawPrint,
  Building2,
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
  { slug: 'boutique-hotels', Icon: Building2, tr: 'Butik oteller', en: 'Boutique hotels' },
  { slug: 'healthcare', Icon: Stethoscope, tr: 'Sağlık klinikleri', en: 'Healthcare clinics' },
  { slug: 'dentists', Icon: Stethoscope, tr: 'Diş klinikleri', en: 'Dental clinics' },
  { slug: 'beauty-salon', Icon: Scissors, tr: 'Güzellik salonları', en: 'Beauty salons' },
  { slug: 'aesthetic', Icon: Sparkles, tr: 'Estetik klinikler', en: 'Aesthetic clinics' },
  { slug: 'gym', Icon: Dumbbell, tr: 'Spor salonları', en: 'Gyms and fitness studios' },
  { slug: 'veterinary', Icon: PawPrint, tr: 'Veteriner klinikleri', en: 'Veterinary clinics' },
  { slug: 'law-firms', Icon: Scale, tr: 'Hukuk büroları', en: 'Law firms' },
  { slug: 'real-estate', Icon: HomeIcon, tr: 'Emlak ofisleri', en: 'Real estate agencies' },
  { slug: 'auto-service', Icon: Car, tr: 'Oto servisler', en: 'Auto repair shops' },
  { slug: 'schools', Icon: GraduationCap, tr: 'Okullar ve kurslar', en: 'Schools and courses' },
  { slug: 'retail', Icon: ShoppingBag, tr: 'Perakende ve yerel hizmetler', en: 'Retail and local services' },
];

/**
 * Closest neighbours per sector, most relevant first. Pages link to these
 * before anything else, so every sector page gets links from its siblings
 * (the old "first 4 of the list" strip left 10 pages with no sibling links).
 */
const SECTOR_NEIGHBOURS: Record<string, readonly string[]> = {
  restaurants: ['delivery', 'hotels', 'retail', 'boutique-hotels'],
  delivery: ['restaurants', 'retail', 'hotels', 'auto-service'],
  hotels: ['boutique-hotels', 'restaurants', 'beauty-salon', 'real-estate'],
  'boutique-hotels': ['hotels', 'restaurants', 'aesthetic', 'beauty-salon'],
  healthcare: ['dentists', 'aesthetic', 'veterinary', 'beauty-salon'],
  dentists: ['healthcare', 'aesthetic', 'veterinary', 'law-firms'],
  'beauty-salon': ['aesthetic', 'gym', 'retail', 'boutique-hotels'],
  aesthetic: ['beauty-salon', 'dentists', 'healthcare', 'gym'],
  gym: ['beauty-salon', 'schools', 'aesthetic', 'healthcare'],
  veterinary: ['healthcare', 'dentists', 'retail', 'auto-service'],
  'law-firms': ['real-estate', 'schools', 'dentists', 'auto-service'],
  'real-estate': ['law-firms', 'hotels', 'auto-service', 'retail'],
  'auto-service': ['retail', 'real-estate', 'delivery', 'veterinary'],
  schools: ['gym', 'law-firms', 'healthcare', 'real-estate'],
  retail: ['restaurants', 'beauty-salon', 'auto-service', 'delivery'],
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
