/**
 * Pulse-themed hero illustrations for sector solution pages that are NOT
 * present in the .design/ handoff bundle (aesthetic, auto-service,
 * boutique-hotels, dentists, gym, real-estate, schools, veterinary).
 *
 * Design language mirrors .design/site/site-shared.jsx illustrations
 * (lighthouse / mountain / shield / chart):
 *   - Flat vector, 2–2.5px #0A0A0A stroke, stroke-linejoin round
 *   - Lime (#C6F24E) as primary accent; lime-soft (#EAF9B8) for surfaces
 *   - White + graphite + neutral #E4E4E4 / #EDEDED for depth
 *   - viewBox ~240×220; the layout scales the SVG to its container width
 *   - Decoration only (aria-hidden) and no SVG text elements: inline SVG
 *     text is indexable, so no ratings, scores or labels are drawn as text.
 */

type IllusProps = { size?: number };

const svgBase = (w: number, h: number, size: number) => ({
  viewBox: `0 0 ${w} ${h}`,
  width: size,
  height: (size * h) / w,
});

// ─── Aesthetic / Dermatology ──────────────────────────────────────────
// Hand mirror with a lime shimmer/sparkle cluster and a feedback pill.
export const IllusAesthetic = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(240, 220, size)} aria-hidden>
    {/* Soft background ring */}
    <circle cx="120" cy="112" r="90" fill="#EAF9B8" opacity="0.55" />
    <circle cx="120" cy="112" r="90" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeDasharray="2 4" />
    {/* Mirror handle */}
    <rect x="100" y="138" width="20" height="12" rx="4" fill="#0A0A0A" />
    <rect x="103" y="148" width="14" height="50" rx="7" fill="#0A0A0A" />
    {/* Mirror frame + glass */}
    <circle cx="110" cy="90" r="52" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
    <circle cx="110" cy="90" r="41" fill="#EAF9B8" stroke="#0A0A0A" strokeWidth="1.5" />
    {/* Glass shine */}
    <path d="M84 78 Q90 60 110 56" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
    <path d="M86 92 Q86 86 89 81" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    {/* Sparkle cluster (lime) */}
    <g>
      <path d="M178 55 L182 65 L192 69 L182 73 L178 83 L174 73 L164 69 L174 65 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M200 100 L203 106 L209 109 L203 112 L200 118 L197 112 L191 109 L197 106 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M44 120 L46 124 L50 126 L46 128 L44 132 L42 128 L38 126 L42 124 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.3" strokeLinejoin="round" />
    </g>
    {/* Feedback pill (three dots, no text) */}
    <rect x="146" y="166" width="70" height="26" rx="13" fill="#0A0A0A" />
    <circle cx="166" cy="179" r="3" fill="#C6F24E" />
    <circle cx="181" cy="179" r="3" fill="#C6F24E" />
    <circle cx="196" cy="179" r="3" fill="#C6F24E" />
  </svg>
);

// ─── Auto Service ────────────────────────────────────────────────────
// Service car side-profile with wrench + lime star rating badge.
export const IllusAuto = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(240, 220, size)} aria-hidden>
    {/* Ground line */}
    <line x1="10" y1="175" x2="230" y2="175" stroke="#0A0A0A" strokeWidth="2" />
    {/* Car body */}
    <path
      d="M30 160 L30 135 Q30 120 45 118 L75 108 Q85 90 110 85 L160 85 Q180 88 195 110 L215 118 Q225 120 225 135 L225 160 Z"
      fill="#FFFFFF"
      stroke="#0A0A0A"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Cabin windows */}
    <path d="M85 112 L105 92 L155 92 L175 112 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />
    <line x1="130" y1="92" x2="130" y2="112" stroke="#0A0A0A" strokeWidth="1.8" />
    {/* Door handle */}
    <rect x="95" y="135" width="16" height="3" rx="1.5" fill="#0A0A0A" />
    <rect x="145" y="135" width="16" height="3" rx="1.5" fill="#0A0A0A" />
    {/* Wheels */}
    <circle cx="70" cy="170" r="18" fill="#0A0A0A" />
    <circle cx="70" cy="170" r="7" fill="#C6F24E" />
    <circle cx="175" cy="170" r="18" fill="#0A0A0A" />
    <circle cx="175" cy="170" r="7" fill="#C6F24E" />
    {/* Headlight */}
    <path d="M225 130 L235 132 L235 138 L225 140 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
    {/* Wrench (floating) */}
    <g transform="translate(170 25) rotate(35)">
      <rect x="0" y="8" width="60" height="10" rx="3" fill="#0A0A0A" />
      <path d="M55 4 Q70 4 70 13 Q70 22 55 22 L50 18 L55 13 L50 8 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="8" cy="13" r="5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.8" />
    </g>
    {/* Rating star badge */}
    <circle cx="40" cy="40" r="22" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
    <path d="M40 28 L44 37 L53 38 L46 44 L48 53 L40 48 L32 53 L34 44 L27 38 L36 37 Z" fill="#0A0A0A" />
  </svg>
);

