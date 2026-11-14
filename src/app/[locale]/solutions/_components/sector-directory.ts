import type { LucideIcon } from 'lucide-react';
import { RELATED_SOLUTIONS_LIST } from '@/lib/related-solutions';
import { SECTOR_PLATFORMS, type SectorKey } from '@/lib/sector-platforms';

/**
 * Data for the /solutions directory (hub grid and the QR generator's
 * industry links).
 *
 * Which pages exist, their order, names and icons come from
 * RELATED_SOLUTIONS_LIST (one list for every surface, so the count is always
 * SECTOR_COUNT). This module only adds what the directory shows on top:
 *   - `sector`: the product sector a business of that kind picks during
 *     setup; it drives the review platforms the panel shows
 *     (SECTOR_PLATFORMS, the same whitelist the owner panel uses) and must
 *     match the `sector` prop of the page itself;
 *   - `where`: where the QR code usually goes (a placement suggestion, not a
 *     product feature);
 *   - the group a page is listed under.
 * A page added to RELATED_SOLUTIONS_LIST without an entry here still shows up
 * (in a final "other" group), so the directory can never drop a sector page.
 */

export type DirectoryLocale = 'tr' | 'en';

interface Localized {
  tr: string;
  en: string;
}

interface SectorMeta {
  sector: SectorKey;
  where: Localized;
}

const SECTOR_META: Record<string, SectorMeta> = {
  restaurants: {
    sector: 'food',
    where: { tr: 'Masa kartı, hesap sümeni ve paket', en: 'Table cards, bill folders and takeaway bags' },
  },
  delivery: {
    sector: 'delivery',
    where: { tr: 'Poşet kartı ve kap etiketi', en: 'Bag inserts and lid labels' },
  },
  hotels: {
    sector: 'hospitality',
    where: { tr: 'Oda, restoran ve resepsiyon', en: 'Rooms, restaurant and reception' },
  },
  'boutique-hotels': {
    sector: 'hospitality',
    where: { tr: 'Oda kartı, kahvaltı salonu ve resepsiyon', en: 'Room cards, breakfast room and reception' },
  },
  healthcare: {
    sector: 'clinic',
    where: { tr: 'Bölüm bekleme alanları ve çıkış bankosu', en: 'Department waiting areas and the checkout desk' },
  },
  dentists: {
    sector: 'clinic',
    where: { tr: 'Ödeme bankosu ve bakım kartı', en: 'Payment desk and aftercare cards' },
  },
  aesthetic: {
    sector: 'clinic',
    where: { tr: 'Kontrol randevusu ve ödeme alanı', en: 'Follow-up visits and the payment area' },
  },
  veterinary: {
    sector: 'clinic',
    where: { tr: 'Ödeme bankosu ve aşı karnesi', en: 'Payment desk and vaccination cards' },
  },
  'beauty-salon': {
    sector: 'spa',
    where: { tr: 'Ayna kenarı, kasa ve randevu kartı', en: 'Mirrors, front desk and appointment cards' },
  },
  gym: {
    sector: 'fitness',
    where: { tr: 'Turnike çıkışı ve soyunma odası koridoru', en: 'Turnstile exit and locker-room corridor' },
  },
  'law-firms': {
    sector: 'legal',
    where: { tr: 'Bekleme alanı ve kartvizit', en: 'Waiting area and business cards' },
  },
  'real-estate': {
    sector: 'other',
    where: { tr: 'Anahtar teslim zarfı ve kartvizit', en: 'Key handover envelopes and business cards' },
  },
  'auto-service': {
    sector: 'other',
    where: { tr: 'Dikiz aynası askısı ve fatura', en: 'Mirror hangers and invoices' },
  },
  schools: {
    sector: 'education',
    where: { tr: 'Veli toplantısı ve kayıt ofisi', en: 'Parent meetings and the admissions office' },
  },
  retail: {
    sector: 'retail',
    where: { tr: 'Kasa, poşet ve deneme kabini', en: 'Checkout, bags and fitting rooms' },
  },
};

