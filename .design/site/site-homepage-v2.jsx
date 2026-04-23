// Buaze Homepage v2 — Premium, animated, conversion-focused
const { useState: useHP, useEffect: useHPE, useRef: useHPR } = React;
const BP = () => window.BuazePremium;
const PB8 = () => window.PulseBrand;
const PL3 = () => window.Platforms;

// ── Animated counter ──
function AnimCounter({ target, suffix = '', duration = 1800 }) {
  const [val, setVal] = useHP(0);
  const ref = useHPR(null);
  useHPE(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      const start = Date.now();
      const tick = () => {
        const p = Math.min((Date.now() - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(ease * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      tick();
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return <span ref={ref}>{val.toLocaleString('tr')}{suffix}</span>;
}

// ── Live review ticker ──
function LiveTicker() {
  const [idx, setIdx] = useHP(0);
  const reviews = [
    { name: 'Melis D.', biz: 'Ark Bistro', stars: 5, text: 'Servis muhteşemdi, tekrar geleceğiz.' },
    { name: 'Ahmet Y.', biz: 'Hotel Nora', stars: 5, text: 'Kahvaltısı nefisti, oda çok temizdi.' },
    { name: 'Zeynep K.', biz: 'Derma+', stars: 5, text: 'Doktor çok ilgiliydi, tavsiye ederim.' },
    { name: 'Can A.', biz: 'Kahve Dükkan', stars: 5, text: 'En iyi espresso, ortam harika.' },
    { name: 'Selin M.', biz: 'Ren Spa', stars: 5, text: 'Masaj seansı mükemmeldi, bayıldım.' },
  ];
  useHPE(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % reviews.length), 2600);
    return () => clearInterval(t);
  }, []);
  const r = reviews[idx];
  return (
    <div key={idx} className="bz-fade-up" style={{
      background: '#fff', border: '1px solid #EDEDED', borderRadius: 14,
      padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start',
      boxShadow: '0 8px 32px rgba(0,0,0,.06)',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 999, background: '#EAF9B8', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{r.name[0]}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600 }}>{r.name} <span style={{ fontWeight: 400, color: '#737373' }}>· {r.biz}</span></span>
          <span style={{ color: '#C6F24E', fontSize: 12, background: '#0A0A0A', padding: '1px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono',monospace" }}>{'★'.repeat(r.stars)}</span>
        </div>
        <div style={{ fontSize: 13, color: '#525252', marginTop: 3 }}>"{r.text}"</div>
      </div>
    </div>
  );
}

// ── Hero dashboard preview ──
function HeroDashboard() {
  const [chartAnim, setChartAnim] = useHP(false);
  useHPE(() => { setTimeout(() => setChartAnim(true), 600); }, []);
  return (
    <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 20, padding: 20, boxShadow: '0 40px 80px -30px rgba(0,0,0,.18)', position: 'relative', overflow: 'hidden' }}>
      {/* topbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#737373', letterSpacing: '0.14em' }}>YORUM RİTMİ · CANLI</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A', animation: 'bz-pulse-dot 1.5s ease infinite' }} />
            <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>Canlı</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {chartAnim ? <AnimCounter target={1284} /> : '0'}
        </div>
      </div>
      {/* chart */}
      <svg viewBox="0 0 380 100" style={{ width: '100%', height: 80 }}>
        <defs>
          <linearGradient id="hpgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25,50,75].map(y => <line key={y} x1="0" y1={y} x2="380" y2={y} stroke="#EDEDED" strokeWidth="0.8" />)}
        <path d="M0 75 L30 68 L60 72 L90 55 L120 58 L150 40 L180 44 L210 28 L240 34 L270 18 L300 24 L330 12 L360 16 L380 8 L380 100 L0 100 Z" fill="url(#hpgrad)" />
        <path d="M0 75 L30 68 L60 72 L90 55 L120 58 L150 40 L180 44 L210 28 L240 34 L270 18 L300 24 L330 12 L360 16 L380 8" fill="none" stroke="#C6F24E" strokeWidth="2.5" strokeLinecap="round" style={{ strokeDasharray: 600, strokeDashoffset: chartAnim ? 0 : 600, transition: 'stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1)' }} />
        <circle cx="380" cy="8" r="4" fill="#C6F24E" style={{ opacity: chartAnim ? 1 : 0, transition: 'opacity .3s .8s' }} />
      </svg>
      {/* mini reviews */}
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { n: 'M. Demir', s: 5, t: 'Servis harikaydı!' },
          { n: 'A. Yılmaz', s: 5, t: 'Kahvesi çok iyi.' },
        ].map((r, i) => (
          <div key={i} className={chartAnim ? `bz-fade-up bz-d${i+1}` : ''} style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #EDEDED' }}>
            <div style={{ width: 26, height: 26, borderRadius: 999, background: '#EAF9B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>{r.n[0]}</div>
            <div style={{ flex: 1, fontSize: 12 }}><b>{r.n}</b> {r.t}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', background: '#0A0A0A', padding: '1px 5px', borderRadius: 3 }}>{'★'.repeat(r.s)}</div>
          </div>
        ))}
      </div>
      {/* floating badge */}
      <div className="bz-float" style={{ position: 'absolute', top: -14, right: -14, background: '#0A0A0A', color: '#C6F24E', padding: '10px 16px', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 22, letterSpacing: '-0.02em' }}>+184%</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, opacity: 0.7, letterSpacing: '0.1em' }}>YORUM ARTIŞI</div>
      </div>
    </div>
  );
}

