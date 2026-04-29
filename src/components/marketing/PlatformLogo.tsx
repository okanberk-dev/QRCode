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
  yemeksepeti: '/platforms/yemeksepeti.png',
  'getir-yemek': '/platforms/getir.png',
  'trendyol-go': '/platforms/trendyol-go.png',
  'migros-hemen': '/platforms/migros-hemen.svg',
  yelp: '/platforms/yelp.svg',
  tripadvisor: '/platforms/tripadvisor.svg',
  booking: '/platforms/booking.svg',
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

export const TR_DELIVERY: PlatformItem[] = [
  { id: 'yemeksepeti', name: 'Yemeksepeti', tag: 'Paket servis · Türkiye' },
  { id: 'getir-yemek', name: 'Getir Yemek', tag: 'Paket servis · Türkiye' },
  { id: 'trendyol-go', name: 'Trendyol GO', tag: 'Paket servis · Türkiye' },
  { id: 'ubereats', name: 'Uber Eats', tag: 'Paket servis · Global' },
];

export const TR_REVIEW: PlatformItem[] = [
  { id: 'google', name: 'Google', tag: 'Yorum & arama' },
  { id: 'foursquare', name: 'Foursquare', tag: 'Konum & yorum' },
  { id: 'facebook', name: 'Facebook', tag: 'Sosyal' },
  { id: 'instagram', name: 'Instagram', tag: 'Sosyal' },
];

export const GLOBAL_REVIEW: PlatformItem[] = [
  { id: 'google', name: 'Google', tag: 'Reviews & Search' },
  { id: 'yelp', name: 'Yelp', tag: 'Local reviews' },
  { id: 'tripadvisor', name: 'Tripadvisor', tag: 'Travel & hospitality' },
  { id: 'trustpilot', name: 'Trustpilot', tag: 'Verified reviews' },
  { id: 'facebook', name: 'Facebook', tag: 'Social' },
  { id: 'booking', name: 'Booking.com', tag: 'Hotel' },
  { id: 'opentable', name: 'OpenTable', tag: 'Restaurant' },
];

export const GLOBAL_DELIVERY: PlatformItem[] = [
  { id: 'ubereats', name: 'Uber Eats', tag: 'Delivery · Global' },
  { id: 'doordash', name: 'DoorDash', tag: 'Delivery · US' },
  { id: 'deliveroo', name: 'Deliveroo', tag: 'Delivery · UK/EU' },
];
