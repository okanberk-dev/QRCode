import type { PlatformId } from '@/components/ui';

// Sector → review platform whitelist. Source of truth for what's shown on the
// owner platforms page, the restaurant detail forms (owner + admin) and the
// integrations page. CLAUDE.md §23.5 / mobile parity §25 don't apply here —
// this is purely behavioural filtering on top of free-form Restaurant.category.

export type SectorKey =
  | 'food'
  | 'delivery'
  | 'hospitality'
  | 'clinic'
  | 'legal'
  | 'spa'
  | 'retail'
  | 'fitness'
  | 'education'
  | 'other';

export const SECTOR_PLATFORMS: Record<SectorKey, PlatformId[]> = {
  // Yelp + Foursquare for food / hospitality verticals (Stage 10 — CLAUDE.md
  // §38.80). Inserted after Tripadvisor on the priority chain: TR-side review
  // platforms (yemeksepeti / getir / trendyol) come first, global directories
  // (tripadvisor / yelp / foursquare) follow, search engines (yandex) last.
  food: ['google', 'yemeksepeti', 'getir', 'trendyol', 'tripadvisor', 'yelp', 'foursquare', 'yandex'],
  delivery: ['google', 'yemeksepeti', 'getir', 'trendyol'],
  hospitality: ['google', 'tripadvisor', 'booking', 'airbnb', 'yelp', 'foursquare', 'yandex'],
  clinic: ['google', 'yandex'],
  legal: ['google'],
  spa: ['google', 'yandex'],
  retail: ['google', 'yandex'],
  fitness: ['google'],
  education: ['google'],
  // Unknown / catch-all sector: show universal review surfaces only — neither
  // delivery-specific nor lodging-specific. Owners with an unusual business
  // can still set Google + Tripadvisor without committing to a vertical.
  other: ['google', 'tripadvisor', 'yandex'],
};

// Categories are free-form across three entry points (onboarding sector list,
// owner profile dropdown, admin detail dropdown) with overlapping but
// inconsistent vocabularies — see CLAUDE.md notes. Use keyword `includes`
// matching to stay forgiving; first match wins.
export function detectSector(category: string | null | undefined): SectorKey {
  const c = (category || '').toLowerCase().trim();
  if (!c) return 'food'; // schema default = 'Restoran'
  if (c.includes('paket')) return 'delivery';
  if (c.includes('otel') || c.includes('hotel') || c.includes('konaklama')) return 'hospitality';
  if (
    c.includes('klinik') ||
    c.includes('clinic') ||
    c.includes('sağlık') ||
    c.includes('saglik') ||
    c.includes('health')
  ) {
    return 'clinic';
  }
  if (c.includes('hukuk') || c.includes('legal') || c.includes('avukat')) return 'legal';
  if (
    c.includes('spa') ||
    c.includes('güzellik') ||
    c.includes('guzellik') ||
    c.includes('beauty') ||
    c.includes('kuaför') ||
    c.includes('kuafor')
  ) {
    return 'spa';
  }
  if (
    c.includes('perakende') ||
    c.includes('retail') ||
    c.includes('mağaza') ||
    c.includes('magaza') ||
    c.includes('shop') ||
    c.includes('store')
  ) {
    return 'retail';
  }
  if (c.includes('fitness') || c.includes('spor') || c.includes('gym')) return 'fitness';
  if (
    c.includes('eğitim') ||
    c.includes('egitim') ||
    c.includes('education') ||
    c.includes('kurs') ||
    c.includes('seminer')
  ) {
    return 'education';
  }
  if (c.includes('diğer') || c.includes('diger') || c.includes('other')) return 'other';
  // Default branch: covers Restoran, Kafe, Pastane, Meyhane, Fast Food,
  // Fine Dining and any other food-adjacent free text.
  return 'food';
}

export function getSectorPlatforms(category: string | null | undefined): Set<PlatformId> {
  return new Set(SECTOR_PLATFORMS[detectSector(category)]);
}
