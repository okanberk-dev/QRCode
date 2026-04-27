/* Buaze Social Kit — profile pic + 4 IG posts (TR) + OG images (TR/EN) */

const { useState: uS, useMemo: uM } = React;

/* ─────────────── Persona content */
const PERSONAS = {
  restaurant: {
    name: 'Lokanta', emoji: '🍽',
    label: { tr: 'Restoran', en: 'Restaurant' },
    venue: 'Mavi Balık Lokantası',
    venueShort: 'Mavi Balık',
    quote: 'Yemekler harikaydı, servis çok hızlıydı. Mutlaka tekrar geleceğiz.',
    quoteAuthor: 'Elif K.',
    qr_label: 'Masa 12 · QR'
  },
  clinic: {
    name: 'Klinik', emoji: '🩺',
    label: { tr: 'Klinik', en: 'Clinic' },
    venue: 'Vita Diş Polikliniği',
    venueShort: 'Vita Diş',
    quote: 'İlgili ekip, modern donanım, randevu saati gecikmedi. Tavsiye ederim.',
    quoteAuthor: 'Mehmet B.',
    qr_label: 'Resepsiyon · QR'
  },
  salon: {
    name: 'Kuaför', emoji: '✂',
    label: { tr: 'Kuaför', en: 'Salon' },
    venue: 'Studio Atelye',
    venueShort: 'Studio Atelye',
    quote: 'Tam istediğim gibi oldu. Çay servisi de çok keyifliydi.',
    quoteAuthor: 'Ayşe T.',
    qr_label: 'Lavabo · QR'
  }
};

/* ─────────────── Color presets */
const PRESETS = {
  lime: { accent: '#C6F24E', accentInk: '#0A0A0A', accentName: 'Lime' },
  amber: { accent: '#F5C24D', accentInk: '#0A0A0A', accentName: 'Amber' },
  blue: { accent: '#5B8DEF', accentInk: '#FFFFFF', accentName: 'Sapphire' },
  rose: { accent: '#F26E8A', accentInk: '#FFFFFF', accentName: 'Rose' },
  violet: { accent: '#9D7BFF', accentInk: '#FFFFFF', accentName: 'Violet' }
};

/* ─────────────── Logo (compact mark) */
function Mark({ size = 80, fg = '#0A0A0A', accent = '#C6F24E' }) {
  // Simplified Buaze mark: bold "b" with QR-style rectangles forming the bowl
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <rect x="14" y="14" width="14" height="14" fill={fg} />
      <rect x="34" y="14" width="32" height="14" fill={accent} />
      <rect x="14" y="34" width="14" height="32" fill={fg} />
      <rect x="34" y="34" width="32" height="32" fill={fg} />
      <rect x="44" y="44" width="12" height="12" fill={accent} />
    </svg>);

}

/* ─────────────── QR placeholder (decorative) */
function FakeQR({ size = 200, fg = '#0A0A0A', bg = '#FFFFFF', dotSize = 1, accent }) {
  // Deterministic pseudo-random pattern that LOOKS like a QR
  const cells = 21;
  const cellPx = size / cells;
  const pattern = uM(() => {
    const out = [];
    let seed = 7;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        seed = (seed * 9301 + 49297) % 233280;
        out.push(seed / 233280 > 0.5 ? 1 : 0);
      }
    }
    return out;
  }, [cells]);
  // Force 3 finder patterns
  const isFinder = (x, y) => {
    const inBox = (bx, by) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
    return inBox(0, 0) || inBox(cells - 7, 0) || inBox(0, cells - 7);
  };
  const finderColor = (x, y) => {
    const corners = [[0, 0], [cells - 7, 0], [0, cells - 7]];
    for (const [bx, by] of corners) {
      if (x >= bx && x < bx + 7 && y >= by && y < by + 7) {
        const inX = x - bx,inY = y - by;
        const isOuter = inX === 0 || inX === 6 || inY === 0 || inY === 6;
        const isInner = inX >= 2 && inX <= 4 && inY >= 2 && inY <= 4;
        if (isOuter || isInner) return fg;
        return null;
      }
    }
    return null;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ background: bg, borderRadius: size * 0.04 }}>
      {pattern.map((v, i) => {
        const x = i % cells,y = Math.floor(i / cells);
        const fc = finderColor(x, y);
        if (fc !== null) {
          return <rect key={i} x={x * cellPx} y={y * cellPx} width={cellPx * 1.05} height={cellPx * 1.05} fill={fc} />;
        }
        if (isFinder(x, y)) return null;
        if (!v) return null;
        // Sprinkle accent on a few dots
        const isAccent = accent && i % 17 === 3;
        return <rect key={i} x={x * cellPx} y={y * cellPx} width={cellPx * 1.05} height={cellPx * 1.05} fill={isAccent ? accent : fg} />;
      })}
      {/* Center logo punch-out */}
      <rect x={size * 0.42} y={size * 0.42} width={size * 0.16} height={size * 0.16} fill={bg} />
      <rect x={size * 0.44} y={size * 0.44} width={size * 0.12} height={size * 0.12} fill={fg} />
    </svg>);

}

