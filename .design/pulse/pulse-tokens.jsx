// Pulse — Tasarım token'ları ve marka sabitleri

const PULSE_TOKENS = {
  colors: {
    // Core
    pure:      '#FFFFFF',   // ana yüzey
    graphite:  '#0A0A0A',   // ana mürekkep / text
    lime:      '#C6F24E',   // vurgu / "pulse"
    limeDeep:  '#A8D62E',   // hover state için koyu lime
    limeSoft:  '#EAF9B8',   // lime tint (arkaplan)

    // Neutrals (gri skala)
    n50:  '#FAFAFA',
    n100: '#F2F2F2',
    n200: '#EDEDED',
    n300: '#D4D4D4',
    n400: '#A3A3A3',
    n500: '#737373',
    n600: '#525252',
    n700: '#333333',
    n800: '#1A1A1A',
    n900: '#0A0A0A',

    // Semantic
    success: '#16A34A',
    warning: '#F59E0B',
    danger:  '#DC2626',
    info:    '#2563EB',
  },

  radius: {
    xs: 4, sm: 6, md: 10, lg: 14, xl: 20, pill: 999,
  },

  space: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96,
  },

  fonts: {
    display: "'Space Grotesk', sans-serif",  // başlıklar, logo
    body:    "'Inter', sans-serif",          // gövde metinleri, UI
    mono:    "'JetBrains Mono', monospace",  // etiketler, sayı, kod
  },

  typeScale: {
    // Display (Space Grotesk)
    display1:  { size: 96, line: 0.92, tracking: '-0.04em', weight: 500 },
    display2:  { size: 72, line: 0.95, tracking: '-0.035em', weight: 500 },
    display3:  { size: 56, line: 1.0,  tracking: '-0.03em',  weight: 500 },
    h1:        { size: 40, line: 1.1,  tracking: '-0.025em', weight: 500 },
    h2:        { size: 28, line: 1.15, tracking: '-0.02em',  weight: 500 },
    h3:        { size: 20, line: 1.3,  tracking: '-0.01em',  weight: 600 },

    // Body (Inter)
    bodyLg:    { size: 18, line: 1.55, tracking: '-0.005em', weight: 400 },
    bodyMd:    { size: 15, line: 1.55, tracking: '0',        weight: 400 },
    bodySm:    { size: 13, line: 1.5,  tracking: '0',        weight: 400 },

    // Mono/eyebrow
    eyebrow:   { size: 11, line: 1.4,  tracking: '0.18em',   weight: 500, upper: true },
    mono:      { size: 12, line: 1.5,  tracking: '0',        weight: 400 },
  },

  shadow: {
    sm:  '0 1px 2px rgba(0,0,0,0.06)',
    md:  '0 4px 12px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    lg:  '0 20px 40px -20px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.04)',
    xl:  '0 40px 80px -30px rgba(0,0,0,0.2)',
    glow: '0 0 0 6px rgba(198,242,78,0.25)',
  },

  motion: {
    fast:   '160ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    base:   '260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    slow:   '520ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    spring: '600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

const PULSE_PRINCIPLES = [
  { k: '01', t: 'Sinyal, gürültü değil', d: 'Her unsur ölçülebilir bir değer taşır. Dekoratif öge yok; sadece bilgiyi güçlendiren form.' },
  { k: '02', t: 'Beyaz ile çalış', d: 'Saf beyaz yüzey anadildir. Mürekkep ve tek bir vurgu rengiyle konuş. Kalabalık değil, kompozisyon.' },
  { k: '03', t: 'Nabız gibi ritmik', d: 'Tipografi, grid ve motion aynı ritmi taşır. Sistem bir metronom; her bileşen onun üzerine yerleşir.' },
  { k: '04', t: 'Geometrik, sıcak değil', d: 'Dairelerin ve keskin çizgilerin diliyle konuşuyoruz. Yumuşak değil, net. Kesin ama insanca.' },
  { k: '05', t: 'Veri insanidir', d: 'Her sayı bir yorumdur, her yorum bir kişidir. Ölçümü empatiyle sun; soğuk dashboard değil.' },
];

const PULSE_VOICE = {
  do:   ['Net', 'Ölçülü', 'Güvenli', 'Doğrudan', 'Türkçe - profesyonel'],
  dont: ['Havalı', 'Slogan', 'Korkutucu', 'Aşırı teknik', 'Emoji yığını'],
  examples: [
    { label: 'Başlık', yes: 'Her yorum bir işarettir.', no: '🚀 Yorumlarınızı devrimci bir şekilde yönetin!' },
    { label: 'CTA', yes: 'QR kodunuzu oluşturun', no: 'Hemen şimdi başlayın ve dönüşümü yakalayın' },
    { label: 'Metrik', yes: 'Organik yorum: +184%', no: 'Çılgın büyüme! Yorumlar patladı 🔥' },
  ],
};

window.PULSE_TOKENS = PULSE_TOKENS;
window.PULSE_PRINCIPLES = PULSE_PRINCIPLES;
window.PULSE_VOICE = PULSE_VOICE;
