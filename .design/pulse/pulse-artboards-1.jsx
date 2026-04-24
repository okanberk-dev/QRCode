// Pulse — Artboard'lar: cover, principles, symbol construction, variations,
// clearspace, color, typography, motion, web hero, dashboard, mobile, email, social, merch

const { useState: usePulseState, useEffect: usePulseEffect } = React;
const T = () => window.PULSE_TOKENS;
const PB = () => window.PulseBrand;

// --- utility components ---
const Eyebrow = ({ children, color }) => (
  <div style={{
    fontFamily: T().fonts.mono, fontSize: 11, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: color || T().colors.n500, fontWeight: 500,
  }}>{children}</div>
);

const Title = ({ children, size = 'h1', color }) => {
  const s = T().typeScale[size];
  return (
    <div style={{
      fontFamily: T().fonts.display,
      fontSize: s.size, lineHeight: s.line, letterSpacing: s.tracking, fontWeight: s.weight,
      color: color || T().colors.graphite,
    }}>{children}</div>
  );
};

const Body = ({ children, size = 'bodyMd', color, style }) => {
  const s = T().typeScale[size];
  return (
    <div style={{
      fontFamily: T().fonts.body,
      fontSize: s.size, lineHeight: s.line, letterSpacing: s.tracking, fontWeight: s.weight,
      color: color || T().colors.n700, ...style,
    }}>{children}</div>
  );
};