/* ─────────────── Star row */
function Stars({ count = 5, filled = 5, size = 32, color = '#0A0A0A', emptyColor }) {
  return (
    <div style={{ display: 'inline-flex', gap: size * 0.15 }}>
      {Array.from({ length: count }).map((_, i) =>
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < filled ? color : emptyColor || 'transparent'}
      stroke={i < filled ? color : color} strokeWidth="1.5">
          <path d="M12 2 15 9l7 .5-5.5 4.5L18.5 21 12 17l-6.5 4 2-7L2 9.5 9 9z" />
        </svg>
      )}
    </div>);

}

/* ─────────────── Editable text helper */
function E({ value, onChange, style, as = 'span', ...rest }) {
  const Tag = as;
  return (
    <Tag
      contentEditable suppressContentEditableWarning
      onBlur={(e) => onChange && onChange(e.currentTarget.innerText)}
      style={{ outline: 'none', cursor: 'text', ...style }}
      {...rest}>
      
      {value}
    </Tag>);

}

/* ═══════════════════════════════════════════════════════════════
   ASSET 1 — Profile picture (1080×1080, displays as circle on IG)
   QR-style mark with brand accent
   ═══════════════════════════════════════════════════════════════ */
function ProfilePic({ accent, accentInk }) {
  return (
    <div className="asset asset-pp" style={{
      background: '#0A0A0A',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative'
    }}>
      {/* Subtle ring */}
      <div style={{
        position: 'absolute', inset: 60, borderRadius: '50%',
        border: `2px solid ${accent}`, opacity: 0.18
      }} />
      <div style={{
        position: 'absolute', inset: 120, borderRadius: '50%',
        border: `1px solid ${accent}`, opacity: 0.10
      }} />

      {/* QR mark composed of dots */}
      <div style={{ position: 'relative', width: 560, height: 560 }}>
        <FakeQR size={560} fg="#FFFFFF" bg="#0A0A0A" accent={accent} />
        {/* Center logo punch */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 180, height: 180, borderRadius: 24, background: '#0A0A0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 8px #0A0A0A'
        }}>
          <div className="tight" style={{
            fontSize: 130, fontWeight: 800, color: accent, letterSpacing: '-0.06em',
            lineHeight: 1, paddingBottom: 8
          }}>b</div>
        </div>
      </div>
    </div>);

}

/* ═══════════════════════════════════════════════════════════════
   POST 1 — Manifesto: "Tek QR. Yıldızlı yorumlar."
   Cesur tipografi, siyah zemin, lime aksan
   ═══════════════════════════════════════════════════════════════ */
