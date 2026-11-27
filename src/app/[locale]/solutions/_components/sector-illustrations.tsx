/**
 * Hero illustrations for the seven sector pages owned by this folder
 * (restaurants, delivery, hotels, healthcare, beauty-salon, law-firms,
 * retail). Same language as solution-illustrations.tsx (the other eight
 * sectors): flat vector, 2–2.5px #0A0A0A strokes, purple #8C6CF0 accents,
 * lavender #DCD3F6 surfaces, viewBox 240×220.
 *
 * Decoration only: the layout wraps them in an aria-hidden box, and they hold
 * no SVG <text> (inline SVG text is indexable), so no stars, scores or labels
 * are drawn as text. The QR glyphs are abstract patterns, not real codes.
 */

type IllusProps = { size?: number };

const svgBase = (size: number) => ({
  viewBox: '0 0 240 220',
  width: size,
  height: (size * 220) / 240,
});

/** Abstract QR glyph: three finder squares and a few modules (not scannable). */
function QrGlyph({ x, y, s, ink = '#0A0A0A', paper = '#FFFFFF' }: { x: number; y: number; s: number; ink?: string; paper?: string }) {
  const c = s / 9;
  const finders: ReadonlyArray<readonly [number, number]> = [
    [0, 0],
    [6, 0],
    [0, 6],
  ];
  const modules: ReadonlyArray<readonly [number, number]> = [
    [4, 0], [4, 2], [5, 1], [0, 4], [2, 4], [4, 4], [6, 4], [8, 4],
    [5, 5], [4, 6], [7, 6], [5, 7], [6, 8], [8, 8], [8, 6],
  ];
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} fill={paper} />
      {finders.map(([fx, fy]) => (
        <g key={`f${fx}${fy}`}>
          <rect x={x + fx * c} y={y + fy * c} width={c * 3} height={c * 3} fill={ink} />
          <rect x={x + fx * c + c * 0.55} y={y + fy * c + c * 0.55} width={c * 1.9} height={c * 1.9} fill={paper} />
          <rect x={x + fx * c + c} y={y + fy * c + c} width={c} height={c} fill={ink} />
        </g>
      ))}
      {modules.map(([mx, my]) => (
        <rect key={`m${mx}${my}`} x={x + mx * c} y={y + my * c} width={c} height={c} fill={ink} />
      ))}
    </g>
  );
}

// ─── Restaurants & cafés ────────────────────────────────────────────────
// Café table with a QR table tent, a coffee cup and a plate.
export const IllusRestaurant = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(size)} aria-hidden>
    <circle cx="120" cy="104" r="86" fill="#DCD3F6" opacity="0.55" />
    {/* Table legs + top */}
    <path d="M78 168 L68 212 M162 168 L172 212" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="120" cy="160" rx="104" ry="20" fill="#0A0A0A" />
    <ellipse cx="120" cy="154" rx="104" ry="20" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
    {/* Table tent with a QR */}
    <path d="M98 150 L108 70 L150 70 L160 150 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M108 70 L150 70 L147 82 L111 82 Z" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />
    <rect x="113" y="92" width="32" height="32" rx="3" fill="#0A0A0A" />
    <QrGlyph x={116} y={95} s={26} />
    <rect x="117" y="132" width="24" height="4" rx="2" fill="#0A0A0A" opacity="0.25" />
    {/* Coffee cup on a saucer */}
    <ellipse cx="54" cy="150" rx="24" ry="6" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
    <path d="M38 124 L40 146 Q54 152 68 146 L70 124 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M70 128 Q80 128 80 135 Q80 142 69 142" fill="none" stroke="#0A0A0A" strokeWidth="2.5" />
    <path d="M48 112 Q52 104 48 98 M58 112 Q62 104 58 98" fill="none" stroke="#A3A3A3" strokeWidth="2" strokeLinecap="round" />
    {/* Plate */}
    <ellipse cx="190" cy="150" rx="28" ry="8" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
    <ellipse cx="190" cy="148" rx="16" ry="4" fill="#8C6CF0" />
    {/* Feedback bubble (dots only) */}
    <path
      d="M168 24 Q168 14 178 14 L216 14 Q226 14 226 24 L226 44 Q226 54 216 54 L196 54 L186 64 L188 54 L178 54 Q168 54 168 44 Z"
      fill="#8C6CF0"
      stroke="#0A0A0A"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="184" cy="34" r="3.5" fill="#0A0A0A" />
    <circle cx="197" cy="34" r="3.5" fill="#0A0A0A" />
    <circle cx="210" cy="34" r="3.5" fill="#0A0A0A" />
  </svg>
);

