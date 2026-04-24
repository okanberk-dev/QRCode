// Platform logo SVG'leri — TR delivery (Yemeksepeti/Getir/Trendyol/Migros),
// TR/Global review (Google/Yelp/Tripadvisor/Booking/Trustpilot/Facebook/Foursquare/OpenTable),
// Global delivery (Uber Eats/DoorDash/Zomato), Sosyal (Instagram).
// Resmi marka renkleri kullanılır — CLAUDE.md §11 "Dokunulmayan platform brand hex'leri".

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
  | 'instagram'
  | 'zomato';

type Props = {
  id: PlatformId;
  size?: number;
  rounded?: number;
  className?: string;
};

export default function PlatformLogo({ id, size = 40, rounded = 10, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 40 40',
    style: { borderRadius: rounded, overflow: 'hidden' as const },
    className,
    'aria-hidden': true as const,
  };

  switch (id) {
    case 'yemeksepeti':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#FA0050" />
          <text
            x="20"
            y="27"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="17"
            fontWeight="800"
            fill="#FFFFFF"
            letterSpacing="-0.04em"
          >
            ys
          </text>
          <circle cx="30" cy="11" r="1.6" fill="#FFFFFF" />
        </svg>
      );
    case 'getir-yemek':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#5D3EBD" />
          <text
            x="20"
            y="27"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="17"
            fontWeight="800"
            fill="#FFD400"
            letterSpacing="-0.04em"
          >
            getir
          </text>
          <circle cx="7" cy="8" r="1.5" fill="#FFD400" />
        </svg>
      );
    case 'trendyol-go':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#F27A1A" />
          <text
            x="17"
            y="27"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="17"
            fontWeight="800"
            fill="#FFFFFF"
            letterSpacing="-0.04em"
          >
            ty
          </text>
          <circle cx="30" cy="28" r="4" fill="#FFFFFF" />
          <text
            x="30"
            y="30"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="6"
            fontWeight="900"
            fill="#F27A1A"
            letterSpacing="-0.05em"
          >
            GO
          </text>
        </svg>
      );
    case 'migros-hemen':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#F57C1F" />
          <path
            d="M10 28 L10 14 L15 14 L20 22 L25 14 L30 14 L30 28 L26 28 L26 21 L22 27 L18 27 L14 21 L14 28 Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'google':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#FFFFFF" />
          <path
            d="M28.5 20.25c0-.6-.05-1.18-.14-1.75H20v3.3h4.77c-.2 1.1-.82 2.04-1.75 2.67v2.22h2.84c1.66-1.53 2.64-3.79 2.64-6.44z"
            fill="#4285F4"
          />
          <path
            d="M20 29c2.38 0 4.37-.79 5.83-2.14l-2.84-2.2c-.79.53-1.8.84-2.99.84-2.3 0-4.25-1.55-4.94-3.64H12.1v2.29A8.99 8.99 0 0 0 20 29z"
            fill="#34A853"
          />
          <path
            d="M15.06 21.85a5.4 5.4 0 0 1 0-3.45V16.1H12.1a8.99 8.99 0 0 0 0 8.1l2.96-2.35z"
            fill="#FBBC04"
          />
          <path
            d="M20 14.76c1.3 0 2.46.45 3.37 1.32l2.52-2.52A8.98 8.98 0 0 0 20 11a8.99 8.99 0 0 0-7.9 5.1l2.96 2.3c.69-2.09 2.64-3.64 4.94-3.64z"
            fill="#EA4335"
          />
        </svg>
      );
    case 'yelp':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#D32323" />
          <path d="M20 8 L20 22 L15 20 Z" fill="#FFFFFF" />
          <path d="M13 16 L21 21 L17 24 Z" fill="#FFFFFF" />
          <path d="M14 26 L22 24 L20 31 Z" fill="#FFFFFF" />
          <path d="M24 23 L28 26 L24 30 Z" fill="#FFFFFF" />
          <path d="M23 19 L29 14 L30 18 Z" fill="#FFFFFF" />
        </svg>
      );
    case 'tripadvisor':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#00AA6C" />
          <circle cx="14" cy="22" r="5.5" fill="#FFFFFF" />
          <circle cx="26" cy="22" r="5.5" fill="#FFFFFF" />
          <circle cx="14" cy="22" r="2.5" fill="#0A0A0A" />
          <circle cx="26" cy="22" r="2.5" fill="#0A0A0A" />
          <path d="M8 16 L32 16 L28 12 L12 12 Z" fill="#FFFFFF" />
        </svg>
      );
    case 'booking':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#003580" />
          <text
            x="20"
            y="26"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="21"
            fontWeight="800"
            fill="#FFFFFF"
            letterSpacing="-0.05em"
          >
            B.
          </text>
        </svg>
      );
    case 'facebook':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#1877F2" />
          <path
            d="M23 32 L23 21 L27 21 L27.6 16.5 L23 16.5 L23 14.2 C23 12.8 23.4 12 25.3 12 L27.8 12 L27.8 8.1 C27 8 25.7 7.8 24.1 7.8 C20.7 7.8 18.5 9.9 18.5 13.7 L18.5 16.5 L14.6 16.5 L14.6 21 L18.5 21 L18.5 32 Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'trustpilot':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#00B67A" />
          <path
            d="M20 8 L22.8 15.6 L31 15.6 L24.6 20.4 L27.1 28 L20 23.2 L12.9 28 L15.4 20.4 L9 15.6 L17.2 15.6 Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'foursquare':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#F94877" />
          <path
            d="M14 8 L28 8 L26 12 L18 12 L18 17 L25 17 L23 21 L18 21 L18 27 L22 27 L17 33 L14 33 Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'opentable':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#DA3743" />
          <path
            d="M20 10 C14 10 10 14 10 20 C10 26 14 30 20 30 C26 30 30 26 30 20 C30 14 26 10 20 10 Z M20 14 C23 14 26 17 26 20 C26 23 23 26 20 26 C17 26 14 23 14 20 C14 17 17 14 20 14 Z"
            fill="#FFFFFF"
          />
          <rect x="18" y="23" width="4" height="8" fill="#FFFFFF" />
        </svg>
      );
    case 'ubereats':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#06C167" />
          <path d="M10 18 L16 18 L16 22 L10 22 Z" fill="#FFFFFF" />
          <text
            x="24"
            y="27"
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="12"
            fontWeight="800"
            fill="#FFFFFF"
          >
            Eats
          </text>
        </svg>
      );
    case 'doordash':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#FF3008" />
          <path
            d="M10 14 L23 14 C27 14 30 17 30 21 C30 25 27 28 23 28 L17 28 L15 24 L22 24 C24 24 26 22 26 20 C26 18 24 16 22 16 L12 16 Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    case 'instagram':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={`igg-${id}`} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FEDA75" />
              <stop offset="30%" stopColor="#FA7E1E" />
              <stop offset="60%" stopColor="#D62976" />
              <stop offset="100%" stopColor="#4F5BD5" />
            </linearGradient>
          </defs>
          <rect width="40" height="40" fill={`url(#igg-${id})`} rx="8" />
          <rect x="11" y="11" width="18" height="18" rx="5" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="20" cy="20" r="4" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
          <circle cx="25.5" cy="14.5" r="1.3" fill="#FFFFFF" />
        </svg>
      );
    case 'zomato':
      return (
        <svg {...common}>
          <rect width="40" height="40" fill="#E23744" />
          <path
            d="M12 12 L28 12 L28 16 L22 16 L22 28 L18 28 L18 16 L12 16 Z"
            fill="#FFFFFF"
          />
        </svg>
      );
    default:
      return (
        <div
          style={{ width: size, height: size, borderRadius: rounded, background: '#EDEDED' }}
          className={className}
        />
      );
  }
}

export type PlatformItem = { id: PlatformId; name: string; tag: string };

export const TR_DELIVERY: PlatformItem[] = [
  { id: 'yemeksepeti', name: 'Yemeksepeti', tag: 'Paket servis · Türkiye' },
  { id: 'getir-yemek', name: 'Getir Yemek', tag: 'Paket servis · Türkiye' },
  { id: 'trendyol-go', name: 'Trendyol GO', tag: 'Paket servis · Türkiye' },
  { id: 'migros-hemen', name: 'Migros Hemen', tag: 'Market · Türkiye' },
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
  { id: 'zomato', name: 'Zomato', tag: 'Delivery · Global' },
];
