// QR Generator, About, Contact, Blog + Auth pages

const S2 = () => window.BuazeSite;
const PB5 = () => window.PulseBrand;

// ============== QR GENERATOR PAGE ==============
function QRGeneratorPage() {
  const { SiteNav, SiteFooter } = S2();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />

      <div style={{ padding: '60px 48px 40px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Ücretsiz araç</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 68, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 1, marginTop: 12 }}>
          QR kod oluşturucu.
        </div>
        <div style={{ fontSize: 16, color: '#525252', marginTop: 14, maxWidth: 560, margin: '14px auto 0' }}>
          Hesap açmadan, ücretsiz, sınırsız QR kod üret. Markana göre özelleştir, PDF olarak indir.
        </div>
      </div>

      <div style={{ padding: '20px 48px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
        {/* FORM */}
        <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 18, padding: 32 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, marginBottom: 20 }}>1. Bilgilerini gir</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>İşletme adı</label>
              <div style={{ marginTop: 6, padding: '14px 16px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 15 }}>Ark Bistro</div>
            </div>
            <div>
              <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>Google yorum linki</label>
              <div style={{ marginTop: 6, padding: '14px 16px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14, fontFamily: "'JetBrains Mono', monospace", color: '#525252' }}>g.page/r/CZEa4X...</div>
            </div>
            <div>
              <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>Ön yazı</label>
              <div style={{ marginTop: 6, padding: '14px 16px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14, color: '#525252' }}>Deneyiminizi paylaşın</div>
            </div>
            <div>
              <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>Tasarım şablonu</label>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {['Beyaz', 'Lime', 'Koyu', 'Minimal'].map((t, i) => (
                  <div key={t} style={{ padding: '10px 8px', background: i === 1 ? '#C6F24E' : '#fff', border: i === 1 ? '2px solid #0A0A0A' : '1px solid #E5E5E5', borderRadius: 8, textAlign: 'center', fontSize: 12, fontWeight: 500 }}>{t}</div>
                ))}
              </div>
            </div>
            <div style={{ padding: '14px 20px', background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontSize: 15, fontWeight: 500, marginTop: 8 }}>QR kodu oluştur →</div>
          </div>
        </div>

        {/* PREVIEW */}
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600, marginBottom: 20 }}>2. Önizle ve indir</div>
          <div style={{ background: '#C6F24E', borderRadius: 18, padding: 40, aspectRatio: '3/4', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.2em', color: '#0A0A0A', opacity: 0.6 }}>ARK BISTRO</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 38, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 10, color: '#0A0A0A' }}>Deneyiminizi<br/>paylaşın.</div>
            </div>
            {/* QR */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 16 }}>
              <svg viewBox="0 0 100 100" width="160" height="160">
                <rect width="100" height="100" fill="#fff" />
                {Array.from({length: 144}).map((_, i) => {
                  const x = i % 12, y = Math.floor(i / 12);
                  const seed = (x * 31 + y * 17 + 7) % 10;
                  if (seed < 4) return null;
                  return <rect key={i} x={x*7 + 5} y={y*7 + 5} width="6" height="6" fill="#0A0A0A" />;
                })}
                {/* finders */}
                {[[5,5],[65,5],[5,65]].map(([fx,fy], i) => (
                  <g key={i}>
                    <rect x={fx} y={fy} width="22" height="22" fill="#fff" />
                    <rect x={fx} y={fy} width="22" height="22" fill="none" stroke="#0A0A0A" strokeWidth="4" />
                    <rect x={fx+7} y={fy+7} width="8" height="8" fill="#0A0A0A" />
                  </g>
                ))}
              </svg>
            </div>
            <div style={{ fontSize: 11, color: '#0A0A0A', opacity: 0.6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>BUAZE · TARA ✦ PAYLAŞ</div>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: '12px 18px', background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontSize: 13, fontWeight: 500 }}>PNG indir</div>
            <div style={{ padding: '12px 18px', border: '1px solid #0A0A0A', borderRadius: 999, textAlign: 'center', fontSize: 13, fontWeight: 500 }}>PDF olarak</div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ============== ABOUT ==============
function AboutPage() {
  const { SiteNav, SiteFooter, IllusLighthouse } = S2();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />

      <div style={{ padding: '80px 48px', display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Biz kimiz</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Her işletmenin<br/>bir <span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>nabzı</span> vardır.
          </div>
          <div style={{ fontSize: 17, color: '#525252', marginTop: 20, lineHeight: 1.6, maxWidth: 560 }}>
            2023'te İstanbul'da kurulduk. Küçük bir kafeyi büyütmeye çalışırken gördük: işletmelerin en değerli geri bildirimi hiçbir zaman duyulmuyor. Buaze bu sessizliği nabza çeviriyor.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <IllusLighthouse size={320} />
        </div>
      </div>

      <div style={{ padding: '40px 48px 80px', background: '#FAFAFA' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[
            { k: '2.400+', l: 'İşletme' },
            { k: '340K+', l: 'Aylık yorum' },
            { k: '28', l: 'Ülke' },
            { k: '4.9/5', l: 'Müşteri puanı' },
          ].map(x => (
            <div key={x.l} style={{ borderTop: '2px solid #0A0A0A', paddingTop: 14 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>{x.k}</div>
              <div style={{ fontSize: 13, color: '#737373', marginTop: 6 }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div style={{ padding: '80px 48px' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 32 }}>Değerlerimiz</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { n: '01', t: 'Şeffaflık', d: 'Yorum sahte olduğunda biz de söyleriz. Müşterinin sesi, müşterinin kalır.' },
            { n: '02', t: 'Hız', d: 'Kurulum 5 dk, ilk yorum aynı gün. Büyüme hızlı geri bildirime bağlı.' },
            { n: '03', t: 'Yerlilik', d: 'Türkçe destek, Türk işletmesinin gerçek problemleri. Biz de buradayız.' },
          ].map(v => (
            <div key={v.n} style={{ padding: 28, background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.16em', fontWeight: 600 }}>{v.n}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 10 }}>{v.t}</div>
              <div style={{ fontSize: 14, color: '#525252', marginTop: 10, lineHeight: 1.6 }}>{v.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div style={{ padding: '0 48px 80px' }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em', marginBottom: 32 }}>Takım</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {[
            { i: 'EK', n: 'Emre Kaya', r: 'Kurucu · CEO' },
            { i: 'ZA', n: 'Zeynep Aydın', r: 'Kurucu · CTO' },
            { i: 'MY', n: 'Mert Yılmaz', r: 'Ürün' },
            { i: 'SD', n: 'Selin Demir', r: 'Büyüme' },
          ].map(p => (
            <div key={p.i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ aspectRatio: '1', background: '#EAF9B8', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk', sans-serif", fontSize: 64, fontWeight: 500, color: '#0A0A0A', letterSpacing: '-0.04em' }}>{p.i}</div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>{p.n}</div>
                <div style={{ fontSize: 12, color: '#737373' }}>{p.r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

// ============== CONTACT ==============
function ContactPage() {
  const { SiteNav, SiteFooter } = S2();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '80px 48px', display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 48 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>İletişim</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 64, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Konuşalım.
          </div>
          <div style={{ fontSize: 16, color: '#525252', marginTop: 18, maxWidth: 440, lineHeight: 1.6 }}>
            Sorularınız, demo istekleri, ortaklık — hangisi olursa olsun, ortalama 2 saat içinde yanıt veriyoruz.
          </div>
          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              { l: 'Satış', v: 'satis@buaze.com', sub: 'Demo ve fiyatlandırma' },
              { l: 'Destek', v: 'destek@buaze.com', sub: '7/24 yanıt' },
              { l: 'Basın', v: 'basin@buaze.com', sub: 'Medya ve işbirliği' },
              { l: 'Adres', v: 'Maslak, İstanbul', sub: 'Workinton Maslak, Kat 4' },
            ].map(x => (
              <div key={x.l} style={{ paddingBottom: 16, borderBottom: '1px solid #EDEDED' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase' }}>{x.l}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, marginTop: 4 }}>{x.v}</div>
                <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>{x.sub}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 18, padding: 32 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 600 }}>Demo isteyin</div>
          <div style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>30 dk. canlı demo + ücretsiz kurulum danışmanlığı</div>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { l: 'Ad Soyad', v: 'Emre Kaya' },
              { l: 'İş e-postası', v: 'emre@arkbistro.com' },
              { l: 'Telefon', v: '+90 532 ***' },
              { l: 'İşletme', v: 'Ark Bistro' },
              { l: 'Sektör', v: 'Restoran & Kafe' },
            ].map(f => (
              <div key={f.l}>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>{f.l}</label>
                <div style={{ marginTop: 6, padding: '12px 14px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14 }}>{f.v}</div>
              </div>
            ))}
            <div>
              <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>Mesajınız</label>
              <div style={{ marginTop: 6, padding: '12px 14px', background: '#fff', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14, color: '#A3A3A3', minHeight: 80 }}>Örn: 3 şubemiz var, tümü için demo görmek istiyoruz.</div>
            </div>
            <div style={{ padding: '14px 20px', background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontSize: 15, fontWeight: 500, marginTop: 8 }}>Demo iste →</div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ============== BLOG LIST ==============
function BlogPage() {
  const { SiteNav, SiteFooter } = S2();
  const posts = [
    { cat: 'STRATEJİ', t: 'Google yorum politikaları 2026: yeni kurallar ve 7 ipucu', a: 'Emre Kaya', d: '14 Nis · 8 dk okuma', color: '#C6F24E' },
    { cat: 'VAKA', t: 'Kadıköy Bistro nasıl 90 günde 4.2\'den 4.8\'e çıktı?', a: 'Selin Demir', d: '10 Nis · 6 dk okuma', color: '#EAF9B8' },
    { cat: 'REHBER', t: 'QR kodunu doğru masaya koymanın 5 altın kuralı', a: 'Mert Yılmaz', d: '3 Nis · 4 dk okuma', color: '#F5F5F5' },
    { cat: 'STRATEJİ', t: 'Olumsuz yoruma 12 dakikada cevap vermenin gücü', a: 'Zeynep Aydın', d: '28 Mar · 7 dk okuma', color: '#F5F5F5' },
    { cat: 'ÜRÜN', t: 'Buaze AI Co-Pilot: yorumlarınız artık kendi kendine cevaplanıyor', a: 'Mert Yılmaz', d: '20 Mar · 5 dk okuma', color: '#F5F5F5' },
    { cat: 'REHBER', t: 'Otel için Booking + Google + Tripadvisor — tek panelde yönetim', a: 'Selin Demir', d: '15 Mar · 9 dk okuma', color: '#F5F5F5' },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="blog" />

      <div style={{ padding: '72px 48px 40px' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Blog</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
          İtibar kütüphanesi.
        </div>
        <div style={{ fontSize: 16, color: '#525252', marginTop: 14, maxWidth: 560 }}>
          Yorum yönetimi, Google politikaları, büyüme taktikleri — haftalık uzman rehberleri.
        </div>
        {/* Filter chips */}
        <div style={{ marginTop: 28, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Tümü', 'Strateji', 'Vaka', 'Rehber', 'Ürün', 'Sektör'].map((c, i) => (
            <div key={c} style={{ padding: '8px 16px', borderRadius: 999, border: '1px solid ' + (i === 0 ? '#0A0A0A' : '#EDEDED'), background: i === 0 ? '#0A0A0A' : '#fff', color: i === 0 ? '#fff' : '#0A0A0A', fontSize: 13, fontWeight: 500 }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Featured */}
      <div style={{ padding: '20px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 18, padding: 0, overflow: 'hidden' }}>
          <div style={{ background: posts[0].color, aspectRatio: '16/10', position: 'relative', padding: 40 }}>
            <div style={{ position: 'absolute', top: 24, left: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', fontWeight: 600 }}>ÖNE ÇIKAN</div>
            <svg viewBox="0 0 200 120" style={{ width: '70%', position: 'absolute', bottom: 30, right: 30 }}>
              <path d="M0 90 L30 80 L60 85 L90 50 L120 60 L150 20 L200 30" fill="none" stroke="#0A0A0A" strokeWidth="3" />
              <circle cx="150" cy="20" r="6" fill="#0A0A0A" />
              <circle cx="90" cy="50" r="5" fill="#0A0A0A" />
            </svg>
          </div>
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', fontWeight: 600 }}>{posts[0].cat}</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.1, marginTop: 10 }}>{posts[0].t}</div>
            <div style={{ fontSize: 12, color: '#737373', marginTop: 14 }}>{posts[0].a} · {posts[0].d}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '30px 48px 80px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {posts.slice(1).map((p, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: i === 0 ? '#EAF9B8' : '#F5F5F5', aspectRatio: '4/3', borderRadius: 12, padding: 24, display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 72, fontWeight: 500, color: '#0A0A0A', opacity: 0.12, letterSpacing: '-0.04em' }}>0{i+2}</div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', fontWeight: 600 }}>{p.cat}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1.25 }}>{p.t}</div>
              <div style={{ fontSize: 12, color: '#737373', marginTop: 10 }}>{p.a} · {p.d}</div>
            </div>
          </div>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}

// ============== AUTH (LOGIN + REGISTER combined split) ==============
function LoginPage() {
  const { Lockup } = PB5();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* LEFT — Form */}
      <div style={{ padding: '48px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Lockup size="sm" color="#0A0A0A" accent="#C6F24E" />
        <div style={{ maxWidth: 400, margin: '0 auto', width: '100%' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>Tekrar<br/>hoş geldin.</div>
          <div style={{ fontSize: 14, color: '#737373', marginTop: 10 }}>Panele giriş yap ve nabzını dinle.</div>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: '#4285F4', display: 'inline-block' }} />
              Google ile devam et
            </div>
            <div style={{ padding: '12px 16px', border: '1px solid #E5E5E5', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: '#0A0A0A', display: 'inline-block' }} />
              Apple ile devam et
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0', color: '#A3A3A3', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em' }}>
              <div style={{ flex: 1, height: 1, background: '#EDEDED' }} /> YA DA <div style={{ flex: 1, height: 1, background: '#EDEDED' }} />
            </div>
            <div>
              <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>E-posta</label>
              <div style={{ marginTop: 6, padding: '14px 16px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14 }}>emre@arkbistro.com</div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>Şifre</label>
                <span style={{ fontSize: 11, color: '#737373' }}>Unuttum?</span>
              </div>
              <div style={{ marginTop: 6, padding: '14px 16px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14, color: '#737373', letterSpacing: '0.3em' }}>••••••••••</div>
            </div>
            <div style={{ padding: '14px 20px', background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontSize: 15, fontWeight: 500, marginTop: 6 }}>Giriş yap →</div>
            <div style={{ fontSize: 13, color: '#737373', textAlign: 'center', marginTop: 14 }}>Hesabın yok mu? <span style={{ color: '#0A0A0A', fontWeight: 600 }}>Kayıt ol</span></div>
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#A3A3A3', letterSpacing: '0.12em' }}>© 2026 BUAZE</div>
      </div>
      {/* RIGHT — Hero */}
      <div style={{ background: '#0A0A0A', color: '#fff', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
          <defs>
            <pattern id="authgrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#fff" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#authgrid)" />
        </svg>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', padding: '6px 12px', background: 'rgba(198,242,78,0.15)', borderRadius: 999, border: '1px solid rgba(198,242,78,0.3)' }}>
          <div style={{ width: 6, height: 6, borderRadius: 999, background: '#C6F24E' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.12em' }}>CANLI · 340K+ YORUM</span>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            "İlk ay içinde Google ortalamamız 4.2'den 4.8'e çıktı."
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>EK</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Emre Kaya</div>
              <div style={{ fontSize: 12, color: '#A3A3A3' }}>Kadıköy Bistro · Kurucu</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 40 }}>
          {[{k: '2.400+', l: 'işletme'}, {k: '4.9/5', l: 'müşteri puanı'}, {k: '28', l: 'ülke'}].map(x => (
            <div key={x.l}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em' }}>{x.k}</div>
              <div style={{ fontSize: 11, color: '#A3A3A3', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RegisterPage() {
  const { Lockup } = PB5();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#C6F24E', padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
        <Lockup size="sm" color="#0A0A0A" accent="#0A0A0A" />
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: '0.14em' }}>14 GÜN ÜCRETSİZ</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 60, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 14 }}>
            Nabzını<br/>duymaya<br/>başla.
          </div>
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {['5 dakikada kurulum', 'Kredi kartı gerekmez', 'İstediğin zaman iptal et', 'Türkçe destek'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <div style={{ width: 18, height: 18, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>✓</div>
                {t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.12em' }}>© 2026 BUAZE</div>
      </div>
      <div style={{ padding: '48px 64px' }}>
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 38, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>Hesap oluştur</div>
          <div style={{ fontSize: 14, color: '#737373', marginTop: 10 }}>Kredi kartı gerekmez. 2 dakikada başla.</div>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { l: 'Ad Soyad', v: 'Emre Kaya' },
              { l: 'İş e-postası', v: 'emre@arkbistro.com' },
              { l: 'İşletme adı', v: 'Ark Bistro' },
              { l: 'Şifre', v: '•••••••••', mono: true },
            ].map(f => (
              <div key={f.l}>
                <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>{f.l}</label>
                <div style={{ marginTop: 6, padding: '12px 14px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14, letterSpacing: f.mono ? '0.3em' : 'normal', color: f.mono ? '#737373' : '#0A0A0A' }}>{f.v}</div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: '#737373', marginTop: 6, lineHeight: 1.5 }}>
              Kayıt olarak <span style={{ color: '#0A0A0A', fontWeight: 600 }}>Kullanım Şartları</span> ve <span style={{ color: '#0A0A0A', fontWeight: 600 }}>Gizlilik Politikası</span>'nı kabul etmiş olursunuz.
            </div>
            <div style={{ padding: '14px 20px', background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontSize: 15, fontWeight: 500, marginTop: 10 }}>Ücretsiz başla →</div>
            <div style={{ fontSize: 13, color: '#737373', textAlign: 'center', marginTop: 10 }}>Hesabın var mı? <span style={{ color: '#0A0A0A', fontWeight: 600 }}>Giriş yap</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SitePages2 = { QRGeneratorPage, AboutPage, ContactPage, BlogPage, LoginPage, RegisterPage };
