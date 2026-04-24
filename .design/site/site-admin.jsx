// Admin Panel — Dashboard, QR Builder, Reviews, Analytics, Locations, Settings

const S3 = () => window.BuazeSite;
const PB6 = () => window.PulseBrand;

// ============== ADMIN SHELL ==============
const AdminShell = ({ active, title, breadcrumb, children }) => {
  const { Lockup } = PB6();
  const nav = [
    { k: 'dashboard', l: 'Genel bakış', i: '◉' },
    { k: 'reviews',   l: 'Yorumlar',    i: '✦', badge: '12' },
    { k: 'qr',        l: 'QR oluştur',  i: '▦' },
    { k: 'analytics', l: 'Analitik',    i: '◢' },
    { k: 'locations', l: 'Konumlar',    i: '◎' },
    { k: 'campaigns', l: 'Kampanyalar', i: '◆' },
    { k: 'team',      l: 'Ekip',        i: '◯' },
    { k: 'settings',  l: 'Ayarlar',     i: '◈' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '100%', fontFamily: "'Inter', sans-serif", background: '#FAFAFA' }}>
      {/* SIDEBAR */}
      <div style={{ background: '#0A0A0A', color: '#fff', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ padding: '6px 8px 18px' }}>
          <Lockup size="sm" color="#FFFFFF" accent="#C6F24E" />
        </div>
        {/* workspace switcher */}
        <div style={{ padding: '10px 12px', background: '#1A1A1A', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>A</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Ark Bistro</div>
            <div style={{ fontSize: 10, color: '#A3A3A3', fontFamily: "'JetBrains Mono', monospace" }}>5 KONUM</div>
          </div>
          <div style={{ color: '#737373' }}>⌄</div>
        </div>
        {nav.map(n => (
          <div key={n.k} style={{
            padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
            background: active === n.k ? '#C6F24E' : 'transparent',
            color: active === n.k ? '#0A0A0A' : '#D4D4D4',
            fontWeight: active === n.k ? 600 : 400, fontSize: 13,
          }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{n.i}</span>
            <span style={{ flex: 1 }}>{n.l}</span>
            {n.badge && <span style={{ padding: '1px 7px', background: active === n.k ? '#0A0A0A' : '#C6F24E', color: active === n.k ? '#C6F24E' : '#0A0A0A', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>{n.badge}</span>}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: 12, background: '#1A1A1A', borderRadius: 10 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#C6F24E', letterSpacing: '0.14em', fontWeight: 600 }}>GROWTH PLAN</div>
          <div style={{ fontSize: 12, color: '#D4D4D4', marginTop: 6, lineHeight: 1.4 }}>Yorum kotan: <b>812 / ∞</b></div>
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, textAlign: 'center', fontSize: 11, fontWeight: 600 }}>Yükselt</div>
        </div>
      </div>
      {/* MAIN */}
      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 28px', background: '#fff', borderBottom: '1px solid #EDEDED', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{breadcrumb}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 2 }}>{title}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ padding: '8px 14px', border: '1px solid #EDEDED', borderRadius: 999, fontSize: 12, color: '#737373', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⌕ Yorum, konum, ekip ara... <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: '1px 5px', background: '#F5F5F5', borderRadius: 4 }}>⌘K</span>
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>EK</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
};

// ============== DASHBOARD ==============
function AdminDashboard() {
  return (
    <AdminShell active="dashboard" breadcrumb="ANA SAYFA / GENEL BAKIŞ" title="Merhaba Emre — bugün nabız güçlü.">
      <div style={{ padding: 28 }}>
        {/* KPI ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { l: 'Google puanı', k: '4.8', d: '+0.2 bu ay', up: true, color: '#C6F24E' },
            { l: 'Yeni yorum', k: '812', d: '+184% / ay', up: true },
            { l: 'Yanıt süresi', k: '12dk', d: '−34% / ay', up: true },
            { l: 'Aktif QR', k: '47', d: '5 konum' },
          ].map(x => (
            <div key={x.l} style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{x.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 38, fontWeight: 500, letterSpacing: '-0.025em' }}>{x.k}</span>
                {x.color && <span style={{ fontSize: 13 }}>★</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11 }}>
                {x.up && <span style={{ color: '#16A34A', fontWeight: 600 }}>↑</span>}
                <span style={{ color: '#737373' }}>{x.d}</span>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginTop: 14 }}>
          {/* Chart */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Yorum ritmi</div>
                <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>Son 30 gün · günlük</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['7G', '30G', '90G', '1Y'].map((t, i) => (
                  <div key={t} style={{ padding: '5px 10px', fontSize: 11, background: i === 1 ? '#0A0A0A' : 'transparent', color: i === 1 ? '#fff' : '#737373', borderRadius: 6 }}>{t}</div>
                ))}
              </div>
            </div>
            {/* chart */}
            <svg viewBox="0 0 580 200" style={{ width: '100%', marginTop: 18 }}>
              {[40, 80, 120, 160].map(y => <line key={y} x1="0" y1={y} x2="580" y2={y} stroke="#F5F5F5" strokeWidth="1" />)}
              <path d="M0 150 L20 140 L40 130 L60 140 L80 120 L100 115 L120 100 L140 110 L160 95 L180 80 L200 90 L220 70 L240 75 L260 60 L280 65 L300 55 L320 40 L340 55 L360 45 L380 35 L400 30 L420 45 L440 25 L460 30 L480 20 L500 15 L520 25 L540 18 L560 12 L580 10"
                fill="none" stroke="#C6F24E" strokeWidth="2.5" />
              <path d="M0 150 L20 140 L40 130 L60 140 L80 120 L100 115 L120 100 L140 110 L160 95 L180 80 L200 90 L220 70 L240 75 L260 60 L280 65 L300 55 L320 40 L340 55 L360 45 L380 35 L400 30 L420 45 L440 25 L460 30 L480 20 L500 15 L520 25 L540 18 L560 12 L580 10 L580 200 L0 200 Z"
                fill="url(#grad)" />
              <defs>
                <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* peaks */}
              {[[320,40],[420,45],[480,20]].map(([x,y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r="4" fill="#0A0A0A" />
                  <circle cx={x} cy={y} r="8" fill="none" stroke="#0A0A0A" strokeWidth="1" opacity="0.3" />
                </g>
              ))}
            </svg>
            <div style={{ marginTop: 16, display: 'flex', gap: 24, fontSize: 11, color: '#737373' }}>
              {['1 Mar', '8 Mar', '15 Mar', '22 Mar', '29 Mar'].map(d => <span key={d} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{d}</span>)}
            </div>
          </div>

          {/* Rating split */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Puan dağılımı</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>Bu ay · 812 yorum</div>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { s: 5, c: 612, p: 75 },
                { s: 4, c: 128, p: 16 },
                { s: 3, c: 42, p: 5 },
                { s: 2, c: 18, p: 2 },
                { s: 1, c: 12, p: 1 },
              ].map(r => (
                <div key={r.s} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 50px', gap: 10, alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', gap: 2 }}>{r.s}<span style={{ color: '#C6F24E' }}>★</span></div>
                  <div style={{ height: 8, background: '#F5F5F5', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${r.p}%`, height: '100%', background: r.s >= 4 ? '#C6F24E' : r.s === 3 ? '#F59E0B' : '#DC2626', borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#737373', fontFamily: "'JetBrains Mono', monospace", textAlign: 'right' }}>{r.c}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LATEST + LOCATIONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14, marginTop: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Son yorumlar</div>
              <div style={{ fontSize: 12, color: '#737373' }}>Tümünü gör →</div>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
              {[
                { n: 'Melis Demir', r: 5, t: 'Servis harikaydı, garsonlar gerçekten ilgiliydi. Yeniden geleceğim.', l: 'Kadıköy', dt: '2 dk önce', status: 'new' },
                { n: 'Ahmet Yılmaz', r: 5, t: 'Kahvesi muhteşem. Nefis bir akşam yemeğiydi.', l: 'Beşiktaş', dt: '12 dk önce', status: 'new' },
                { n: 'Zeynep Öztürk', r: 2, t: 'Bekleme süresi çok uzundu, garson siparişi unuttu.', l: 'Kadıköy', dt: '34 dk önce', status: 'attention' },
                { n: 'Can Aksoy', r: 5, t: 'Mantı tarifi harikaydı, aile ile güzel zaman geçirdik.', l: 'Nişantaşı', dt: '1 sa önce', status: 'replied' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '14px 0', borderBottom: i < 3 ? '1px solid #EDEDED' : 'none', display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 999, background: r.r === 5 ? '#C6F24E' : r.r === 2 ? '#FEE2E2' : '#F5F5F5', color: r.r === 2 ? '#DC2626' : '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>
                    {r.n.split(' ').map(x => x[0]).join('')}
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.n}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E' }}>{'★'.repeat(r.r)}</span>
                      <span style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>· {r.l} · {r.dt}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#525252', marginTop: 3, lineHeight: 1.45 }}>{r.t}</div>
                  </div>
                  <div style={{
                    padding: '3px 8px',
                    background: r.status === 'new' ? '#EAF9B8' : r.status === 'attention' ? '#FEE2E2' : '#F5F5F5',
                    color: r.status === 'new' ? '#0A0A0A' : r.status === 'attention' ? '#DC2626' : '#525252',
                    borderRadius: 4,
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.1em', fontWeight: 600,
                  }}>
                    {r.status === 'new' ? 'YENİ' : r.status === 'attention' ? 'DİKKAT' : 'YANITLANDI'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Konum performansı</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>Bu ay</div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { l: 'Kadıköy', r: 4.9, c: 312 },
                { l: 'Beşiktaş', r: 4.8, c: 218 },
                { l: 'Nişantaşı', r: 4.7, c: 156 },
                { l: 'Levent', r: 4.6, c: 89 },
                { l: 'Bebek', r: 4.5, c: 37 },
              ].map(l => (
                <div key={l.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F5F5F5' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{l.l}</div>
                    <div style={{ fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>{l.c} yorum</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>{l.r}</span>
                    <span style={{ color: '#C6F24E', fontSize: 12 }}>★</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ============== REVIEWS INBOX ==============
function AdminReviews() {
  const reviews = [
    { n: 'Melis Demir', r: 5, t: 'Servis harikaydı, garsonlar gerçekten ilgiliydi. Yeniden geleceğim. Tavuk döneri özellikle lezzetliydi.', l: 'Kadıköy', dt: '2 dk', src: 'Google', tags: ['Servis', 'Yemek'], active: true },
    { n: 'Ahmet Yılmaz', r: 5, t: 'Kahvesi muhteşem. Nefis bir akşam yemeğiydi.', l: 'Beşiktaş', dt: '12 dk', src: 'Google', tags: ['Kahve'] },
    { n: 'Zeynep Öztürk', r: 2, t: 'Bekleme süresi çok uzundu, garson siparişi unuttu. Yöneticiyle konuşmak istedim.', l: 'Kadıköy', dt: '34 dk', src: 'Buaze', tags: ['Hız', 'Servis'], flagged: true },
    { n: 'Can Aksoy', r: 5, t: 'Aile ile güzel zaman geçirdik.', l: 'Nişantaşı', dt: '1 sa', src: 'Tripadvisor', replied: true },
    { n: 'Burcu Şahin', r: 4, t: 'İyiydi, ama dessert kısmı zayıf.', l: 'Levent', dt: '2 sa', src: 'Google', tags: ['Tatlı'] },
    { n: 'Mehmet Öz', r: 5, t: 'Her ay geliyoruz, hiç sukut-u hayale uğramadık.', l: 'Kadıköy', dt: '4 sa', src: 'Google' },
    { n: 'Ayşe Kılıç', r: 3, t: 'Ortalama bir deneyimdi.', l: 'Beşiktaş', dt: '6 sa', src: 'Buaze' },
  ];
  return (
    <AdminShell active="reviews" breadcrumb="YORUMLAR / GELEN KUTUSU" title="Yorum gelen kutusu">
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr 360px', height: '100%', background: '#fff' }}>
        {/* LEFT — list */}
        <div style={{ borderRight: '1px solid #EDEDED', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #EDEDED' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Hepsi · 812', 'Yeni · 12', 'Dikkat · 3', 'Yanıtlandı'].map((c, i) => (
                <div key={c} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 500, background: i === 0 ? '#0A0A0A' : '#F5F5F5', color: i === 0 ? '#fff' : '#525252', borderRadius: 999 }}>{c}</div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: '8px 12px', background: '#F5F5F5', borderRadius: 8, fontSize: 12, color: '#737373' }}>⌕ Yorum, müşteri ara...</div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {reviews.map((r, i) => (
              <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid #F5F5F5', background: r.active ? '#EAF9B8' : '#fff', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: r.active ? '3px solid #0A0A0A' : '3px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, background: r.r === 5 ? '#0A0A0A' : r.r <= 2 ? '#FEE2E2' : '#F5F5F5', color: r.r === 5 ? '#C6F24E' : r.r <= 2 ? '#DC2626' : '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                      {r.n.split(' ').map(x => x[0]).join('')}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{r.n}</span>
                  </div>
                  <span style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>{r.dt}</span>
                </div>
                <div style={{ fontSize: 12, color: '#525252', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.t}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E', background: '#0A0A0A', padding: '1px 5px', borderRadius: 3 }}>{'★'.repeat(r.r)}</span>
                  <span style={{ fontSize: 10, color: '#737373' }}>{r.src} · {r.l}</span>
                  {r.replied && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#16A34A' }}>✓</span>}
                  {r.flagged && <span style={{ marginLeft: 'auto', fontSize: 10, color: '#DC2626' }}>⚠</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER — active review */}
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ width: 56, height: 56, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 600 }}>MD</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600 }}>Melis Demir</div>
              <div style={{ fontSize: 12, color: '#737373', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>GOOGLE · KADIKÖY · 2 DK ÖNCE</div>
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map(i => <span key={i} style={{ color: '#C6F24E', fontSize: 16 }}>★</span>)}
                <span style={{ fontSize: 13, fontWeight: 600, marginLeft: 4 }}>5.0</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ padding: '7px 12px', border: '1px solid #EDEDED', borderRadius: 8, fontSize: 12 }}>⚐ Flag</div>
              <div style={{ padding: '7px 12px', border: '1px solid #EDEDED', borderRadius: 8, fontSize: 12 }}>▲ Ata</div>
            </div>
          </div>

          <div style={{ marginTop: 24, padding: 20, background: '#FAFAFA', borderRadius: 12, fontSize: 15, color: '#0A0A0A', lineHeight: 1.6 }}>
            "Servis harikaydı, garsonlar gerçekten ilgiliydi. Yeniden geleceğim. Tavuk döneri özellikle lezzetliydi, kaburga yanında ikramı da güzel bir dokunuştu. Fiyat-performans açısından da çok başarılı buldum."
          </div>

          {/* Tags */}
          <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Servis · +5', 'Yemek · +5', 'Fiyat · +4', 'Atmosfer · +4'].map(t => (
              <div key={t} style={{ padding: '4px 10px', background: '#EAF9B8', borderRadius: 999, fontSize: 11, fontWeight: 500 }}>{t}</div>
            ))}
            <div style={{ padding: '4px 10px', border: '1px dashed #A3A3A3', borderRadius: 999, fontSize: 11, color: '#737373' }}>+ Etiket</div>
          </div>

          {/* AI suggestion */}
          <div style={{ marginTop: 24, padding: 20, background: '#0A0A0A', color: '#fff', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11 }}>AI</div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em' }}>BUAZE CO-PILOT ÖNERİSİ</span>
            </div>
            <div style={{ marginTop: 12, fontSize: 14, color: '#D4D4D4', lineHeight: 1.6 }}>
              "Melis Hanım, böylesine güzel bir geri bildirim bıraktığınız için çok teşekkür ederiz! Tavuk dönerimizden bahsetmeniz de bizi mutlu etti — şef Mustafa'ya iletiyoruz. Sizi yeniden ağırlamayı dört gözle bekliyoruz. 🙏"
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <div style={{ padding: '8px 14px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>Kullan & gönder</div>
              <div style={{ padding: '8px 14px', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 12 }}>⟲ Yeniden öner</div>
              <div style={{ padding: '8px 14px', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 12 }}>✎ Düzenle</div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 16, border: '1px solid #EDEDED', borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: '#737373', marginBottom: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em' }}>YANIT YAZIN</div>
            <div style={{ fontSize: 14, color: '#0A0A0A', minHeight: 40 }}>Merhaba Melis Hanım, <span style={{ background: '#C6F24E', display: 'inline-block', width: 2, height: 16, verticalAlign: 'middle' }} /></div>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {['📝', '✨', '😊', '@'].map(e => <span key={e} style={{ width: 28, height: 28, borderRadius: 6, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{e}</span>)}
              </div>
              <div style={{ padding: '8px 16px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>Gönder ↑</div>
            </div>
          </div>
        </div>

        {/* RIGHT — customer context */}
        <div style={{ borderLeft: '1px solid #EDEDED', padding: 24, background: '#FAFAFA', overflow: 'auto' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em' }}>MÜŞTERİ PROFİLİ</div>
          <div style={{ marginTop: 14, padding: 16, background: '#fff', borderRadius: 12, border: '1px solid #EDEDED' }}>
            <div style={{ fontSize: 12, color: '#737373' }}>Toplam ziyaret</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em' }}>4</div>
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>ORT. PUAN</div><div style={{ fontWeight: 600, fontSize: 15 }}>4.8 ★</div></div>
              <div><div style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>SADAKAT</div><div style={{ fontWeight: 600, fontSize: 15 }}>Yüksek</div></div>
            </div>
          </div>

          <div style={{ marginTop: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em' }}>GEÇMİŞ</div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { dt: '2 dk', r: 5, t: 'Servis harikaydı...' },
              { dt: '12 Oca', r: 5, t: 'Harika akşam yemeği' },
              { dt: '3 Kas', r: 4, t: 'Çok iyi ama biraz kalabalık' },
            ].map((x, i) => (
              <div key={i} style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #EDEDED' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span style={{ color: '#C6F24E', background: '#0A0A0A', padding: '1px 4px', borderRadius: 3, fontFamily: "'JetBrains Mono', monospace" }}>{'★'.repeat(x.r)}</span>
                  <span style={{ color: '#737373' }}>{x.dt}</span>
                </div>
                <div style={{ fontSize: 12, color: '#525252', marginTop: 4 }}>{x.t}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em' }}>OTOMASYON</div>
          <div style={{ marginTop: 10, padding: 14, background: '#EAF9B8', borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}>
            <b>SLA hedefi</b>: 2 saat içinde yanıt. <b>1 sa 58 dk</b> kaldı.
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ============== QR BUILDER ==============
function AdminQRBuilder() {
  return (
    <AdminShell active="qr" breadcrumb="QR OLUŞTUR / YENİ KAMPANYA" title="QR kodu oluştur">
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 24 }}>
        {/* CONFIGURE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Step 1 */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>1</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Kampanya detayları</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373' }}>KAMPANYA ADI</label>
                <div style={{ marginTop: 6, padding: '11px 14px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 13 }}>Masa QR — Kadıköy</div>
              </div>
              <div>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373' }}>KONUM</label>
                <div style={{ marginTop: 6, padding: '11px 14px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 13 }}>Ark Bistro · Kadıköy ⌄</div>
              </div>
              <div>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373' }}>YERLEŞİM</label>
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  {['Masa', 'Fatura', 'Kapı', 'Paket'].map((t, i) => (
                    <div key={t} style={{ flex: 1, padding: '8px 6px', textAlign: 'center', fontSize: 12, borderRadius: 6, background: i === 0 ? '#0A0A0A' : '#F5F5F5', color: i === 0 ? '#fff' : '#0A0A0A', fontWeight: 500 }}>{t}</div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373' }}>ADET</label>
                <div style={{ marginTop: 6, padding: '11px 14px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 13 }}>24 adet (M01-M24)</div>
              </div>
            </div>
          </div>

          {/* Step 2 — Flow */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>2</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Akış</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, alignItems: 'stretch' }}>
              {[
                { n: '1', t: 'Tarama', d: 'Müşteri QR okur' },
                { n: '2', t: 'Puan verir', d: '1-5 yıldız ekran' },
                { n: '3', t: 'Not bırakır', d: 'Opsiyonel metin' },
                { n: '4', t: 'Yönlendirme', d: '≥4 → Google\n<4 → Özel form' },
              ].map((s, i) => (
                <React.Fragment key={s.n}>
                  <div style={{ padding: 14, background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 10 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em', fontWeight: 600 }}>ADIM {s.n}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, marginTop: 6 }}>{s.t}</div>
                    <div style={{ fontSize: 11, color: '#737373', marginTop: 4, whiteSpace: 'pre-line' }}>{s.d}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={{ marginTop: 14, padding: 12, background: '#EAF9B8', borderRadius: 8, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 700 }}>✓</span>
              <span>Google politikalarına <b>%100 uyumlu</b>. Olumsuz yorumlar gizlenmez; süzülmez — sadece iç yönetime atanır.</span>
            </div>
          </div>

          {/* Step 3 — Style */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>3</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Tasarım</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {[
                { bg: '#C6F24E', fg: '#0A0A0A', l: 'Lime', active: true },
                { bg: '#FFFFFF', fg: '#0A0A0A', l: 'Beyaz' },
                { bg: '#0A0A0A', fg: '#C6F24E', l: 'Koyu' },
                { bg: '#FAFAFA', fg: '#0A0A0A', l: 'Minimal' },
              ].map((x, i) => (
                <div key={x.l} style={{ aspectRatio: '3/4', background: x.bg, border: x.active ? '2px solid #0A0A0A' : '1px solid #EDEDED', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: x.fg, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12 }}>Yorum bırak</div>
                  <div style={{ width: 36, height: 36, background: x.fg, borderRadius: 4 }} />
                  <div style={{ color: x.fg, fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, padding: '14px 20px', border: '1px solid #EDEDED', borderRadius: 999, textAlign: 'center', fontSize: 14 }}>Taslak kaydet</div>
            <div style={{ flex: 1, padding: '14px 20px', background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontSize: 14, fontWeight: 500 }}>Yayınla & indir →</div>
          </div>
        </div>

        {/* PREVIEW */}
        <div>
          <div style={{ position: 'sticky', top: 0 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', marginBottom: 10 }}>CANLI ÖNİZLEME</div>
            {/* Phone preview + card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Card */}
              <div style={{ background: '#C6F24E', borderRadius: 14, padding: 16, aspectRatio: '3/4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.2em', color: '#0A0A0A', opacity: 0.6 }}>ARK BISTRO</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1, marginTop: 8 }}>Deneyiminizi paylaşın.</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 8, padding: 8 }}>
                  <svg viewBox="0 0 60 60" width="80" height="80">
                    {Array.from({length: 64}).map((_, i) => {
                      const x = i % 8, y = Math.floor(i / 8);
                      if ((x*31 + y*17 + 7) % 10 < 4) return null;
                      return <rect key={i} x={x*6 + 4} y={y*6 + 4} width="5" height="5" fill="#0A0A0A" />;
                    })}
                    {[[4,4],[40,4],[4,40]].map(([fx,fy], i) => (
                      <g key={i}><rect x={fx} y={fy} width="16" height="16" fill="none" stroke="#0A0A0A" strokeWidth="3"/><rect x={fx+5} y={fy+5} width="6" height="6" fill="#0A0A0A" /></g>
                    ))}
                  </svg>
                </div>
                <div style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.14em' }}>BUAZE · M07</div>
              </div>
              {/* Phone */}
              <div style={{ background: '#0A0A0A', borderRadius: 28, padding: 10, aspectRatio: '9/19' }}>
                <div style={{ background: '#fff', borderRadius: 20, height: '100%', padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#737373', letterSpacing: '0.14em' }}>ARK BISTRO</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1 }}>Deneyiminizi nasıldı?</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    {[1,2,3,4,5].map(i => <div key={i} style={{ width: 24, height: 24, borderRadius: 999, background: i <= 4 ? '#C6F24E' : '#EDEDED', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>★</div>)}
                  </div>
                  <div style={{ padding: 8, background: '#FAFAFA', borderRadius: 6, fontSize: 9, color: '#A3A3A3', minHeight: 50 }}>Kısa notunuz...</div>
                  <div style={{ padding: 8, background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontSize: 10, fontWeight: 500 }}>Paylaş →</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 14, background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 10 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em' }}>QR URL</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#0A0A0A', marginTop: 4, wordBreak: 'break-all' }}>buaze.co/r/ark-kadikoy/M07</div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

// ============== ANALYTICS ==============
function AdminAnalytics() {
  return (
    <AdminShell active="analytics" breadcrumb="ANALİTİK / GENEL" title="Analitik">
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Genel', 'Duygu', 'Personel', 'Konum', 'Kaynak'].map((t, i) => (
              <div key={t} style={{ padding: '8px 14px', fontSize: 13, borderRadius: 8, background: i === 0 ? '#0A0A0A' : '#fff', color: i === 0 ? '#fff' : '#525252', border: '1px solid ' + (i === 0 ? '#0A0A0A' : '#EDEDED'), fontWeight: 500 }}>{t}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '8px 14px', border: '1px solid #EDEDED', borderRadius: 8, fontSize: 12 }}>📅 Son 90 gün</div>
            <div style={{ padding: '8px 14px', border: '1px solid #EDEDED', borderRadius: 8, fontSize: 12 }}>⬇ Rapor indir</div>
          </div>
        </div>

        {/* Big scoreboard */}
        <div style={{ background: '#0A0A0A', color: '#fff', borderRadius: 16, padding: 32, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em' }}>NPS SKORU · 90 GÜN</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 10 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 120, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 0.85, color: '#C6F24E' }}>72</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>Mükemmel</div>
                <div style={{ fontSize: 12, color: '#A3A3A3' }}>↑ +14 geçen çeyrek</div>
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 20 }}>
              {[{k: 'Destekçi', v: 78, c: '#C6F24E'}, {k: 'Nötr', v: 16, c: '#737373'}, {k: 'Eleştiren', v: 6, c: '#DC2626'}].map(s => (
                <div key={s.k} style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#A3A3A3' }}>{s.k}</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{s.v}%</span>
                  </div>
                  <div style={{ marginTop: 6, height: 4, background: '#1A1A1A', borderRadius: 2 }}>
                    <div style={{ width: `${s.v}%`, height: '100%', background: s.c, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em' }}>TREND</div>
            <svg viewBox="0 0 320 150" style={{ width: '100%', marginTop: 10 }}>
              <path d="M0 120 L30 115 L60 100 L90 110 L120 80 L150 65 L180 70 L210 50 L240 35 L270 40 L300 25 L320 20" fill="none" stroke="#C6F24E" strokeWidth="2.5" />
              {[[120,80],[210,50],[270,40],[320,20]].map(([x,y],i) => <circle key={i} cx={x} cy={y} r="3" fill="#C6F24E" />)}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace", marginTop: 8 }}>
              <span>OCA</span><span>ŞUB</span><span>MAR</span>
            </div>
          </div>
        </div>

        {/* Tag cloud + themes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, marginTop: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Öne çıkan temalar</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>AI tarafından tespit edildi</div>
            <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {[
                { t: 'servis kalitesi', s: 34, tone: 'pos' },
                { t: 'lezzet', s: 28, tone: 'pos' },
                { t: 'atmosfer', s: 22, tone: 'pos' },
                { t: 'fiyat', s: 20, tone: 'neu' },
                { t: 'bekleme süresi', s: 18, tone: 'neg' },
                { t: 'personel ilgisi', s: 16, tone: 'pos' },
                { t: 'park yeri', s: 11, tone: 'neg' },
                { t: 'temizlik', s: 10, tone: 'pos' },
                { t: 'sipariş hatası', s: 7, tone: 'neg' },
                { t: 'müzik', s: 5, tone: 'neu' },
              ].map(tag => (
                <div key={tag.t} style={{
                  padding: `${4 + tag.s*0.15}px ${8 + tag.s*0.3}px`,
                  background: tag.tone === 'pos' ? '#EAF9B8' : tag.tone === 'neg' ? '#FEE2E2' : '#F5F5F5',
                  borderRadius: 999,
                  fontSize: 11 + tag.s * 0.1,
                  fontWeight: 500,
                  color: tag.tone === 'neg' ? '#DC2626' : '#0A0A0A',
                }}>
                  {tag.t} · {tag.s}
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Kaynak dağılımı</div>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { l: 'Google', v: 62, c: '#C6F24E' },
                { l: 'Buaze QR', v: 24, c: '#0A0A0A' },
                { l: 'Tripadvisor', v: 9, c: '#A3A3A3' },
                { l: 'Yandex', v: 5, c: '#EDEDED' },
              ].map(s => (
                <div key={s.l}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 500 }}>
                    <span>{s.l}</span><span>{s.v}%</span>
                  </div>
                  <div style={{ marginTop: 6, height: 8, background: '#F5F5F5', borderRadius: 999 }}>
                    <div style={{ width: `${s.v}%`, height: '100%', background: s.c, borderRadius: 999 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff performance */}
        <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24, marginTop: 14 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Personel performansı</div>
          <table style={{ width: '100%', marginTop: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.12em', textAlign: 'left' }}>
                <th style={{ padding: '10px 0' }}>PERSONEL</th>
                <th>KONUM</th>
                <th>YORUM</th>
                <th>ORT. PUAN</th>
                <th>YANIT SÜRESİ</th>
                <th>DURUM</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 13 }}>
              {[
                { n: 'Ayşe Tekin', l: 'Kadıköy', c: 124, r: 4.9, t: '8dk', s: 'top' },
                { n: 'Burak Yıldız', l: 'Beşiktaş', c: 98, r: 4.8, t: '11dk', s: 'top' },
                { n: 'Ceren Kaya', l: 'Kadıköy', c: 87, r: 4.7, t: '14dk', s: 'ok' },
                { n: 'Deniz Aydın', l: 'Nişantaşı', c: 72, r: 4.6, t: '18dk', s: 'ok' },
                { n: 'Ebru Sönmez', l: 'Levent', c: 45, r: 4.2, t: '32dk', s: 'warn' },
              ].map(p => (
                <tr key={p.n} style={{ borderTop: '1px solid #F5F5F5' }}>
                  <td style={{ padding: '14px 0', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ width: 26, height: 26, borderRadius: 999, background: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{p.n.split(' ').map(x=>x[0]).join('')}</span>
                      {p.n}
                    </span>
                  </td>
                  <td style={{ color: '#737373' }}>{p.l}</td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.c}</td>
                  <td><span style={{ fontWeight: 600 }}>{p.r}</span> <span style={{ color: '#C6F24E' }}>★</span></td>
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", color: '#737373' }}>{p.t}</td>
                  <td>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em',
                      background: p.s === 'top' ? '#EAF9B8' : p.s === 'warn' ? '#FEE2E2' : '#F5F5F5',
                      color: p.s === 'warn' ? '#DC2626' : '#0A0A0A',
                    }}>
                      {p.s === 'top' ? 'ZİRVEDE' : p.s === 'warn' ? 'DİKKAT' : 'NORMAL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

// ============== LOCATIONS ==============
function AdminLocations() {
  return (
    <AdminShell active="locations" breadcrumb="KONUMLAR / TÜMÜ" title="Konumlar · 5 şube">
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '8px 14px', background: '#fff', border: '1px solid #EDEDED', borderRadius: 8, fontSize: 12 }}>⌕ Ara...</div>
            <div style={{ padding: '8px 14px', background: '#fff', border: '1px solid #EDEDED', borderRadius: 8, fontSize: 12 }}>Tümü ⌄</div>
          </div>
          <div style={{ padding: '8px 16px', background: '#0A0A0A', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 500 }}>+ Yeni konum</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { l: 'Kadıköy', a: 'Bahariye Cad. No:24', r: 4.9, c: 312, qr: 12, team: 8, trend: 'up' },
            { l: 'Beşiktaş', a: 'Barbaros Bul. No:56', r: 4.8, c: 218, qr: 10, team: 7, trend: 'up' },
            { l: 'Nişantaşı', a: 'Abdi İpekçi Cad. No:31', r: 4.7, c: 156, qr: 9, team: 6, trend: 'up' },
            { l: 'Levent', a: 'Büyükdere Cad. No:142', r: 4.6, c: 89, qr: 8, team: 5, trend: 'flat' },
            { l: 'Bebek', a: 'Cevdet Paşa Cad. No:18', r: 4.5, c: 37, qr: 8, team: 4, trend: 'down' },
          ].map(loc => (
            <div key={loc.l} style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{loc.l}</div>
                  <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>{loc.a}</div>
                </div>
                <div style={{ padding: '3px 8px', background: loc.trend === 'up' ? '#EAF9B8' : loc.trend === 'down' ? '#FEE2E2' : '#F5F5F5', borderRadius: 4, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', color: loc.trend === 'down' ? '#DC2626' : '#0A0A0A' }}>
                  {loc.trend === 'up' ? '↑ YÜKSELİYOR' : loc.trend === 'down' ? '↓ DÜŞÜYOR' : '→ DURAĞAN'}
                </div>
              </div>

              {/* Mini map */}
              <div style={{ marginTop: 14, aspectRatio: '2/1', background: '#F5F5F5', borderRadius: 8, position: 'relative', overflow: 'hidden' }}>
                <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 200 100">
                  <path d="M0 50 Q30 40 60 48 Q90 55 120 42 Q150 30 200 38" stroke="#EDEDED" strokeWidth="1.5" fill="none" />
                  <path d="M20 70 Q60 60 100 65 Q140 70 180 62" stroke="#EDEDED" strokeWidth="1.5" fill="none" />
                  <path d="M0 20 Q40 25 80 18 Q120 12 160 22 Q190 30 200 22" stroke="#EDEDED" strokeWidth="1.5" fill="none" />
                  <circle cx="100" cy="50" r="18" fill="#C6F24E" opacity="0.3" />
                  <circle cx="100" cy="50" r="10" fill="#C6F24E" opacity="0.6" />
                  <circle cx="100" cy="50" r="5" fill="#0A0A0A" />
                </svg>
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { l: 'Puan', v: loc.r, u: '★' },
                  { l: 'Yorum', v: loc.c },
                  { l: 'QR', v: loc.qr },
                  { l: 'Ekip', v: loc.team },
                ].map(x => (
                  <div key={x.l}>
                    <div style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em' }}>{x.l.toUpperCase()}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em' }}>{x.v}{x.u && <span style={{ color: '#C6F24E', fontSize: 14 }}> {x.u}</span>}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, padding: '10px 14px', background: '#FAFAFA', borderRadius: 8, fontSize: 12, color: '#525252', textAlign: 'center', fontWeight: 500 }}>Detay aç →</div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

// ============== SETTINGS ==============
function AdminSettings() {
  return (
    <AdminShell active="settings" breadcrumb="AYARLAR / HESAP" title="Ayarlar">
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { k: 'account', l: 'Hesap' },
            { k: 'brand', l: 'Marka kimliği', active: true },
            { k: 'integ', l: 'Entegrasyonlar' },
            { k: 'rules', l: 'Otomatik kurallar' },
            { k: 'team', l: 'Ekip & roller' },
            { k: 'billing', l: 'Faturalandırma' },
            { k: 'notif', l: 'Bildirimler' },
            { k: 'api', l: 'API & webhook\'lar' },
          ].map(i => (
            <div key={i.k} style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: i.active ? 600 : 400, background: i.active ? '#0A0A0A' : 'transparent', color: i.active ? '#fff' : '#525252' }}>{i.l}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Brand */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>Marka kimliği</div>
            <div style={{ fontSize: 13, color: '#737373', marginTop: 2 }}>QR kartlarında ve müşteri ekranlarında görünen tasarım</div>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em' }}>LOGO</label>
                <div style={{ marginTop: 8, height: 80, border: '1px dashed #E5E5E5', borderRadius: 8, background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>ark<span style={{ background: '#C6F24E', padding: '0 3px' }}>·</span></div>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#737373' }}>ark-logo.svg · 42kb</div>
              </div>
              <div>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em' }}>MARKA RENGİ</label>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  {['#C6F24E', '#0A0A0A', '#FFFFFF', '#FF6B35', '#2563EB'].map((c, i) => (
                    <div key={c} style={{ width: 36, height: 36, borderRadius: 6, background: c, border: i === 0 ? '2px solid #0A0A0A' : '1px solid #E5E5E5' }} />
                  ))}
                  <div style={{ width: 36, height: 36, borderRadius: 6, border: '1px dashed #A3A3A3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A3A3A3' }}>+</div>
                </div>
                <label style={{ marginTop: 16, display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em' }}>AKSAN FONTU</label>
                <div style={{ marginTop: 6, padding: '10px 14px', border: '1px solid #E5E5E5', borderRadius: 8, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16 }}>Space Grotesk</span>
                  <span style={{ color: '#A3A3A3' }}>⌄</span>
                </div>
              </div>
            </div>
          </div>

          {/* Google */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>Google Business Profile</div>
                <div style={{ fontSize: 13, color: '#737373', marginTop: 2 }}>ark-bistro@gmail.com · 5 konum eşleşti</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: '#16A34A' }} />
                <span style={{ fontSize: 12, fontWeight: 500 }}>Bağlı</span>
              </div>
            </div>
            <div style={{ marginTop: 16, padding: 14, background: '#EAF9B8', borderRadius: 8, fontSize: 12, lineHeight: 1.5 }}>
              ✓ Google politikalarına uyumlu. Son denetim: 2 gün önce.
            </div>
          </div>

          {/* Plan */}
          <div style={{ background: '#0A0A0A', color: '#fff', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em' }}>GROWTH PLAN</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6 }}>₺890/ay</div>
                <div style={{ fontSize: 12, color: '#A3A3A3', marginTop: 4 }}>Sonraki fatura 14 Mayıs · 5 konum</div>
              </div>
              <div style={{ padding: '10px 16px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, fontSize: 13, fontWeight: 600, alignSelf: 'flex-start' }}>Scale\'e yükselt →</div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

window.AdminPages = { AdminDashboard, AdminReviews, AdminQRBuilder, AdminAnalytics, AdminLocations, AdminSettings };