// ─── Boutique Hotels ─────────────────────────────────────────────────
// Small townhouse hotel facade with lime awning + feedback bubble.
export const IllusBoutique = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(240, 220, size)} aria-hidden>
    {/* Ground */}
    <rect x="22" y="176" width="196" height="12" rx="6" fill="#E4E4E4" />
    {/* Main facade */}
    <path d="M60 180 L60 80 L120 40 L180 80 L180 180 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Roof trim */}
    <path d="M55 85 L120 37 L185 85" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
    {/* Windows (2 rows of 3) */}
    {([
      [75, 100],
      [108, 100],
      [141, 100],
      [75, 130],
      [141, 130],
    ] as const).map(([x, y], i) => (
      <g key={i}>
        <rect x={x} y={y} width="24" height="18" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.8" />
        <line x1={x + 12} y1={y} x2={x + 12} y2={y + 18} stroke="#0A0A0A" strokeWidth="1" />
      </g>
    ))}
    {/* Door + lime awning */}
    <rect x="108" y="130" width="24" height="50" fill="#0A0A0A" />
    <rect x="110" y="132" width="20" height="46" fill="#EAF9B8" />
    <circle cx="127" cy="158" r="1.5" fill="#0A0A0A" />
    <path d="M100 120 L140 120 L132 128 L108 128 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />
    {/* Chimney */}
    <rect x="145" y="60" width="14" height="20" fill="#0A0A0A" />
    {/* Flag on top */}
    <path d="M120 40 L120 22" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
    <path d="M120 22 L135 26 L128 31 L135 36 L120 32 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" strokeLinejoin="round" />
    {/* Feedback bubble floating (message lines, no text) */}
    <path d="M185 30 Q185 22 193 22 L222 22 Q230 22 230 30 L230 50 Q230 58 222 58 L205 58 L198 65 L198 58 L193 58 Q185 58 185 50 Z"
      fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />
    <line x1="194" y1="34" x2="221" y2="34" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
    <line x1="194" y1="41" x2="215" y2="41" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
    <line x1="194" y1="48" x2="208" y2="48" stroke="#A8D62E" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ─── Dentists ────────────────────────────────────────────────────────
// Tooth silhouette with lime sparkle + check medallion.
export const IllusDentist = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(240, 220, size)} aria-hidden>
    {/* Soft circle bg */}
    <circle cx="120" cy="110" r="85" fill="#EAF9B8" opacity="0.55" />
    {/* Tooth shape */}
    <path
      d="M85 40 Q75 35 70 50 Q62 75 68 110 Q72 140 82 170 Q88 190 98 188 Q108 185 110 160 Q115 140 120 140 Q125 140 130 160 Q132 185 142 188 Q152 190 158 170 Q168 140 172 110 Q178 75 170 50 Q165 35 155 40 Q140 48 120 48 Q100 48 85 40 Z"
      fill="#FFFFFF"
      stroke="#0A0A0A"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Tooth shine */}
    <path d="M98 72 Q92 90 95 118" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    {/* Lime check medallion */}
    <circle cx="165" cy="65" r="22" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
    <path d="M154 66 L162 74 L177 58" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {/* Sparkles */}
    <path d="M55 85 L58 92 L65 95 L58 98 L55 105 L52 98 L45 95 L52 92 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M195 140 L197 145 L202 147 L197 149 L195 154 L193 149 L188 147 L193 145 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.2" strokeLinejoin="round" />
    {/* Smile dots */}
    <circle cx="60" cy="150" r="2" fill="#0A0A0A" />
    <circle cx="45" cy="130" r="2" fill="#0A0A0A" />
    <circle cx="200" cy="100" r="2" fill="#0A0A0A" />
  </svg>
);