// ============== 01 COVER ==============
function CoverBoard() {
  const { Symbol, Wordmark } = PB();
  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 64, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
      {/* subtle grid */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}>
        <defs>
          <pattern id="pulse-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pulse-grid)" />
      </svg>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Eyebrow>Buaze · Pulse · Marka kılavuzu v1.0</Eyebrow>
        <Eyebrow>2026 / 04</Eyebrow>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <Symbol size={180} />
        <Title size="display1">her yorum<br/>bir <span style={{ fontStyle: 'italic' }}>nabız</span>.</Title>
        <Body size="bodyLg" style={{ maxWidth: 560 }}>
          Buaze — işletmeler için dijital itibar platformu. QR tabanlı geri bildirim, merkezi yorum yönetimi, canlı analiz. Pulse, Buaze'nin marka kimliğidir: saf beyaz yüzey, grafit çizgi ve tek bir canlı lime aksan.
        </Body>
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Eyebrow>Yön 03 · Pulse</Eyebrow>
        <div style={{ display: 'flex', gap: 8 }}>
          {['#0A0A0A', '#C6F24E', '#FAFAFA', '#737373'].map(c => (
            <div key={c} style={{ width: 28, height: 28, background: c, borderRadius: 999, border: c === '#FAFAFA' ? '1px solid #EDEDED' : 'none' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============== 02 PRINCIPLES ==============
function PrinciplesBoard() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 56, display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <Eyebrow>Marka ilkeleri</Eyebrow>
        <Title size="display3" style={{ marginTop: 6 }}>Nasıl düşünüyoruz.</Title>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20, flex: 1 }}>
        {window.PULSE_PRINCIPLES.map((p, i) => (
          <div key={p.k} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px solid #0A0A0A' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Eyebrow>{p.k}</Eyebrow>
              {i === 0 && <div style={{ width: 10, height: 10, borderRadius: 999, background: '#C6F24E' }} />}
            </div>
            <Title size="h3">{p.t}</Title>
            <Body size="bodySm">{p.d}</Body>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== 03 SYMBOL CONSTRUCTION ==============
function ConstructionBoard() {
  const { Symbol } = PB();
  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 56, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40 }}>
      <div style={{ background: '#FAFAFA', borderRadius: 14, padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: '1px solid #EDEDED' }}>
        {/* Construction grid */}
        <svg viewBox="0 0 640 640" width="100%" height="100%" style={{ maxWidth: 480 }}>
          <defs>
            <pattern id="cg" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D4D4D4" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="640" height="640" fill="url(#cg)" />
          {/* 10-unit guides */}
          <line x1="0" y1="320" x2="640" y2="320" stroke="#C6F24E" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="320" y1="0" x2="320" y2="640" stroke="#C6F24E" strokeWidth="1" strokeDasharray="4 4" />
          {/* Symbol at 10x scale (viewBox 64) */}
          <g transform="translate(0 0) scale(10)">
            {/* Bubble */}
            <path d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z" fill="none" stroke="#0A0A0A" strokeWidth="3.2" strokeLinejoin="round" />
            {/* Pulse */}
            <path d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28" fill="none" stroke="#0A0A0A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Spark */}
            <circle cx="54" cy="10" r="5" fill="#C6F24E" />
          </g>
          {/* Measurements */}
          <g fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#737373">
            <text x="540" y="96" textAnchor="start">5u</text>
            <text x="96" y="530" textAnchor="start">8u keşif alanı</text>
          </g>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Eyebrow>Sembol konstrüksiyonu</Eyebrow>
        <Title size="display3">Üç öge,<br/>bir ritim.</Title>
        <Body size="bodyLg">
          Sembol 64×64 grid üstünde kurulur. Üç öge:
        </Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { n: '01', t: 'Yorum baloncuğu', d: 'Asimetrik kuyruk, 2u yarıçap köşeler. Tüm iletişimi kapsar.' },
            { n: '02', t: 'Nabız çizgisi', d: '5 tepe · 1 tam döngü. Ritmik, ölçülü, yaşayan.' },
            { n: '03', t: 'Kıvılcım', d: 'Sağ üst 5u disk. Tek vurgu rengi; marka mühürü.' },
          ].map(x => (
            <div key={x.n} style={{ display: 'flex', gap: 14, paddingBottom: 14, borderBottom: '1px solid #EDEDED' }}>
              <div style={{ fontFamily: T().fonts.mono, fontSize: 11, color: '#737373', minWidth: 24 }}>{x.n}</div>
              <div>
                <div style={{ fontFamily: T().fonts.display, fontSize: 18, fontWeight: 600, color: '#0A0A0A' }}>{x.t}</div>
                <Body size="bodySm" style={{ marginTop: 2 }}>{x.d}</Body>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============== 04 LOGO VARIATIONS ==============
function VariationsBoard() {
  const { Symbol, Glyph, Mono, Wordmark, Lockup, Stacked } = PB();
  const Card = ({ label, bg, children, dark, tall }) => (
    <div style={{
      background: bg, borderRadius: 14,
      border: bg === '#FFFFFF' ? '1px solid #EDEDED' : 'none',
      padding: 28,
      minHeight: tall ? 220 : 160,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden',
    }}>
      <Eyebrow color={dark ? '#A3A3A3' : '#737373'}>{label}</Eyebrow>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 48, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <Eyebrow>Logo varyantları</Eyebrow>
        <Title size="display3" style={{ marginTop: 6 }}>Aynı ses, farklı tonlar.</Title>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <Card label="Primary · Yatay lockup" tall>
          <Lockup size="lg" />
        </Card>
        <Card label="Stacked · Dikey lockup" tall>
          <Stacked size="lg" />
        </Card>
        <Card label="Inverted · Koyu zemin" bg="#0A0A0A" dark tall>
          <Lockup size="lg" color="#FFFFFF" />
        </Card>

        <Card label="Accent zemin" bg="#C6F24E">
          <Lockup size="md" color="#0A0A0A" accent="#0A0A0A" />
        </Card>
        <Card label="Mono · Tek renk">
          <Lockup size="md" color="#0A0A0A" accent="#0A0A0A" />
        </Card>
        <Card label="Wordmark · Sembolsüz">
          <Wordmark fontSize={54} />
        </Card>

        <Card label="Glyph · Favicon / app icon">
          <div style={{ background: '#0A0A0A', width: 88, height: 88, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Glyph size={56} fg="#FFFFFF" accent="#C6F24E" />
          </div>
        </Card>
        <Card label="Monogram · b+nabız">
          <Mono size={88} />
        </Card>
        <Card label="Glyph · Accent tile" bg="#C6F24E">
          <div style={{ background: '#0A0A0A', width: 88, height: 88, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Glyph size={56} fg="#C6F24E" accent="#C6F24E" stroke={5} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// ============== 05 CLEAR SPACE + DON'T ==============
function ClearSpaceBoard() {
  const { Symbol, Lockup } = PB();
  const bad = (fn) => (
    <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 999, background: '#DC2626', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }}>✕</div>
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <Eyebrow>Clear space · Güvenli alan</Eyebrow>
          <Title size="h1" style={{ marginTop: 6 }}>Nefes aldır.</Title>
          <Body size="bodyMd" style={{ marginTop: 10, maxWidth: 420 }}>
            Logonun minimum güvenli alanı, sembolün "kıvılcım" noktasının çapı kadardır (1× spark).
            Hiçbir metin, kenar ya da fotoğraf bu alana girmemelidir.
          </Body>
        </div>

        <div style={{ background: '#FAFAFA', borderRadius: 14, padding: 40, border: '1px solid #EDEDED', position: 'relative' }}>
          {/* Guides */}
          <div style={{
            position: 'absolute', inset: 24,
            border: '1px dashed #C6F24E',
            borderRadius: 10,
          }} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Lockup size="lg" />
          </div>
          <div style={{ fontFamily: T().fonts.mono, fontSize: 10, color: '#737373', position: 'absolute', top: 8, left: 14, letterSpacing: '0.12em' }}>X = 1× SPARK</div>
        </div>

        <div style={{ background: '#FAFAFA', borderRadius: 14, padding: 28, border: '1px solid #EDEDED' }}>
          <Eyebrow>Minimum boyut</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 20, gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Lockup size="xs" />
              <div style={{ fontFamily: T().fonts.mono, fontSize: 10, color: '#737373' }}>Web · 20px</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Lockup size="sm" />
              <div style={{ fontFamily: T().fonts.mono, fontSize: 10, color: '#737373' }}>Print · 14mm</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <Symbol size={16} />
              <div style={{ fontFamily: T().fonts.mono, fontSize: 10, color: '#737373' }}>Favicon · 16px</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Eyebrow>Yapma</Eyebrow>
        <Title size="h2" style={{ marginBottom: 10 }}>Bunlardan kaçın.</Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { lbl: 'Gerdirme', node: <div style={{ transform: 'scaleX(1.6)' }}><Lockup size="sm" /></div> },
            { lbl: 'Döndürme', node: <div style={{ transform: 'rotate(-12deg)' }}><Lockup size="sm" /></div> },
            { lbl: 'Gölge/efekt', node: <div style={{ filter: 'drop-shadow(4px 4px 0 #C6F24E)' }}><Lockup size="sm" /></div> },
            { lbl: 'Renk değiştirme', node: <Lockup size="sm" color="#DC2626" accent="#2563EB" /> },
            { lbl: 'Karmaşık foto üstü', node: (
              <div style={{ background: 'conic-gradient(from 0deg, #DC2626, #F59E0B, #16A34A, #2563EB, #DC2626)', padding: 10, borderRadius: 6 }}>
                <Lockup size="sm" color="#FFFFFF" />
              </div>
            )},
            { lbl: 'Yeniden tipografi', node: (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Symbol size={36} />
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontStyle: 'italic' }}>buaze</span>
              </div>
            )},
          ].map((x, i) => (
            <div key={i} style={{ position: 'relative', background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 10, padding: 18, minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 999, background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter' }}>✕</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>{x.node}</div>
              <Eyebrow>{x.lbl}</Eyebrow>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============== 06 COLOR ==============
function ColorBoard() {
  const c = T().colors;
  const Swatch = ({ hex, name, role, text = '#fff', bordered }) => (
    <div style={{
      background: hex, borderRadius: 12,
      border: bordered ? '1px solid #EDEDED' : 'none',
      padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180,
    }}>
      <Eyebrow color={text + 'B3'}>{role}</Eyebrow>
      <div>
        <div style={{ fontFamily: T().fonts.display, fontSize: 22, color: text, fontWeight: 500, letterSpacing: '-0.02em' }}>{name}</div>
        <div style={{ fontFamily: T().fonts.mono, fontSize: 11, color: text, opacity: 0.75, marginTop: 4 }}>{hex}</div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Eyebrow>Renk sistemi</Eyebrow>
        <Title size="display3" style={{ marginTop: 6 }}>Beyaz, grafit, bir kıvılcım.</Title>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Swatch hex={c.graphite} name="Graphite" role="Primary / Ink" text="#fff" />
        <Swatch hex={c.lime}     name="Lime Pulse" role="Accent" text="#0A0A0A" />
        <Swatch hex={c.pure}     name="Pure" role="Surface" text="#0A0A0A" bordered />
        <Swatch hex={c.n500}     name="Ash" role="Muted" text="#fff" />
      </div>

      <div>
        <Eyebrow>Gri skala</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, marginTop: 10 }}>
          {['n50','n100','n200','n300','n400','n500','n600','n700','n800','n900'].map((k, i) => (
            <div key={k} style={{ background: c[k], height: 64, borderRadius: 6, border: i === 0 ? '1px solid #EDEDED' : 'none', display: 'flex', alignItems: 'flex-end', padding: 8 }}>
              <span style={{ fontFamily: T().fonts.mono, fontSize: 9, color: i > 4 ? '#fff' : '#0A0A0A', letterSpacing: '0.06em' }}>{k}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Eyebrow>Vurgu tonları</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 10 }}>
          <Swatch hex={c.limeSoft} name="Lime Tint" role="Soft BG" text="#0A0A0A" bordered />
          <Swatch hex={c.lime}     name="Lime" role="Accent" text="#0A0A0A" />
          <Swatch hex={c.limeDeep} name="Lime Deep" role="Hover" text="#0A0A0A" />
        </div>
      </div>

      <div>
        <Eyebrow>Semantik (yalnızca UI)</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 10 }}>
          <Swatch hex={c.success} name="Success" role="Success" />
          <Swatch hex={c.warning} name="Warning" role="Warning" text="#0A0A0A" />
          <Swatch hex={c.danger}  name="Danger" role="Danger" />
          <Swatch hex={c.info}    name="Info" role="Info" />
        </div>
      </div>
    </div>
  );
}

// ============== 07 TYPOGRAPHY ==============
function TypographyBoard() {
  const rows = [
    { n: 'Display 1', k: 'display1', sample: 'her yorum bir nabız.' },
    { n: 'Display 2', k: 'display2', sample: 'Sinyal, gürültü değil.' },
    { n: 'H1',        k: 'h1',       sample: 'Yorum yönetimi, tek panelden.' },
    { n: 'H2',        k: 'h2',       sample: 'QR ile geri bildirim' },
    { n: 'H3',        k: 'h3',       sample: 'Canlı analiz özeti' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <Eyebrow>Tipografi</Eyebrow>
          <Title size="display3" style={{ marginTop: 6 }}>İki ses, bir ritim.</Title>
        </div>

        <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, padding: 24 }}>
          <Eyebrow>Display · Space Grotesk</Eyebrow>
          <div style={{ fontFamily: T().fonts.display, fontSize: 96, lineHeight: 0.92, letterSpacing: '-0.04em', fontWeight: 500, marginTop: 12 }}>Aa</div>
          <Body size="bodySm" style={{ marginTop: 10 }}>
            Weights: 300 · 400 · 500 · 600 · 700<br/>
            Kullanım: logo, başlık, büyük sayılar, CTA.
          </Body>
        </div>

        <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, padding: 24 }}>
          <Eyebrow>Body · Inter</Eyebrow>
          <div style={{ fontFamily: T().fonts.body, fontSize: 96, lineHeight: 1, fontWeight: 400, marginTop: 12 }}>Aa</div>
          <Body size="bodySm" style={{ marginTop: 10 }}>
            Weights: 400 · 500 · 600<br/>
            Kullanım: gövde metni, UI, tablo, form.
          </Body>
        </div>

        <div style={{ background: '#0A0A0A', color: '#fff', borderRadius: 12, padding: 24 }}>
          <Eyebrow color="#A3A3A3">Mono · JetBrains Mono</Eyebrow>
          <div style={{ fontFamily: T().fonts.mono, fontSize: 60, fontWeight: 400, marginTop: 12 }}>Aa 01</div>
          <Body size="bodySm" color="#A3A3A3" style={{ marginTop: 10 }}>
            Eyebrow, sayı, kod, metrik.
          </Body>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Eyebrow>Tip skalası</Eyebrow>
        {rows.map(r => {
          const s = T().typeScale[r.k];
          return (
            <div key={r.k} style={{ paddingBottom: 14, borderBottom: '1px solid #EDEDED' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: T().fonts.mono, fontSize: 10, color: '#737373', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{r.n}</span>
                <span style={{ fontFamily: T().fonts.mono, fontSize: 10, color: '#737373' }}>{s.size}/{(s.size * s.line).toFixed(0)} · {s.tracking}</span>
              </div>
              <div style={{
                fontFamily: T().fonts.display,
                fontSize: s.size, lineHeight: s.line, letterSpacing: s.tracking, fontWeight: s.weight,
                color: '#0A0A0A', marginTop: 4,
              }}>{r.sample}</div>
            </div>
          );
        })}
        <div style={{ marginTop: 8, padding: 16, background: '#FAFAFA', borderRadius: 10, border: '1px solid #EDEDED' }}>
          <Eyebrow>Gövde örneği</Eyebrow>
          <Body size="bodyLg" style={{ marginTop: 8 }}>
            Buaze, işletmelerin müşteri geri bildirimini canlıya döker. QR ile yorum topla, merkezi panelden yanıtla, Google politikalarına uyumlu büyü. Veri soğuk değil; her yorum bir ritimdir.
          </Body>
        </div>
      </div>
    </div>
  );
}

// ============== 08 VOICE ==============
function VoiceBoard() {
  const v = window.PULSE_VOICE;
  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 56, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Eyebrow>Ses & ton</Eyebrow>
        <Title size="display3" style={{ marginTop: 6 }}>Ölçülü, net, insancıl.</Title>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, padding: 24 }}>
          <Eyebrow color="#16A34A">Evet, böyle</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {v.do.map(x => (
              <div key={x} style={{ fontFamily: T().fonts.display, fontSize: 22, fontWeight: 500, color: '#0A0A0A' }}>{x}</div>
            ))}
          </div>
        </div>
        <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, padding: 24 }}>
          <Eyebrow color="#DC2626">Hayır, böyle değil</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {v.dont.map(x => (
              <div key={x} style={{ fontFamily: T().fonts.display, fontSize: 22, fontWeight: 500, color: '#0A0A0A', textDecoration: 'line-through', textDecorationColor: '#DC2626', textDecorationThickness: 2 }}>{x}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Eyebrow>Örnekler</Eyebrow>
        {v.examples.map(ex => (
          <div key={ex.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: 16, padding: 16, border: '1px solid #EDEDED', borderRadius: 10 }}>
            <Eyebrow>{ex.label}</Eyebrow>
            <div>
              <div style={{ fontFamily: T().fonts.mono, fontSize: 10, color: '#16A34A', letterSpacing: '0.14em' }}>EVET</div>
              <Body size="bodyMd" color="#0A0A0A" style={{ marginTop: 2 }}>{ex.yes}</Body>
            </div>
            <div>
              <div style={{ fontFamily: T().fonts.mono, fontSize: 10, color: '#DC2626', letterSpacing: '0.14em' }}>HAYIR</div>
              <Body size="bodyMd" color="#737373" style={{ marginTop: 2, textDecoration: 'line-through', textDecorationColor: '#DC2626' }}>{ex.no}</Body>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.PulseArtboards1 = { CoverBoard, PrinciplesBoard, ConstructionBoard, VariationsBoard, ClearSpaceBoard, ColorBoard, TypographyBoard, VoiceBoard };
