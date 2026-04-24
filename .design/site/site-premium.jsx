/* =====================================================
   BUAZE PREMIUM — CSS Animations & Global Styles
   Load this BEFORE any JSX components
   ===================================================== */

if (!document.getElementById('buaze-premium-css')) {
  const s = document.createElement('style');
  s.id = 'buaze-premium-css';
  s.textContent = `
    /* ── Keyframes ── */
    @keyframes bz-fade-up   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:none } }
    @keyframes bz-fade-in   { from { opacity:0 } to { opacity:1 } }
    @keyframes bz-slide-in  { from { opacity:0; transform:translateX(-16px) } to { opacity:1; transform:none } }
    @keyframes bz-scale-in  { from { opacity:0; transform:scale(0.92) } to { opacity:1; transform:scale(1) } }
    @keyframes bz-pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.6);opacity:.5} }
    @keyframes bz-marquee   { from{transform:translateX(0)} to{transform:translateX(-50%)} }
    @keyframes bz-ecg       { from{stroke-dashoffset:400} to{stroke-dashoffset:0} }
    @keyframes bz-float     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes bz-glow      { 0%,100%{box-shadow:0 0 0 0 rgba(198,242,78,.35)} 50%{box-shadow:0 0 0 12px rgba(198,242,78,0)} }
    @keyframes bz-count     { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
    @keyframes bz-bar-grow  { from{width:0} to{width:var(--w)} }
    @keyframes bz-spin      { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    @keyframes bz-slide-up  { from{transform:translateY(100%);opacity:0} to{transform:none;opacity:1} }
    @keyframes bz-slide-down{ from{transform:translateY(-100%)} to{transform:none} }
    @keyframes bz-toast-in  { from{transform:translateX(120%);opacity:0} to{transform:none;opacity:1} }
    @keyframes bz-wiggle    { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-3deg)} 75%{transform:rotate(3deg)} }
    @keyframes bz-ping      { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.5);opacity:0} }

    /* ── Animation classes ── */
    .bz-fade-up   { animation: bz-fade-up   .55s cubic-bezier(.2,.8,.2,1) both }
    .bz-fade-in   { animation: bz-fade-in   .4s  cubic-bezier(.2,.8,.2,1) both }
    .bz-scale-in  { animation: bz-scale-in  .4s  cubic-bezier(.34,1.56,.64,1) both }
    .bz-float     { animation: bz-float     3s   ease-in-out infinite }
    .bz-glow      { animation: bz-glow      2.5s ease-in-out infinite }
    .bz-spin      { animation: bz-spin      1.2s linear infinite }
    .bz-wiggle    { animation: bz-wiggle    .5s  ease-in-out }

    .bz-d1  { animation-delay:.08s }
    .bz-d2  { animation-delay:.16s }
    .bz-d3  { animation-delay:.24s }
    .bz-d4  { animation-delay:.32s }
    .bz-d5  { animation-delay:.4s  }

    /* ── Hover states ── */
    .bz-btn-primary { transition: background .16s, box-shadow .16s, transform .16s }
    .bz-btn-primary:hover { background: #A8D62E !important; box-shadow: 0 6px 24px rgba(198,242,78,.4); transform: translateY(-1px) }
    .bz-btn-ghost:hover { background: rgba(0,0,0,.05) !important }
    .bz-card-hover { transition: box-shadow .2s, transform .2s }
    .bz-card-hover:hover { box-shadow: 0 20px 48px -20px rgba(0,0,0,.15); transform: translateY(-2px) }
    .bz-link:hover { text-decoration: underline; text-underline-offset: 3px }

    /* ── Nav dropdown ── */
    .bz-dropdown { display:none; position:absolute; top:calc(100% + 8px); left:50%; transform:translateX(-50%);
      background:#fff; border:1px solid #EDEDED; border-radius:16px; padding:8px;
      box-shadow:0 20px 60px -20px rgba(0,0,0,.2); min-width:480px; z-index:100;
      animation: bz-scale-in .2s cubic-bezier(.34,1.56,.64,1) both }
    .bz-nav-item:hover .bz-dropdown { display:grid }

    /* ── Marquee ── */
    .bz-marquee-track { display:flex; width:max-content; animation:bz-marquee 28s linear infinite }
    .bz-marquee-track:hover { animation-play-state:paused }

    /* ── Toast ── */
    .bz-toast { animation: bz-toast-in .4s cubic-bezier(.34,1.56,.64,1) both }

    /* ── Mobile ── */
    @media (max-width: 768px) {
      .bz-hide-mobile { display:none !important }
      .bz-mobile-stack { flex-direction:column !important }
      .bz-mobile-full  { grid-template-columns:1fr !important }
      .bz-mobile-px    { padding-left:20px !important; padding-right:20px !important }
    }
  `;
  document.head.appendChild(s);
}