// ─── Delivery ────────────────────────────────────────────────────────────
// Paper bag with a QR card tucked in front, a route and a home pin.
export const IllusDelivery = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(size)} aria-hidden>
    <ellipse cx="112" cy="196" rx="92" ry="10" fill="#DCD3F6" />
    {/* Route to a home pin */}
    <path d="M196 182 Q228 150 212 112 Q200 84 214 58" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
    <path d="M214 22 Q200 22 200 36 Q200 48 214 62 Q228 48 228 36 Q228 22 214 22 Z" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M207 40 L214 33 L221 40 L221 47 L207 47 Z" fill="#0A0A0A" />
    {/* Bag */}
    <path d="M44 74 L160 74 L172 192 L32 192 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M44 74 L160 74 L157 94 L47 94 Z" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" />
    <path d="M78 74 Q78 46 102 46 Q126 46 126 74" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
    {/* Food container peeking out */}
    <rect x="62" y="58" width="44" height="18" rx="4" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
    {/* QR card on the front */}
    <g transform="rotate(-6 104 142)">
      <rect x="72" y="108" width="64" height="70" rx="8" fill="#0A0A0A" />
      <rect x="80" y="116" width="48" height="48" rx="4" fill="#FFFFFF" />
      <QrGlyph x={84} y={120} s={40} />
      <rect x="86" y="168" width="36" height="4" rx="2" fill="#8C6CF0" />
    </g>
  </svg>
);

// ─── Hotels ──────────────────────────────────────────────────────────────
// Room door with a QR door hanger and a key card.
export const IllusHotel = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(size)} aria-hidden>
    <circle cx="120" cy="108" r="88" fill="#DCD3F6" opacity="0.55" />
    <rect x="20" y="196" width="200" height="10" rx="5" fill="#E4E4E4" />
    {/* Door frame + door */}
    <rect x="58" y="28" width="104" height="170" rx="4" fill="#0A0A0A" />
    <rect x="66" y="36" width="88" height="162" rx="2" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
    <rect x="78" y="50" width="64" height="44" rx="3" fill="none" stroke="#0A0A0A" strokeWidth="1.5" opacity="0.35" />
    <rect x="78" y="110" width="64" height="74" rx="3" fill="none" stroke="#0A0A0A" strokeWidth="1.5" opacity="0.35" />
    {/* Room number plate (shape only) */}
    <rect x="96" y="64" width="28" height="14" rx="7" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="2" />
    {/* Handle */}
    <circle cx="142" cy="118" r="5" fill="#0A0A0A" />
    <rect x="128" y="115" width="14" height="6" rx="3" fill="#0A0A0A" />
    {/* Door hanger with a QR */}
    <path d="M128 124 L156 124 L156 196 L128 196 Z" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
    <circle cx="142" cy="133" r="5.5" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
    <rect x="131" y="146" width="22" height="22" rx="2" fill="#0A0A0A" />
    <QrGlyph x={133} y={148} s={18} />
    <rect x="133" y="176" width="18" height="3" rx="1.5" fill="#0A0A0A" opacity="0.4" />
    {/* Key card */}
    <g transform="rotate(14 196 82)">
      <rect x="168" y="60" width="58" height="38" rx="6" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
      <rect x="176" y="70" width="14" height="10" rx="2" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="1.5" />
      <rect x="176" y="86" width="34" height="3" rx="1.5" fill="#0A0A0A" opacity="0.4" />
    </g>
  </svg>
);

// ─── Healthcare clinics ──────────────────────────────────────────────────
// Clipboard with a lime cross badge, next to a QR desk stand.
export const IllusClinic = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(size)} aria-hidden>
    <circle cx="116" cy="110" r="86" fill="#DCD3F6" opacity="0.55" />
    <circle cx="116" cy="110" r="86" fill="none" stroke="#0A0A0A" strokeWidth="1.5" strokeDasharray="2 4" />
    {/* Clipboard */}
    <rect x="42" y="40" width="104" height="146" rx="10" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
    <rect x="72" y="30" width="44" height="20" rx="6" fill="#0A0A0A" />
    <rect x="84" y="36" width="20" height="6" rx="3" fill="#8C6CF0" />
    {/* Cross badge */}
    <circle cx="94" cy="86" r="20" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="2.5" />
    <path d="M94 74 L94 98 M82 86 L106 86" stroke="#0A0A0A" strokeWidth="5" strokeLinecap="round" />
    {/* Check lines */}
    {[122, 142, 162].map((y) => (
      <g key={y}>
        <path d={`M58 ${y} L62 ${y + 4} L70 ${y - 4}`} fill="none" stroke="#0A0A0A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="78" y={y - 2} width="52" height="4" rx="2" fill="#0A0A0A" opacity="0.3" />
      </g>
    ))}
    {/* QR desk stand */}
    <path d="M158 196 L166 104 L218 104 L226 196 Z" fill="#0A0A0A" />
    <rect x="170" y="114" width="44" height="44" rx="4" fill="#FFFFFF" />
    <QrGlyph x={174} y={118} s={36} />
    <rect x="174" y="168" width="36" height="5" rx="2.5" fill="#8C6CF0" />
    <rect x="152" y="194" width="80" height="8" rx="4" fill="#E4E4E4" />
  </svg>
);

