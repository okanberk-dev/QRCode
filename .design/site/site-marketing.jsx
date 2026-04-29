// Marketing sayfaları: Home, Pricing, How It Works, Solutions, QR Generator, About, Contact, Blog

const S = () => window.BuazeSite;
const PB4 = () => window.PulseBrand;

// ============== HOMEPAGE ==============
function HomePage() {
  const { SiteNav, SiteFooter, IllusLighthouse, IllusCompass, IllusInbox, IllusChart, IllusShield, IllusMountain } = S();
  const { Symbol, Lockup } = PB4();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="home" />

      {/* HERO */}
      <div style={{ padding: '80px 48px 60px', display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 48, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
          <defs>
            <pattern id="hgrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDEDED" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hgrid)" />
        </svg>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: '6px 12px', background: '#EAF9B8', borderRadius: 999 }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#0A0A0A', letterSpacing: '0.12em', textTransform: 'uppercase' }}>2.400+ işletme kullanıyor</span>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 80, fontWeight: 500, lineHeight: 0.92, letterSpacing: '-0.04em', color: '#0A0A0A' }}>
            İtibarınızı<br/>bir <span style={{ background: '#C6F24E', padding: '0 12px', borderRadius: 8 }}>nabız</span> gibi<br/>izleyin.
          </div>
          <div style={{ fontSize: 18, lineHeight: 1.55, color: '#525252', maxWidth: 520 }}>
            QR ile gerçek müşterilerden geri bildirim toplayın, yorumları tek panelden yönetin, Google politikalarına uyumlu şekilde itibarınızı büyütün.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>14 gün ücretsiz başla →</div>
            <div style={{ padding: '14px 22px', border: '1px solid #0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>▶ Demo izle (2 dk)</div>
          </div>
          <div style={{ display: 'flex', gap: 18, paddingTop: 14, color: '#737373', fontSize: 12 }}>
            <span>✓ Kredi kartı gerekmez</span>
            <span>✓ 5 dakikada kurulum</span>
            <span>✓ Türkçe destek</span>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <IllusLighthouse size={340} />
        </div>
      </div>

      {/* LOGO STRIP */}
      <div style={{ padding: '30px 48px', borderTop: '1px solid #EDEDED', borderBottom: '1px solid #EDEDED', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Güvenen markalar</div>
        {['ARK BISTRO', 'HOTEL NORA', 'DERMA+', 'LAW&CO', 'KAHVE DUKKAN', 'SPA REN'].map(b => (
          <div key={b} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 500, color: '#A3A3A3', letterSpacing: '-0.01em' }}>{b}</div>
        ))}
      </div>

      {/* 3 STEPS — Editorial */}
      <ThreeStepsEditorial />

      {/* FEATURE — BIG IMAGE LEFT */}
      <div style={{ padding: '60px 48px', background: '#0A0A0A', color: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 18, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#A3A3A3', letterSpacing: '0.14em' }}>CANLI AKIŞ</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A' }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#A3A3A3' }}>LIVE</span>
              </div>
            </div>
            <svg viewBox="0 0 400 120" style={{ width: '100%', height: 100 }}>
              <path d="M0 90 L40 85 L80 70 L120 75 L160 50 L200 55 L240 30 L280 40 L320 22 L360 30 L400 12" fill="none" stroke="#C6F24E" strokeWidth="2.5" />
              {[40,80,120,160,200,240,280,320,360].map((x, i) => <circle key={x} cx={x} cy={[85,70,75,50,55,30,40,22,30][i]} r="3" fill="#C6F24E" />)}
            </svg>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { n: 'M. Demir', t: 'Servis harikaydı!', s: 5 },
                { n: 'A. Yılmaz', t: 'Kahvesi çok iyi.', s: 5 },
                { n: 'Z. Öztürk', t: 'Bekleme uzundu.', s: 2 },
              ].map((r, i) => (
                <div key={i} style={{ background: '#0A0A0A', borderRadius: 10, padding: 12, display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #333' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 999, background: r.s === 5 ? '#C6F24E' : '#333', color: r.s === 5 ? '#0A0A0A' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 11 }}>{r.n.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{r.n}</div>
                    <div style={{ fontSize: 11, color: '#A3A3A3' }}>{r.t}</div>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E' }}>{'★'.repeat(r.s)}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Merkezi yönetim</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.03em', marginTop: 10 }}>
              Her yorum,<br/>tek bir <span style={{ color: '#C6F24E' }}>panelde</span>.
            </div>
            <div style={{ fontSize: 16, color: '#A3A3A3', marginTop: 18, maxWidth: 440, lineHeight: 1.6 }}>
              Google, Tripadvisor, Yandex, Zomato — tüm platformlardaki yorumlar Buaze'de buluşur. Olumsuzu önce sen gör, kriz büyümeden çöz.
            </div>
            <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {['Otomatik etiketleme', 'Duygu analizi (AI)', 'Takım atama', 'SLA takibi'].map(x => (
                <div key={x} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#D4D4D4' }}>
                  <div style={{ width: 16, height: 16, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>✓</div>
                  {x}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FEATURE — BIG IMAGE RIGHT */}
      <div style={{ padding: '80px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Google güvenli</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 52, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.03em', marginTop: 10 }}>
              Politikalara uyumlu.<br/>Organik büyüme.
            </div>
            <div style={{ fontSize: 16, color: '#525252', marginTop: 18, maxWidth: 440, lineHeight: 1.6 }}>
              Google'ın yorum kurallarını ezbere biliyoruz. Hiçbir kampanyamız "gerçekdışı teşvik" tuzağına düşmez. Kazandıran: gerçek müşteri, gerçek yorum.
            </div>
            <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { n: '01', t: 'Tercih gönderimi', d: 'QR müşteriyi önce gerçek geri bildirime yönlendirir.' },
                { n: '02', t: 'Şeffaf akış', d: 'Negatif yorumları süzmez; içeride çözüme aktarır.' },
                { n: '03', t: 'Kural motoru', d: 'Her kampanya Google politikasına göre otomatik denetlenir.' },
              ].map(x => (
                <div key={x.n} style={{ display: 'flex', gap: 14, paddingBottom: 12, borderBottom: '1px solid #EDEDED' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', minWidth: 24 }}>{x.n}</div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>{x.t}</div>
                    <div style={{ fontSize: 13, color: '#737373', marginTop: 2 }}>{x.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <IllusShield size={300} />
          </div>
        </div>
      </div>

      {/* SOLUTIONS GRID */}
      <div style={{ padding: '60px 48px', background: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 40px' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sektörler</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 10 }}>Her sektör için, tam oturur.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { e: 'Restoran & Kafe', s: '1.200+ mekan' },
            { e: 'Otel', s: '340+ konaklama' },
            { e: 'Klinik & Muayenehane', s: '520+ sağlık' },
            { e: 'Hukuk Ofisi', s: '180+ ofis' },
            { e: 'Güzellik & Spa', s: '410+ salon' },
            { e: 'Perakende', s: '260+ mağaza' },
            { e: 'Spor & Fitness', s: '140+ tesis' },
            { e: 'Eğitim', s: '90+ kurum' },
          ].map(x => (
            <div key={x.e} style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: '#EAF9B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Symbol size={22} />
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 600 }}>{x.e}</div>
              <div style={{ fontSize: 12, color: '#737373' }}>{x.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS + CASE STUDY */}
      <div style={{ padding: '80px 48px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <IllusMountain size={340} />
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Vaka · Kadıköy Bistro</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 10 }}>
            90 günde <span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>+184%</span><br/>organik yorum.
          </div>
          <div style={{ fontSize: 15, color: '#525252', marginTop: 18, lineHeight: 1.6, maxWidth: 480 }}>
            "Masalara QR koyduk. İlk ay içinde Google ortalamamız 4.2'den 4.8'e çıktı. Artık müşteri yorumunu bekleyecek vakit harcamıyoruz — sistem kendi kendine çalışıyor."
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>EK</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Emre Kaya</div>
              <div style={{ fontSize: 11, color: '#737373' }}>Kadıköy Bistro · Kurucu</div>
            </div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 24 }}>
            {[
              { k: '4.2 → 4.8', l: 'Google ort.' },
              { k: '+184%', l: 'Yorum/ay' },
              { k: '12 dk', l: 'Yanıt' },
            ].map(x => (
              <div key={x.l} style={{ borderTop: '2px solid #0A0A0A', paddingTop: 8 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>{x.k}</div>
                <div style={{ fontSize: 11, color: '#737373' }}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING TEASER */}
      <div style={{ padding: '60px 48px', background: '#C6F24E', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', color: '#0A0A0A', lineHeight: 1 }}>
          Bugün başla,<br/>ilk yorumunu yarın al.
        </div>
        <div style={{ marginTop: 18, fontSize: 16, color: '#0A0A0A', opacity: 0.7 }}>14 gün ücretsiz deneme · Kredi kartı gerekmez · İstediğinde vazgeç</div>
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <div style={{ padding: '16px 28px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 600 }}>Ücretsiz başla →</div>
          <div style={{ padding: '16px 28px', background: 'transparent', color: '#0A0A0A', border: '2px solid #0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 600 }}>Fiyatlara bak</div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ============== PRICING ==============
function PricingPage() {
  const { SiteNav, SiteFooter } = S();
  const { Symbol } = PB4();
  const plans = [
    { n: 'Starter', p: '₺0', per: 'sonsuza kadar', d: 'Küçük tek işletmeler için', cta: 'Ücretsiz başla', accent: false, feats: ['1 işletme', '50 yorum/ay', 'Temel QR oluşturucu', 'Google entegrasyonu', 'E-posta desteği'] },
    { n: 'Growth', p: '₺890', per: 'ay · yıllık', d: 'Büyüyen işletmeler için', cta: '14 gün dene', accent: true, feats: ['5 işletme', 'Sınırsız yorum', 'Gelişmiş QR + özel tasarım', 'Tüm platform entegrasyonları', 'AI duygu analizi', 'Canlı dashboard', 'Öncelikli destek'] },
    { n: 'Scale', p: '₺2.490', per: 'ay · yıllık', d: 'Zincirler ve kurumlar için', cta: 'Demo iste', accent: false, feats: ['Sınırsız işletme', 'SSO & takım rolleri', 'API & webhook\'lar', 'SLA takibi', 'Özel raporlar', 'Adanmış müşteri başarı yöneticisi'] },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="pricing" />

      <div style={{ padding: '80px 48px 40px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Fiyatlar</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1, marginTop: 12 }}>
          Basit. Şeffaf.<br/>Gizli ücret yok.
        </div>
        <div style={{ fontSize: 17, color: '#525252', marginTop: 18, maxWidth: 560, margin: '18px auto 0' }}>
          Her plan 14 gün ücretsiz. Kredi kartı istenmez. İstediğin zaman yükselt, düşür ya da iptal et.
        </div>
        <div style={{ marginTop: 24, display: 'inline-flex', background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 999, padding: 4 }}>
          <div style={{ padding: '8px 16px', fontSize: 13, color: '#737373' }}>Aylık</div>
          <div style={{ padding: '8px 16px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 500 }}>Yıllık · %20 indirim</div>
        </div>
      </div>

      <div style={{ padding: '20px 48px 80px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {plans.map(pl => (
          <div key={pl.n} style={{
            background: pl.accent ? '#0A0A0A' : '#FFFFFF',
            color: pl.accent ? '#fff' : '#0A0A0A',
            border: pl.accent ? 'none' : '1px solid #EDEDED',
            borderRadius: 18,
            padding: 32,
            position: 'relative',
            boxShadow: pl.accent ? '0 40px 80px -30px rgba(198,242,78,0.3)' : 'none',
          }}>
            {pl.accent && <div style={{ position: 'absolute', top: -12, left: 32, background: '#C6F24E', color: '#0A0A0A', padding: '4px 10px', borderRadius: 999, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em' }}>EN POPÜLER</div>}
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600 }}>{pl.n}</div>
            <div style={{ fontSize: 13, color: pl.accent ? '#A3A3A3' : '#737373', marginTop: 4 }}>{pl.d}</div>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em' }}>{pl.p}</span>
              <span style={{ fontSize: 13, color: pl.accent ? '#A3A3A3' : '#737373' }}>/ {pl.per}</span>
            </div>
            <div style={{ marginTop: 20, padding: '14px 18px', background: pl.accent ? '#C6F24E' : '#0A0A0A', color: '#0A0A0A', borderRadius: 999, textAlign: 'center', fontWeight: 500, fontSize: 14, ...(pl.accent ? {} : { color: '#fff' }) }}>{pl.cta}</div>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pl.feats.map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                  <div style={{ width: 16, height: 16, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, marginTop: 2, flexShrink: 0 }}>✓</div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ padding: '0 48px 80px' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>SSS</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', marginTop: 10 }}>Sorularınız var, cevaplarımız hazır.</div>
        <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { q: 'Kredi kartı gerekiyor mu?', a: 'Hayır. 14 gün ücretsiz deneme için kredi kartı istemiyoruz.' },
            { q: 'Plan değiştirebilir miyim?', a: 'Her an yükseltebilir ya da düşürebilirsiniz. Faturalandırma günlük bazda hesaplanır.' },
            { q: 'Yorum sayısı limitini aşarsam?', a: 'Bildirim alırsınız, akışınız kesilmez. Üst plana geçmek için size yazıyoruz.' },
            { q: 'Google politikalarına uyumlu mu?', a: 'Evet. Akışımız Google "fake review" kurallarının tamamına uygun; bunu garanti ediyoruz.' },
            { q: 'İptal edebilir miyim?', a: 'İstediğiniz anda, tek tıkla. Kullanmadığınız dönem için iade alırsınız.' },
            { q: 'Türkçe destek var mı?', a: 'Evet — Türkçe canlı destek, 7/24 yardım merkezi ve Türkçe eğitim içerikleri.' },
          ].map(f => (
            <div key={f.q} style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, padding: 20 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {f.q}
                <span style={{ fontSize: 18, color: '#C6F24E' }}>+</span>
              </div>
              <div style={{ fontSize: 13, color: '#525252', marginTop: 8, lineHeight: 1.5 }}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ============== HOW IT WORKS ==============
function HowItWorksPage() {
  const { SiteNav, SiteFooter, IllusCompass, IllusInbox, IllusChart, IllusShield } = S();
  const steps = [
    { n: '01', t: 'QR kodunu yerleştir', d: 'Sihirbazla 3 dakikada özel markan ile QR kart tasarla. Masaya, faturaya ya da kapıya yapıştır. Her konum ve personel için farklı kod oluştur.', illus: <IllusCompass size={280} />, side: 'right' },
    { n: '02', t: 'Müşteri yorum bırakır', d: 'Müşteri kodu tarar, bir formda 1-5 puan ve kısa bir not bırakır. Memnunsa Google\'a yönlenir, değilse ekibine iletilir — kriz büyümeden çözülür.', illus: <IllusInbox size={280} />, side: 'left' },
    { n: '03', t: 'Panelden yönet', d: 'Tüm yorumları tek panelde topla. AI etiketleme, olumsuzları otomatik atar. Yanıt şablonları ile saniyeler içinde cevap ver.', illus: <IllusShield size={260} />, side: 'right' },
    { n: '04', t: 'Canlı analizle izle', d: 'NPS skorun, Google puan değişimin, personel performansın — hepsi canlı dashboard\'da. Haftalık rapor e-postana düşer.', illus: <IllusChart size={280} />, side: 'left' },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="how" />

      <div style={{ padding: '80px 48px 40px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Nasıl çalışır</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1, marginTop: 12 }}>
          5 dakikada kurulum.<br/>Ömür boyu ritim.
        </div>
      </div>

      <div style={{ padding: '40px 48px 80px' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, background: '#EDEDED', transform: 'translateX(-50%)' }} />
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 32, alignItems: 'center', padding: '40px 0', position: 'relative' }}>
              {s.side === 'left' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{s.illus}</div>
                  <div style={{ position: 'relative', padding: '0 40px' }}>
                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 60, height: 60, borderRadius: 999, background: '#C6F24E', border: '4px solid #fff', boxShadow: '0 0 0 2px #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>{s.n}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1 }}>{s.t}</div>
                    <div style={{ fontSize: 15, color: '#525252', marginTop: 14, lineHeight: 1.6 }}>{s.d}</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1 }}>{s.t}</div>
                    <div style={{ fontSize: 15, color: '#525252', marginTop: 14, lineHeight: 1.6 }}>{s.d}</div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 60, height: 60, borderRadius: 999, background: '#C6F24E', border: '4px solid #fff', boxShadow: '0 0 0 2px #0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>{s.n}</div>
                  </div>
                  <div>{s.illus}</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ============== SOLUTIONS (Restoran & Kafe detay) ==============
function SolutionPage() {
  const { SiteNav, SiteFooter } = S();
  const { Symbol } = PB4();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="solutions" />

      <div style={{ padding: '72px 48px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 40, alignItems: 'center', background: '#FAFAFA' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600 }}>ÇÖZÜM · RESTORAN & KAFE</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 68, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Masanın sesi,<br/>Google'da.
          </div>
          <div style={{ fontSize: 17, color: '#525252', marginTop: 18, maxWidth: 520, lineHeight: 1.55 }}>
            Masaya QR koy, ilk hafta Google yorumun 10 kat artsın. Memnun müşteriyi Google'a, memnun olmayanı ekibine yönlendiriyoruz. 1.200+ restoran ve kafe Buaze'i tercih ediyor.
          </div>
          <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Ücretsiz dene →</div>
            <div style={{ padding: '14px 22px', border: '1px solid #0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Demo iste</div>
          </div>
        </div>
        {/* Illustration: restaurant table with QR */}
        <svg viewBox="0 0 320 280" style={{ width: '100%', maxWidth: 420 }}>
          {/* Table top */}
          <ellipse cx="160" cy="180" rx="140" ry="30" fill="#0A0A0A" />
          <ellipse cx="160" cy="175" rx="140" ry="30" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
          {/* Legs */}
          <path d="M110 190 L100 260 M210 190 L220 260" stroke="#0A0A0A" strokeWidth="3" />
          {/* QR stand */}
          <rect x="140" y="80" width="60" height="95" rx="4" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
          <rect x="148" y="90" width="44" height="44" fill="#0A0A0A" rx="3" />
          {[[0,0],[1,0],[3,0],[0,1],[2,1],[3,1],[0,3],[2,3],[1,2],[3,2]].map(([x,y], i) => (
            <rect key={i} x={150 + x*9} y={92 + y*9} width="7" height="7" fill="#C6F24E" />
          ))}
          <text x="170" y="152" textAnchor="middle" fontFamily="Space Grotesk" fontSize="9" fontWeight="600" fill="#0A0A0A">TARA</text>
          <text x="170" y="164" textAnchor="middle" fontFamily="Space Grotesk" fontSize="7" fill="#737373">buaze.com</text>
          {/* Coffee cup */}
          <ellipse cx="70" cy="165" rx="20" ry="6" fill="#0A0A0A" />
          <path d="M55 160 L55 145 Q55 140 60 140 L80 140 Q85 140 85 145 L85 160 Z" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
          <path d="M85 146 Q92 146 92 152 Q92 158 85 158" fill="none" stroke="#0A0A0A" strokeWidth="2" />
          <path d="M62 132 Q65 125 68 132 M72 132 Q75 125 78 132" stroke="#A3A3A3" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          {/* Plate */}
          <ellipse cx="250" cy="165" rx="30" ry="8" fill="#EDEDED" />
          <ellipse cx="250" cy="163" rx="30" ry="8" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2" />
          {/* Pulse bubble */}
          <path d="M220 15 Q220 5 230 5 L290 5 Q300 5 300 15 L300 45 Q300 55 290 55 L260 55 L250 65 L250 55 L230 55 Q220 55 220 45 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
          <text x="260" y="34" textAnchor="middle" fontFamily="Inter" fontSize="13" fontWeight="700" fill="#0A0A0A">★★★★★</text>
        </svg>
      </div>

      {/* BENEFITS */}
      <div style={{ padding: '72px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { k: '+184%', l: 'Organik Google yorum artışı', d: 'İlk 90 gün ortalaması' },
            { k: '4.8 / 5', l: 'Ortalama Google puanı', d: 'Buaze kullanıcılarının' },
            { k: '12 dk', l: 'Ortalama yanıt süresi', d: 'Takım atama sonrası' },
          ].map(x => (
            <div key={x.l} style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 14, padding: 28 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>{x.k}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginTop: 10 }}>{x.l}</div>
              <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>{x.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* USE CASES */}
      <div style={{ padding: '0 48px 80px' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 24 }}>Restoranın her noktasında, bir nabız.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { t: 'Masa QR', d: 'Her masa için özel kod — masa numarasıyla eşleştir.' },
            { t: 'Fatura QR', d: 'Fiş altına kod bas, ödeme sonrası yorum.' },
            { t: 'Kapıda veda', d: 'Kapıdaki stand, çıkışta son dokunuş.' },
            { t: 'Paket siparişte', d: 'Pakete stickerlı kart; evde yorum bırakır.' },
          ].map(x => (
            <div key={x.t} style={{ padding: 22, border: '1px solid #EDEDED', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Symbol size={32} />
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>{x.t}</div>
              <div style={{ fontSize: 13, color: '#525252', lineHeight: 1.55 }}>{x.d}</div>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

window.MarketingPages = { HomePage, PricingPage, HowItWorksPage, SolutionPage };
