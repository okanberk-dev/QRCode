import Link from 'next/link';
import Image from 'next/image';
import { img } from '../ritim/media';

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
    <section id="platforms" className="rt-section rt-reveal" aria-labelledby="platforms-title">
      <div className="rt-container">
        <div className="rt-promo-split">
          <div className="rt-mini-head" style={{ gap: 20 }}>
            <p className="rt-script rt-script--md">{copy.eyebrow}</p>
            <h2 id="platforms-title" className="rt-t-h2">
              {copy.title}
            </h2>
            <p className="rt-t-lead">{copy.lead}</p>
            <p className="rt-eyebrow">{copy.listLabel}</p>
            <ul className="rt-chips rt-chips--sm" style={{ justifyContent: 'flex-start', margin: 0 }}>
              {PLATFORMS.map((platform) => (
                <li key={platform.name} className="rt-chip">
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 99, background: platform.color, marginRight: 10 }} />
                  {platform.name}
                </li>
              ))}
            </ul>
            <p className="rt-t-muted">{copy.google}</p>
            <Link className="rt-link-arrow" href={`/${locale}/integrations`}>
              {copy.link}
            </Link>
          </div>
          <div className="rt-promo-split__media">
            <Image src={img('misafirler')} alt="" width={723} height={579} sizes="(max-width: 1023px) 100vw, 720px" />
          </div>
        </div>
      </div>
    </section>
  );
}
