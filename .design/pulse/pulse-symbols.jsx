// Pulse — Rafine sembol sistemi
// Geri bildirim = nabız. Sembol: yorum baloncuğu + nabız çizgisi + kıvılcım birleşimi.
// Birkaç varyant: primary, compact, glyph (favicon), wordmark-inline, monogram.

const PulseSymbol = ({
  size = 64,
  fg = '#0A0A0A',
  accent = '#C6F24E',
  stroke = 3.2,
}) => {
  // viewBox 64x64. Yorum baloncuğu formu + içinde nabız çizgisi + dışında kıvılcım noktası
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: 'block' }}>
      {/* Yorum baloncuğu — asimetrik, sağ alt kuyruk */}
      <path
        d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z"
        fill="none"
        stroke={fg}
        strokeWidth={stroke}
        strokeLinejoin="round"
      />
      {/* Nabız çizgisi (ECG) baloncuk içinde */}
      <path
        d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28"
        fill="none"
        stroke={fg}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Kıvılcım — sağ üst, accent dolgulu disk */}
      <circle cx="54" cy="10" r="5" fill={accent} />
    </svg>
  );
};

// Kompakt varyant: sadece nabız + nokta (küçük boyutlar, favicon)
const PulseGlyph = ({ size = 64, fg = '#0A0A0A', accent = '#C6F24E', stroke = 5 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: 'block' }}>
    <path
      d="M6 34 L18 34 L22 20 L30 46 L36 26 L42 36 L58 36"
      fill="none"
      stroke={fg}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="22" cy="20" r="4.5" fill={accent} />
  </svg>
);

// Monogram: "b" + nabız
const PulseMono = ({ size = 64, fg = '#0A0A0A', accent = '#C6F24E' }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: 'block' }}>
    {/* b stem */}
    <rect x="14" y="8" width="5" height="48" rx="2.5" fill={fg} />
    {/* b bowl */}
    <circle cx="34" cy="40" r="16" fill="none" stroke={fg} strokeWidth="5" />
    {/* pulse inside bowl */}
    <path
      d="M22 40 L28 40 L30 34 L34 46 L38 36 L41 40 L46 40"
      fill="none"
      stroke={accent}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Wordmark: Space Grotesk benzeri ince custom geometric lowercase
// Implementasyon: Space Grotesk Medium kullanıyoruz, negatif letter-spacing ve özel kerning
const PulseWordmark = ({ fontSize = 72, color = '#0A0A0A', accent = '#C6F24E', withDot = true }) => (
  <span style={{
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500,
    fontSize,
    color,
    letterSpacing: '-0.035em',
    lineHeight: 0.9,
    display: 'inline-flex',
    alignItems: 'baseline',
  }}>
    buaze
    {withDot && (
      <span style={{
        display: 'inline-block',
        width: fontSize * 0.14,
        height: fontSize * 0.14,
        background: accent,
        borderRadius: '50%',
        marginLeft: fontSize * 0.06,
        alignSelf: 'flex-end',
        marginBottom: fontSize * 0.1,
      }} />
    )}
  </span>
);

// Horizontal lockup
const PulseLockup = ({ size = 'lg', color = '#0A0A0A', accent = '#C6F24E', withDot = true }) => {
  const symbolSize = size === 'xl' ? 120 : size === 'lg' ? 80 : size === 'md' ? 52 : size === 'sm' ? 36 : 24;
  const fontSize = size === 'xl' ? 104 : size === 'lg' ? 68 : size === 'md' ? 46 : size === 'sm' ? 30 : 20;
  const gap = size === 'xl' ? 28 : size === 'lg' ? 20 : size === 'md' ? 14 : size === 'sm' ? 10 : 6;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      <PulseSymbol size={symbolSize} fg={color} accent={accent} />
      <PulseWordmark fontSize={fontSize} color={color} accent={accent} withDot={withDot} />
    </div>
  );
};

// Stacked lockup
const PulseStacked = ({ size = 'lg', color = '#0A0A0A', accent = '#C6F24E' }) => {
  const symbolSize = size === 'xl' ? 160 : size === 'lg' ? 110 : 72;
  const fontSize = size === 'xl' ? 64 : size === 'lg' ? 44 : 30;
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: symbolSize * 0.18 }}>
      <PulseSymbol size={symbolSize} fg={color} accent={accent} />
      <PulseWordmark fontSize={fontSize} color={color} accent={accent} withDot={false} />
    </div>
  );
};

window.PulseBrand = {
  Symbol: PulseSymbol,
  Glyph: PulseGlyph,
  Mono: PulseMono,
  Wordmark: PulseWordmark,
  Lockup: PulseLockup,
  Stacked: PulseStacked,
};
