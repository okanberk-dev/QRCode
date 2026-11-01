// Platform logos are local SVG assets under /public/platforms.
// Component API is intentionally stable because it is used across marketing
// and panel onboarding surfaces.

export type PlatformId =
  | 'google'
  | 'yemeksepeti'
  | 'getir-yemek'
  | 'trendyol-go'
  | 'migros-hemen'
  | 'yelp'
  | 'tripadvisor'
  | 'booking'
  | 'yandex'
  | 'facebook'
  | 'trustpilot'
  | 'foursquare'
  | 'opentable'
  | 'ubereats'
  | 'doordash'
  | 'deliveroo'
  | 'instagram'
  | 'zomato'
  | 'airbnb'
  | 'slack'
  | 'teams'
  | 'whatsapp'
  | 'zapier';

type Props = {
  id: PlatformId;
  size?: number;
  rounded?: number;
  className?: string;
};

const PLATFORM_ASSET: Partial<Record<PlatformId, string>> = {
  google: '/platforms/google.svg',
  yemeksepeti: '/platforms/yemeksepeti.svg',
  'getir-yemek': '/platforms/getir.svg',
  'trendyol-go': '/platforms/trendyol-go.svg',
  'migros-hemen': '/platforms/migros-hemen.svg',
  yelp: '/platforms/yelp.svg',
  tripadvisor: '/platforms/tripadvisor.svg',
  booking: '/platforms/booking.svg',
  yandex: '/platforms/yandex.svg',
  facebook: '/platforms/facebook.svg',
  trustpilot: '/platforms/trustpilot.svg',
  foursquare: '/platforms/foursquare.svg',
  opentable: '/platforms/opentable.svg',
  ubereats: '/platforms/ubereats.svg',
  doordash: '/platforms/doordash.svg',
  deliveroo: '/platforms/deliveroo.svg',
  instagram: '/platforms/instagram.svg',
  zomato: '/platforms/zomato.svg',
  airbnb: '/platforms/airbnb.svg',
  slack: '/platforms/slack.svg',
  teams: '/platforms/teams.svg',
  whatsapp: '/platforms/whatsapp.svg',
  zapier: '/platforms/zapier.svg',
};

export default function PlatformLogo({ id, size = 40, rounded = 10, className }: Props) {
  const src = PLATFORM_ASSET[id];

  if (!src) {
    return (
      <div
        style={{ width: size, height: size, borderRadius: rounded, background: '#EDEDED' }}
        className={className}
        aria-hidden
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ borderRadius: rounded, overflow: 'hidden' }}
      className={className}
      aria-hidden
    >
      <image href={src} width="40" height="40" preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

export type PlatformItem = { id: PlatformId; name: string; tag: string };

// Only platforms Buaze actually supports as review-link targets (CLAUDE.md
// §5: google, yemeksepeti, getir, trendyol_go, tripadvisor, airbnb, booking,
// yandex, yelp, foursquare). These lists render on marketing pages as
// "supported platforms"; listing Uber Eats, DoorDash, Trustpilot, Facebook,
// Instagram or OpenTable there claimed integrations that do not exist.
export const TR_DELIVERY: PlatformItem[] = [
  { id: 'yemeksepeti', name: 'Yemeksepeti', tag: 'Paket servis' },
  { id: 'getir-yemek', name: 'Getir Yemek', tag: 'Paket servis' },
  { id: 'trendyol-go', name: 'Trendyol GO', tag: 'Paket servis' },
];

export const TR_REVIEW: PlatformItem[] = [
  { id: 'google', name: 'Google', tag: 'Yorum & arama' },
  { id: 'tripadvisor', name: 'Tripadvisor', tag: 'Seyahat & konaklama' },
  { id: 'yandex', name: 'Yandex', tag: 'Harita & yorum' },
  { id: 'foursquare', name: 'Foursquare', tag: 'Konum & yorum' },
];

export const GLOBAL_REVIEW: PlatformItem[] = [
  { id: 'google', name: 'Google', tag: 'Reviews & search' },
  { id: 'tripadvisor', name: 'Tripadvisor', tag: 'Travel & hospitality' },
  { id: 'yelp', name: 'Yelp', tag: 'Local reviews' },
  { id: 'foursquare', name: 'Foursquare', tag: 'Places & tips' },
  { id: 'yandex', name: 'Yandex', tag: 'Maps & reviews' },
];

// Booking platforms (kept under the historical "delivery" name; Buaze's
// supported delivery apps are Turkey-only — see TR_DELIVERY).
export const GLOBAL_DELIVERY: PlatformItem[] = [
  { id: 'booking', name: 'Booking.com', tag: 'Hotel stays' },
  { id: 'airbnb', name: 'Airbnb', tag: 'Short stays' },
];
