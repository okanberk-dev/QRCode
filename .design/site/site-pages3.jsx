// Buaze Site — Yeni Eklenen Sayfalar
// Delivery çözümü, uluslararası sürüm, özellikler, entegrasyonlar,
// müşteri hikayeleri, SSS, yardım, yasal, kariyer, onboarding, admin ek.

const S3 = () => window.BuazeSite;
const PB6 = () => window.PulseBrand;
const PL = () => window.Platforms;

// ================================================================
// 1) PAKET SERVİS / DELIVERY ÇÖZÜM SAYFASI — /cozumler/paket-servis
// ================================================================
function DeliverySolutionPage() {
  const { SiteNav, SiteFooter } = S3();
  const { PlatformLogo, TR_DELIVERY, TR_REVIEW } = PL();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="solutions" />

      {/* HERO */}
      <div style={{ padding: '60px 48px 40px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sektör · Paket servis & Dark kitchen</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Her pakette bir<br/><span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>yorum</span> fırsatı.
          </div>
          <div style={{ fontSize: 17, color: '#525252', marginTop: 18, maxWidth: 540, lineHeight: 1.6 }}>
            Yemeksepeti, Getir Yemek ve Trendyol GO'daki puanınız Google'dan bile daha önemli. Paket içine koyduğunuz tek QR ile müşteriyi tam olarak yorum bırakacak platforma yönlendirin.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Paket QR'ı ücretsiz oluştur →</div>
            <div style={{ padding: '14px 22px', border: '1px solid #0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Demo iste</div>
          </div>
        </div>
        {/* QR + PLATFORM KARTI */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 340, background: '#0A0A0A', borderRadius: 18, padding: 28, color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em' }}>PAKET İÇİ QR</div>
              <div style={{ fontSize: 11, color: '#A3A3A3' }}>v2.4</div>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 500, marginTop: 10, lineHeight: 1.1 }}>
              Memnun kaldın mı?<br/>10 sn'de paylaş.
            </div>
            {/* QR */}
            <div style={{ background: '#C6F24E', borderRadius: 12, padding: 16, marginTop: 16, display: 'flex', justifyContent: 'center' }}>
              <svg viewBox="0 0 100 100" width="180" height="180">
                <rect width="100" height="100" fill="#C6F24E" />
                {Array.from({length: 144}).map((_, i) => {
                  const x = i % 12, y = Math.floor(i / 12);
                  const seed = (x * 37 + y * 19 + 3) % 10;
                  if (seed < 4) return null;
                  return <rect key={i} x={x*7 + 5} y={y*7 + 5} width="6" height="6" fill="#0A0A0A" />;
                })}
                {[[5,5],[65,5],[5,65]].map(([fx,fy], i) => (
                  <g key={i}>
                    <rect x={fx} y={fy} width="22" height="22" fill="#C6F24E" />
                    <rect x={fx} y={fy} width="22" height="22" fill="none" stroke="#0A0A0A" strokeWidth="4" />
                    <rect x={fx+7} y={fy+7} width="8" height="8" fill="#0A0A0A" />
                  </g>
                ))}
              </svg>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#A3A3A3', letterSpacing: '0.14em' }}>AKTİF PLATFORMLAR</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {['yemeksepeti', 'getir-yemek', 'trendyol-go', 'google'].map(id => <PlatformLogo key={id} id={id} size={32} rounded={8} />)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PLATFORMS GRID */}
      <div style={{ padding: '60px 48px', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 680 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Platform entegrasyonları</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1 }}>
            Tek QR. Dört platform. Dört kat geri bildirim.
          </div>
          <div style={{ fontSize: 15, color: '#525252', marginTop: 14, lineHeight: 1.6 }}>
            Memnun müşteri doğrudan yüksek puan verdiği platforma gider. Memnun olmayan, size özel feedback formuna. Böylece düşük puanlar halka açık yerlerde değil, kendi panelinizde karşılanır.
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[...TR_DELIVERY, ...TR_REVIEW].map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <PlatformLogo id={p.id} size={44} rounded={10} />
                <div style={{ width: 10, height: 10, borderRadius: 999, background: '#C6F24E' }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{p.tag}</div>
              </div>
              <div style={{ fontSize: 13, color: '#525252', lineHeight: 1.5 }}>
                {p.id === 'yemeksepeti' && 'Sipariş ID eşleştirme, otomatik yorum isteği, düşük puan alerti.'}
                {p.id === 'getir-yemek' && 'Yorum API bağlantısı, ortalama puan canlı takibi.'}
                {p.id === 'trendyol-go' && 'Kurye geri bildirimi ayrıştırma, restoran skoru üzerinde odak.'}
                {p.id === 'migros-hemen' && 'Market ürün yorumları ve teslimat deneyimi ayrı raporlarda.'}
                {p.id === 'google' && 'Sipariş sonrası müşteriyi Google işletme profiline yönlendir.'}
                {p.id === 'foursquare' && 'Konum bazlı yorumlar, çevredeki aramalarda çıkma.'}
                {p.id === 'facebook' && 'Meta Business Review API ile otomatik senkron.'}
                {p.id === 'instagram' && 'DM üzerinden gelen yorumları panele çek.'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FLOW */}
      <div style={{ padding: '80px 48px' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
          Akıllı yönlendirme.
        </div>
        <div style={{ fontSize: 15, color: '#525252', marginTop: 12, maxWidth: 600 }}>
          Müşteri QR'ı tarıyor. Önce 1-5 puan veriyor. Ne olduğuna göre farklı bir yere gidiyor.
        </div>
        <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { s: '5 ★', t: 'Google + kampanya', d: 'En memnun müşteri Google işletme profiline yönlendirilir + tekrar sipariş için kupon.', bg: '#C6F24E' },
            { s: '4 ★', t: 'Paket platformu', d: 'Sipariş verilen platforma geri götürülür; yorum bırakması kolaylaştırılır.', bg: '#EAF9B8' },
            { s: '1-3 ★', t: 'Özel feedback', d: 'Müşteri halka açık alanlara gitmez, size özel form doldurur. Düşük puan halka yayılmaz.', bg: '#FEE2E2' },
          ].map(x => (
            <div key={x.s} style={{ border: '1px solid #EDEDED', borderRadius: 16, padding: 24, background: '#FAFAFA' }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: x.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600 }}>{x.s}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 14 }}>{x.t}</div>
              <div style={{ fontSize: 14, color: '#525252', marginTop: 10, lineHeight: 1.55 }}>{x.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div style={{ padding: '20px 48px 80px' }}>
        <div style={{ background: '#0A0A0A', color: '#fff', borderRadius: 20, padding: '50px 48px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40 }}>
          {[
            { k: '+312%', l: 'Yemeksepeti yorum artışı · 60 gün' },
            { k: '4.8', l: 'Ortalama Getir puanı · 3. ay' },
            { k: '-68%', l: 'Negatif halka açık yorum' },
            { k: '18sn', l: 'Ortalama tarama–yorum süresi' },
          ].map(x => (
            <div key={x.l}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', color: '#C6F24E', lineHeight: 1 }}>{x.k}</div>
              <div style={{ fontSize: 13, color: '#A3A3A3', marginTop: 8 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ================================================================
// 2) INTERNATIONAL HOME — /en (hero'da Yelp/Tripadvisor)
// ================================================================
function InternationalHomePage() {
  const { SiteFooter, IllusLighthouse } = S3();
  const { Lockup } = PB6();
  const { PlatformLogo, GLOBAL_REVIEW, GLOBAL_DELIVERY } = PL();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      {/* Custom EN nav */}
      <div style={{ padding: '18px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EDEDED', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}>
        <Lockup size="sm" color="#0A0A0A" accent="#C6F24E" />
        <div style={{ display: 'flex', gap: 26, fontSize: 14 }}>
          {['Product', 'Solutions', 'Pricing', 'Customers', 'Blog'].map((l, i) => (
            <span key={l} style={{ color: i === 0 ? '#0A0A0A' : '#525252', fontWeight: i === 0 ? 600 : 400 }}>{l}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>🌐 EN</span>
          <span style={{ fontSize: 14 }}>Log in</span>
          <div style={{ padding: '10px 18px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>Start free</div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ padding: '80px 48px 60px', display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#EAF9B8', borderRadius: 999, marginBottom: 18 }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.12em' }}>TRUSTED BY 2,400+ BUSINESSES</span>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 80, fontWeight: 500, lineHeight: 0.92, letterSpacing: '-0.04em' }}>
            Track your reputation<br/>like a <span style={{ background: '#C6F24E', padding: '0 12px', borderRadius: 8 }}>pulse</span>.
          </div>
          <div style={{ fontSize: 18, color: '#525252', marginTop: 22, maxWidth: 520, lineHeight: 1.55 }}>
            Collect real reviews via QR, route them to Google, Yelp and Tripadvisor automatically, and reply to every customer from one inbox.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Start 14-day free trial →</div>
            <div style={{ padding: '14px 22px', border: '1px solid #0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>▶ Watch demo</div>
          </div>
          <div style={{ marginTop: 30 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Works with</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {GLOBAL_REVIEW.map(p => <PlatformLogo key={p.id} id={p.id} size={40} rounded={10} />)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <IllusLighthouse size={340} />
        </div>
      </div>

      {/* PLATFORM COVERAGE */}
      <div style={{ padding: '60px 48px', background: '#FAFAFA' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>One dashboard · Every platform</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 10 }}>
          From Yelp to Tripadvisor to DoorDash.
        </div>
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 16, padding: 28 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.14em', color: '#737373' }}>REVIEW PLATFORMS</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 500, marginTop: 6 }}>Your brand's trust signals</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
              {GLOBAL_REVIEW.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PlatformLogo id={p.id} size={36} rounded={8} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#737373' }}>{p.tag}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 16, padding: 28 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.14em', color: '#737373' }}>DELIVERY & BOOKING</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 500, marginTop: 6 }}>Where orders happen</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 20 }}>
              {GLOBAL_DELIVERY.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PlatformLogo id={p.id} size={36} rounded={8} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#737373' }}>{p.tag}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIAL */}
      <div style={{ padding: '80px 48px' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.025em', maxWidth: 900 }}>
          "We went from 3.9 on Yelp to 4.7 in six months. The Tripadvisor sync alone paid for Buaze."
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>JM</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Julia Martens</div>
            <div style={{ fontSize: 13, color: '#737373' }}>Hotel Nora · Amsterdam</div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ================================================================
// 3) FEATURES · /ozellikler
// ================================================================
function FeaturesPage() {
  const { SiteNav, SiteFooter, IllusInbox, IllusChart, IllusShield, IllusCompass } = S3();
  const features = [
    { n: '01', t: 'Yorum gelen kutusu', d: 'Google, Yelp, Yemeksepeti — tüm platformlardan gelen yorumlar tek bir inbox\'ta. Atama, SLA, arşivleme.', illus: <IllusInbox size={180} /> },
    { n: '02', t: 'AI Co-Pilot yanıt', d: 'Her yoruma 30 sn\'de markanıza özel yanıt. GPT-4 + Claude, işletmenizin tonunda öğreniyor.', illus: <IllusShield size={180} /> },
    { n: '03', t: 'QR kod stüdyosu', d: 'Masa başına, paket içine, hizmet sonrası. Branded, izlenebilir, yeniden basılabilir.', illus: <IllusCompass size={180} /> },
    { n: '04', t: 'Analiz & raporlama', d: 'NPS, duygu, personel performansı, konum karşılaştırma. Haftalık e-posta raporu.', illus: <IllusChart size={180} /> },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '72px 48px 40px' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Ürün</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12, maxWidth: 900 }}>
          Bir panel. Her yorum. <span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>Her platform.</span>
        </div>
        <div style={{ fontSize: 16, color: '#525252', marginTop: 16, maxWidth: 620 }}>
          Buaze'in tüm özellikleri nabız metaforunda buluşuyor: topla, yönet, iyileştir, büyü.
        </div>
      </div>
      <div style={{ padding: '20px 48px 80px' }}>
        {features.map((f, i) => (
          <div key={f.n} style={{ display: 'grid', gridTemplateColumns: i % 2 === 0 ? '1fr 1.1fr' : '1.1fr 1fr', gap: 48, alignItems: 'center', padding: '60px 0', borderTop: i === 0 ? '2px solid #0A0A0A' : '1px solid #EDEDED' }}>
            <div style={{ order: i % 2 === 0 ? 1 : 2 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', fontWeight: 600, letterSpacing: '0.16em' }}>ÖZELLİK {f.n}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 10 }}>{f.t}</div>
              <div style={{ fontSize: 16, color: '#525252', marginTop: 16, lineHeight: 1.6, maxWidth: 460 }}>{f.d}</div>
              <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
                <div style={{ padding: '10px 18px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>Detaylı bak →</div>
                <div style={{ padding: '10px 18px', border: '1px solid #0A0A0A', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>Canlı demo</div>
              </div>
            </div>
            <div style={{ order: i % 2 === 0 ? 2 : 1, display: 'flex', justifyContent: 'center', background: '#FAFAFA', borderRadius: 18, padding: 40, aspectRatio: '5/3', alignItems: 'center' }}>
              {f.illus}
            </div>
          </div>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// 4) INTEGRATIONS · /entegrasyonlar
// ================================================================
function IntegrationsPage() {
  const { SiteNav, SiteFooter } = S3();
  const { PlatformLogo, TR_DELIVERY, TR_REVIEW } = PL();
  const groups = [
    { title: 'Yorum platformları', subtitle: 'Müşteriler nerede konuşursa orada olun.', items: TR_REVIEW },
    { title: 'Paket servis', subtitle: 'Her paket bir fırsat.', items: TR_DELIVERY },
    { title: 'Takım araçları', subtitle: 'Ekibinize bildirim akıtın.', items: [
      { id: 'slack', name: 'Slack', tag: 'Kanal bildirimleri' },
      { id: 'teams', name: 'Microsoft Teams', tag: 'Kurumsal bildirim' },
      { id: 'whatsapp', name: 'WhatsApp Business', tag: 'Mobil alert' },
      { id: 'zapier', name: 'Zapier', tag: '5000+ uygulama' },
    ] },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '72px 48px 40px' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Entegrasyonlar</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
          Mevcut akışına<br/>dokun.
        </div>
        <div style={{ fontSize: 16, color: '#525252', marginTop: 14, maxWidth: 560 }}>
          İşletmenizde zaten kullandığınız araçlarla Buaze tek tıkla konuşur. API ve webhook'lar developer dokümanlarında.
        </div>
      </div>

      <div style={{ padding: '20px 48px 80px' }}>
        {groups.map((g, gi) => (
          <div key={g.title} style={{ paddingTop: 40, borderTop: gi === 0 ? '2px solid #0A0A0A' : '1px solid #EDEDED' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 40, paddingBottom: 50 }}>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em' }}>{g.title}</div>
                <div style={{ fontSize: 13, color: '#737373', marginTop: 6 }}>{g.subtitle}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {g.items.map(it => {
                  const hasLogo = ['yemeksepeti','getir-yemek','trendyol-go','migros-hemen','google','facebook','instagram','foursquare'].includes(it.id);
                  return (
                    <div key={it.id} style={{ padding: 16, border: '1px solid #EDEDED', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, background: '#FAFAFA' }}>
                      {hasLogo ? <PlatformLogo id={it.id} size={40} rounded={10} /> :
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600 }}>{it.name[0]}</div>
                      }
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{it.name}</div>
                        <div style={{ fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>{it.tag}</div>
                      </div>
                      <div style={{ padding: '4px 10px', background: '#C6F24E', borderRadius: 999, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>BAĞLI</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// 5) CUSTOMER STORIES · /basari-hikayeleri
// ================================================================
function CustomerStoriesPage() {
  const { SiteNav, SiteFooter } = S3();
  const stories = [
    { c: '#C6F24E', b: 'Ark Bistro', s: 'Restoran · Kadıköy', m: '+184%', ml: 'yorum · 90 gün', q: 'Google puanımız 4.2\'den 4.8\'e çıktı.' },
    { c: '#EAF9B8', b: 'Hotel Nora', s: 'Otel · Bodrum', m: '4.9/5', ml: 'Booking', q: 'Oda QR\'ları ile her misafir Booking\'e yönleniyor.' },
    { c: '#F5F5F5', b: 'Derma+', s: 'Klinik · Ankara', m: '+62%', ml: 'aylık randevu', q: 'Düşük puanlar halka açık platforma gitmiyor artık.' },
    { c: '#F5F5F5', b: 'Kahve Dükkan', s: 'Kafe · Çeşme · 4 şube', m: '3.8→4.7', ml: 'Google', q: 'Tüm şubelerin performansını tek panelde görüyorum.' },
    { c: '#F5F5F5', b: 'Law&Co', s: 'Hukuk ofisi · İstanbul', m: '+90', ml: 'net yorum', q: 'Danışma sonrası her müvekkilden yorum alıyoruz.' },
    { c: '#F5F5F5', b: 'Spa Ren', s: 'Güzellik · Nişantaşı', m: '4.95', ml: 'ort. puan', q: 'Instagram + Google + Foursquare üçgeninde zirve.' },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '72px 48px 40px' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Başarı hikayeleri</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
          Rakam konuşur.
        </div>
        <div style={{ fontSize: 16, color: '#525252', marginTop: 14, maxWidth: 560 }}>
          2.400'den fazla işletme Buaze ile nabzını dinliyor. İşte bir kısmı.
        </div>
      </div>
      <div style={{ padding: '20px 48px 80px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {stories.map((x, i) => (
          <div key={x.b} style={{ border: '1px solid #EDEDED', borderRadius: 18, overflow: 'hidden', background: '#FAFAFA' }}>
            <div style={{ background: x.c, padding: '32px 28px', minHeight: 220 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#0A0A0A', letterSpacing: '0.14em', opacity: 0.7 }}>{x.s.toUpperCase()}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 8 }}>{x.b}</div>
              <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1 }}>{x.m}</div>
                <div style={{ fontSize: 12, color: '#0A0A0A', opacity: 0.7 }}>{x.ml}</div>
              </div>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.35, color: '#0A0A0A' }}>"{x.q}"</div>
              <div style={{ marginTop: 18, fontSize: 12, color: '#737373', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Tam hikayeyi oku →</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>0{i+1}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// 6) FAQ · /sss
// ================================================================
function FAQPage() {
  const { SiteNav, SiteFooter } = S3();
  const faqs = [
    { q: 'Buaze Google\'ın politikalarına uyumlu mu?', a: 'Evet. Gatekeeping yapmıyoruz — her müşteri istediği yere yorum bırakabilir. Sadece memnun müşterilere kolay bir yol gösteriyoruz.' },
    { q: 'Kurulum ne kadar sürer?', a: 'Ortalama 5 dakika. İşletme bilgileri, Google Business Profile bağlantısı, ilk QR — tek oturumda bitiyor.' },
    { q: 'Hangi cihazlarda çalışır?', a: 'Müşteri tarafında sadece kamera var — her QR okuyan telefonda çalışır. Sizin panel web tabanlı, iOS ve Android uygulamamız da var.' },
    { q: 'Kredi kartı vermem gerekiyor mu?', a: 'Hayır. 14 gün tamamen ücretsiz. Beğenirseniz kart bilgisi eklersiniz.' },
    { q: 'Yemeksepeti ve Getir entegrasyonu nasıl çalışıyor?', a: 'Sipariş numarası üzerinden eşleştirme. QR\'ı tarayan müşteri otomatik olarak doğru platforma yönlendirilir.' },
    { q: 'Fiyatlandırma nasıl?', a: 'Konum başına aylık sabit fiyat. Yıllık ödemede %20 indirim. Küçük işletme için ücretsiz plan da var.' },
    { q: 'Ekip üyelerimi nasıl ekleyebilirim?', a: 'Panel → Ekip → Davet et. Rol bazlı yetkilendirme: Admin, Manager, Staff, Viewer.' },
    { q: 'Veri güvenliği?', a: 'Tüm veriler Türkiye\'de (AWS eu-central-1) saklanır. KVKK + GDPR uyumlu. Uygun sektörler için ISO 27001 süreci devam ediyor.' },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '72px 48px 40px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 48 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>SSS</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 64, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Cevaplar.
          </div>
          <div style={{ fontSize: 15, color: '#525252', marginTop: 14, maxWidth: 320 }}>
            Başka sorun var mı? <span style={{ color: '#0A0A0A', fontWeight: 600, borderBottom: '1px solid #0A0A0A' }}>destek@buaze.com</span>
          </div>
        </div>
        <div>
          {faqs.map((f, i) => (
            <div key={i} style={{ padding: '22px 0', borderBottom: '1px solid #EDEDED' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 500, letterSpacing: '-0.015em' }}>{f.q}</div>
                <div style={{ width: 28, height: 28, borderRadius: 999, border: '1px solid #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{i < 2 ? '−' : '+'}</div>
              </div>
              {i < 2 && <div style={{ fontSize: 14, color: '#525252', marginTop: 10, maxWidth: 560, lineHeight: 1.6 }}>{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// 7) CAREERS · /kariyer
// ================================================================
function CareersPage() {
  const { SiteNav, SiteFooter, IllusMountain } = S3();
  const jobs = [
    { t: 'Senior Backend Engineer', l: 'İstanbul / Uzaktan', d: 'Ürün', tags: ['Node.js', 'TypeScript', 'PostgreSQL'] },
    { t: 'Product Designer', l: 'İstanbul', d: 'Ürün', tags: ['Figma', 'Motion', 'Systems'] },
    { t: 'Growth Marketer', l: 'İstanbul / Hibrit', d: 'Büyüme', tags: ['SEO', 'CRO', 'Content'] },
    { t: 'Customer Success Manager', l: 'Uzaktan', d: 'Operasyon', tags: ['B2B', 'SaaS', 'Türkçe + İngilizce'] },
    { t: 'AI Research Engineer', l: 'İstanbul', d: 'Ürün', tags: ['LLM', 'RAG', 'Türkçe NLP'] },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '72px 48px 40px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Kariyer</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Birlikte<br/>büyüyelim.
          </div>
          <div style={{ fontSize: 16, color: '#525252', marginTop: 18, maxWidth: 480 }}>
            2.400+ işletmenin itibarını yöneten 24 kişilik ekibimiz, Maslak'tan + uzaktan çalışıyor. Türkçe ile dünyaya ürün yapıyoruz.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}><IllusMountain size={260} /></div>
      </div>

      <div style={{ padding: '40px 48px', background: '#FAFAFA' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            { k: 'Uzaktan-ilk', d: 'İstersen İstanbul, istersen Bali' },
            { k: '%100 Sağlık', d: 'Sen + eş + çocuklar' },
            { k: 'Cuma öğleden sonra', d: 'Haftada 4.5 gün çalışma' },
            { k: 'Ekipman seçimi', d: 'Apple + 1000$ ofis bütçesi' },
          ].map(b => (
            <div key={b.k} style={{ borderTop: '2px solid #0A0A0A', paddingTop: 14 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>{b.k}</div>
              <div style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>{b.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '60px 48px' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 500, letterSpacing: '-0.025em', marginBottom: 20 }}>Açık pozisyonlar</div>
        {jobs.map((j, i) => (
          <div key={j.t} style={{ padding: '20px 0', borderTop: i === 0 ? '2px solid #0A0A0A' : '1px solid #EDEDED', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 20, alignItems: 'center' }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 500, letterSpacing: '-0.015em' }}>{j.t}</div>
            <div style={{ fontSize: 13, color: '#737373' }}>{j.d}</div>
            <div style={{ fontSize: 13, color: '#737373' }}>{j.l}</div>
            <div style={{ padding: '8px 16px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>Başvur →</div>
          </div>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// 8) HELP CENTER · /yardim
// ================================================================
function HelpCenterPage() {
  const { SiteNav, SiteFooter } = S3();
  const cats = [
    { t: 'Başlarken', n: 12, i: '🚀' },
    { t: 'QR Kodları', n: 18, i: '▦' },
    { t: 'Yorum Yönetimi', n: 24, i: '✦' },
    { t: 'Entegrasyonlar', n: 16, i: '⟷' },
    { t: 'Ekip & Roller', n: 8, i: '◎' },
    { t: 'Faturalandırma', n: 10, i: '$' },
    { t: 'API & Webhook', n: 14, i: '{ }' },
    { t: 'Güvenlik & KVKK', n: 7, i: '🛡' },
  ];
  const popular = [
    'QR kodumu masaya nasıl yapıştırırım?',
    'Google Business Profile bağlama',
    'Olumsuz yoruma en iyi nasıl yanıt verilir?',
    'Yemeksepeti yorumlarını senkronlama',
    'Ekip üyesi ekleme + rol atama',
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '80px 48px', background: '#FAFAFA', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Yardım merkezi</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 64, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
          Sorunuzun cevabı burada.
        </div>
        <div style={{ marginTop: 28, maxWidth: 580, margin: '28px auto 0', background: '#fff', border: '1px solid #E5E5E5', borderRadius: 999, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 16 }}>🔍</span>
          <span style={{ flex: 1, fontSize: 14, color: '#A3A3A3', textAlign: 'left' }}>Sorunuzu yazın — "QR nasıl oluşturulur?"</span>
          <div style={{ padding: '6px 14px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>Ara</div>
        </div>
      </div>

      <div style={{ padding: '60px 48px' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 24 }}>Kategoriler</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {cats.map(c => (
            <div key={c.t} style={{ padding: 24, border: '1px solid #EDEDED', borderRadius: 14, background: '#fff' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, color: '#0A0A0A', marginBottom: 12 }}>{c.i}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: '-0.015em' }}>{c.t}</div>
              <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>{c.n} makale</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 60 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 20 }}>Popüler sorular</div>
          {popular.map((p, i) => (
            <div key={p} style={{ padding: '18px 0', borderTop: i === 0 ? '2px solid #0A0A0A' : '1px solid #EDEDED', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 500 }}>{p}</div>
              <div style={{ fontSize: 14, color: '#737373' }}>→</div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// 9) LEGAL · /gizlilik
// ================================================================
function LegalPage({ title = 'Gizlilik Politikası', sub = 'Son güncelleme: 14 Nisan 2026' }) {
  const { SiteNav, SiteFooter } = S3();
  const sections = [
    { h: '1. Topladığımız veriler', p: 'Hesap bilgileri (ad, e-posta, işletme adı), kullanım verileri (oturum, tıklama, tarayıcı), ödeme bilgileri (Stripe üzerinden; biz saklamayız), müşterilerden gelen yorumlar ve içerikleri. IP adresleri 30 gün sonra anonimleştirilir.' },
    { h: '2. Verilerinizi nasıl kullanıyoruz', p: 'Hizmeti sağlamak, hesabınızı yönetmek, güvenliği korumak, ürün iyileştirmeleri (anonimleştirilmiş), ve onay vermişseniz pazarlama iletişimi. Verinizi üçüncü şahıslara satmayız — asla.' },
    { h: '3. Nerede saklanır', p: 'Tüm veriler Almanya (AWS eu-central-1) veri merkezlerinde saklanır. Yedekler şifreli olarak 90 gün tutulur. KVKK + GDPR uyumlu.' },
    { h: '4. Haklarınız', p: 'Verinize erişme, düzeltme, silme, taşıma, itiraz etme haklarınız vardır. destek@buaze.com üzerinden 30 gün içinde yanıtlanır.' },
    { h: '5. Çerezler', p: 'Zorunlu + analiz çerezleri kullanıyoruz. Çerez tercihlerinizi istediğiniz zaman ayarlayabilirsiniz.' },
    { h: '6. Değişiklikler', p: 'Bu politikayı güncellediğimizde size e-posta ile haber veririz. 30 gün içinde yeni şartlar yürürlüğe girer.' },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '72px 48px 20px' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Yasal</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 64, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#737373', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginTop: 12 }}>{sub}</div>
      </div>
      <div style={{ padding: '40px 48px 80px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: 48, maxWidth: 1100 }}>
        <div style={{ position: 'sticky', top: 100, alignSelf: 'start' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase', marginBottom: 12 }}>İçindekiler</div>
          {sections.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: i === 0 ? '#0A0A0A' : '#525252', padding: '6px 0', fontWeight: i === 0 ? 600 : 400, borderLeft: i === 0 ? '2px solid #C6F24E' : '2px solid transparent', paddingLeft: 10 }}>{s.h}</div>
          ))}
        </div>
        <div>
          {sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 10 }}>{s.h}</div>
              <div style={{ fontSize: 15, color: '#525252', lineHeight: 1.7 }}>{s.p}</div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// 10) ONBOARDING · /baslangic
// ================================================================
function OnboardingPage() {
  const { Lockup } = PB6();
  const { PlatformLogo } = PL();
  const steps = ['İşletme', 'Sektör', 'Konum', 'Platformlar', 'İlk QR'];
  const cur = 3;
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <div style={{ padding: '18px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EDEDED', background: '#fff' }}>
        <Lockup size="sm" color="#0A0A0A" accent="#C6F24E" />
        <div style={{ fontSize: 13, color: '#737373' }}>Daha sonra yapacağım · <span style={{ color: '#0A0A0A', fontWeight: 600 }}>Çıkış</span></div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '32px 48px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 720, margin: '0 auto' }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, margin: '0 auto', background: i <= cur ? '#C6F24E' : '#fff', border: '2px solid ' + (i <= cur ? '#0A0A0A' : '#E5E5E5'), color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>{i < cur ? '✓' : i+1}</div>
                <div style={{ fontSize: 11, color: i === cur ? '#0A0A0A' : '#737373', marginTop: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: i === cur ? 600 : 400 }}>{s}</div>
              </div>
              {i < steps.length - 1 && <div style={{ height: 2, flex: 0.6, background: i < cur ? '#0A0A0A' : '#E5E5E5' }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '40px 48px', maxWidth: 820, margin: '0 auto' }}>
        <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 18, padding: 40 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.16em', fontWeight: 600 }}>ADIM 4 / 5</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 500, letterSpacing: '-0.025em', marginTop: 6, lineHeight: 1.1 }}>
            Hangi platformları bağlamak istiyorsun?
          </div>
          <div style={{ fontSize: 14, color: '#737373', marginTop: 10 }}>
            Seçtiğin her platforma müşterilerin yönlendirilecek. Daha sonra değiştirebilirsin.
          </div>

          <div style={{ marginTop: 30 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Yorum platformları</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { id: 'google', n: 'Google', active: true },
                { id: 'foursquare', n: 'Foursquare', active: false },
                { id: 'facebook', n: 'Facebook', active: true },
              ].map(p => (
                <div key={p.id} style={{ padding: 14, border: '2px solid ' + (p.active ? '#0A0A0A' : '#E5E5E5'), borderRadius: 12, background: p.active ? '#EAF9B8' : '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PlatformLogo id={p.id} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.n}</div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: 999, background: p.active ? '#0A0A0A' : '#fff', border: '2px solid ' + (p.active ? '#0A0A0A' : '#A3A3A3'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C6F24E', fontSize: 10, fontWeight: 700 }}>{p.active ? '✓' : ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Paket servis <span style={{ color: '#C6F24E', marginLeft: 6 }}>· Restoran için önerilir</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { id: 'yemeksepeti', n: 'Yemeksepeti', active: true },
                { id: 'getir-yemek', n: 'Getir Yemek', active: true },
                { id: 'trendyol-go', n: 'Trendyol GO', active: false },
              ].map(p => (
                <div key={p.id} style={{ padding: 14, border: '2px solid ' + (p.active ? '#0A0A0A' : '#E5E5E5'), borderRadius: 12, background: p.active ? '#EAF9B8' : '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PlatformLogo id={p.id} size={32} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.n}</div>
                  </div>
                  <div style={{ width: 18, height: 18, borderRadius: 999, background: p.active ? '#0A0A0A' : '#fff', border: '2px solid ' + (p.active ? '#0A0A0A' : '#A3A3A3'), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C6F24E', fontSize: 10, fontWeight: 700 }}>{p.active ? '✓' : ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 36, display: 'flex', justifyContent: 'space-between', paddingTop: 24, borderTop: '1px solid #EDEDED' }}>
            <div style={{ padding: '12px 22px', border: '1px solid #E5E5E5', borderRadius: 999, fontSize: 14, fontWeight: 500 }}>← Geri</div>
            <div style={{ padding: '12px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 14, fontWeight: 500 }}>Devam et → İlk QR'ını oluştur</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 11) ROI CALCULATOR · /roi
// ================================================================
function ROICalculatorPage() {
  const { SiteNav, SiteFooter } = S3();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="pricing" />
      <div style={{ padding: '72px 48px 40px' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>ROI hesaplayıcı</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12, maxWidth: 900 }}>
          Buaze sizi ne kadar <span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>kazandırır?</span>
        </div>
      </div>
      <div style={{ padding: '20px 48px 80px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40 }}>
        {/* Sliders */}
        <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 18, padding: 32 }}>
          {[
            { l: 'Günlük müşteri sayısı', v: '180', max: 500 },
            { l: 'Ortalama sepet tutarı (TL)', v: '340', max: 1500 },
            { l: 'Mevcut Google puanı', v: '4.2', max: 5 },
            { l: 'Aylık yorum sayısı', v: '24', max: 500 },
          ].map((s, i) => (
            <div key={s.l} style={{ padding: '18px 0', borderTop: i === 0 ? 'none' : '1px solid #EDEDED' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, color: '#0A0A0A' }}>{s.v}</div>
              </div>
              <div style={{ position: 'relative', height: 6, background: '#E5E5E5', borderRadius: 999 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: 6, width: (parseFloat(s.v) / s.max * 100) + '%', background: '#C6F24E', borderRadius: 999 }} />
                <div style={{ position: 'absolute', left: `calc(${parseFloat(s.v) / s.max * 100}% - 10px)`, top: -6, width: 18, height: 18, background: '#0A0A0A', borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Result */}
        <div style={{ background: '#0A0A0A', color: '#fff', borderRadius: 18, padding: 36, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.14em' }}>12 AY SONRA</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 96, fontWeight: 500, letterSpacing: '-0.04em', lineHeight: 0.9, color: '#C6F24E', marginTop: 14 }}>
              ₺340K
            </div>
            <div style={{ fontSize: 15, color: '#D4D4D4', marginTop: 10 }}>ek gelir (tahmini)</div>
          </div>

          <div style={{ marginTop: 24, padding: '20px 0', borderTop: '1px solid #1F1F1F', borderBottom: '1px solid #1F1F1F' }}>
            {[
              { l: 'Yeni yorumlar', v: '+2.840' },
              { l: 'Google puanınız', v: '4.2 → 4.7' },
              { l: 'Yeni müşteri', v: '+1.120/ay' },
              { l: 'Buaze yatırımı', v: '₺24K/yıl' },
              { l: 'Net kazanç', v: '₺316K' },
            ].map((r, i) => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span style={{ color: i === 4 ? '#C6F24E' : '#A3A3A3', fontWeight: i === 4 ? 600 : 400 }}>{r.l}</span>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: i === 4 ? '#C6F24E' : '#fff' }}>{r.v}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 20px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, textAlign: 'center', fontWeight: 600, marginTop: 20 }}>Hemen başla →</div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// 12) ADMIN: CAMPAIGNS, TEAM, BILLING, NOTIFICATIONS
// ================================================================
function AdminCampaigns() {
  const { Lockup } = PB6();
  const camps = [
    { n: 'Akşam yemeği QR · Masa 1-12', s: 'Aktif', r: '+184', ctr: '%42', col: '#C6F24E' },
    { n: 'Paket servis — Yemeksepeti', s: 'Aktif', r: '+62', ctr: '%38', col: '#EAF9B8' },
    { n: 'Özel etkinlik — 14 Şubat', s: 'Tamamlandı', r: '+28', ctr: '%51', col: '#F5F5F5' },
    { n: 'Yeni menü lansman · A/B', s: 'Beta', r: '+12', ctr: '%29', col: '#F5F5F5' },
  ];
  return (
    <div style={{ background: '#FAFAFA', display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebarMini active="campaigns" />
      <div>
        <AdminTopBar title="Kampanyalar" />
        <div style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Kampanyalar</div>
              <div style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>QR kampanyalarını ve A/B testlerini yönet</div>
            </div>
            <div style={{ padding: '10px 18px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>+ Yeni kampanya</div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { l: 'Aktif kampanya', v: '8' },
              { l: 'Toplam tarama', v: '18.4K' },
              { l: 'Yorum dönüşüm', v: '%42' },
              { l: 'En iyi performans', v: 'Akşam QR' },
            ].map(k => (
              <div key={k.l} style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 12, padding: 18 }}>
                <div style={{ fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>{k.l}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6 }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr auto', gap: 16, padding: '14px 20px', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '2px solid #0A0A0A' }}>
              <div>Kampanya</div><div>Durum</div><div>Yorum</div><div>Dönüşüm</div><div>Platform</div><div></div>
            </div>
            {camps.map((c, i) => (
              <div key={c.n} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr 1fr auto', gap: 16, padding: '18px 20px', borderBottom: i === camps.length - 1 ? 'none' : '1px solid #EDEDED', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 8, height: 40, background: c.col, borderRadius: 4 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{c.n}</div>
                    <div style={{ fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>Oluşturuldu 2 hf önce</div>
                  </div>
                </div>
                <div><span style={{ padding: '3px 10px', background: c.s === 'Aktif' ? '#EAF9B8' : c.s === 'Beta' ? '#FEF3C7' : '#F5F5F5', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{c.s}</span></div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600 }}>{c.r}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600 }}>{c.ctr}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: '#C6F24E' }} />
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: '#0A0A0A' }} />
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: '#FA0050' }} />
                </div>
                <div style={{ fontSize: 20, color: '#737373' }}>⋯</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminTeam() {
  const members = [
    { n: 'Emre Kaya', r: 'Admin', e: 'emre@arkbistro.com', i: 'EK', c: '#C6F24E', status: 'Çevrimiçi' },
    { n: 'Zeynep Aydın', r: 'Manager', e: 'zeynep@arkbistro.com', i: 'ZA', c: '#EAF9B8', status: 'Çevrimiçi' },
    { n: 'Mert Yılmaz', r: 'Staff', e: 'mert@arkbistro.com', i: 'MY', c: '#F5F5F5', status: '2 sa önce' },
    { n: 'Selin Demir', r: 'Staff', e: 'selin@arkbistro.com', i: 'SD', c: '#F5F5F5', status: 'Dün' },
    { n: 'Ahmet Öz', r: 'Viewer', e: 'ahmet@arkbistro.com', i: 'AÖ', c: '#F5F5F5', status: 'Davet beklemede' },
  ];
  return (
    <div style={{ background: '#FAFAFA', display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebarMini active="team" />
      <div>
        <AdminTopBar title="Ekip" />
        <div style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Ekip üyeleri</div>
              <div style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>5 aktif · 1 bekleyen davet</div>
            </div>
            <div style={{ padding: '10px 18px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>+ Davet et</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, overflow: 'hidden' }}>
            {members.map((m, i) => (
              <div key={m.e} style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1fr 1.5fr 1fr auto', gap: 16, padding: '16px 20px', alignItems: 'center', borderBottom: i === members.length - 1 ? 'none' : '1px solid #EDEDED' }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, background: m.c, color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>{m.i}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.n}</div>
                  <div style={{ fontSize: 12, color: '#737373' }}>{m.e}</div>
                </div>
                <div><span style={{ padding: '3px 10px', background: m.r === 'Admin' ? '#0A0A0A' : '#F5F5F5', color: m.r === 'Admin' ? '#C6F24E' : '#0A0A0A', borderRadius: 999, fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>{m.r.toUpperCase()}</span></div>
                <div style={{ fontSize: 12, color: m.status === 'Çevrimiçi' ? '#16A34A' : '#737373' }}>● {m.status}</div>
                <div style={{ fontSize: 12, color: '#737373' }}>Son giriş: Bugün</div>
                <div style={{ fontSize: 20, color: '#737373' }}>⋯</div>
              </div>
            ))}
          </div>

          {/* Roles */}
          <div style={{ marginTop: 32 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 500, marginBottom: 14 }}>Rol yetkileri</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {[
                { r: 'Admin', d: 'Tam erişim · fatura · ekip yönetimi', c: '#0A0A0A', fg: '#C6F24E' },
                { r: 'Manager', d: 'Yorumlar · QR · raporlar', c: '#C6F24E', fg: '#0A0A0A' },
                { r: 'Staff', d: 'Yorumlara yanıt ver', c: '#EAF9B8', fg: '#0A0A0A' },
                { r: 'Viewer', d: 'Sadece görüntüleme', c: '#F5F5F5', fg: '#0A0A0A' },
              ].map(r => (
                <div key={r.r} style={{ background: r.c, color: r.fg, borderRadius: 12, padding: 18 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600 }}>{r.r}</div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>{r.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminBilling() {
  return (
    <div style={{ background: '#FAFAFA', display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebarMini active="billing" />
      <div>
        <AdminTopBar title="Faturalandırma" />
        <div style={{ padding: '24px 32px' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 20 }}>Faturalandırma</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
            {/* Current plan */}
            <div style={{ background: '#0A0A0A', color: '#fff', borderRadius: 16, padding: 30 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.14em' }}>MEVCUT PLAN</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 10 }}>Growth</div>
              <div style={{ fontSize: 14, color: '#A3A3A3', marginTop: 10 }}>3 konum · 4 ekip üyesi · AI Co-Pilot dahil</div>
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #1F1F1F' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.02em', color: '#C6F24E' }}>₺2.400</div>
                  <div style={{ fontSize: 13, color: '#A3A3A3' }}>/ ay · yıllık ödeme</div>
                </div>
                <div style={{ fontSize: 12, color: '#A3A3A3', marginTop: 4 }}>Bir sonraki fatura: 14 Mayıs 2026</div>
              </div>
              <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
                <div style={{ padding: '10px 18px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>Planı yükselt</div>
                <div style={{ padding: '10px 18px', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 13 }}>Planı değiştir</div>
              </div>
            </div>

            {/* Payment method */}
            <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 16, padding: 24 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Ödeme yöntemi</div>
              <div style={{ marginTop: 14, padding: 16, background: '#FAFAFA', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 26, background: 'linear-gradient(135deg, #1A1F71, #0E4C97)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>VISA</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>•••• 4242</div>
                  <div style={{ fontSize: 11, color: '#737373' }}>Son kullanma 08/28</div>
                </div>
                <div style={{ fontSize: 12, color: '#0A0A0A' }}>Güncelle</div>
              </div>
              <div style={{ marginTop: 16, padding: '10px 0', borderTop: '1px solid #EDEDED' }}>
                <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.14em', color: '#737373' }}>FATURA ADRESİ</div>
                <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>
                  Ark Gıda A.Ş.<br/>
                  Maslak Mah. Büyükdere Cad. No:255<br/>
                  Sarıyer / İstanbul
                </div>
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div style={{ marginTop: 24, background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #EDEDED', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16 }}>Faturalar</div>
            {[
              { d: '14 Nis 2026', n: 'INV-2026-04', a: '₺2.400', s: 'Ödendi' },
              { d: '14 Mar 2026', n: 'INV-2026-03', a: '₺2.400', s: 'Ödendi' },
              { d: '14 Şub 2026', n: 'INV-2026-02', a: '₺2.400', s: 'Ödendi' },
              { d: '14 Oca 2026', n: 'INV-2026-01', a: '₺2.400', s: 'Ödendi' },
            ].map((inv, i) => (
              <div key={inv.n} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 16, padding: '14px 20px', fontSize: 13, borderTop: i === 0 ? 'none' : '1px solid #EDEDED', alignItems: 'center' }}>
                <div style={{ color: '#737373' }}>{inv.d}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{inv.n}</div>
                <div style={{ fontWeight: 600 }}>{inv.a}</div>
                <div><span style={{ padding: '3px 10px', background: '#EAF9B8', color: '#0A0A0A', borderRadius: 999, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>{inv.s.toUpperCase()}</span></div>
                <div style={{ fontSize: 12, textAlign: 'right' }}>PDF indir ↓</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminNotifications() {
  const items = [
    { t: 'Yeni 1★ yorum · Kadıköy', d: '3 dk önce', p: 'google', tone: 'danger', txt: '"Servis çok yavaştı, yemek soğuk geldi."', atLabel: 'Hemen yanıtla' },
    { t: 'Yemeksepeti puanınız 4.5\'e yükseldi', d: '1 sa önce', p: 'yemeksepeti', tone: 'success', txt: 'Son 7 günde +14 yeni yorum geldi.', atLabel: 'Raporu gör' },
    { t: 'Zeynep 3 yorumu size atadı', d: '2 sa önce', p: null, tone: 'neutral', txt: '"Bu sizin konu" notuyla.', atLabel: 'Gelen kutusuna git' },
    { t: 'Faturanız hazırlandı', d: 'Dün', p: null, tone: 'neutral', txt: 'INV-2026-04 · ₺2.400', atLabel: 'İndir' },
    { t: 'Getir Yemek entegrasyonu onaylandı', d: '2 gün önce', p: 'getir-yemek', tone: 'success', txt: 'Artık Getir yorumları otomatik senkron.', atLabel: 'Ayarla' },
  ];
  const { PlatformLogo } = PL();
  return (
    <div style={{ background: '#FAFAFA', display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      <AdminSidebarMini active="notif" />
      <div>
        <AdminTopBar title="Bildirimler" />
        <div style={{ padding: '24px 32px', maxWidth: 780 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Bildirimler</div>
            <div style={{ fontSize: 13, color: '#737373' }}>Tümünü okundu olarak işaretle</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['Tümü · 12', 'Yorum · 5', 'Ekip · 3', 'Sistem · 2', 'Fatura · 2'].map((f, i) => (
              <div key={f} style={{ padding: '6px 14px', borderRadius: 999, border: '1px solid ' + (i === 0 ? '#0A0A0A' : '#EDEDED'), background: i === 0 ? '#0A0A0A' : '#fff', color: i === 0 ? '#fff' : '#0A0A0A', fontSize: 12, fontWeight: 500 }}>{f}</div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, overflow: 'hidden' }}>
            {items.map((n, i) => (
              <div key={i} style={{ padding: '18px 20px', borderBottom: i === items.length - 1 ? 'none' : '1px solid #EDEDED', display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 14, alignItems: 'flex-start' }}>
                <div>
                  {n.p ? <PlatformLogo id={n.p} size={40} rounded={10} /> :
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: n.tone === 'danger' ? '#FEE2E2' : n.tone === 'success' ? '#EAF9B8' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>●</div>
                  }
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{n.t}</div>
                    <div style={{ fontSize: 11, color: '#737373' }}>{n.d}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#525252', marginTop: 4, fontStyle: n.txt.startsWith('"') ? 'italic' : 'normal' }}>{n.txt}</div>
                  <div style={{ marginTop: 10, padding: '6px 14px', display: 'inline-block', background: n.tone === 'danger' ? '#0A0A0A' : '#F5F5F5', color: n.tone === 'danger' ? '#C6F24E' : '#0A0A0A', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>{n.atLabel} →</div>
                </div>
                <div />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin mini-sidebar + topbar — yeni admin sayfaları için
function AdminSidebarMini({ active }) {
  const { Lockup } = PB6();
  const items = [
    { k: 'overview', l: 'Genel bakış', i: '◉' },
    { k: 'reviews', l: 'Yorumlar', i: '❝' },
    { k: 'qr', l: 'QR Kodlar', i: '▦' },
    { k: 'analytics', l: 'Analitik', i: '◐' },
    { k: 'locations', l: 'Konumlar', i: '◈' },
    { k: 'campaigns', l: 'Kampanyalar', i: '✦' },
    { k: 'team', l: 'Ekip', i: '◎' },
    { k: 'notif', l: 'Bildirimler', i: '◔', b: 12 },
    { k: 'billing', l: 'Faturalandırma', i: '$' },
    { k: 'settings', l: 'Ayarlar', i: '⚙' },
  ];
  return (
    <div style={{ background: '#0A0A0A', color: '#fff', padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ padding: '0 6px 20px' }}><Lockup size="sm" color="#fff" accent="#C6F24E" /></div>
      {items.map(it => (
        <div key={it.k} style={{ padding: '10px 12px', borderRadius: 8, background: active === it.k ? '#C6F24E' : 'transparent', color: active === it.k ? '#0A0A0A' : '#A3A3A3', fontSize: 13, fontWeight: active === it.k ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><span style={{ display: 'inline-block', width: 20, opacity: 0.7 }}>{it.i}</span>{it.l}</span>
          {it.b && <span style={{ padding: '1px 7px', background: active === it.k ? '#0A0A0A' : '#C6F24E', color: active === it.k ? '#C6F24E' : '#0A0A0A', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{it.b}</span>}
        </div>
      ))}
    </div>
  );
}
function AdminTopBar({ title }) {
  return (
    <div style={{ background: '#fff', borderBottom: '1px solid #EDEDED', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 13, color: '#737373' }}>{title}</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ padding: '6px 14px', border: '1px solid #E5E5E5', borderRadius: 999, fontSize: 12, color: '#737373', fontFamily: "'JetBrains Mono', monospace" }}>⌘K</div>
        <div style={{ width: 32, height: 32, borderRadius: 999, background: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>EK</div>
      </div>
    </div>
  );
}

window.SitePages3 = {
  DeliverySolutionPage, InternationalHomePage, FeaturesPage, IntegrationsPage,
  CustomerStoriesPage, FAQPage, CareersPage, HelpCenterPage, LegalPage,
  OnboardingPage, ROICalculatorPage,
  AdminCampaigns, AdminTeam, AdminBilling, AdminNotifications,
};