// ─── Gym / Fitness ────────────────────────────────────────────────────
// Dumbbell + ECG pulse line + lime heart.
export const IllusGym = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(240, 220, size)} aria-hidden>
    {/* Soft floor */}
    <ellipse cx="120" cy="184" rx="104" ry="12" fill="#EAF9B8" />
    {/* ECG pulse line across the middle */}
    <path
      d="M0 115 L40 115 L55 85 L70 145 L85 100 L100 115 L130 115 L140 95 L155 135 L170 105 L180 115 L240 115"
      fill="none"
      stroke="#C6F24E"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M0 115 L40 115 L55 85 L70 145 L85 100 L100 115 L130 115 L140 95 L155 135 L170 105 L180 115 L240 115"
      fill="none"
      stroke="#0A0A0A"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1 3"
    />
    {/* Dumbbell */}
    <g>
      <rect x="60" y="150" width="120" height="14" rx="4" fill="#0A0A0A" />
      {/* Left plates */}
      <rect x="30" y="135" width="18" height="44" rx="4" fill="#0A0A0A" />
      <rect x="48" y="142" width="12" height="30" rx="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
      {/* Right plates */}
      <rect x="192" y="135" width="18" height="44" rx="4" fill="#0A0A0A" />
      <rect x="180" y="142" width="12" height="30" rx="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
    </g>
    {/* Lime heart */}
    <path
      d="M190 40 Q190 28 200 28 Q210 28 210 38 Q210 28 220 28 Q230 28 230 40 Q230 52 210 68 Q190 52 190 40 Z"
      fill="#C6F24E"
      stroke="#0A0A0A"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path d="M200 42 L204 46 L216 34" fill="none" stroke="#0A0A0A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── Real Estate ─────────────────────────────────────────────────────
// House with a lime yard sign out front + little window light.
export const IllusRealEstate = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(240, 220, size)} aria-hidden>
    {/* Ground */}
    <rect x="12" y="176" width="216" height="12" rx="6" fill="#E4E4E4" />
    {/* House body */}
    <path d="M70 180 L70 110 L130 65 L190 110 L190 180 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Roof */}
    <path d="M62 113 L130 62 L198 113" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
    {/* Chimney */}
    <rect x="160" y="82" width="14" height="22" fill="#0A0A0A" />
    {/* Window with lime light */}
    <rect x="88" y="125" width="30" height="30" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
    <line x1="103" y1="125" x2="103" y2="155" stroke="#0A0A0A" strokeWidth="1.5" />
    <line x1="88" y1="140" x2="118" y2="140" stroke="#0A0A0A" strokeWidth="1.5" />
    {/* Door */}
    <path d="M140 180 L140 135 Q140 128 147 128 L168 128 Q175 128 175 135 L175 180 Z" fill="#0A0A0A" />
    <circle cx="167" cy="158" r="1.8" fill="#C6F24E" />
    {/* Key floating */}
    <g transform="translate(198 45) rotate(-20)">
      <circle cx="8" cy="8" r="7" fill="none" stroke="#0A0A0A" strokeWidth="2.5" />
      <circle cx="8" cy="8" r="2.5" fill="#C6F24E" />
      <rect x="13" y="6" width="22" height="4" fill="#0A0A0A" />
      <rect x="30" y="6" width="3" height="7" fill="#0A0A0A" />
      <rect x="24" y="6" width="3" height="7" fill="#0A0A0A" />
    </g>
    {/* Yard sign with a check mark (no text) */}
    <g transform="translate(22 140)">
      <rect x="6" y="0" width="4" height="40" fill="#0A0A0A" />
      <rect x="0" y="6" width="56" height="22" rx="3" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
      <path d="M20 17 L26 22 L37 11" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