function Post1({ accent, accentInk, headline, sub, persona }) {
  return (
    <div className="asset asset-1080 grid-bg" style={{ background: '#0A0A0A' }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 64, left: 64, right: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Mark size={56} fg="#FFFFFF" accent={accent} />
          <div className="tight" style={{ color: '#fff', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>buaze</div>
        </div>
        <div className="mono" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 500 }}>
          buaze.com
        </div>
      </div>

      {/* Main type block */}
      <div style={{ position: 'absolute', top: 280, left: 64, right: 64 }}>
        <div className="mono" style={{
          color: accent, fontSize: 22, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 32, lineHeight: "1.4"
        }}>
          ↳ qr · feedback · reputation
        </div>
        <E value={headline} as="h1" className="tight" style={{
          margin: 0, color: '#fff', fontSize: 168, fontWeight: 800, lineHeight: 0.92, letterSpacing: '-0.045em',
          whiteSpace: 'pre-line'
        }} />
        <div style={{ height: 36 }} />
        <E value={sub} as="p" className="nrm" style={{
          margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 36, fontWeight: 400, lineHeight: 1.3, maxWidth: 880, letterSpacing: '-0.01em'
        }} />
      </div>

      {/* Footer — accent bar with stars */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 64, paddingRight: 64 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Stars filled={5} size={48} color={accentInk} />
          <div className="tight" style={{ color: accentInk, fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>4.8 ortalama</div>
        </div>
        <div className="mono" style={{ color: accentInk, fontSize: 20, fontWeight: 600, opacity: 0.7 }}>01 / 04</div>
      </div>
    </div>);

}

/* ═══════════════════════════════════════════════════════════════
   POST 2 — Akış (3 adım: QR → Yıldız → Yayın)
   Beyaz zemin, numaralı kartlar
   ═══════════════════════════════════════════════════════════════ */
function Post2({ accent, accentInk, persona }) {
  const steps = [
  { n: '01', title: 'Müşteri QR\'ı okutur', body: 'Masada, lavaboda, resepsiyonda — tek tarama.' },
  { n: '02', title: 'Yıldızını bırakır', body: '4★+ ise Google\'a, altıysa size özel forma.' },
  { n: '03', title: 'Yayınlanır, çözülür', body: 'İyi olan yayında. Kötü olan iç inboxta.' }];

  return (
    <div className="asset asset-1080 grid-bg-light" style={{ background: '#FAFAFA' }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 64, left: 64, right: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Mark size={56} fg="#0A0A0A" accent={accent} />
          <div className="tight" style={{ color: '#0A0A0A', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>buaze</div>
        </div>
        <div className="mono" style={{ color: 'rgba(0,0,0,0.5)', fontSize: 18, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Nasıl çalışır
        </div>
      </div>

      {/* Title */}
      <div style={{ position: 'absolute', top: 200, left: 64, right: 64 }}>
        <h2 className="tight" style={{ margin: 0, fontSize: 96, fontWeight: 800, color: '#0A0A0A', lineHeight: 0.95, letterSpacing: '-0.04em' }}>
          3 adımda<br />kötü yorum<br />filtresi.
        </h2>
      </div>

      {/* Steps */}
      <div style={{ position: 'absolute', bottom: 64, left: 64, right: 64, display: 'flex', gap: 24 }}>
        {steps.map((s, i) =>
        <div key={i} style={{
          flex: 1, background: '#fff', borderRadius: 24, padding: 32, position: 'relative',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.08)',
          minHeight: 320, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
        }}>
            <div className="mono" style={{
            color: i === 1 ? accentInk : '#0A0A0A',
            background: i === 1 ? accent : 'transparent',
            fontSize: 24, fontWeight: 700,
            padding: i === 1 ? '4px 12px' : 0,
            borderRadius: 6, alignSelf: 'flex-start',
            letterSpacing: '0.05em'
          }}>{s.n}</div>
            <div>
              <div className="tight" style={{ fontSize: 36, fontWeight: 700, color: '#0A0A0A', lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 12 }}>
                {s.title}
              </div>
              <div className="nrm" style={{ fontSize: 22, color: '#525252', lineHeight: 1.4 }}>
                {s.body}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>);

}

/* ═══════════════════════════════════════════════════════════════
   POST 3 — İstatistik kartı: "Yorumların %40'ı kayboluyor"
   ═══════════════════════════════════════════════════════════════ */
function Post3({ accent, accentInk, persona }) {
  return (
    <div className="asset asset-1080" style={{ background: accent, position: 'relative' }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 64, left: 64, right: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Mark size={56} fg={accentInk} accent="#0A0A0A" />
          <div className="tight" style={{ color: accentInk, fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>buaze</div>
        </div>
        <div className="mono" style={{ color: accentInk, fontSize: 18, fontWeight: 600, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Veri · 2025
        </div>
      </div>

      {/* Big number */}
      <div style={{ position: 'absolute', top: 220, left: 64, right: 64 }}>
        <div className="mono" style={{ color: accentInk, fontSize: 22, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 24, opacity: 0.65 }}>
          Memnun müşterilerin
        </div>
        <div className="tight" style={{
          color: accentInk, fontSize: 480, fontWeight: 800, lineHeight: 0.85, letterSpacing: '-0.06em',
          fontVariantNumeric: 'tabular-nums'
        }}>
          %40
        </div>
        <div className="tight" style={{ color: accentInk, fontSize: 56, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.03em', marginTop: 16, maxWidth: 900 }}>
          yorum bırakmadan ayrılıyor.
        </div>
      </div>

      {/* Footer card */}
      <div style={{
        position: 'absolute', bottom: 64, left: 64, right: 64,
        background: '#0A0A0A', borderRadius: 28, padding: '32px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24
      }}>
        <div>
          <div className="mono" style={{ color: accent, fontSize: 18, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Buaze ile
          </div>
          <div className="tight" style={{ color: '#fff', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Bu oran %85'e çıkıyor.
          </div>
        </div>
        <div className="mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: 600 }}>03 / 04</div>
      </div>
    </div>);

}

/* ═══════════════════════════════════════════════════════════════
   POST 4 — Müşteri yorumu (testimonial card)
   ═══════════════════════════════════════════════════════════════ */
function Post4({ accent, accentInk, persona }) {
  const p = PERSONAS[persona];
  return (
    <div className="asset asset-1080" style={{ background: '#FAFAFA', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 12, background: accent }} />

      {/* Header */}
      <div style={{ position: 'absolute', top: 80, left: 64, right: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Mark size={56} fg="#0A0A0A" accent={accent} />
          <div className="tight" style={{ color: '#0A0A0A', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>buaze</div>
        </div>
        <div className="mono" style={{ color: '#737373', fontSize: 18, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Vaka · {p.label.tr.toLowerCase()}
        </div>
      </div>

      {/* Quote */}
      <div style={{ position: 'absolute', top: 240, left: 64, right: 64 }}>
        <div className="tight" style={{ color: accentInk, background: accent, display: 'inline-block', padding: '6px 16px', borderRadius: 6, fontSize: 22, fontWeight: 700, letterSpacing: '0.04em', marginBottom: 28 }}>
          ★★★★★  Google
        </div>
        <div className="tight" style={{
          color: '#0A0A0A', fontSize: 72, fontWeight: 600, lineHeight: 1.08, letterSpacing: '-0.025em',
          fontStyle: 'italic'
        }}>
          “{p.quote}”
        </div>
      </div>

      {/* Author + venue */}
      <div style={{ position: 'absolute', bottom: 250, left: 64, right: 64, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: '#0A0A0A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent, fontSize: 28, fontWeight: 700, fontFamily: "'Inter Tight'"
        }}>
          {p.quoteAuthor.charAt(0)}
        </div>
        <div>
          <div className="tight" style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.01em' }}>
            {p.quoteAuthor}
          </div>
          <div className="nrm" style={{ fontSize: 20, color: '#737373' }}>
            {p.venue}
          </div>
        </div>
      </div>

      {/* Footer with QR */}
      <div style={{
        position: 'absolute', bottom: 64, left: 64, right: 64,
        background: '#0A0A0A', borderRadius: 24, padding: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div className="mono" style={{ color: accent, fontSize: 16, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Sen de başla
          </div>
          <div className="tight" style={{ color: '#fff', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
            buaze.com
          </div>
        </div>
        <div style={{ background: '#fff', padding: 12, borderRadius: 12 }}>
          <FakeQR size={120} fg="#0A0A0A" bg="#FFFFFF" />
        </div>
      </div>
    </div>);

}

/* ═══════════════════════════════════════════════════════════════
   OG IMAGE — TR + EN versions (1200×630)
   ═══════════════════════════════════════════════════════════════ */
function OG({ lang, accent, accentInk }) {
  const copy = lang === 'tr' ? {
    eyebrow: 'QR · YORUM · İTİBAR YÖNETİMİ',
    headline: 'Tek QR ile yıldızlı yorumlar.',
    sub: 'Buaze, mutlu müşterileri Google\'a, mutsuz olanları size yönlendirir.',
    cta: 'buaze.com'
  } : {
    eyebrow: 'QR · REVIEWS · REPUTATION',
    headline: 'One QR. More 5★ reviews.',
    sub: 'Buaze routes happy customers to Google, unhappy ones straight to you.',
    cta: 'buaze.com'
  };
  return (
    <div className="asset asset-og-w grid-bg" style={{ background: '#0A0A0A', position: 'relative' }}>
      {/* Left content */}
      <div style={{ position: 'absolute', top: 56, left: 56, right: 460, bottom: 56, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Mark size={48} fg="#FFFFFF" accent={accent} />
          <div className="tight" style={{ color: '#fff', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em' }}>buaze</div>
          <div className="mono" style={{
            marginLeft: 14, fontSize: 11, fontWeight: 700, color: accent,
            border: `1px solid ${accent}`, padding: '4px 8px', borderRadius: 4,
            letterSpacing: '0.1em'
          }}>
            {lang.toUpperCase()}
          </div>
        </div>

        <div>
          <div className="mono" style={{
            color: accent, fontSize: 14, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 18
          }}>
            ↳ {copy.eyebrow}
          </div>
          <div className="tight" style={{
            color: '#fff', fontSize: 80, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.035em', marginBottom: 18,
            textWrap: 'balance'
          }}>
            {copy.headline}
          </div>
          <div className="nrm" style={{
            color: 'rgba(255,255,255,0.7)', fontSize: 22, lineHeight: 1.4, maxWidth: 600, letterSpacing: '-0.005em'
          }}>
            {copy.sub}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Stars filled={5} size={20} color={accent} />
            <div className="mono" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 600 }}>4.8 · 1.2k+</div>
          </div>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)' }} />
          <div className="mono" style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>
            {copy.cta}
          </div>
        </div>
      </div>

      {/* Right showcase: phone with public review */}
      <div style={{
        position: 'absolute', right: 56, top: 56, bottom: 56, width: 380,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          width: 280, height: 480, background: '#1a1a1a', borderRadius: 32, padding: 16,
          boxShadow: `0 30px 80px ${accent}22, 0 0 0 1px rgba(255,255,255,0.08)`,
          position: 'relative'
        }}>
          {/* Notch */}
          <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', width: 90, height: 22, borderRadius: 14, background: '#000', zIndex: 2 }} />
          <div style={{
            background: '#0A0A0A', borderRadius: 22, height: '100%',
            padding: '60px 24px 24px', display: 'flex', flexDirection: 'column', gap: 18
          }}>
            <div className="mono" style={{ color: accent, fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              {PERSONAS.restaurant.qr_label}
            </div>
            <div className="tight" style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {lang === 'tr' ? 'Deneyiminizi puanlayın' : 'Rate your experience'}
            </div>
            <div style={{ height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
              {[1, 2, 3, 4, 5].map((i) =>
              <svg key={i} width="32" height="32" viewBox="0 0 24 24" fill={i <= 5 ? accent : 'transparent'} stroke={accent} strokeWidth="1.5">
                  <path d="M12 2 15 9l7 .5-5.5 4.5L18.5 21 12 17l-6.5 4 2-7L2 9.5 9 9z" />
                </svg>
              )}
            </div>
            <div className="mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'center', marginTop: 4 }}>
              {lang === 'tr' ? '5/5 — Google\'a yönlendiriliyor' : '5/5 — Routing to Google'}
            </div>
            <div style={{ flex: 1 }} />
            <button style={{
              background: accent, color: accentInk, border: 'none', borderRadius: 12,
              padding: '12px 16px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
              letterSpacing: '-0.01em'
            }}>
              {lang === 'tr' ? 'Yorum bırak →' : 'Leave a review →'}
            </button>
          </div>
        </div>
      </div>
    </div>);

}

/* ═══════════════════════════════════════════════════════════════
   ROOT
   ═══════════════════════════════════════════════════════════════ */
function App() {
  const [tweaks, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "preset": "lime",
    "persona": "restaurant",
    "post1Headline": "Tek QR.\nYıldızlı\nyorumlar.",
    "post1Sub": "Masada bir kare. Resepsiyonda bir kare. Aldığınız her yorum, kendi yerine. Buaze, müşteri sesini yönetilebilir bir akışa çevirir."
  } /*EDITMODE-END*/);

  const preset = PRESETS[tweaks.preset] || PRESETS.lime;

  return (
    <>
      <DesignCanvas>
        <DCSection id="profile" title="Profile picture" subtitle="1080×1080 — Instagram'da yuvarlak görünür">
          <DCArtboard id="pp-square" label="01 · Profile (square)" width={1080} height={1080}>
            <ProfilePic accent={preset.accent} accentInk={preset.accentInk} />
          </DCArtboard>
          <DCArtboard id="pp-circle" label="02 · Profile (circle preview)" width={1080} height={1080}>
            <div style={{ width: '100%', height: '100%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}>
              <div style={{ width: 920, height: 920, borderRadius: '50%', overflow: 'hidden', border: `4px solid ${preset.accent}`, boxShadow: '0 40px 100px rgba(0,0,0,0.5)' }}>
                <ProfilePic accent={preset.accent} accentInk={preset.accentInk} />
              </div>
            </div>
          </DCArtboard>
        </DCSection>

        <DCSection id="posts" title="Instagram feed posts" subtitle="1080×1080 · Türkçe — başlık ve alt yazı inline düzenlenebilir (tıklayıp yazın)">
          <DCArtboard id="post-1" label="Post 01 · Manifesto" width={1080} height={1080}>
            <Post1
              accent={preset.accent} accentInk={preset.accentInk}
              headline={tweaks.post1Headline}
              sub={tweaks.post1Sub}
              persona={tweaks.persona} />
            
          </DCArtboard>
          <DCArtboard id="post-2" label="Post 02 · Nasıl çalışır" width={1080} height={1080}>
            <Post2 accent={preset.accent} accentInk={preset.accentInk} persona={tweaks.persona} />
          </DCArtboard>
          <DCArtboard id="post-3" label="Post 03 · İstatistik" width={1080} height={1080}>
            <Post3 accent={preset.accent} accentInk={preset.accentInk} persona={tweaks.persona} />
          </DCArtboard>
          <DCArtboard id="post-4" label="Post 04 · Müşteri yorumu" width={1080} height={1080}>
            <Post4 accent={preset.accent} accentInk={preset.accentInk} persona={tweaks.persona} />
          </DCArtboard>
        </DCSection>

        <DCSection id="og" title="OpenGraph" subtitle="1200×630 — link önizleme görseli">
          <DCArtboard id="og-tr" label="OG · Türkçe" width={1200} height={630}>
            <OG lang="tr" accent={preset.accent} accentInk={preset.accentInk} />
          </DCArtboard>
          <DCArtboard id="og-en" label="OG · English" width={1200} height={630}>
            <OG lang="en" accent={preset.accent} accentInk={preset.accentInk} />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Renk paleti" />
        <TweakRadio label="Aksan" value={tweaks.preset} onChange={(v) => setTweak('preset', v)}
        options={Object.entries(PRESETS).map(([k, v]) => ({ value: k, label: v.accentName }))} />

        <TweakSection label="Persona (Post 04)" />
        <TweakRadio label="Sektör" value={tweaks.persona} onChange={(v) => setTweak('persona', v)}
        options={[
        { value: 'restaurant', label: 'Restoran' },
        { value: 'clinic', label: 'Klinik' },
        { value: 'salon', label: 'Kuaför' }]
        } />

        <TweakSection label="Düzenleme" />
        <div style={{ fontSize: 11, color: '#737373', padding: '4px 0 8px', lineHeight: 1.4 }}>
          Post 01'deki başlık ve alt yazıyı doğrudan görselin üzerine tıklayıp düzenleyebilirsin.
        </div>
        <TweakText label="Post 01 başlık" value={tweaks.post1Headline}
        onChange={(v) => setTweak('post1Headline', v)} />
        <TweakText label="Post 01 alt yazı" value={tweaks.post1Sub}
        onChange={(v) => setTweak('post1Sub', v)} />
      </TweaksPanel>
    </>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);