// ─── Beauty salons ───────────────────────────────────────────────────────
// Salon mirror with a QR sticker on the frame, scissors and a comb.
export const IllusSalon = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(size)} aria-hidden>
    <ellipse cx="120" cy="200" rx="96" ry="9" fill="#DCD3F6" />
    {/* Mirror on a stand */}
    <rect x="112" y="166" width="16" height="30" rx="4" fill="#0A0A0A" />
    <ellipse cx="120" cy="198" rx="34" ry="6" fill="#0A0A0A" />
    <ellipse cx="120" cy="96" rx="62" ry="76" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
    <ellipse cx="120" cy="96" rx="50" ry="64" fill="#DCD3F6" stroke="#0A0A0A" strokeWidth="1.5" />
    <path d="M92 62 Q100 44 120 40" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" />
    <path d="M90 82 Q90 74 94 68" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    {/* QR sticker on the frame */}
    <g transform="rotate(8 166 140)">
      <rect x="146" y="120" width="40" height="40" rx="6" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="2.5" />
      <QrGlyph x={153} y={127} s={26} />
    </g>
    {/* Scissors */}
    <g transform="translate(12 104) rotate(-24)">
      <circle cx="10" cy="40" r="9" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
      <circle cx="30" cy="44" r="9" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
      <path d="M16 33 L40 2 M24 36 L44 6" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
    </g>
    {/* Comb */}
    <g transform="translate(190 34) rotate(18)">
      <rect x="0" y="0" width="12" height="62" rx="3" fill="#0A0A0A" />
      {[6, 14, 22, 30, 38, 46, 54].map((y) => (
        <rect key={y} x="12" y={y} width="14" height="3" rx="1.5" fill="#0A0A0A" />
      ))}
    </g>
  </svg>
);

// ─── Retail stores ───────────────────────────────────────────────────────
// Shopping bag and a receipt with a QR at the bottom.
export const IllusRetail = ({ size = 280 }: IllusProps) => (
  <svg {...svgBase(size)} aria-hidden>
    <ellipse cx="120" cy="198" rx="98" ry="10" fill="#DCD3F6" />
    {/* Shopping bag */}
    <path d="M28 86 L118 86 L126 194 L20 194 Z" fill="#8C6CF0" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M50 86 Q50 54 73 54 Q96 54 96 86" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
    <circle cx="50" cy="100" r="3.5" fill="#0A0A0A" />
    <circle cx="96" cy="100" r="3.5" fill="#0A0A0A" />
    <path d="M44 150 L102 150" stroke="#0A0A0A" strokeWidth="2" opacity="0.35" />
    {/* Receipt with a zigzag bottom and a QR */}
    <g transform="rotate(5 170 114)">
      <path
        d="M132 22 L212 22 L212 196 L204 188 L196 196 L188 188 L180 196 L172 188 L164 196 L156 188 L148 196 L140 188 L132 196 Z"
        fill="#FFFFFF"
        stroke="#0A0A0A"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {[40, 52, 64, 76, 88].map((y, i) => (
        <g key={y}>
          <rect x="144" y={y} width={i % 2 === 0 ? 38 : 30} height="4" rx="2" fill="#0A0A0A" opacity="0.3" />
          <rect x="190" y={y} width="12" height="4" rx="2" fill="#0A0A0A" opacity="0.3" />
        </g>
      ))}
      <path d="M142 102 L202 102" stroke="#0A0A0A" strokeWidth="1.5" strokeDasharray="3 4" />
      <rect x="150" y="114" width="44" height="44" rx="3" fill="#0A0A0A" />
      <QrGlyph x={153} y={117} s={38} />
      <rect x="156" y="166" width="32" height="5" rx="2.5" fill="#8C6CF0" />
    </g>
  </svg>
);