// ─── Schools / Education ─────────────────────────────────────────────
// Open book + graduation cap + lime star accent.
export const IllusSchool = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(240, 220, size)} aria-hidden>
    {/* Soft floor */}
    <ellipse cx="120" cy="186" rx="104" ry="11" fill="#EAF9B8" />
    {/* Open book base */}
    <path
      d="M30 180 L30 140 Q30 130 45 130 L110 130 Q120 130 120 140 L120 180 Q120 170 110 170 L45 170 Q30 170 30 180 Z"
      fill="#FFFFFF"
      stroke="#0A0A0A"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M210 180 L210 140 Q210 130 195 130 L130 130 Q120 130 120 140 L120 180 Q120 170 130 170 L195 170 Q210 170 210 180 Z"
      fill="#FFFFFF"
      stroke="#0A0A0A"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {/* Pages */}
    <line x1="45" y1="144" x2="105" y2="144" stroke="#0A0A0A" strokeWidth="1.2" />
    <line x1="45" y1="152" x2="95" y2="152" stroke="#0A0A0A" strokeWidth="1.2" />
    <line x1="45" y1="160" x2="105" y2="160" stroke="#0A0A0A" strokeWidth="1.2" />
    <line x1="135" y1="144" x2="195" y2="144" stroke="#0A0A0A" strokeWidth="1.2" />
    <line x1="135" y1="152" x2="185" y2="152" stroke="#0A0A0A" strokeWidth="1.2" />
    <line x1="135" y1="160" x2="195" y2="160" stroke="#0A0A0A" strokeWidth="1.2" />
    {/* Spine */}
    <line x1="120" y1="130" x2="120" y2="180" stroke="#0A0A0A" strokeWidth="2" />
    {/* Graduation cap */}
    <g transform="translate(70 40)">
      <path d="M50 35 L0 20 L50 5 L100 20 Z" fill="#0A0A0A" />
      <path d="M50 10 L50 40 M15 27 Q15 50 50 50 Q85 50 85 27" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 35 L50 60" stroke="#0A0A0A" strokeWidth="2.5" />
      <circle cx="50" cy="62" r="5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
    </g>
    {/* Lime stars */}
    <path d="M25 55 L28 62 L35 64 L28 66 L25 73 L22 66 L15 64 L22 62 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M210 70 L213 76 L219 78 L213 80 L210 86 L207 80 L201 78 L207 76 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);

// ─── Veterinary ──────────────────────────────────────────────────────
// Paw print + stethoscope ring + lime heart.
export const IllusVet = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(240, 220, size)} aria-hidden>
    {/* Background circle */}
    <circle cx="120" cy="115" r="85" fill="#EAF9B8" opacity="0.55" />
    <circle cx="120" cy="115" r="85" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeDasharray="2 4" />
    {/* Main paw pad */}
    <path
      d="M120 150 Q98 150 92 130 Q88 112 102 105 Q120 100 138 105 Q152 112 148 130 Q142 150 120 150 Z"
      fill="#0A0A0A"
    />
    {/* Toe pads */}
    <ellipse cx="88" cy="95" rx="11" ry="14" fill="#0A0A0A" />
    <ellipse cx="108" cy="78" rx="11" ry="14" fill="#0A0A0A" />
    <ellipse cx="132" cy="78" rx="11" ry="14" fill="#0A0A0A" />
    <ellipse cx="152" cy="95" rx="11" ry="14" fill="#0A0A0A" />
    {/* Lime heart center */}
    <path
      d="M120 132 Q110 128 110 120 Q110 113 116 113 Q120 113 120 118 Q120 113 124 113 Q130 113 130 120 Q130 128 120 132 Z"
      fill="#C6F24E"
      stroke="#C6F24E"
      strokeWidth="1"
    />
    {/* Stethoscope ring on the side */}
    <circle cx="190" cy="168" r="22" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
    <circle cx="190" cy="168" r="12" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
    <path
      d="M190 146 Q190 100 160 100 Q130 100 130 140"
      fill="none"
      stroke="#0A0A0A"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Sparkle */}
    <path d="M45 55 L48 62 L55 65 L48 68 L45 75 L42 68 L35 65 L42 62 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