const SECTOR_GROUPS: ReadonlyArray<{ id: string; title: Localized; slugs: readonly string[] }> = [
  { id: 'food', title: { tr: 'Yeme-içme', en: 'Food and drink' }, slugs: ['restaurants', 'delivery'] },
  { id: 'hospitality', title: { tr: 'Konaklama', en: 'Hospitality' }, slugs: ['hotels', 'boutique-hotels'] },
  {
    id: 'health',
    title: { tr: 'Sağlık', en: 'Health' },
    slugs: ['healthcare', 'dentists', 'aesthetic', 'veterinary'],
  },
  { id: 'care', title: { tr: 'Güzellik ve spor', en: 'Beauty and fitness' }, slugs: ['beauty-salon', 'gym'] },
  { id: 'retail', title: { tr: 'Mağaza ve servis', en: 'Retail and repair' }, slugs: ['retail', 'auto-service'] },
  {
    id: 'services',
    title: { tr: 'Profesyonel hizmetler ve eğitim', en: 'Professional services and education' },
    slugs: ['law-firms', 'real-estate', 'schools'],
  },
];

const OTHER_GROUP_TITLE: Localized = { tr: 'Diğer sektörler', en: 'Other industries' };

/** Display names of the review platform ids used in SECTOR_PLATFORMS. */
const PLATFORM_NAMES: Record<string, string> = {
  google: 'Google',
  yemeksepeti: 'Yemeksepeti',
  getir: 'Getir',
  trendyol: 'Trendyol GO',
  trendyol_go: 'Trendyol GO',
  tripadvisor: 'Tripadvisor',
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  yandex: 'Yandex',
  yelp: 'Yelp',
  foursquare: 'Foursquare',
};

export interface DirectoryEntry {
  slug: string;
  Icon: LucideIcon;
  name: Localized;
  /** Where the QR usually goes; empty when the page has no entry in SECTOR_META. */
  where: Localized | null;
  /** Review platforms the panel shows for this sector, in panel order. */
  platforms: string[];
}

export interface DirectoryGroup {
  id: string;
  title: Localized;
  entries: DirectoryEntry[];
}

function platformsFor(sector: SectorKey | undefined): string[] {
  if (!sector) return [];
  return SECTOR_PLATFORMS[sector].map((id) => PLATFORM_NAMES[id] ?? id);
}

/** Names of the review platforms the panel shows for a product sector. */
export function platformNamesForSector(sector: SectorKey): string[] {
  return platformsFor(sector);
}

/** "A, B ve C" / "A, B and C". */
export function joinNames(names: readonly string[], locale: DirectoryLocale): string {
  if (names.length <= 1) return names.join('');
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(', ')} ${locale === 'tr' ? 've' : 'and'} ${last}`;
}

function toEntry(slug: string): DirectoryEntry | null {
  const source = RELATED_SOLUTIONS_LIST.find((entry) => entry.slug === slug);
  if (!source) return null;
  const meta = SECTOR_META[slug];
  return {
    slug,
    Icon: source.Icon,
    name: { tr: source.tr, en: source.en },
    where: meta ? meta.where : null,
    platforms: platformsFor(meta?.sector),
  };
}

/** Every sector page, grouped for the /solutions directory. */
export function getSectorDirectory(): DirectoryGroup[] {
  const placed = new Set<string>();
  const groups: DirectoryGroup[] = [];
  for (const group of SECTOR_GROUPS) {
    const entries = group.slugs.flatMap((slug) => {
      const entry = toEntry(slug);
      if (!entry) return [];
      placed.add(slug);
      return [entry];
    });
    if (entries.length > 0) groups.push({ id: group.id, title: group.title, entries });
  }
  const rest = RELATED_SOLUTIONS_LIST.filter((entry) => !placed.has(entry.slug)).flatMap((entry) => {
    const item = toEntry(entry.slug);
    return item ? [item] : [];
  });
  if (rest.length > 0) groups.push({ id: 'other', title: OTHER_GROUP_TITLE, entries: rest });
  return groups;
}

/** The same entries in display order, flattened (for the ItemList JSON-LD). */
export function getSectorDirectoryFlat(): DirectoryEntry[] {
  return getSectorDirectory().flatMap((group) => group.entries);
}

/** Selected entries in the given order; unknown slugs are skipped. */
export function getSectorEntries(slugs: readonly string[]): DirectoryEntry[] {
  return slugs.flatMap((slug) => {
    const entry = toEntry(slug);
    return entry ? [entry] : [];
  });
}

/** "Google, Yemeksepeti, Getir +5" style summary for small cards. */
export function platformSummary(platforms: readonly string[], shown = 3): string {
  const head = platforms.slice(0, shown).join(', ');
  return platforms.length > shown ? `${head} +${platforms.length - shown}` : head;
}
