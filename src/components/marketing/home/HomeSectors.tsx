import Link from 'next/link';
import { RtStories } from '../ritim/interactive';
import { img } from '../ritim/media';
import { RELATED_SOLUTIONS_LIST, SECTOR_COUNT } from '@/lib/related-solutions';
import { SECTOR_PLATFORMS, type SectorKey } from '@/lib/sector-platforms';

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

/** Photo + handwritten line per sector for the story rail. */
const SLIDE_ART: Record<string, { img: string; script: { tr: string; en: string } }> = {
  restaurants: { img: img('restoran-ic'), script: { tr: 'masada, adisyonda', en: 'at the table' } },
  delivery: { img: img('online-siparis'), script: { tr: 'paketin içinde', en: 'inside the bag' } },
  hotels: { img: img('restoran-aydinlik'), script: { tr: 'odada, resepsiyonda', en: 'in the room' } },
  healthcare: { img: img('destek-ekip'), script: { tr: 'bekleme salonunda', en: 'in the waiting room' } },
  'beauty-salon': { img: img('kafe-ic'), script: { tr: 'ayna önünde', en: 'by the mirror' } },
  retail: { img: img('market'), script: { tr: 'kasada, fişte', en: 'at the till' } },
};

/** Business types → the closest sector page (chips with a photo peek). */
const CHIPS: { tr: string; en: string; slug: string; img: string }[] = [
  { tr: 'Restoran', en: 'Restaurant', slug: 'restaurants', img: img('fine-dining') },
  { tr: 'Kafe', en: 'Café', slug: 'restaurants', img: img('kafe') },
  { tr: 'Pastane', en: 'Bakery', slug: 'restaurants', img: img('kahvalti') },
  { tr: 'Bar', en: 'Bar', slug: 'restaurants', img: img('bar') },
  { tr: 'Pizzacı', en: 'Pizzeria', slug: 'restaurants', img: img('pizza') },
  { tr: 'Burgerci', en: 'Burger joint', slug: 'restaurants', img: img('burger') },
  { tr: 'Paket servis', en: 'Delivery', slug: 'delivery', img: img('tako') },
  { tr: 'Otel', en: 'Hotel', slug: 'hotels', img: img('restoran-aydinlik') },
  { tr: 'Klinik', en: 'Clinic', slug: 'healthcare', img: img('destek-ekip') },
  { tr: 'Kuaför', en: 'Hair salon', slug: 'beauty-salon', img: img('kafe-ic') },
  { tr: 'Güzellik salonu', en: 'Beauty salon', slug: 'beauty-salon', img: img('restoran-yesil') },
  { tr: 'Mağaza', en: 'Shop', slug: 'retail', img: img('market') },
  { tr: 'Market', en: 'Grocery', slug: 'retail', img: img('kafe-bahce') },
];

export default function HomeSectors({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const tr = locale === 'tr';
  const base = `/${locale}`;
  const existing = new Map(RELATED_SOLUTIONS_LIST.map((entry) => [entry.slug, entry] as const));

  const slides = FEATURED.filter((f) => existing.has(f.slug)).map((f) => {
    const entry = existing.get(f.slug)!;
    const art = SLIDE_ART[f.slug];
    const name = tr ? entry.tr : entry.en;
    return {
      img: art.img,
      stat: name,
      statSub: art.script[locale],
      quote: `${copy.platforms}: ${platformSummary(f.sector, locale)}.`,
      sign: name,
      by: `${copy.where} · ${f.where[locale]}`,
      href: `${base}/solutions/${f.slug}`,
      linkLabel: tr ? 'Sektör sayfası' : 'Industry page',
    };
  });

  return (
    <>
      <section id="industries" className="rt-section rt-reveal" aria-labelledby="industries-title">
        <div className="rt-stories">
          <div className="rt-container">
            <div className="rt-section-head">
              <div className="rt-section-head__text">
                <p className="rt-eyebrow">{copy.eyebrow}</p>
                <h2 id="industries-title" className="rt-t-h1">
                  {copy.title}
                </h2>
                <p className="rt-t-lead">{copy.lead}</p>
              </div>
              <Link className="rt-btn rt-btn--primary" href={`${base}/solutions`}>
                {copy.allTitle}
              </Link>
            </div>
            <RtStories slides={slides} prevLabel={tr ? 'Önceki sektör' : 'Previous industry'} nextLabel={tr ? 'Sonraki sektör' : 'Next industry'} />
          </div>
        </div>
      </section>

      <section className="rt-section rt-reveal" aria-labelledby="business-types-title">
        <div className="rt-container">
          <div className="rt-section-head rt-section-head--center">
            <div className="rt-section-head__text">
              <h2 id="business-types-title" className="rt-t-h1">
                {tr ? 'Hangi işletmeyi yönetiyorsanız' : 'Whatever business you run'}
              </h2>
              <p className="rt-t-lead">
                {tr
                  ? 'QR kodun yeri ve öne çıkan platformlar işletmeye göre değişir. Size en yakın sayfayı seçin.'
                  : 'Where the QR code goes and which platforms matter depends on the business. Pick the page closest to yours.'}
              </p>
            </div>
          </div>
          <div className="rt-chips">
            {CHIPS.map((c) => (
              <Link key={c.tr} className="rt-chip" href={`${base}/solutions/${c.slug}`} prefetch={false}>
                {tr ? c.tr : c.en}
                <span className="rt-chip__peek" aria-hidden="true">
                  <img src={c.img} alt="" loading="lazy" decoding="async" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
