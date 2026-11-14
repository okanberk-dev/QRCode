import type { SectorKey } from './sector-platforms';

// Single source of truth for the sector picker shown across:
//   - Onboarding wizard (`src/app/[locale]/onboarding/page.tsx`)
//   - Owner restaurant create modal (`/[locale]/dashboard/restaurants/page.tsx`)
//   - Onboarding complete API (`/api/onboarding/complete/route.ts`)
//
// Historical bug: the onboarding form persisted the Turkish slug (e.g.
// `paket`) but the API mapping table keyed on English slugs (`delivery`),
// so every restaurant fell through to the `'Restoran'` fallback regardless
// of what the owner picked. Consolidating the list here keeps form ID,
// stored DB label, classification key (drives `getSectorPlatforms`) and
// localized display copy in one row — adding a sector or renaming a label
// is a single-line change.

export type SectorOptionId =
  | 'restoran'
  | 'paket'
  | 'otel'
  | 'klinik'
  | 'hukuk'
  | 'spa'
  | 'perakende'
  | 'fitness'
  | 'egitim'
  | 'diger';

export interface SectorOption {
  /** Form ID — used by onboarding picker + create modal `<select>`. */
  id: SectorOptionId;
  /**
   * Stored DB value on `Restaurant.category`. Turkish label is canonical;
   * detectSector() uses keyword matching so historical free-form values
   * (Kafe, Pastane, Fast Food…) keep working.
   */
  label: string;
  /** Sector classification — drives the platform whitelist. */
  sectorKey: SectorKey;
  /** Localized display label shown in pickers. */
  display: { tr: string; en: string };
  /** One-line sub-description shown under the picker option. */
  sub: { tr: string; en: string };
}

export const SECTORS: readonly SectorOption[] = [
  {
    id: 'restoran',
    label: 'Restoran',
    sectorKey: 'food',
    display: { tr: 'Restoran & Kafe', en: 'Restaurant & Café' },
    sub: { tr: 'Masa, fatura ve paket QR', en: 'Table, receipt and pack QR' },
  },
  {
    id: 'paket',
    label: 'Paket Servis',
    sectorKey: 'delivery',
    display: { tr: 'Paket Servis', en: 'Delivery' },
    sub: { tr: 'Yemeksepeti, Getir, Trendyol GO', en: 'Yemeksepeti, Getir, Trendyol GO' },
  },
  {
    id: 'otel',
    label: 'Otel',
    sectorKey: 'hospitality',
    display: { tr: 'Otel & Konaklama', en: 'Hotel & Hospitality' },
    sub: { tr: 'Oda QR, Tripadvisor, Airbnb', en: 'Room QR, Tripadvisor, Airbnb' },
  },
  {
    id: 'klinik',
    label: 'Klinik',
    sectorKey: 'clinic',
    display: { tr: 'Klinik & Sağlık', en: 'Clinic & Health' },
    sub: { tr: 'KVKK uyumlu anket akışı', en: 'KVKK-compliant survey flow' },
  },
  {
    id: 'hukuk',
    label: 'Hukuk',
    sectorKey: 'legal',
    display: { tr: 'Hukuk Ofisi', en: 'Legal' },
    sub: { tr: 'Danışmanlık sonrası yorum', en: 'Post-consultation review' },
  },
  {
    id: 'spa',
    label: 'Spa',
    sectorKey: 'spa',
    display: { tr: 'Güzellik & Spa', en: 'Beauty & Spa' },
    sub: { tr: 'Hizmet sonrası geri bildirim', en: 'Post-service feedback' },
  },
  {
    id: 'perakende',
    label: 'Perakende',
    sectorKey: 'retail',
    display: { tr: 'Perakende', en: 'Retail' },
    sub: { tr: 'Kasa QR, çok mağaza', en: 'Checkout QR, multi-store' },
  },
  {
    id: 'fitness',
    label: 'Fitness',
    sectorKey: 'fitness',
    display: { tr: 'Spor & Fitness', en: 'Sports & Fitness' },
    sub: { tr: 'Seans sonrası geri bildirim', en: 'Post-session feedback' },
  },
  {
    id: 'egitim',
    label: 'Eğitim',
    sectorKey: 'education',
    display: { tr: 'Eğitim', en: 'Education' },
    sub: { tr: 'Kurs ve seminer değerlendirmesi', en: 'Course and seminar review' },
  },
  {
    id: 'diger',
    label: 'Diğer',
    sectorKey: 'other',
    display: { tr: 'Diğer', en: 'Other' },
    sub: { tr: 'Sektörünü sonra özelleştir', en: 'Tell us more later' },
  },
];

export function getSectorById(id: string | null | undefined): SectorOption | undefined {
  if (!id) return undefined;
  return SECTORS.find((s) => s.id === id);
}

/**
 * Reverse lookup from a stored `Restaurant.category` value to the picker
 * option. Tries exact label match first, then falls back to a fuzzy match
 * (case-insensitive substring) so values typed by hand or migrated from the
 * legacy admin dropdown ('Kafe', 'Fast Food', 'Güzellik salonu', …) still
 * resolve to the correct row.
 */
export function getSectorByLabel(label: string | null | undefined): SectorOption | undefined {
  if (!label) return undefined;
  const exact = SECTORS.find((s) => s.label === label);
  if (exact) return exact;
  const lower = label.toLowerCase();
  return SECTORS.find((s) => lower.includes(s.label.toLowerCase()));
}

/**
 * Convert a form ID to the canonical `Restaurant.category` string. Falls
 * back to `'Restoran'` for unrecognized IDs — same default as the schema.
 */
export function sectorIdToLabel(id: string | null | undefined): string {
  return getSectorById(id)?.label ?? 'Restoran';
}
