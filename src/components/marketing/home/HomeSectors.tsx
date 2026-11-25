import Link from 'next/link';
import { ArrowRight, LayoutGrid } from 'lucide-react';
import { RELATED_SOLUTIONS_LIST, SECTOR_COUNT } from '@/lib/related-solutions';
import { SECTOR_PLATFORMS, type SectorKey } from '@/lib/sector-platforms';
import SectionHeader from './SectionHeader';

/**
 * Sectors — plain links to the six sector pages plus the full list (replaces
 * the old client-side tab switcher, whose stats and integration claims were
 * not true). Names, icons and page existence come from RELATED_SOLUTIONS_LIST
 * (the same labels as the navbar, footer and /solutions), the suggested
 * platforms from SECTOR_PLATFORMS (the same whitelist the owner panel uses)
 * and the count from SECTOR_COUNT. "Where the QR goes" lines are placement
 * suggestions, not product features. Each card's title is an H3 holding a
 * stretched link, so the link name stays short.
 */

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

interface FeaturedSector {
  slug: string;
  sector: SectorKey;
  where: { tr: string; en: string };
}

const FEATURED: readonly FeaturedSector[] = [
  {
    slug: 'restaurants',
    sector: 'food',
    where: { tr: 'masa, adisyon ve paket', en: 'tables, bills and takeaway bags' },
  },
  {
    slug: 'delivery',
    sector: 'delivery',
    where: { tr: 'paket ve sipariş kartı', en: 'packages and order cards' },
  },
  {
    slug: 'hotels',
    sector: 'hospitality',
    where: { tr: 'oda, resepsiyon ve oda kartı kılıfı', en: 'rooms, front desk and key card holders' },
  },
  {
    slug: 'healthcare',
    sector: 'clinic',
    where: { tr: 'resepsiyon ve bekleme salonu', en: 'reception and waiting room' },
  },
  {
    slug: 'beauty-salon',
    sector: 'spa',
    where: { tr: 'kasa ve ayna önü', en: 'front desk and mirror stations' },
  },
  {
    slug: 'retail',
    sector: 'retail',
    where: { tr: 'kasa, fiş ve poşet', en: 'checkout, receipts and bags' },
  },
];

const COPY = {
  tr: {
    eyebrow: 'Sektörler',
    title: 'Sektörünüze göre QR yerleşimi ve yorum platformları',
    lead: 'QR kodun nereye konacağı ve hangi platformun öne çıkacağı sektöre göre değişir. Panel, sektörünüze uygun yorum platformlarını gösterir.',
    where: 'QR konumu',
    platforms: 'Platformlar',
    allTitle: 'Tüm sektörler',
    allBody: `${SECTOR_COUNT} sektör sayfasının hepsini görün.`,
  },
  en: {
    eyebrow: 'Industries',
    title: 'QR placement and review platforms by industry',
    lead: 'Where the QR code goes and which platform matters most depends on your industry. The panel shows the review platforms that fit yours.',
    where: 'QR placement',
    platforms: 'Platforms',
    allTitle: 'All industries',
    allBody: `See all ${SECTOR_COUNT} industry pages.`,
  },
} as const;

/** Up to four names in full; longer lists show three, then "ve N platform daha". */
function platformSummary(sector: SectorKey, locale: 'tr' | 'en'): string {
  const names = SECTOR_PLATFORMS[sector].map((id) => PLATFORM_NAMES[id] ?? id);
  if (names.length <= 4) return names.join(', ');
  const shown = names.slice(0, 3).join(', ');
  const rest = names.length - 3;
  return locale === 'tr' ? `${shown} ve ${rest} platform daha` : `${shown} and ${rest} more`;
}

const CARD =
  'group relative flex h-full flex-col rounded-[20px] border p-6 transition-colors focus-within:ring-2 focus-within:ring-[#C6F24E] focus-within:ring-offset-2';
const STRETCHED_LINK = 'after:absolute after:inset-0 after:rounded-[20px] focus-visible:outline-none';

export default function HomeSectors({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const existing = new Map(RELATED_SOLUTIONS_LIST.map((entry) => [entry.slug, entry] as const));

  return (
    <section id="industries" aria-labelledby="industries-title" className="bg-white py-[60px] sm:py-24">
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
        <SectionHeader id="industries-title" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

        <ul className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {FEATURED.map((item) => {
            const entry = existing.get(item.slug);
            if (!entry) return null;
            const Icon = entry.Icon;
            return (
              <li key={item.slug} className={`${CARD} border-[#EDEDED] bg-white hover:border-[#0A0A0A]`}>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#FAFAFA] text-[#0A0A0A] ring-1 ring-[#EDEDED]"
                  >
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <h3 className="min-w-0 flex-1 text-[18px] leading-[1.25] text-[#0A0A0A]">
                    <Link href={`/${locale}/solutions/${item.slug}`} className={STRETCHED_LINK}>
                      {entry[locale]}
                    </Link>
                  </h3>
                  <ArrowRight
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-[#A3A3A3] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0A0A0A] motion-reduce:transition-none"
                  />
                </div>
                <p className="mt-4 text-pretty text-[14px] leading-[1.55] text-[#525252]">
                  <span className="font-medium text-[#0A0A0A]">{copy.where}:</span> {item.where[locale]}
                </p>
                <p className="mt-1 text-pretty text-[14px] leading-[1.55] text-[#525252]">
                  <span className="font-medium text-[#0A0A0A]">{copy.platforms}:</span>{' '}
                  {platformSummary(item.sector, locale)}
                </p>
              </li>
            );
          })}
          <li className={`${CARD} border-[#0A0A0A] bg-[#0A0A0A] hover:bg-[#1A1A1A]`}>
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#C6F24E] text-[#0A0A0A]"
              >
                <LayoutGrid size={18} strokeWidth={2} />
              </span>
              <h3 className="min-w-0 flex-1 text-[18px] leading-[1.25] text-white">
                <Link href={`/${locale}/solutions`} className={STRETCHED_LINK}>
                  {copy.allTitle}
                </Link>
              </h3>
              <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-[#C6F24E]" />
            </div>
            <p className="mt-4 text-[14px] leading-[1.55] text-white/75">{copy.allBody}</p>
          </li>
        </ul>
      </div>
    </section>
  );
}
