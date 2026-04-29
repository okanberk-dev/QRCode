// Buaze · "Üç adım, üç saniye" — Editorial / Connected Process (Var 01)
// Kullanım: site-marketing.jsx içindeki HomePage'de eski "{/* 3 STEPS */}" bloğunu
// <ThreeStepsEditorial /> ile değiştir.

function ThreeStepsEditorial() {
  const C = {
    pure: '#FFFFFF',
    graphite: '#0A0A0A',
    lime: '#C6F24E',
    limeDeep: '#A8D62E',
    n50: '#FAFAFA',
    n100: '#F2F2F2',
    n200: '#EDEDED',
    n300: '#D4D4D4',
    n400: '#A3A3A3',
    n500: '#737373',
    n600: '#525252',
    n800: '#1A1A1A',
  };
  const FONT = {
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  };

  // ---- ICONS ----
  const IconQR = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3M20 14v.01M14 20v.01M17 17h4v4" />
    </svg>
  );
  const IconInbox = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  );
  const IconTrend = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );

  // ---- MINI ILLUSTRATIONS ----
  const IllusQR = () => (
    <svg viewBox="0 0 220 110" width="100%" height="100%">
      <rect x="6" y="6" width="80" height="80" rx="8" fill={C.pure} stroke={C.graphite} strokeWidth="1.2" />
      <g fill={C.graphite}>
        <rect x="14" y="14" width="20" height="20" rx="2" />
        <rect x="58" y="14" width="20" height="20" rx="2" />
        <rect x="14" y="58" width="20" height="20" rx="2" />
        <rect x="20" y="20" width="8" height="8" fill={C.pure} />
        <rect x="64" y="20" width="8" height="8" fill={C.pure} />
        <rect x="20" y="64" width="8" height="8" fill={C.pure} />
      </g>
      <g fill={C.graphite}>
        <rect x="42" y="42" width="4" height="4" /><rect x="50" y="42" width="4" height="4" />
        <rect x="58" y="50" width="4" height="4" /><rect x="46" y="50" width="4" height="4" />
        <rect x="66" y="42" width="4" height="4" /><rect x="42" y="58" width="4" height="4" />
        <rect x="50" y="66" width="4" height="4" /><rect x="58" y="58" width="4" height="4" />
        <rect x="66" y="58" width="4" height="4" /><rect x="66" y="66" width="4" height="4" />
      </g>
      <rect x="42" y="50" width="4" height="4" fill={C.limeDeep} />
      <rect x="58" y="42" width="4" height="4" fill={C.limeDeep} />
      <g transform="translate(108 14)">
        <rect width="100" height="84" rx="4" fill={C.n50} stroke={C.n200} />
        <rect x="10" y="12" width="60" height="3" rx="1.5" fill={C.graphite} />
        <rect x="10" y="22" width="80" height="2" rx="1" fill={C.n300} />
        <rect x="10" y="28" width="70" height="2" rx="1" fill={C.n300} />
        <rect x="10" y="34" width="55" height="2" rx="1" fill={C.n300} />
        <rect x="10" y="48" width="80" height="22" rx="3" fill={C.lime} />
        <text x="50" y="63" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" fill={C.graphite}>YORUM BIRAK ★</text>
      </g>
    </svg>
  );

  const IllusInbox = () => (
    <svg viewBox="0 0 220 110" width="100%" height="100%">
      <rect x="6" y="6" width="208" height="98" rx="8" fill={C.pure} stroke={C.n200} />
      <rect x="14" y="14" width="40" height="6" rx="3" fill={C.graphite} />
      <circle cx="200" cy="17" r="3" fill={C.limeDeep} />
      <g>
        <rect x="14" y="32" width="192" height="20" rx="4" fill={C.n50} />
        <circle cx="24" cy="42" r="6" fill={C.lime} />
        <rect x="36" y="38" width="80" height="3" rx="1.5" fill={C.graphite} />
        <rect x="36" y="44" width="50" height="2" rx="1" fill={C.n400} />
        <rect x="170" y="38" width="30" height="8" rx="4" fill={C.graphite} />
        <text x="185" y="44" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={C.lime}>YANITLA</text>
      </g>
      <g>
        <rect x="14" y="58" width="192" height="20" rx="4" fill={C.n50} />
        <circle cx="24" cy="68" r="6" fill={C.graphite} />
        <rect x="36" y="64" width="60" height="3" rx="1.5" fill={C.graphite} />
        <rect x="36" y="70" width="70" height="2" rx="1" fill={C.n400} />
        <rect x="170" y="64" width="30" height="8" rx="4" fill={C.pure} stroke={C.graphite} />
        <text x="185" y="70" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="6" fill={C.graphite}>EKİBE AT</text>
      </g>
      <g>
        <rect x="14" y="84" width="192" height="20" rx="4" fill={C.n50} />
        <circle cx="24" cy="94" r="6" fill={C.lime} />
        <rect x="36" y="90" width="70" height="3" rx="1.5" fill={C.graphite} />
        <rect x="36" y="96" width="55" height="2" rx="1" fill={C.n400} />
      </g>
    </svg>
  );

  const IllusChart = () => (
    <svg viewBox="0 0 220 110" width="100%" height="100%">
      <rect x="6" y="6" width="208" height="98" rx="8" fill={C.pure} stroke={C.n200} />
      <g stroke={C.n200} strokeWidth="1">
        <line x1="20" y1="32" x2="200" y2="32" />
        <line x1="20" y1="56" x2="200" y2="56" />
        <line x1="20" y1="80" x2="200" y2="80" />
      </g>
      <path d="M20 80 L50 72 L80 60 L110 50 L140 36 L170 26 L200 18" fill="none" stroke={C.graphite} strokeWidth="1.5" />
      <path d="M20 90 L50 84 L80 78 L110 72 L140 64 L170 58 L200 52" fill="none" stroke={C.limeDeep} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="200" cy="18" r="4" fill={C.graphite} />
      <circle cx="200" cy="52" r="4" fill={C.lime} stroke={C.graphite} strokeWidth="1.2" />
      <g transform="translate(150 14)">
        <rect width="50" height="14" rx="7" fill={C.graphite} />
        <text x="25" y="10" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="8" fontWeight="600" fill={C.lime}>+184%</text>
      </g>
    </svg>
  );

  // ---- DATA ----
  const steps = [
    {
      n: '01',
      icon: <IconQR />,
      iconBg: C.graphite,
      iconFg: C.lime,
      title: 'Topla',
      desc: 'Masadaki QR kodu tarayan müşteri 20 saniyede yorum bırakır. Form yok, yönlendirme yok — sıfır sürtünme.',
      illus: <IllusQR />,
      metaL: 'Süre',
      metaV: '~20 sn',
      metaR: 'Müşteri tarafı',
    },
    {
      n: '02',
      icon: <IconInbox />,
      iconBg: C.lime,
      iconFg: C.graphite,
      title: 'Yönet',
      desc: 'Tüm platformlardan gelen yorumlar tek panelde. Olumsuzu ekibine ata, olumluyu Google\'a yayına taşı.',
      illus: <IllusInbox />,
      metaL: 'SLA',
      metaV: '~12 dk yanıt',
      metaR: 'İşletme paneli',
    },
    {
      n: '03',
      icon: <IconTrend />,
      iconBg: C.graphite,
      iconFg: C.lime,
      title: 'Büyü',
      desc: 'Canlı analitik puanını izler, Google sıralamanı yükseltir. Organik büyüme, ölçülebilir bir nabız.',
      illus: <IllusChart />,
      metaL: 'Sonuç',
      metaV: '+184% / 90 gün',
      metaR: 'Analitik',
    },
  ];

  // ---- STYLES ----
  const eyebrow = {
    fontFamily: FONT.mono, fontSize: 11, color: C.n500,
    letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500,
  };
  const headStat = {
    borderTop: `2px solid ${C.graphite}`,
    paddingTop: 8,
    minWidth: 96,
  };

  return (
    <div style={{ padding: '96px 64px', background: C.pure }}>
      {/* HEAD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 56, gap: 40, flexWrap: 'wrap' }}>
        <div style={{ maxWidth: 640 }}>
          <div style={eyebrow}>Nasıl çalışır · 03 adım</div>
          <h2 style={{
            fontFamily: FONT.display, fontSize: 64, fontWeight: 500,
            letterSpacing: '-0.035em', lineHeight: 1, margin: '12px 0 0', color: C.graphite,
          }}>
            Üç adım, <span style={{ background: C.lime, padding: '0 10px', borderRadius: 6 }}>üç saniye</span>.
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 32, paddingBottom: 8 }}>
          {[
            { k: '~3 dk', l: 'Toplam kurulum' },
            { k: '2.400+', l: 'İşletme kullanıyor' },
            { k: '+184%', l: 'Ort. yorum artışı' },
          ].map(s => (
            <div key={s.l} style={headStat}>
              <div style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>{s.k}</div>
              <div style={{ fontSize: 11, color: C.n500, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GRID */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0,
        borderTop: `1px solid ${C.graphite}`, borderBottom: `1px solid ${C.graphite}`,
      }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{
            padding: '36px 32px 40px',
            borderRight: i < steps.length - 1 ? `1px solid ${C.n200}` : 'none',
            display: 'flex', flexDirection: 'column', gap: 20,
            background: C.pure, transition: 'background 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.n50}
          onMouseLeave={e => e.currentTarget.style.background = C.pure}
          >
            {/* Cell head: number + icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                fontFamily: FONT.display, fontSize: 88, lineHeight: 0.85,
                fontWeight: 300, letterSpacing: '-0.04em', color: C.graphite,
              }}>
                {s.n}<span style={{ color: C.n300 }}>.</span>
              </div>
              <div style={{
                width: 44, height: 44, background: s.iconBg, color: s.iconFg,
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.icon}
              </div>
            </div>

            {/* Title */}
            <h3 style={{
              fontFamily: FONT.display, fontSize: 32, fontWeight: 500,
              letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0, color: C.graphite,
            }}>{s.title}</h3>

            {/* Desc */}
            <p style={{ fontSize: 15, color: C.n600, lineHeight: 1.6, margin: 0 }}>{s.desc}</p>

            {/* Illustration */}
            <div style={{
              background: C.n50, borderRadius: 10, height: 140, padding: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              {s.illus}
            </div>

            {/* Meta */}
            <div style={{
              marginTop: 'auto', paddingTop: 24, borderTop: `1px solid ${C.n200}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontFamily: FONT.mono, fontSize: 11, color: C.n500, letterSpacing: '0.04em',
            }}>
              <span>{s.metaL} · <strong style={{ color: C.graphite, fontWeight: 500 }}>{s.metaV}</strong></span>
              <span>{s.metaR}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.ThreeStepsEditorial = ThreeStepsEditorial;
