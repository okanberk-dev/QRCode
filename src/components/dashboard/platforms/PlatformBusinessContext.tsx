'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { PulseSelect } from '@/components/ui';
import { detectSector, type SectorKey } from '@/lib/sector-platforms';
import type { PlatformLinkState, PlatformLinkSummary } from '@/lib/platform-link-status';
import { PlatformStateIcon } from './PlatformStatusPill';

export const SECTOR_LABELS: Record<SectorKey, { tr: string; en: string }> = {
  food: { tr: 'Yemek & Restoran', en: 'Food & Restaurant' },
  delivery: { tr: 'Paket Servis', en: 'Delivery' },
  hospitality: { tr: 'Konaklama', en: 'Hospitality' },
  clinic: { tr: 'Sağlık & Klinik', en: 'Health & Clinic' },
  legal: { tr: 'Hukuk', en: 'Legal' },
  spa: { tr: 'Güzellik & Spa', en: 'Beauty & Spa' },
  retail: { tr: 'Perakende', en: 'Retail' },
  fitness: { tr: 'Fitness & Spor', en: 'Fitness & Sports' },
  education: { tr: 'Eğitim', en: 'Education' },
  other: { tr: 'Diğer', en: 'Other' },
};

export function sectorLabelFor(category: string | null | undefined, locale: 'tr' | 'en'): string {
  const label = SECTOR_LABELS[detectSector(category)];
  return locale === 'tr' ? label.tr : label.en;
}

export function settingsPlatformsHref(locale: 'tr' | 'en', restaurantId: string): string {
  return `/${locale}/dashboard/restaurants/${encodeURIComponent(restaurantId)}/settings?section=platforms`;
}

const SUMMARY_PARTS: Array<{
  key: keyof PlatformLinkSummary;
  state: PlatformLinkState;
  tr: string;
  en: string;
}> = [
  { key: 'connected', state: 'connected', tr: 'bağlı', en: 'connected' },
  { key: 'issue', state: 'issue', tr: 'sorunlu', en: 'need attention' },
  { key: 'missing', state: 'missing', tr: 'eksik', en: 'not added' },
  { key: 'off', state: 'off', tr: 'kapalı', en: 'off' },
];

// Wrapping separator list: every item carries a leading "·" in its left
// padding and the row is shifted left by that padding inside an
// overflow-hidden box, so the separator of whichever item starts a line is
// clipped — no dangling "·" at line ends or starts when the row wraps
// (e.g. the 820px context card). The dot is hidden from assistive tech.
const SEPARATED_ITEM =
  "relative pl-3 before:absolute before:left-[3px] before:text-[#737373] before:content-['·'_/_'']";

/**
 * "3 bağlı · 1 sorunlu · 5 eksik" — only non-zero counts, icon-prefixed.
 * `lead` (e.g. the sector label) is rendered as the first item of the same
 * wrapping row.
 */
export function PlatformSummaryLine({
  summary,
  locale,
  lead,
}: {
  summary: PlatformLinkSummary;
  locale: 'tr' | 'en';
  lead?: ReactNode;
}) {
  const parts = SUMMARY_PARTS.filter((part) => summary[part.key] > 0);
  if (parts.length === 0 && !lead) return null;
  return (
    <span className="block overflow-hidden">
      <span className="-ml-3 flex flex-wrap items-center gap-y-0.5">
        {lead && <span className={SEPARATED_ITEM}>{lead}</span>}
        {parts.map((part) => (
          <span key={part.key} className={`${SEPARATED_ITEM} inline-flex items-center gap-1 whitespace-nowrap`}>
            <PlatformStateIcon state={part.state} size={12} />
            {summary[part.key]} {locale === 'tr' ? part.tr : part.en}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * The single page-level business control on the platform pages: which
 * business you are editing, its sector, the review-link summary, a
 * labelled business picker (multi-business owners only) and the way back to
 * that business's settings.
 */
export function PlatformBusinessContext({
  locale,
  restaurant,
  restaurants,
  summary,
  onSelect,
}: {
  locale: 'tr' | 'en';
  restaurant: { id: string; name: string; category: string | null };
  restaurants: Array<{ id: string; name: string }>;
  summary: PlatformLinkSummary;
  onSelect: (restaurantId: string) => void;
}) {
  const isTr = locale === 'tr';
  const initial = restaurant.name.trim().charAt(0).toLocaleUpperCase(isTr ? 'tr-TR' : 'en-US') || '•';
  return (
    <section
      aria-labelledby="pb-ctx"
      className="bz-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#0A0A0A] text-[14px] font-semibold text-[#C6F24E]"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <h2 id="pb-ctx" className="bz-h-tight truncate text-[16px] text-[#0A0A0A]">
            {restaurant.name}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-[#525252]">
            <PlatformSummaryLine
              summary={summary}
              locale={locale}
              lead={sectorLabelFor(restaurant.category, locale)}
            />
          </p>
        </div>
      </div>
      {restaurants.length > 1 && (
        <div className="flex w-full flex-col gap-1 sm:w-[240px]">
          <span id="pb-select-label" className="text-[12px] font-semibold text-[#0A0A0A]">
            {isTr ? 'İşletme' : 'Business'}
          </span>
          <PulseSelect
            aria-labelledby="pb-select-label"
            value={restaurant.id}
            onChange={onSelect}
            options={restaurants.map((item) => ({ value: item.id, label: item.name }))}
            className="w-full"
          />
        </div>
      )}
      <Link
        href={settingsPlatformsHref(locale, restaurant.id)}
        className={`bz-btn-ghost inline-flex min-h-[44px] items-center justify-center gap-1.5 text-[12.5px] focus-visible:outline-none focus-visible:ring-2! focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 sm:min-h-[38px] ${restaurants.length > 1 ? 'sm:self-end' : ''}`}
      >
        <Settings size={14} aria-hidden="true" />
        {isTr ? 'İşletme ayarları' : 'Business settings'}
      </Link>
    </section>
  );
}

export default PlatformBusinessContext;
