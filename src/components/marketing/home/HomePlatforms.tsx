import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import PlatformOrbitStage from '@/components/marketing/three/PlatformOrbitStage';
import SectionHeader from './SectionHeader';

/**
 * "Platform bağlantıları" — the homepage's first dark section and the only
 * place it lists the 10 review platforms. The three.js orbit (spec D14,
 * placement 2) is decorative: pulses travel from the core out to the
 * platforms, matching the copy — Buaze sends the customer on to a review
 * page; it imports no reviews. The platform names are real HTML text.
 *
 * Dot colors match the scene's node colors (Booking.com uses #0A5CC2, a
 * lighter shade of its brand blue that stays visible on graphite).
 */

const PLATFORMS: readonly { name: string; color: string }[] = [
  { name: 'Google', color: '#4285F4' },
  { name: 'Yemeksepeti', color: '#FA0050' },
  { name: 'Getir', color: '#5D3EBC' },
  { name: 'Trendyol GO', color: '#F27A1A' },
  { name: 'Tripadvisor', color: '#34E0A1' },
  { name: 'Airbnb', color: '#FF5A5F' },
  { name: 'Booking.com', color: '#0A5CC2' },
  { name: 'Yandex', color: '#FC3F1D' },
  { name: 'Yelp', color: '#D32323' },
  { name: 'Foursquare', color: '#F94877' },
];

const COPY = {
  tr: {
    eyebrow: 'Platform bağlantıları',
    title: 'Müşterinizi seçtiğiniz platformun yorum sayfasına gönderin',
    lead: '10 yorum platformundaki bağlantılarınızı tek yerden yönetirsiniz; Buaze bu bağlantıları her gün otomatik olarak kontrol eder. Yorumlar ilgili platformda yazılır ve orada kalır.',
    listLabel: 'Desteklenen yorum platformları',
    google:
      "Google için ayrıca puanınızı, yorum sayınızı ve Google'ın gösterdiği en fazla 5 yorumu panelde görürsünüz.",
    link: 'Platform bağlantıları hakkında',
  },
  en: {
    eyebrow: 'Platform links',
    title: 'Send customers to the review page you choose',
    lead: 'Manage your links on 10 review platforms from one place; Buaze checks them automatically every day. Reviews are written on each platform and stay there.',
    listLabel: 'Supported review platforms',
    google: 'For Google, the panel also shows your rating, review count and up to 5 reviews that Google returns.',
    link: 'About platform links',
  },
} as const;

export default function HomePlatforms({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];

  return (
    <section
      id="platforms"
      aria-labelledby="platforms-title"
      className="overflow-hidden bg-[#0A0A0A] py-[60px] text-white sm:py-24"
    >
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-5 sm:px-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-16 lg:gap-y-10">
        <SectionHeader
          id="platforms-title"
          tone="dark"
          eyebrow={copy.eyebrow}
          title={copy.title}
          lead={copy.lead}
          className="lg:col-start-1 lg:row-start-1 lg:self-end"
        />

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <PlatformOrbitStage
            locale={locale}
            theme="dark"
            id="home-orbit"
            className="mx-auto max-w-[340px] sm:max-w-[440px] lg:max-w-[520px]"
          />
        </div>

        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <p className="pulse-eyebrow text-white/70">{copy.listLabel}</p>
          <ul className="mt-4 grid max-w-[420px] grid-cols-2 gap-x-6 gap-y-3">
            {PLATFORMS.map((platform) => (
              <li key={platform.name} className="flex items-center gap-2.5 text-[15px] text-white">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: platform.color }}
                />
                {platform.name}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-[520px] text-[15px] leading-[1.6] text-white/70">{copy.google}</p>
          <Link
            href={`/${locale}/integrations`}
            className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-semibold text-white underline decoration-[#C6F24E] decoration-2 underline-offset-4 transition-colors hover:text-[#C6F24E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
          >
            {copy.link}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