// =========================================================
// PREMIUM NAV — mega-dropdown, scroll-aware, mobile-ready
// =========================================================
const { useState: useNavState, useEffect: useNavEffect } = React;

function PremiumNav({ active = 'home' }) {
  const { Lockup } = window.PulseBrand;
  const [scrolled, setScrolled] = useNavState(false);
  const [mobileOpen, setMobileOpen] = useNavState(false);

  useNavEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navStyle = {
    position: 'sticky', top: 0, zIndex: 200,
    background: scrolled ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid ' + (scrolled ? '#E5E5E5' : '#EDEDED'),
    transition: 'all .25s cubic-bezier(.2,.8,.2,1)',
    boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,.05)' : 'none',
  };

  const solutionItems = [
    { icon: '🍽', l: 'Restoran & Kafe', d: 'Masa QR + Google yorum' },
    { icon: '📦', l: 'Paket Servis', d: 'Yemeksepeti, Getir, Trendyol GO' },
    { icon: '🏨', l: 'Otel', d: 'Booking + Tripadvisor enteg.' },
    { icon: '🏥', l: 'Klinik', d: 'KVKK uyumlu hasta anketi' },
    { icon: '⚖️', l: 'Hukuk Ofisi', d: 'Müvekkil memnuniyet akışı' },
    { icon: '💆', l: 'Güzellik & Spa', d: 'Randevu sonrası yorum' },
  ];

  const productItems = [
    { icon: '▦', l: 'QR Stüdyosu', d: 'Marka QR kodu oluştur' },
    { icon: '✦', l: 'Yorum Yönetimi', d: 'Tek panelde tüm platformlar' },
    { icon: '◐', l: 'AI Co-Pilot', d: '30 sn\'de akıllı yanıt önerisi' },
    { icon: '◉', l: 'Analitik', d: 'NPS, duygu, personel skoru' },
  ];

  return (
    <nav style={navStyle}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Lockup size="sm" color="#0A0A0A" accent="#C6F24E" />

        {/* Desktop nav */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} className="bz-hide-mobile">
          {/* Ürün dropdown */}
          <div className="bz-nav-item" style={{ position: 'relative' }}>
            <button style={{ padding: '8px 14px', fontSize: 14, fontFamily: "'Inter',sans-serif", background: 'none', border: 'none', cursor: 'pointer', color: active === 'product' ? '#0A0A0A' : '#525252', fontWeight: active === 'product' ? 600 : 400, borderRadius: 8 }}>
              Ürün ↓
            </button>
            <div className="bz-dropdown" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {productItems.map(it => (
                <div key={it.l} style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{it.icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14 }}>{it.l}</div>
                    <div style={{ fontSize: 12, color: '#737373', marginTop: 1 }}>{it.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Çözümler dropdown */}
          <div className="bz-nav-item" style={{ position: 'relative' }}>
            <button style={{ padding: '8px 14px', fontSize: 14, fontFamily: "'Inter',sans-serif", background: 'none', border: 'none', cursor: 'pointer', color: active === 'solutions' ? '#0A0A0A' : '#525252', fontWeight: active === 'solutions' ? 600 : 400, borderRadius: 8 }}>
              Çözümler ↓
            </button>
            <div className="bz-dropdown" style={{ gridTemplateColumns: '1fr 1fr', left: '-60px', transform: 'translateX(0)' }}>
              {solutionItems.map(it => (
                <div key={it.l} style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EAF9B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{it.icon}</div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14 }}>{it.l}</div>
                    <div style={{ fontSize: 12, color: '#737373', marginTop: 1 }}>{it.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {[
            { k: 'pricing', l: 'Fiyatlar' },
            { k: 'stories', l: 'Müşteriler' },
            { k: 'blog', l: 'Blog' },
          ].map(i => (
            <button key={i.k} style={{ padding: '8px 14px', fontSize: 14, fontFamily: "'Inter',sans-serif", background: 'none', border: 'none', cursor: 'pointer', color: active === i.k ? '#0A0A0A' : '#525252', fontWeight: active === i.k ? 600 : 400, borderRadius: 8 }}>{i.l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="bz-hide-mobile" style={{ padding: '9px 16px', fontSize: 14, fontFamily: "'Inter',sans-serif", background: 'none', border: 'none', cursor: 'pointer', color: '#525252' }}>Giriş yap</button>
          <button className="bz-btn-primary" style={{ padding: '10px 20px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600, fontFamily: "'Inter',sans-serif", cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            Ücretsiz başla <span style={{ fontSize: 16 }}>→</span>
          </button>
          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{ display: 'none', padding: 8, background: 'none', border: 'none', cursor: 'pointer' }} className="bz-show-mobile">☰</button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderBottom: '1px solid #EDEDED', padding: 20, animation: 'bz-slide-down .2s ease both', zIndex: 199 }}>
          {['Ürün', 'Çözümler', 'Fiyatlar', 'Müşteriler', 'Blog', 'Giriş yap'].map(l => (
            <div key={l} style={{ padding: '12px 0', borderBottom: '1px solid #F5F5F5', fontSize: 16, fontFamily: "'Inter',sans-serif", fontWeight: 500 }}>{l}</div>
          ))}
          <div style={{ marginTop: 16, padding: '14px 0', background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>Ücretsiz başla →</div>
        </div>
      )}
    </nav>
  );
}

// =========================================================
// PREMIUM FOOTER — email capture, animated ECG line
// =========================================================
function PremiumFooter() {
  const { Lockup } = window.PulseBrand;
  const [email, setEmail] = useNavState('');
  const [submitted, setSubmitted] = useNavState(false);

  const cols = [
    { t: 'Ürün', items: ['QR Stüdyosu', 'Yorum Yönetimi', 'AI Co-Pilot', 'Analitik & Raporlar', 'Entegrasyonlar', 'API & Webhook'] },
    { t: 'Çözümler', items: ['Restoran & Kafe', 'Paket Servis', 'Otel', 'Klinik', 'Hukuk Ofisi', 'Güzellik & Spa'] },
    { t: 'Şirket', items: ['Hakkımızda', 'Kariyer → 5 pozisyon', 'Blog', 'Müşteri hikayeleri', 'İletişim'] },
    { t: 'Destek', items: ['Yardım merkezi', 'Sistem durumu ●', 'Gizlilik', 'KVKK', 'Şartlar'] },
  ];

  return (
    <footer style={{ background: '#0A0A0A', color: '#fff', fontFamily: "'Inter',sans-serif" }}>
      {/* ECG divider */}
      <div style={{ borderTop: '1px solid #1F1F1F', overflow: 'hidden', height: 56, position: 'relative' }}>
        <svg viewBox="0 0 1440 56" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
          <path d="M0 28 L200 28 L240 8 L280 48 L320 18 L360 38 L500 28 L700 28 L740 8 L780 48 L820 18 L860 38 L1000 28 L1200 28 L1240 8 L1280 48 L1320 18 L1360 38 L1440 28"
            fill="none" stroke="#C6F24E" strokeWidth="2" opacity="0.5"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: 'bz-ecg 3s ease forwards' }} />
        </svg>
      </div>

      {/* Email capture */}
      <div style={{ borderBottom: '1px solid #1F1F1F', padding: '48px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 36, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Haftalık itibar rehberi. <span style={{ color: '#C6F24E' }}>Ücretsiz.</span>
          </div>
          <div style={{ fontSize: 14, color: '#737373', marginTop: 10 }}>Google politikaları, QR ipuçları, vaka çalışmaları. Haftada bir, fazla değil.</div>
        </div>
        {submitted ? (
          <div className="bz-scale-in" style={{ padding: 20, background: '#EAF9B8', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✓</div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 600, color: '#0A0A0A' }}>Süper! Kayıt oldunuz.</div>
              <div style={{ fontSize: 13, color: '#525252', marginTop: 2 }}>İlk e-posta pazartesi geliyor.</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="email"
              placeholder="e-posta@işletme.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ flex: 1, padding: '14px 18px', background: '#1A1A1A', border: '1px solid #333', borderRadius: 999, fontSize: 14, color: '#fff', fontFamily: "'Inter',sans-serif", outline: 'none' }}
            />
            <button className="bz-btn-primary" onClick={() => email && setSubmitted(true)}
              style={{ padding: '14px 22px', background: '#C6F24E', color: '#0A0A0A', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Abone ol →
            </button>
          </div>
        )}
      </div>

      {/* Links */}
      <div style={{ padding: '48px 64px 28px', display: 'grid', gridTemplateColumns: '1.6fr repeat(4, 1fr)', gap: 32 }}>
        <div>
          <Lockup size="sm" color="#FFFFFF" accent="#C6F24E" />
          <div style={{ fontSize: 13, color: '#737373', marginTop: 14, lineHeight: 1.7, maxWidth: 260 }}>
            İşletmeler için dijital itibar platformu. QR ile topla, tek panelden yönet, gerçek zamanlı izle.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {[
              { l: 'X', bg: '#000' }, { l: 'in', bg: '#0A66C2' }, { l: 'IG', bg: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }, { l: 'YT', bg: '#FF0000' }
            ].map(s => (
              <div key={s.l} style={{ width: 34, height: 34, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>{s.l}</div>
            ))}
          </div>
        </div>
        {cols.map(c => (
          <div key={c.t}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16 }}>{c.t}</div>
            {c.items.map(it => (
              <div key={it} style={{ fontSize: 13, color: '#A3A3A3', marginBottom: 10, cursor: 'pointer', transition: 'color .12s' }}
                onMouseEnter={e => e.currentTarget.style.color='#fff'}
                onMouseLeave={e => e.currentTarget.style.color='#A3A3A3'}>{it}</div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '20px 64px 28px', borderTop: '1px solid #1F1F1F', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#525252', letterSpacing: '0.14em' }}>© 2026 BUAZE BİLİŞİM A.Ş. · İSTANBUL · TÜM HAKLARI SAKLIDIR</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: 999, background: '#16A34A', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: '#16A34A', animation: 'bz-ping 1.5s cubic-bezier(0,0,.2,1) infinite' }} />
          </div>
          <span style={{ fontSize: 12, color: '#737373' }}>Tüm sistemler çalışıyor</span>
        </div>
      </div>
    </footer>
  );
}

// =========================================================
// CONVERSION LAYER — sticky CTA, social proof toast
// =========================================================
function ConversionLayer() {
  const [showSticky, setShowSticky] = useNavState(false);
  const [toast, setToast] = useNavState(null);
  const [toastIdx, setToastIdx] = useNavState(0);

  const toasts = [
    { biz: 'Kadıköy Bistro', city: 'İstanbul', action: 'az önce 14 günlük denemeye başladı' },
    { biz: 'Hotel Nora', city: 'Bodrum', action: 'bu ay 284 yeni yorum topladı' },
    { biz: 'Derma+ Klinik', city: 'Ankara', action: 'Google puanını 4.9\'a yükseltti' },
    { biz: 'Ark Kahve', city: 'Beşiktaş', action: 'şimdi kaydoldu' },
    { biz: 'Ren Spa', city: 'Nişantaşı', action: 'Yemeksepeti entegrasyonunu aktifleştirdi' },
  ];

  useNavEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });

    // Toast timer
    let t;
    const show = () => {
      setToast(toasts[toastIdx % toasts.length]);
      setToastIdx(i => i + 1);
      setTimeout(() => setToast(null), 4200);
      t = setTimeout(show, 8000);
    };
    const init = setTimeout(show, 3000);
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(t); clearTimeout(init); };
  }, []);

  return (
    <>
      {/* Social proof toast */}
      {toast && (
        <div className="bz-toast" style={{
          position: 'fixed', bottom: showSticky ? 80 : 24, left: 24, zIndex: 1000,
          background: '#fff', border: '1px solid #EDEDED', borderRadius: 16,
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 20px 60px -20px rgba(0,0,0,.2)', maxWidth: 340,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: '#EAF9B8', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
            {toast.biz[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 13 }}>{toast.biz}</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 1 }}>{toast.city} · {toast.action}</div>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#A3A3A3', alignSelf: 'flex-start' }}>ŞİMDİ</div>
        </div>
      )}

      {/* Sticky CTA bar */}
      {showSticky && (
        <div className="bz-fade-in" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
          background: '#0A0A0A', color: '#fff',
          padding: '14px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid #1F1F1F',
        }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 500, letterSpacing: '-0.015em' }}>Bugün başla, ilk yorunuzu yarın alın.</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 1 }}>14 gün ücretsiz · Kredi kartı gerekmez · İstediğin zaman iptal et</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="bz-btn-primary" style={{ padding: '12px 24px', background: '#C6F24E', color: '#0A0A0A', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Ücretsiz başla →
            </button>
            <button onClick={() => setShowSticky(false)} style={{ background: 'none', border: 'none', color: '#737373', fontSize: 22, cursor: 'pointer', padding: '4px 8px' }}>✕</button>
          </div>
        </div>
      )}
    </>
  );
}

window.BuazePremium = { PremiumNav, PremiumFooter, ConversionLayer };
