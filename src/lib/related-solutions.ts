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
  { slug: 'restaurants', Icon: Utensils, tr: 'Restoran & Kafeler', en: 'Restaurants & Cafes' },
  { slug: 'delivery', Icon: Truck, tr: 'Paket Servisi', en: 'Delivery' },
  { slug: 'hotels', Icon: Hotel, tr: 'Oteller', en: 'Hotels' },
  { slug: 'boutique-hotels', Icon: Building2, tr: 'Butik Oteller', en: 'Boutique Hotels' },
  { slug: 'healthcare', Icon: Stethoscope, tr: 'Sağlık Klinikleri', en: 'Healthcare Clinics' },
  { slug: 'dentists', Icon: Stethoscope, tr: 'Diş Klinikleri', en: 'Dental Clinics' },
  { slug: 'beauty-salon', Icon: Scissors, tr: 'Güzellik Salonları', en: 'Beauty Salons' },
  { slug: 'aesthetic', Icon: Sparkles, tr: 'Estetik & Kozmetik', en: 'Aesthetic & Cosmetics' },
  { slug: 'gym', Icon: Dumbbell, tr: 'Spor Salonları', en: 'Gyms & Fitness' },
  { slug: 'veterinary', Icon: PawPrint, tr: 'Veterinerler', en: 'Veterinary Clinics' },
  { slug: 'law-firms', Icon: Scale, tr: 'Hukuk Firmaları', en: 'Law Firms' },
  { slug: 'real-estate', Icon: HomeIcon, tr: 'Emlak', en: 'Real Estate' },
  { slug: 'auto-service', Icon: Car, tr: 'Araç Servisleri', en: 'Auto Services' },
  { slug: 'schools', Icon: GraduationCap, tr: 'Okullar & Kurslar', en: 'Schools & Courses' },
  { slug: 'retail', Icon: ShoppingBag, tr: 'Perakende & Yerel Hizmetler', en: 'Retail & Local Services' },
];

/**
 * Returns up to N related solutions for a current page slug, filtered
 * to exclude the current slug itself. Stable order = priority order
 * defined in the master list.
 */
export function getRelatedSolutions(currentSlug: string, take = 4): RelatedSolution[] {
  return RELATED_SOLUTIONS_LIST.filter((s) => s.slug !== currentSlug).slice(0, take);
}