// ── Video modal ──
function VideoModal({ onClose }) {
  return (
    <div className="bz-fade-in" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="bz-scale-in" onClick={e => e.stopPropagation()} style={{ background: '#0A0A0A', borderRadius: 20, width: 760, aspectRatio: '16/9', position: 'relative', overflow: 'hidden', border: '1px solid #333' }}>
        {/* Fake video player */}
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <svg viewBox="0 0 64 64" width="120" style={{ opacity: 0.15 }}>
            <path d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z" fill="none" stroke="#C6F24E" strokeWidth="3" />
            <path d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28" fill="none" stroke="#C6F24E" strokeWidth="3" strokeLinecap="round" />
            <circle cx="54" cy="10" r="5" fill="#C6F24E" />
          </svg>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 500, color: '#fff' }}>2 dakikalık ürün turu</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: '#737373' }}>Video geliştirme aşamasında · Demo talep edebilirsiniz</div>
          <div style={{ padding: '12px 24px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Demo iste →</div>
        </div>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 999, background: '#1F1F1F', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
    </div>
  );
}

// ── MAIN HOMEPAGE V2 ──
function HomePageV2() {
  const { PremiumNav, PremiumFooter, ConversionLayer } = BP();
  const { Symbol } = PB8();
  const { PlatformLogo } = PL3();
  const [videoOpen, setVideoOpen] = useHP(false);
  const [activeTab, setActiveTab] = useHP(0);

  const platforms = ['yemeksepeti','getir-yemek','trendyol-go','google','tripadvisor','booking','yelp','foursquare','instagram','facebook'];

  const bentoFeatures = [
    { id: 'qr', span: '1 / 3', bg: '#0A0A0A', color: '#fff',
      title: 'QR Stüdyosu', sub: 'Sürükle-bırak kart tasarımı',
      body: 'Her masa, her paket, her oda için özel QR. 3 dakikada oluştur, PDF olarak indir, seri bas.',
      visual: (
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {['#C6F24E', '#FFFFFF', '#0A0A0A'].map((bg, i) => (
            <div key={i} style={{ flex: 1, aspectRatio: '3/4', background: bg, borderRadius: 10, border: bg === '#FFFFFF' ? '1px solid #333' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10 }}>
              <div style={{ width: 40, height: 40, background: bg === '#0A0A0A' ? '#C6F24E' : '#0A0A0A', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Symbol size={24} fg={bg === '#0A0A0A' ? '#0A0A0A' : '#fff'} accent={bg === '#0A0A0A' ? '#0A0A0A' : '#C6F24E'} />
              </div>
              <div style={{ width: '80%', height: 32, background: bg === '#0A0A0A' ? '#1A1A1A' : '#F5F5F5', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      )
    },
    { id: 'ai', span: '1 / 2', bg: '#C6F24E', color: '#0A0A0A',
      title: 'AI Co-Pilot', sub: '30 saniyede yanıt önerisi',
      body: 'GPT-4 + Claude, işletme sesinizi öğrenir. Onaylamanız yeterli.',
      visual: (
        <div style={{ marginTop: 14, background: 'rgba(0,0,0,.08)', borderRadius: 10, padding: 12 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.12em', marginBottom: 6 }}>AI ÖNERİSİ</div>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>"Teşekkürler! Tavuk dönerimizden bahsetmeniz şefi mutlu etti. Tekrar bekliyoruz 🙏"</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <div style={{ padding: '4px 10px', background: '#0A0A0A', color: '#C6F24E', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>Kullan</div>
            <div style={{ padding: '4px 10px', background: 'rgba(0,0,0,.1)', borderRadius: 999, fontSize: 10 }}>Düzenle</div>
          </div>
        </div>
      )
    },
    { id: 'analytics', span: '1 / 2', bg: '#FAFAFA', color: '#0A0A0A',
      title: 'Canlı Analitik', sub: 'NPS · Duygu · Personel',
      body: 'Her metrik anlık güncellenir. Haftalık özet e-postanıza düşer.',
      visual: (
        <svg viewBox="0 0 200 80" style={{ width: '100%', marginTop: 12 }}>
          {[20,40,60].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#EDEDED" strokeWidth="0.8" />)}
          <path d="M0 60 L30 50 L60 55 L90 35 L120 40 L150 20 L180 25 L200 10" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="200" cy="10" r="4" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
        </svg>
      )
    },
    { id: 'platforms', span: '1 / 3', bg: '#FFFFFF', color: '#0A0A0A',
      title: 'Tüm platformlar bağlı', sub: '12+ entegrasyon',
      body: 'Google, Yemeksepeti, Booking, Tripadvisor, Getir ve daha fazlası.',
      visual: (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
          {platforms.map(id => <PlatformLogo key={id} id={id} size={36} rounded={8} />)}
        </div>
      )
    },
  ];

  const testimonials = [
    { name: 'Emre Kaya', role: 'Kadıköy Bistro · Kurucu', avatar: 'EK', q: '"İlk ay içinde Google ortalamamız 4.2\'den 4.8\'e çıktı. Sistem kendi kendine çalışıyor."', metric: '+184%', mLabel: 'yorum artışı' },
    { name: 'Leyla Arslan', role: 'Hotel Nora · Genel Müdür', avatar: 'LA', q: '"Booking puanımız 8.2\'den 9.1\'e yükseldi. Tripadvisor\'da bölgede 1. olduk."', metric: '9.1/10', mLabel: 'Booking puanı' },
    { name: 'Dr. Ceren Yıldız', role: 'Derma+ Klinik · Kurucu', avatar: 'CY', q: '"KVKK uyumluluğu bizi çok rahatlatı. Hasta memnuniyeti ilk 60 günde %94\'e ulaştı."', metric: '%94', mLabel: 'hasta memnuniyeti' },
  ];

  const sectorTabs = [
    { label: 'Restoran & Kafe', badge: '1.200+', color: '#C6F24E', stats: ['+184%', '4.8/5', '22sn'], slabels: ['yorum artışı', 'Google puanı', 'tarama süresi'] },
    { label: 'Otel', badge: '340+', color: '#0A0A0A', stats: ['9.1/10', '+92%', '4.9/5'], slabels: ['Booking skoru', 'Tripadvisor yorum', 'ort. puan'] },
    { label: 'Klinik', badge: '520+', color: '#EAF9B8', stats: ['%94', '+62%', 'KVKK'], slabels: ['memnuniyet', 'randevu artışı', 'uyumlu'] },
    { label: 'Paket Servis', badge: '890+', color: '#0A0A0A', stats: ['+312%', '4.8/5', '3 platform'], slabels: ['Yemeksepeti yorum', 'Getir puanı', 'tek QR'] },
  ];

  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter',sans-serif" }}>
      <PremiumNav active="home" />
      {videoOpen && <VideoModal onClose={() => setVideoOpen(false)} />}
      <ConversionLayer />

      {/* ── HERO ── */}
      <section style={{ padding: '96px 64px 80px', maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* badge */}
          <div className="bz-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#EAF9B8', borderRadius: 999, alignSelf: 'flex-start' }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A', animation: 'bz-pulse-dot 1.5s ease infinite' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '0.12em', color: '#0A0A0A' }}>
              <AnimCounter target={2400} />+ işletme güveniyor
            </span>
          </div>
          {/* headline */}
          <div className="bz-fade-up bz-d1">
            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 76, fontWeight: 500, lineHeight: 0.92, letterSpacing: '-0.04em', color: '#0A0A0A', margin: 0 }}>
              İtibarınızı<br/>
              <span style={{ position: 'relative', display: 'inline-block' }}>
                bir <span style={{ background: '#C6F24E', padding: '0 14px 2px', borderRadius: 10, display: 'inline-block', transform: 'rotate(-0.5deg)' }}>nabız</span> gibi
              </span>
              <br/>izleyin.
            </h1>
          </div>
          {/* sub */}
          <p className="bz-fade-up bz-d2" style={{ fontSize: 18, lineHeight: 1.6, color: '#525252', maxWidth: 500, margin: 0 }}>
            QR ile gerçek müşterilerden geri bildirim toplayın. Yorumları tek panelden yönetin. Google politikalarına uyumlu, organik büyüme.
          </p>
          {/* CTAs */}
          <div className="bz-fade-up bz-d3" style={{ display: 'flex', gap: 12 }}>
            <button className="bz-btn-primary" style={{ padding: '16px 28px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 999, fontSize: 16, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              14 gün ücretsiz başla <span>→</span>
            </button>
            <button className="bz-btn-ghost" onClick={() => setVideoOpen(true)} style={{ padding: '16px 24px', background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 999, fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: '#0A0A0A' }}>
              <span style={{ width: 28, height: 28, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>▶</span>
              Demo izle <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#737373' }}>2 dk</span>
            </button>
          </div>
          {/* Trust strip */}
          <div className="bz-fade-up bz-d4" style={{ display: 'flex', gap: 20, paddingTop: 8 }}>
            {['✓ Kredi kartı gerekmez', '✓ 5 dk kurulum', '✓ Türkçe destek'].map(t => (
              <span key={t} style={{ fontSize: 13, color: '#737373' }}>{t}</span>
            ))}
          </div>
        </div>
        {/* Right: dashboard + ticker */}
        <div className="bz-fade-in bz-d2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <HeroDashboard />
          <LiveTicker />
        </div>
      </section>

      {/* ── LOGO MARQUEE ── */}
      <section style={{ borderTop: '1px solid #EDEDED', borderBottom: '1px solid #EDEDED', padding: '20px 0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flexShrink: 0, padding: '0 40px', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Güvenen markalar</div>
          <div style={{ flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)' }}>
            <div className="bz-marquee-track">
              {[...Array(2)].flatMap(() => ['ARK BİSTRO', 'HOTEL NORA', 'DERMA+', 'LAW&CO', 'KAHVE DÜKKAN', 'SPA REN', 'GÜLER KLİNİK', 'TASTY BURGER', 'LOTUS SPA', 'AKDAĞ HUKUK']).map((b, i) => (
                <div key={i} style={{ padding: '0 40px', fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 600, color: '#D4D4D4', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{b}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '80px 64px', background: '#0A0A0A', color: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          {[
            { n: 2400, s: '+', l: 'Aktif işletme', sub: 'Türkiye & uluslararası' },
            { n: 1.2, s: 'M+', l: 'Aylık yorum', sub: 'Organik, gerçek müşteri' },
            { n: 4.8, s: '/5', l: 'Ort. Google puanı', sub: 'Buaze kullanıcıları' },
            { n: 28, s: '', l: 'Ülke', sub: '40+ dil desteği' },
          ].map((s, i) => (
            <div key={i} style={{ borderTop: '1px solid #333', paddingTop: 20 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 64, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1, color: '#C6F24E' }}>
                <AnimCounter target={typeof s.n === 'number' && s.n > 10 ? s.n : s.n * 10} suffix={s.s} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 500, marginTop: 8 }}>{s.l}</div>
              <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── BENTO FEATURES ── */}
      <section style={{ padding: '96px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Ürün</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 12, marginBottom: 0 }}>
            Bir panel. Her şey.
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'auto auto', gap: 16 }}>
          {bentoFeatures.map((f, i) => (
            <div key={f.id} className="bz-card-hover" style={{
              gridColumn: f.span,
              background: f.bg, color: f.color,
              borderRadius: 20, padding: 28,
              border: f.bg === '#FFFFFF' || f.bg === '#FAFAFA' ? '1px solid #EDEDED' : 'none',
              overflow: 'hidden',
            }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.6 }}>{f.sub}</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 8 }}>{f.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, marginTop: 8, maxWidth: 380 }}>{f.body}</div>
              {f.visual}
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTOR TABS ── */}
      <section style={{ padding: '80px 64px', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center' }}>Sektörler</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', textAlign: 'center', marginTop: 10, marginBottom: 40 }}>
            Her işletmeye özel akış.
          </h2>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
            {sectorTabs.map((t, i) => (
              <button key={t.label} onClick={() => setActiveTab(i)} style={{ padding: '10px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: activeTab === i ? 700 : 500, background: activeTab === i ? '#0A0A0A' : '#fff', color: activeTab === i ? '#C6F24E' : '#525252', transition: 'all .2s', boxShadow: activeTab === i ? '0 4px 16px rgba(0,0,0,.15)' : 'none' }}>
                {t.label} <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", opacity: 0.7 }}>{t.badge}</span>
              </button>
            ))}
          </div>
          {/* Tab content */}
          {sectorTabs.map((t, i) => i === activeTab && (
            <div key={t.label} className="bz-scale-in" style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 20, padding: '40px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                  {t.stats.map((s, si) => (
                    <div key={si} style={{ flex: 1, padding: '18px 14px', background: si === 0 ? '#C6F24E' : '#FAFAFA', borderRadius: 14, border: '1px solid #EDEDED', textAlign: 'center' }}>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em' }}>{s}</div>
                      <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono',monospace", color: '#737373', marginTop: 4, letterSpacing: '0.08em' }}>{t.slabels[si].toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 15, color: '#525252', lineHeight: 1.7 }}>
                  {t.label === 'Restoran & Kafe' && 'Masa QR\'ı tarayan müşteri, 20 saniyede yorum bırakır. Memnun müşteri Google\'a gider, şikayetli ekibinize — kriz büyümeden önce.'}
                  {t.label === 'Otel' && 'Oda numarasına göre etiketlenmiş QR kodları. Check-out\'ta misafir yorumunu anında yakala. Booking, Tripadvisor ve Google entegrasyonu.'}
                  {t.label === 'Klinik' && 'KVKK uyumlu anket akışı. Hasta verisi şifreli ve anonimleştirilebilir. Randevu sonrası otomatik daveti randevu yazılımınızla bağla.'}
                  {t.label === 'Paket Servis' && 'Paket içine QR kartı koy. Müşteri Yemeksepeti, Getir veya Trendyol GO\'ya yönlendirilir. Düşük puan özel formunuza gider.'}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                  <div style={{ padding: '12px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Detaylı incele →</div>
                  <div style={{ padding: '12px 22px', border: '1px solid #E5E5E5', borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>Demo iste</div>
                </div>
              </div>
              {/* Mini mockup */}
              <div style={{ background: '#FAFAFA', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#737373', letterSpacing: '0.14em' }}>ÖRNEK AKIŞ · {t.label.toUpperCase()}</div>
                {['QR kodu tarıyorum', 'Puan veriyorum (5/5 ★)', 'Yorum yazıyorum', 'Google\'a yönlendiriliyorum'].map((s, si) => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff', borderRadius: 10, border: '1px solid #EDEDED' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 999, background: si < 3 ? '#C6F24E' : '#EAF9B8', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>{si + 1}</div>
                    <div style={{ fontSize: 13, fontWeight: si < 3 ? 500 : 400, color: '#0A0A0A' }}>{s}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 11, color: '#16A34A' }}>✓</div>
                  </div>
                ))}
                <div style={{ padding: '10px 14px', background: '#EAF9B8', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⏱</span> Ortalama süre: <b>22 saniye</b>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '96px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Nasıl çalışır</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 10, marginBottom: 0 }}>Üç adım, sürekli büyüme.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { n: '01', t: 'QR koy', sub: '3 dakikada kurulum', d: 'Masanıza, faturanıza, paketinize. Her noktaya özel kod.', accent: '#C6F24E' },
            { n: '02', t: 'Yorum topla', sub: '20 saniyede tamamlanır', d: 'Müşteri tarar, puan verir, platforma yönlendirilir. Zahmet sıfır.', accent: '#0A0A0A' },
            { n: '03', t: 'Büyü', sub: 'Anlık analitik', d: 'NPS, Google sıralaması, personel skoru — hepsi tek panelde.', accent: '#EAF9B8' },
          ].map((s, i) => (
            <div key={s.n} className="bz-card-hover" style={{ padding: 32, border: '1px solid #EDEDED', borderRadius: 20, background: '#fff', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, fontFamily: "'Space Grotesk',sans-serif", fontSize: 120, fontWeight: 700, color: '#F5F5F5', letterSpacing: '-0.05em', userSelect: 'none', lineHeight: 1 }}>{s.n}</div>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: s.accent, border: s.accent === '#EAF9B8' ? '1px solid #EDEDED' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 22, color: s.accent === '#0A0A0A' ? '#C6F24E' : '#0A0A0A' }}>{['▦', '✦', '◉'][i]}</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>{s.sub}</div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>{s.t}</div>
                <div style={{ fontSize: 14, color: '#525252', lineHeight: 1.6, marginTop: 10 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: '80px 64px', background: '#0A0A0A', color: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Müşteri hikayeleri</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 12, marginBottom: 0, color: '#fff' }}>Rakam konuşur.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {testimonials.map((t, i) => (
              <div key={i} className="bz-card-hover" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 16 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>{t.role}</div>
                  </div>
                </div>
                <div style={{ fontSize: 15, color: '#D4D4D4', lineHeight: 1.65, fontStyle: 'italic' }}>{t.q}</div>
                <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 40, fontWeight: 500, letterSpacing: '-0.025em', color: '#C6F24E' }}>{t.metric}</div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#737373', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{t.mLabel}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#525252', cursor: 'pointer' }}>Hikayeyi oku →</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING TEASER ── */}
      <section style={{ padding: '96px 64px', background: '#C6F24E' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 64, fontWeight: 500, letterSpacing: '-0.035em', color: '#0A0A0A', lineHeight: 1, marginBottom: 0 }}>
            Bugün başla,<br/>ilk yorunuzu yarın al.
          </h2>
          <div style={{ fontSize: 16, color: '#0A0A0A', opacity: 0.65, marginTop: 16 }}>
            14 gün ücretsiz deneme · Kredi kartı gerekmez · İstediğinde vazgeç
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 36 }}>
            <button className="bz-btn-primary" style={{ padding: '18px 32px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 999, fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>Ücretsiz başla →</button>
            <button style={{ padding: '18px 28px', background: 'transparent', border: '2px solid #0A0A0A', borderRadius: 999, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Tüm fiyatları gör</button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 28 }}>
            {['Starter: Ücretsiz', 'Growth: ₺890/ay', 'Scale: ₺2.490/ay'].map(p => (
              <div key={p} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#0A0A0A', opacity: 0.65 }}>{p}</div>
            ))}
          </div>
        </div>
      </section>

      <PremiumFooter />
    </div>
  );
}

window.HomePageV2 = HomePageV2;
