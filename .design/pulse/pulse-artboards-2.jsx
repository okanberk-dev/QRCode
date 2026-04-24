// Pulse — Artboards 2: web hero, dashboard, mobile, QR, email, social, merch, guidelines summary

const T2 = () => window.PULSE_TOKENS;
const PB2 = () => window.PulseBrand;

const Eyebrow2 = ({ children, color }) => (
  <div style={{
    fontFamily: T2().fonts.mono, fontSize: 11, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: color || T2().colors.n500, fontWeight: 500,
  }}>{children}</div>
);

// ============== WEB HERO ==============
function WebHeroBoard() {
  const { Lockup, Symbol } = PB2();
  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Browser chrome */}
      <div style={{ background: '#FAFAFA', borderBottom: '1px solid #EDEDED', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 999, background: '#E5E5E5' }} />
          <div style={{ width: 10, height: 10, borderRadius: 999, background: '#E5E5E5' }} />
          <div style={{ width: 10, height: 10, borderRadius: 999, background: '#E5E5E5' }} />
        </div>
        <div style={{ flex: 1, background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 6, padding: '4px 10px', fontFamily: T2().fonts.mono, fontSize: 11, color: '#737373' }}>buaze.com</div>
      </div>

      {/* Nav */}
      <div style={{ padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Lockup size="sm" />
        <div style={{ display: 'flex', gap: 28, fontFamily: T2().fonts.body, fontSize: 14, color: '#0A0A0A' }}>
          <span>Ürün</span><span>Çözümler</span><span>Fiyatlar</span><span>Müşteriler</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 14, color: '#0A0A0A' }}>Giriş</div>
          <div style={{ padding: '10px 18px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontFamily: T2().fonts.body, fontSize: 13, fontWeight: 500 }}>Ücretsiz başla</div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ padding: '60px 48px 40px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 56, flex: 1, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: '6px 12px', background: '#EAF9B8', borderRadius: 999 }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: '#0A0A0A' }} />
            <span style={{ fontFamily: T2().fonts.mono, fontSize: 11, color: '#0A0A0A', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Yeni · Otomatik yanıt v2</span>
          </div>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 84, lineHeight: 0.92, letterSpacing: '-0.04em', fontWeight: 500, color: '#0A0A0A' }}>
            Her yorum<br/>bir <span style={{ background: '#C6F24E', padding: '0 8px', borderRadius: 6 }}>nabız</span>.
          </div>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 18, lineHeight: 1.55, color: '#525252', maxWidth: 520 }}>
            QR ile geri bildirim topla, yorumları tek panelden yönet, itibarını canlı izle. Buaze'le Google politikalarına uyumlu, ölçülebilir bir itibar kur.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontFamily: T2().fonts.body, fontSize: 15, fontWeight: 500 }}>14 gün ücretsiz başla →</div>
            <div style={{ padding: '14px 22px', border: '1px solid #0A0A0A', color: '#0A0A0A', borderRadius: 999, fontFamily: T2().fonts.body, fontSize: 15, fontWeight: 500 }}>Demo izle</div>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop: '1px solid #EDEDED' }}>
            {[
              { k: '2.400+', l: 'işletme' },
              { k: '1.2M', l: 'organik yorum/ay' },
              { k: '4.8/5', l: 'ortalama puan' },
            ].map(s => (
              <div key={s.k}>
                <div style={{ fontFamily: T2().fonts.display, fontSize: 28, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.02em' }}>{s.k}</div>
                <div style={{ fontFamily: T2().fonts.body, fontSize: 12, color: '#737373' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual: product card mock */}
        <div style={{ position: 'relative' }}>
          <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 18, padding: 22, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Eyebrow2>Canlı akış · Son 24s</Eyebrow2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A' }} />
                <span style={{ fontFamily: T2().fonts.mono, fontSize: 10, color: '#737373' }}>LIVE</span>
              </div>
            </div>
            <svg viewBox="0 0 400 100" style={{ width: '100%', height: 80 }}>
              <defs>
                <linearGradient id="pg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 70 L40 65 L80 55 L120 60 L160 40 L200 45 L240 25 L280 35 L320 20 L360 28 L400 12 L400 100 L0 100 Z" fill="url(#pg1)" />
              <path d="M0 70 L40 65 L80 55 L120 60 L160 40 L200 45 L240 25 L280 35 L320 20 L360 28 L400 12" fill="none" stroke="#0A0A0A" strokeWidth="2" />
              <circle cx="400" cy="12" r="5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
            </svg>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { n: 'M. Demir', t: 'Servis harikaydı, tekrar geleceğiz.', s: 5, k: 'Restoran · Beşiktaş' },
                { n: 'A. Yılmaz', t: 'Kahve ve ortam mükemmel.', s: 5, k: 'Kafe · Moda' },
              ].map((x,i) => (
                <div key={i} style={{ background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 10, padding: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', fontFamily: T2().fonts.body, fontWeight: 600, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{x.n.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: T2().fonts.body, fontSize: 12, fontWeight: 600, color: '#0A0A0A' }}>{x.n}</span>
                      <span style={{ fontFamily: T2().fonts.mono, fontSize: 10, color: '#A3A3A3' }}>{'★'.repeat(x.s)}</span>
                    </div>
                    <div style={{ fontFamily: T2().fonts.body, fontSize: 12, color: '#525252', marginTop: 2 }}>{x.t}</div>
                    <div style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#A3A3A3', marginTop: 4, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{x.k}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Floating QR card */}
          <div style={{ position: 'absolute', bottom: -18, left: -30, background: '#0A0A0A', color: '#fff', padding: 14, borderRadius: 14, display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 20px 40px -20px rgba(0,0,0,0.3)' }}>
            <div style={{ width: 60, height: 60, background: '#fff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Symbol size={36} fg="#0A0A0A" accent="#C6F24E" />
            </div>
            <div>
              <div style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#C6F24E', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Masa 07</div>
              <div style={{ fontFamily: T2().fonts.display, fontSize: 15, fontWeight: 500, marginTop: 2 }}>Deneyiminizi paylaş</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== DASHBOARD (detaylı) ==============
function DashboardBoard() {
  const { Lockup } = PB2();
  return (
    <div style={{ width: '100%', height: '100%', background: '#FAFAFA', display: 'grid', gridTemplateColumns: '220px 1fr' }}>
      {/* Sidebar */}
      <div style={{ background: '#FFFFFF', borderRight: '1px solid #EDEDED', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Lockup size="sm" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { l: 'Panel', active: true },
            { l: 'Yorumlar', badge: 12 },
            { l: 'QR kodları' },
            { l: 'Kampanyalar' },
            { l: 'Raporlar' },
            { l: 'Takım' },
            { l: 'Ayarlar' },
          ].map(n => (
            <div key={n.l} style={{
              padding: '8px 10px', borderRadius: 8,
              background: n.active ? '#0A0A0A' : 'transparent',
              color: n.active ? '#fff' : '#525252',
              fontFamily: T2().fonts.body, fontSize: 13, fontWeight: n.active ? 500 : 400,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{n.l}</span>
              {n.badge && <span style={{ background: '#C6F24E', color: '#0A0A0A', fontFamily: T2().fonts.mono, fontSize: 10, padding: '2px 6px', borderRadius: 999, fontWeight: 600 }}>{n.badge}</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: 12, background: '#FAFAFA', borderRadius: 10, border: '1px solid #EDEDED' }}>
          <Eyebrow2>Plan · Growth</Eyebrow2>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 12, color: '#525252', marginTop: 6 }}>14 günlük deneme · 9 gün kaldı</div>
          <div style={{ marginTop: 8, height: 4, background: '#EDEDED', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ width: '35%', height: '100%', background: '#0A0A0A' }} />
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Eyebrow2>Restoran · Kadıköy Şubesi</Eyebrow2>
            <div style={{ fontFamily: T2().fonts.display, fontSize: 34, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.025em', marginTop: 4 }}>İyi akşamlar, Elif.</div>
            <div style={{ fontFamily: T2().fonts.body, fontSize: 14, color: '#737373', marginTop: 2 }}>Son 24 saatte 38 yeni yorum geldi. 2 tanesi dikkatini bekliyor.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ padding: '8px 14px', border: '1px solid #EDEDED', background: '#FFFFFF', borderRadius: 999, fontFamily: T2().fonts.body, fontSize: 12 }}>Son 30 gün ↓</div>
            <div style={{ padding: '8px 14px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontFamily: T2().fonts.body, fontSize: 12, fontWeight: 500 }}>+ Yeni QR</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { k: 'NPS', v: '72', d: '+6', up: true },
            { k: 'Organik yorum', v: '1.284', d: '+184%', up: true, highlight: true },
            { k: 'Ortalama puan', v: '4.8', d: '4.8/5' },
            { k: 'Yanıt süresi', v: '4s 12d', d: '−38 sn', up: true },
          ].map((m,i) => (
            <div key={i} style={{ background: m.highlight ? '#C6F24E' : '#FFFFFF', borderRadius: 12, padding: 16, border: m.highlight ? 'none' : '1px solid #EDEDED' }}>
              <Eyebrow2 color={m.highlight ? '#0A0A0A' : '#737373'}>{m.k}</Eyebrow2>
              <div style={{ fontFamily: T2().fonts.display, fontSize: 36, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.02em', lineHeight: 1, marginTop: 8 }}>{m.v}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                {m.up && <span style={{ color: m.highlight ? '#0A0A0A' : '#16A34A', fontSize: 11 }}>▲</span>}
                <span style={{ fontFamily: T2().fonts.body, fontSize: 11, color: m.highlight ? '#0A0A0A' : '#525252', fontWeight: 500 }}>{m.d}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, flex: 1, minHeight: 0 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: T2().fonts.display, fontSize: 18, fontWeight: 500, color: '#0A0A0A' }}>Yorum ritmi</div>
              <div style={{ display: 'flex', gap: 10, fontFamily: T2().fonts.mono, fontSize: 10, color: '#737373' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, background: '#0A0A0A' }} />Organik</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 8, height: 8, background: '#C6F24E' }} />Kampanya</div>
              </div>
            </div>
            <svg viewBox="0 0 500 180" preserveAspectRatio="none" style={{ width: '100%', flex: 1 }}>
              <defs>
                <linearGradient id="dgr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0A0A0A" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#0A0A0A" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[40,80,120,160].map(y => <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#EDEDED" strokeWidth="0.5" />)}
              <path d="M0 140 L35 130 L70 135 L105 110 L140 115 L175 90 L210 95 L245 70 L280 75 L315 55 L350 62 L385 40 L420 48 L455 30 L500 22 L500 180 L0 180 Z" fill="url(#dgr)" />
              <path d="M0 140 L35 130 L70 135 L105 110 L140 115 L175 90 L210 95 L245 70 L280 75 L315 55 L350 62 L385 40 L420 48 L455 30 L500 22" fill="none" stroke="#0A0A0A" strokeWidth="2" />
              <path d="M0 160 L35 158 L70 155 L105 148 L140 150 L175 135 L210 140 L245 120 L280 125 L315 100 L350 105 L385 85 L420 90 L455 75 L500 65" fill="none" stroke="#C6F24E" strokeWidth="2.5" />
              <circle cx="500" cy="22" r="5" fill="#0A0A0A" />
              <circle cx="500" cy="65" r="5" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T2().fonts.mono, fontSize: 10, color: '#A3A3A3', marginTop: 6 }}>
              <span>01 NİS</span><span>08</span><span>15</span><span>22</span><span>29</span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
            <div style={{ fontFamily: T2().fonts.display, fontSize: 18, fontWeight: 500, color: '#0A0A0A' }}>Dikkat bekleyen</div>
            {[
              { n: 'Z. Öztürk', s: 2, t: 'Bekleme süresi çok uzundu ve garson...', tag: 'Şikayet' },
              { n: 'B. Arslan', s: 5, t: 'Her şey için teşekkürler, en sevdiğim...', tag: 'Övgü' },
              { n: 'S. Çelik', s: 3, t: 'Ortam güzel ama fiyatlar biraz...', tag: 'Nötr' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 10, borderBottom: i < 2 ? '1px solid #EDEDED' : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: 999, background: r.s <= 2 ? '#DC2626' : r.s >= 5 ? '#C6F24E' : '#EDEDED', color: r.s >= 5 ? '#0A0A0A' : r.s <= 2 ? '#fff' : '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T2().fonts.body, fontWeight: 600, fontSize: 10 }}>{r.n.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: T2().fonts.body, fontSize: 11, fontWeight: 600 }}>{r.n}</span>
                    <span style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#A3A3A3' }}>{r.s}★</span>
                  </div>
                  <div style={{ fontFamily: T2().fonts.body, fontSize: 11, color: '#525252', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.t}</div>
                  <div style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#737373', marginTop: 2, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{r.tag}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== MOBILE ==============
function MobileBoard() {
  const { Symbol, Lockup } = PB2();
  const Phone = ({ children }) => (
    <div style={{ width: 280, height: 570, background: '#FFFFFF', borderRadius: 36, border: '8px solid #0A0A0A', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.3)' }}>
      <div style={{ height: 22, background: '#0A0A0A', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 3 }}>
        <div style={{ width: 80, height: 4, background: '#333', borderRadius: 2 }} />
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#FAFAFA', padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      {/* Screen 1: Rating */}
      <Phone>
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Lockup size="xs" />
            <div style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#737373', letterSpacing: '0.14em' }}>MASA 07</div>
          </div>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 28, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.025em', lineHeight: 1.05, marginTop: 12 }}>Ziyaretiniz<br/>nasıldı?</div>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 12, color: '#737373' }}>20 saniyenizi alacak. Söyledikleriniz bize çok değerli.</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            {[1,2,3,4,5].map(i => (
              <svg key={i} viewBox="0 0 24 24" width={40} height={40}>
                <path d="M12 2 L14.5 9 L22 9 L16 13.5 L18.2 21 L12 16.5 L5.8 21 L8 13.5 L2 9 L9.5 9 Z" fill={i <= 5 ? '#C6F24E' : 'none'} stroke="#0A0A0A" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            ))}
          </div>
          <div style={{ marginTop: 16, background: '#FAFAFA', borderRadius: 12, padding: 14, border: '1px solid #EDEDED', flex: 1 }}>
            <div style={{ fontFamily: T2().fonts.body, fontSize: 13, color: '#0A0A0A', lineHeight: 1.5 }}>
              <span style={{ color: '#C6F24E', fontWeight: 700 }}>"</span>
              Servis hızlıydı, kahve mükemmeldi. Masaların düzeni çok rahat, tekrar geleceğim.
            </div>
          </div>
          <div style={{ padding: 14, background: '#0A0A0A', color: '#fff', borderRadius: 14, textAlign: 'center', fontFamily: T2().fonts.body, fontWeight: 500, fontSize: 14 }}>Google'da paylaş →</div>
        </div>
      </Phone>

      {/* Screen 2: Thank you */}
      <Phone>
        <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, position: 'relative' }}>
          {/* ECG pulse background */}
          <svg style={{ position: 'absolute', top: '38%', left: 0, right: 0, width: '100%' }} viewBox="0 0 280 80">
            <path d="M0 40 L40 40 L55 20 L75 60 L95 30 L115 50 L140 40 L280 40" fill="none" stroke="#EDEDED" strokeWidth="1.5" />
          </svg>
          <div style={{ position: 'relative', background: '#C6F24E', borderRadius: 999, width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width={48} height={48}><path d="M5 12 L10 17 L19 7" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 28, fontWeight: 500, color: '#0A0A0A', textAlign: 'center', letterSpacing: '-0.025em' }}>Teşekkürler.</div>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 13, color: '#525252', textAlign: 'center', maxWidth: 220 }}>
            Sesiniz Buaze'de kayıtlı. Yorumunuz Google'da yayınlanıyor.
          </div>
          <div style={{ marginTop: 'auto', textAlign: 'center' }}>
            <div style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#A3A3A3', letterSpacing: '0.16em' }}>POWERED BY</div>
            <div style={{ marginTop: 6 }}><Lockup size="xs" /></div>
          </div>
        </div>
      </Phone>

      {/* Screen 3: Dashboard mobile */}
      <Phone>
        <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', gap: 14, background: '#FAFAFA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Lockup size="xs" />
            <div style={{ width: 28, height: 28, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', fontFamily: T2().fonts.body, fontWeight: 600, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>E</div>
          </div>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 22, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.02em' }}>Bugün 38 yorum.</div>
          <div style={{ background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 12, padding: 14 }}>
            <Eyebrow2>NPS · Bu hafta</Eyebrow2>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
              <div style={{ fontFamily: T2().fonts.display, fontSize: 40, fontWeight: 500, color: '#0A0A0A' }}>72</div>
              <div style={{ fontFamily: T2().fonts.body, fontSize: 12, color: '#16A34A', fontWeight: 500 }}>▲ +6</div>
            </div>
            <svg viewBox="0 0 240 40" style={{ width: '100%', height: 30, marginTop: 6 }}>
              <path d="M0 30 L40 26 L80 24 L120 18 L160 20 L200 10 L240 6" fill="none" stroke="#0A0A0A" strokeWidth="2" />
            </svg>
          </div>
          <div style={{ background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
            <Eyebrow2>Yeni</Eyebrow2>
            {[
              { n: 'M. Demir', t: 'Servis harikaydı.', s: 5 },
              { n: 'A. Yılmaz', t: 'Kahve mükemmeldi.', s: 5 },
              { n: 'Z. Öztürk', t: 'Bekleme uzundu.', s: 2 },
            ].map((r,i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 22, height: 22, borderRadius: 999, background: r.s <= 2 ? '#DC2626' : '#EDEDED', color: r.s <= 2 ? '#fff' : '#0A0A0A', fontFamily: T2().fonts.body, fontWeight: 600, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r.n.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T2().fonts.body, fontSize: 11, fontWeight: 600 }}>{r.n}</div>
                  <div style={{ fontFamily: T2().fonts.body, fontSize: 10, color: '#737373', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.t}</div>
                </div>
                <div style={{ fontFamily: T2().fonts.mono, fontSize: 10, color: '#A3A3A3' }}>{r.s}★</div>
              </div>
            ))}
          </div>
          <div style={{ padding: 12, background: '#0A0A0A', color: '#fff', borderRadius: 14, textAlign: 'center', fontFamily: T2().fonts.body, fontWeight: 500, fontSize: 13 }}>Tümünü gör</div>
        </div>
      </Phone>
    </div>
  );
}

// ============== QR STATIONERY ==============
function QRBoard() {
  const { Lockup, Symbol } = PB2();
  const grid = 13;
  const seed = 42;
  const cells = [];
  for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) {
    const n = (x * 31 + y * 17 + seed) % 7;
    if (n > 2) cells.push({ x, y });
  }
  const renderQR = (fg, bg, innerFg) => (
    <div style={{ width: 180, height: 180, background: bg, borderRadius: 10, padding: 12, display: 'grid', gridTemplateColumns: `repeat(${grid}, 1fr)`, gridTemplateRows: `repeat(${grid}, 1fr)`, gap: 1, position: 'relative' }}>
      {Array.from({ length: grid * grid }).map((_, i) => {
        const x = i % grid, y = Math.floor(i / grid);
        const inCorner = (x < 3 && y < 3) || (x > grid - 4 && y < 3) || (x < 3 && y > grid - 4);
        if (inCorner) {
          const innerLeft = (x < 3 && y < 3);
          const innerRight = (x > grid - 4 && y < 3);
          const innerBot = (x < 3 && y > grid - 4);
          const lx = innerLeft ? x : (innerRight ? x - (grid - 3) : x);
          const ly = innerBot ? y - (grid - 3) : y;
          const isRing = (lx === 0 || lx === 2 || ly === 0 || ly === 2);
          const isCenter = lx === 1 && ly === 1;
          if (isRing || isCenter) return <div key={i} style={{ background: fg }} />;
          return <div key={i} />;
        }
        const filled = cells.some(c => c.x === x && c.y === y);
        return <div key={i} style={{ background: filled ? fg : 'transparent' }} />;
      })}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div style={{ background: bg, padding: 6, borderRadius: 6 }}>
          <Symbol size={28} fg={innerFg || fg} accent="#C6F24E" />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', background: '#FAFAFA', padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      {/* White tabletop card */}
      <div style={{ width: 240, height: 380, background: '#fff', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #EDEDED', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Lockup size="xs" />
          <div style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#737373', letterSpacing: '0.14em', textAlign: 'right' }}>
            MASA<br/>
            <span style={{ fontSize: 20, color: '#0A0A0A', letterSpacing: 0, fontFamily: T2().fonts.display, fontWeight: 500 }}>07</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>{renderQR('#0A0A0A', '#FAFAFA')}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 18, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.02em' }}>Deneyiminizi paylaşın</div>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 11, color: '#737373', marginTop: 2 }}>Kodu tarayın · 20 saniye</div>
        </div>
      </div>

      {/* Lime tabletop */}
      <div style={{ width: 240, height: 380, background: '#C6F24E', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Lockup size="xs" color="#0A0A0A" accent="#0A0A0A" withDot={false} />
          <div style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#0A0A0A', letterSpacing: '0.14em', textAlign: 'right' }}>
            KLİNİK<br/>
            <span style={{ fontSize: 20, letterSpacing: 0, fontFamily: T2().fonts.display, fontWeight: 500 }}>A12</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>{renderQR('#0A0A0A', '#fff')}</div>
        <div>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 18, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.02em', lineHeight: 1.05 }}>Sağlığınız<br/>önemli.</div>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 11, color: '#0A0A0A', opacity: 0.7, marginTop: 4 }}>Bize yazın · buaze.com</div>
        </div>
      </div>

      {/* Dark tabletop */}
      <div style={{ width: 240, height: 380, background: '#0A0A0A', color: '#fff', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 30px 60px -30px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Lockup size="xs" color="#fff" />
          <div style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#A3A3A3', letterSpacing: '0.14em', textAlign: 'right' }}>
            ODA<br/>
            <span style={{ fontSize: 20, color: '#fff', letterSpacing: 0, fontFamily: T2().fonts.display, fontWeight: 500 }}>214</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>{renderQR('#C6F24E', '#0A0A0A', '#0A0A0A')}</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 18, fontWeight: 500, letterSpacing: '-0.02em' }}>Yorumunuz, konağımız.</div>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 11, color: '#A3A3A3', marginTop: 2 }}>Kodu tarayın</div>
        </div>
      </div>
    </div>
  );
}

// ============== EMAIL / SOCIAL / MERCH ==============
function EmailSocialBoard() {
  const { Lockup, Symbol, Glyph } = PB2();
  return (
    <div style={{ width: '100%', height: '100%', background: '#FAFAFA', padding: 40, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
      {/* Email signature */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Eyebrow2>E-posta imzası</Eyebrow2>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 28, fontWeight: 500, color: '#0A0A0A', marginTop: 4, letterSpacing: '-0.02em' }}>İmza.</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 12, padding: 24, boxShadow: '0 10px 30px -15px rgba(0,0,0,0.08)' }}>
          <div style={{ fontFamily: T2().fonts.body, fontSize: 13, color: '#525252', lineHeight: 1.6 }}>
            Merhaba,<br/><br/>
            Bu hafta NPS rakamlarınızdaki sıçramayı kutlarım — 72 çok güçlü bir skor. Büyüme toplantımız için pazartesi 14:00 uygun mu?<br/><br/>
            İyi çalışmalar,
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #EDEDED', display: 'flex', gap: 14, alignItems: 'center' }}>
            <Symbol size={44} />
            <div>
              <div style={{ fontFamily: T2().fonts.display, fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>Elif Koç</div>
              <div style={{ fontFamily: T2().fonts.body, fontSize: 11, color: '#737373' }}>Müşteri Başarı Lideri · Buaze</div>
              <div style={{ fontFamily: T2().fonts.mono, fontSize: 10, color: '#0A0A0A', marginTop: 4, letterSpacing: '0.04em' }}>
                elif@buaze.com · <span style={{ background: '#C6F24E', padding: '1px 4px', borderRadius: 2 }}>buaze.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* Merch - cap, shirt, sticker */}
        <div>
          <Eyebrow2>Merch</Eyebrow2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 8 }}>
            {/* T-shirt */}
            <div style={{ background: '#0A0A0A', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', position: 'relative' }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%">
                <path d="M20 30 L35 20 L40 22 Q50 28 60 22 L65 20 L80 30 L75 40 L70 38 L70 85 L30 85 L30 38 L25 40 Z" fill="#1A1A1A" stroke="#333" strokeWidth="0.5" />
              </svg>
              <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <Symbol size={28} fg="#C6F24E" accent="#C6F24E" />
              </div>
            </div>
            {/* Sticker */}
            <div style={{ background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1' }}>
              <div style={{ background: '#C6F24E', padding: '10px 14px', borderRadius: 999, transform: 'rotate(-6deg)' }}>
                <Lockup size="sm" color="#0A0A0A" accent="#0A0A0A" withDot={false} />
              </div>
            </div>
            {/* Cap */}
            <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', position: 'relative' }}>
              <svg viewBox="0 0 100 60" width="100%">
                <path d="M15 40 Q15 18 50 18 Q85 18 85 40 L85 44 L15 44 Z" fill="#0A0A0A" />
                <path d="M12 44 L88 44 L95 52 L5 52 Z" fill="#1A1A1A" />
              </svg>
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <Glyph size={22} fg="#C6F24E" accent="#C6F24E" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <Eyebrow2>Sosyal medya</Eyebrow2>
          <div style={{ fontFamily: T2().fonts.display, fontSize: 28, fontWeight: 500, color: '#0A0A0A', marginTop: 4, letterSpacing: '-0.02em' }}>Şablonlar.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Post 1 - quote */}
          <div style={{ aspectRatio: '1', background: '#0A0A0A', color: '#fff', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Symbol size={32} fg="#fff" accent="#C6F24E" />
            <div style={{ fontFamily: T2().fonts.display, fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              "Her yorum<br/>bir nabız."
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#A3A3A3', letterSpacing: '0.14em' }}>MANİFESTO · 01</span>
              <span style={{ fontFamily: T2().fonts.mono, fontSize: 9, color: '#C6F24E' }}>@buaze</span>
            </div>
          </div>
          {/* Post 2 - stat */}
          <div style={{ aspectRatio: '1', background: '#C6F24E', color: '#0A0A0A', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Eyebrow2 color="#0A0A0A">Vaka · Kadıköy</Eyebrow2>
            <div>
              <div style={{ fontFamily: T2().fonts.display, fontSize: 64, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 1 }}>+184%</div>
              <div style={{ fontFamily: T2().fonts.body, fontSize: 13, marginTop: 4 }}>Organik Google yorumu · 90 gün</div>
            </div>
            <Lockup size="xs" color="#0A0A0A" accent="#0A0A0A" withDot={false} />
          </div>
          {/* Post 3 - image + headline */}
          <div style={{ aspectRatio: '1', background: '#fff', border: '1px solid #EDEDED', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <Eyebrow2>Öne çıkan</Eyebrow2>
              <div style={{ fontFamily: T2().fonts.display, fontSize: 24, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.02em', marginTop: 10, lineHeight: 1.1 }}>
                QR ile yorum toplamanın 3 kuralı
              </div>
            </div>
            <svg viewBox="0 0 200 40" style={{ width: '100%', height: 30 }}>
              <path d="M0 25 L30 25 L40 10 L55 35 L70 15 L85 22 L200 22" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
              <circle cx="40" cy="10" r="4" fill="#C6F24E" />
            </svg>
            <Lockup size="xs" />
          </div>
          {/* Post 4 - avatar grid */}
          <div style={{ aspectRatio: '1', background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <Eyebrow2>Müşteriler</Eyebrow2>
              <div style={{ fontFamily: T2().fonts.display, fontSize: 26, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.025em', marginTop: 6, lineHeight: 1.1 }}>
                2.400+ işletme<br/>Buaze'le büyüyor.
              </div>
            </div>
            <div style={{ display: 'flex' }}>
              {['E','M','A','Z','B','+'].map((x,i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: 999, background: i === 5 ? '#C6F24E' : '#0A0A0A', color: i === 5 ? '#0A0A0A' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T2().fonts.body, fontSize: 11, fontWeight: 600, marginLeft: i === 0 ? 0 : -8, border: '2px solid #FAFAFA' }}>{x}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== MOTION ==============
function MotionBoard() {
  const { Symbol } = PB2();
  return (
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', padding: 48, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`
        @keyframes pulse-draw {
          0%   { stroke-dashoffset: 100; opacity: 0; }
          30%  { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes pulse-spark {
          0%, 30% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-beat {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.08); }
          60% { transform: scale(0.98); }
        }
        @keyframes line-move {
          0% { transform: translateX(0); }
          100% { transform: translateX(-80px); }
        }
        .anim-draw path { stroke-dasharray: 100; animation: pulse-draw 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .anim-spark circle { transform-origin: 54px 10px; animation: pulse-spark 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .anim-beat { animation: pulse-beat 1.4s ease-in-out infinite; transform-origin: center; }
        .anim-line { animation: line-move 1.2s linear infinite; }
      `}</style>

      <div>
        <Eyebrow2>Motion</Eyebrow2>
        <div style={{ fontFamily: T2().fonts.display, fontSize: 56, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.03em', marginTop: 6, lineHeight: 1 }}>Sembol yaşar.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, flex: 1 }}>
        {/* Build-in */}
        <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Eyebrow2>01 · Build-in</Eyebrow2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 64 64" width="140" height="140" className="anim-draw">
              <path d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z" fill="none" stroke="#0A0A0A" strokeWidth="3.2" strokeLinejoin="round" />
              <path d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28" fill="none" stroke="#0A0A0A" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              <g className="anim-spark"><circle cx="54" cy="10" r="5" fill="#C6F24E" /></g>
            </svg>
          </div>
          <div style={{ fontFamily: T2().fonts.mono, fontSize: 11, color: '#737373' }}>
            Baloncuk çizilir → nabız akar → kıvılcım patlar<br/>
            1.800ms · cubic-bezier(0.4, 0, 0.2, 1)
          </div>
        </div>

        {/* Heartbeat */}
        <div style={{ background: '#0A0A0A', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Eyebrow2 color="#A3A3A3">02 · Heartbeat (loading)</Eyebrow2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="anim-beat">
              <Symbol size={140} fg="#fff" accent="#C6F24E" />
            </div>
          </div>
          <div style={{ fontFamily: T2().fonts.mono, fontSize: 11, color: '#A3A3A3' }}>
            Ölçek 1.00 → 1.08 → 0.98 → 1.00<br/>
            1.400ms · ease-in-out · infinite
          </div>
        </div>

        {/* ECG banner */}
        <div style={{ background: '#C6F24E', borderRadius: 14, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Eyebrow2 color="#0A0A0A">03 · Canlı şerit (banner)</Eyebrow2>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <svg viewBox="0 0 240 80" width="100%" height="80">
              <g className="anim-line">
                {[0, 80, 160, 240, 320].map(x => (
                  <path key={x} d={`M${x} 40 L${x+10} 40 L${x+20} 20 L${x+30} 60 L${x+40} 30 L${x+50} 50 L${x+80} 40`} fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </g>
            </svg>
          </div>
          <div style={{ fontFamily: T2().fonts.mono, fontSize: 11, color: '#0A0A0A' }}>
            Sürekli kayan ECG şeridi<br/>
            1.200ms · linear · infinite
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, paddingTop: 20, borderTop: '1px solid #EDEDED' }}>
        {[
          { k: 'Fast', v: '160ms', d: 'Mikro etkileşim, hover' },
          { k: 'Base', v: '260ms', d: 'Modal, panel, sayfa geçişi' },
          { k: 'Slow', v: '520ms', d: 'Vurgulu giriş, başlık' },
          { k: 'Spring', v: '600ms', d: 'Oyunbaz, feedback onay' },
        ].map(x => (
          <div key={x.k}>
            <Eyebrow2>{x.k}</Eyebrow2>
            <div style={{ fontFamily: T2().fonts.display, fontSize: 28, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.02em', marginTop: 4 }}>{x.v}</div>
            <div style={{ fontFamily: T2().fonts.body, fontSize: 11, color: '#737373', marginTop: 2 }}>{x.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============== DEV HANDOFF / IDE PROMPT ==============
function HandoffBoard() {
  const prompt = `# Buaze — Pulse Marka Kimliği · Frontend Handoff

Rol: Kıdemli frontend mühendisi.
Görev: buaze.com (Next.js 14 App Router + TypeScript + TailwindCSS + Framer Motion) web sitesinin Pulse marka kimliğine göre yeniden tasarımını uygulamak.

## 1. Marka Özü
- Ürün: Dijital itibar & geri bildirim platformu (QR tabanlı yorum toplama, merkezi yönetim, canlı analiz).
- Kimlik adı: Pulse — "her yorum bir nabız" manifestosu.
- Prensipler: sinyal > gürültü · beyaz ile çalış · geometrik + insancıl · ritmik · veri insanidir.

## 2. Design Tokens (Tailwind config'e ekle)
colors:
  graphite:  "#0A0A0A"   // primary / ink
  pure:      "#FFFFFF"   // surface
  lime:      "#C6F24E"   // accent (tek vurgu)
  limeDeep:  "#A8D62E"   // hover
  limeSoft:  "#EAF9B8"   // soft bg/tint
  ash:       "#737373"   // muted text
  mist:      "#EDEDED"   // line / divider
  neutrals:  { 50, 100, 200, 300, 400, 500, 600, 700, 800, 900 } // standart gri skala

semantic:
  success: "#16A34A"
  warning: "#F59E0B"
  danger:  "#DC2626"
  info:    "#2563EB"

fontFamily:
  display: ["Space Grotesk", "sans-serif"]   // logo, başlık, sayı
  body:    ["Inter", "sans-serif"]           // gövde, UI
  mono:    ["JetBrains Mono", "monospace"]   // eyebrow, metrik, kod

typeScale (display için Space Grotesk Medium/500; letter-spacing listed):
  display-1: 96/92   tracking -0.04em
  display-2: 72/95   tracking -0.035em
  display-3: 56/100  tracking -0.03em
  h1: 40/110  -0.025em
  h2: 28/115  -0.02em
  h3: 20/130  -0.01em (weight 600)
  body-lg: 18/155
  body:    15/155
  body-sm: 13/150
  eyebrow: 11/140 tracking 0.18em uppercase weight 500 (font-mono)
  mono:    12/150

radius: xs 4 · sm 6 · md 10 · lg 14 · xl 20 · pill 999
space ölçeği: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96
shadow:
  sm:  0 1px 2px rgba(0,0,0,0.06)
  md:  0 4px 12px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
  lg:  0 20px 40px -20px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.04)
  xl:  0 40px 80px -30px rgba(0,0,0,0.2)
  glow: 0 0 0 6px rgba(198, 242, 78, 0.25)

motion (framer-motion tokens):
  fast: 0.16s · [0.2, 0.8, 0.2, 1]
  base: 0.26s · [0.2, 0.8, 0.2, 1]
  slow: 0.52s · [0.2, 0.8, 0.2, 1]
  spring: type:"spring", stiffness:260, damping:20

## 3. Logo & Sembol (SVG'leri birebir kullan)

Primary symbol (viewBox 64x64):
<svg viewBox="0 0 64 64">
  <path d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z"
        fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round" />
  <path d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28"
        fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="54" cy="10" r="5" fill="#C6F24E" />
</svg>

Glyph (favicon/app icon, viewBox 64x64):
<svg viewBox="0 0 64 64">
  <path d="M6 34 L18 34 L22 20 L30 46 L36 26 L42 36 L58 36"
        fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="22" cy="20" r="4.5" fill="#C6F24E" />
</svg>

Wordmark:
- Space Grotesk, weight 500, lowercase "buaze"
- letter-spacing -0.035em, line-height 0.9
- sonunda opsiyonel nokta: çap fontSize * 0.14, renk #C6F24E, "e"nin sağına, baseline'a hizalı

Lockup (yatay):
- sembol + 20px gap + wordmark; sembol yüksekliği ≈ wordmark cap height × 1.35
- minimum clear space: 1 × spark (sembol içindeki accent disk)
- minimum kullanım: yatay lockup 20px, favicon 16px

Stacked: sembol üstte, wordmark altta, aralarında symbolSize * 0.18 gap.

Yasak kullanımlar: gerdirme, döndürme, gölge/efekt, renk değiştirme, karmaşık arka plan üstü, tipografi değiştirme.

## 4. Komponent davranışları (minimum)

Button (3 variant × 3 size):
- variant: primary (bg graphite, text pure, hover limeDeep text graphite)
        | accent (bg lime, text graphite, hover limeDeep)
        | ghost (border graphite, text graphite, hover bg n100)
- size: sm (h32 px12 text13), md (h44 px18 text15), lg (h52 px22 text16)
- radius: pill (999), transition: motion.fast

Input:
- border n200, radius md, h44 px14 text15
- focus: border graphite, ring 3px rgba(10,10,10,0.08)
- error: border danger, ring 3px rgba(220,38,38,0.12)

Card:
- bg pure, border mist (1px), radius lg, shadow md
- hover (clickable): shadow lg, translate-y-[-2px], transition base

Badge:
- pill, px10 py3, text11, font-mono, tracking 0.14em, uppercase
- variants: neutral (n100 bg), success (limeSoft bg graphite text), warning, danger, live (limeSoft bg + 6px canlı nokta #16A34A önünde)

Nav:
- sticky top, bg pure/90 + backdrop-blur, border-b mist, h72 px48
- logo sol, linkler orta (gap 28, text14 body), CTA sağ (pill primary)

## 5. Sayfa akışı ve özellikler

/ (Landing)
- Hero: büyük display-1 başlık "her yorum bir nabız." ("nabız" kelimesi lime bg ile vurgulu, 6px radius padding)
- Sağ: canlı akış mockup card (ECG çizgisi + son yorumlar), sol alt: floating dark QR card
- Social proof strip: "2.400+ işletme · 1.2M organik yorum/ay · 4.8/5"
- Feature grid (3 sütun): QR ile topla / Tek panelden yönet / Canlı analiz
- Sektörler: restoran, kafe, otel, klinik, hukuk ofisi, güzellik salonu (lime tint badge'li grid)
- Case study: +184% organik yorum kartı (lime bg)
- CTA section: koyu bg, "14 gün ücretsiz başla"
- Footer: sade, 4 sütun + mini lockup

/app (Dashboard)
- Sidebar (220px): logo + navigation + plan widget
- Topbar: tarih filtresi, "+ Yeni QR" primary button
- KPI grid (4 metrik); bir tanesi lime bg ile vurgulu
- Yorum ritmi chart: siyah (organik) + lime (kampanya) çizgi
- Dikkat bekleyen yorumlar listesi

/qr (QR oluşturma sihirbazı)
- 3 adım: Konum → Şablon → Önizleme
- Şablon seçimi: white/lime/dark varyant 1:1 preview

/mobile (müşteri formu — QR landing)
- Step 1: yıldız seçimi (1-5, animasyonlu)
- Step 2: yorum + opsiyonel fotoğraf
- Step 3: teşekkür + Google'a yönlendir (büyük lime onay tik)
- Alt: "POWERED BY buaze" küçük lockup

## 6. Motion paterni (Framer Motion)
- Sayfa girişi: opacity 0→1, y 8→0, base duration
- Hero başlık: harf harf stagger, stagger 0.05s
- Logo heartbeat: ölçek 1→1.08→0.98→1, 1.4s ease-in-out, sadece loading state'te
- ECG line: sürekli akış (translateX linear infinite)
- Butonlar: hover'da 1.02 scale, tap'te 0.98
- Skeletons: lime tint pulse (limeSoft → mist → limeSoft)

## 7. Erişilebilirlik
- Kontrast: graphite on pure, graphite on lime (AA ✓), lime on graphite text için kullanma; graphite yaz
- Focus ring: 3px rgba(10,10,10,0.1), outside border
- Tüm butonlar aria-label, tüm form label'lı, motion-reduce için heartbeat'i disable

## 8. Klasör yapısı
- app/layout.tsx (fonts, theme provider)
- app/page.tsx (landing)
- app/(dashboard)/app/page.tsx
- components/
  - brand/ (Symbol, Glyph, Wordmark, Lockup, Stacked)
  - ui/ (Button, Input, Card, Badge, Nav, Footer)
  - marketing/ (Hero, FeatureGrid, Industries, CaseStudy, CTA)
  - app/ (Sidebar, KPICard, RhythmChart, InboxItem)
- lib/tokens.ts (export edilmiş design tokens — Tailwind'in tamamlayıcısı, motion için)
- styles/globals.css

## 9. Yapılacaklar
1) Tailwind config'e tokens'ı ekle; fonts'ı layout.tsx'te yükle (next/font/google: Space Grotesk, Inter, JetBrains Mono).
2) brand/ klasörüne tüm SVG komponentlerini yaz; storybook opsiyonel ama önerilir.
3) ui/ komponentlerini CVA (class-variance-authority) ile variant'lı yaz.
4) Landing sayfasını yukarıdaki akışla kur; tüm başlıklar Space Grotesk 500, letter-spacing doğru.
5) Dashboard iskeletini kur (sidebar + topbar + grid); mock data ile besle.
6) Motion'ları ekle; prefers-reduced-motion için fallback.
7) Lighthouse: perf 90+, a11y 100, best-practices 100.

## 10. Sıkı kurallar
- Lime sadece 1 accent; sayfa başına maksimum 2 yerde görünür olsun (overuse yasak).
- Emoji kullanma; ikonlar için Lucide Icons, 1.5px stroke, currentColor.
- Gradient, glassmorphism, neumorphism yok. Sadece düz renk + hairline border + minimal shadow.
- Rounded-full yerine radius değerlerini token'dan al (pill hariç).
- Hiç bir başlıkta ünlem işareti yok. Ton sakin, ölçülü.
- Metin: Türkçe birincil; opsiyonel İngilizce switcher.

Bitince bana özet ver: kurulan sayfalar, komponent listesi, karşılaştığın kararlar.`;

  return (
    <div style={{ width: '100%', height: '100%', background: '#0A0A0A', color: '#fff', padding: 40, display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Eyebrow2 color="#A3A3A3">Developer handoff</Eyebrow2>
        <div style={{ fontFamily: T2().fonts.display, fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
          IDE prompt.
        </div>
        <div style={{ fontFamily: T2().fonts.body, fontSize: 13, color: '#A3A3A3', lineHeight: 1.55 }}>
          Claude Opus 4.7'ye (Cursor / Zed / Claude Code) vermek için hazır prompt. Sağdaki bloğu kopyala, repo'da yapıştır — token'lar, komponentler, sayfa akışı, motion ve sıkı kurallar dahil.
        </div>
        <div style={{ padding: 14, background: '#1A1A1A', borderRadius: 10, border: '1px solid #333', fontFamily: T2().fonts.mono, fontSize: 11, color: '#C6F24E', lineHeight: 1.7 }}>
          STACK<br/>
          <span style={{ color: '#fff' }}>Next.js 14 · TypeScript</span><br/>
          <span style={{ color: '#fff' }}>Tailwind · Framer Motion</span><br/>
          <span style={{ color: '#fff' }}>Lucide Icons · CVA</span>
        </div>
        <div style={{ fontFamily: T2().fonts.mono, fontSize: 10, color: '#737373', letterSpacing: '0.14em', marginTop: 'auto' }}>
          BUAZE · PULSE · v1.0
        </div>
      </div>

      <div style={{ background: '#0F0F0F', border: '1px solid #1F1F1F', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #1F1F1F', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#DC2626' }} />
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#F59E0B' }} />
            <div style={{ width: 10, height: 10, borderRadius: 999, background: '#16A34A' }} />
          </div>
          <div style={{ fontFamily: T2().fonts.mono, fontSize: 11, color: '#737373' }}>buaze-pulse-prompt.md</div>
          <div style={{ fontFamily: T2().fonts.mono, fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em' }}>COPY READY</div>
        </div>
        <pre style={{
          margin: 0, padding: 20,
          fontFamily: T2().fonts.mono,
          fontSize: 10.5,
          lineHeight: 1.65,
          color: '#E4E4E4',
          whiteSpace: 'pre-wrap',
          overflow: 'auto',
          flex: 1,
        }}>{prompt}</pre>
      </div>
    </div>
  );
}

window.PulseArtboards2 = { WebHeroBoard, DashboardBoard, MobileBoard, QRBoard, EmailSocialBoard, MotionBoard, HandoffBoard };
