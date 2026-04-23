// Buaze Site — Ek Sayfalar (site-pages4.jsx)
// Sektör detayları, özellik detayları, karşılaştırma, blog detay,
// şifre sıfırlama, 404, Admin API.

const S4 = () => window.BuazeSite;
const PB7 = () => window.PulseBrand;
const PL2 = () => window.Platforms;

// Shared mini helpers
const SG = ({ label, value, up }) => (
  <div style={{ borderTop: '2px solid #0A0A0A', paddingTop: 12 }}>
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
      {value}{up && <span style={{ fontSize: 22, color: '#16A34A', marginLeft: 6 }}>↑</span>}
    </div>
    <div style={{ fontSize: 12, color: '#737373', marginTop: 4 }}>{label}</div>
  </div>
);

// ================================================================
// SEKTÖR: OTEL — /cozumler/otel
// ================================================================
function HotelSolutionPage() {
  const { SiteNav, SiteFooter, IllusLighthouse } = S4();
  const { PlatformLogo } = PL2();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="solutions" />
      <div style={{ padding: '72px 48px 40px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'center', background: '#FAFAFA' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sektör · Otel & Konaklama</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 68, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Misafirin sesi,<br/>her platformda<br/><span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>yankılanır.</span>
          </div>
          <div style={{ fontSize: 16, color: '#525252', marginTop: 18, maxWidth: 500, lineHeight: 1.6 }}>
            Booking.com, Tripadvisor ve Google — üç platformu tek panelden yönet. Oda QR'ları ile check-out'ta yorum topla, negatifi önce sen gör.
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>14 gün ücretsiz başla →</div>
            <div style={{ padding: '14px 22px', border: '1px solid #0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Demo iste</div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em' }}>BAĞLANTI</div>
            {['booking', 'tripadvisor', 'google'].map(id => <PlatformLogo key={id} id={id} size={36} rounded={8} />)}
          </div>
        </div>
        <IllusLighthouse size={320} />
      </div>

      <div style={{ padding: '60px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 56 }}>
          <SG label="Booking puanı artışı (ort.)" value="8.2→9.1" up />
          <SG label="Tripadvisor yorum artışı" value="+92%" up />
          <SG label="Oda QR dönüşüm oranı" value="%57" />
          <SG label="Check-out→yorum süresi" value="22sn" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { t: 'Oda QR sistemi', d: 'Her oda numarası kendi QR koduna sahip. Misafir tararken oda bilgisi otomatik eşleşir.' },
            { t: 'Check-out tetikleyici', d: 'PMS entegrasyonu ile check-out anında SMS/WhatsApp ile yorum daveti.' },
            { t: 'Dil tespiti', d: 'Misafirin tarayıcı diline göre form otomatik dil değiştirir. 12 dil desteği.' },
            { t: 'Personel skoru', d: 'Resepsiyonist, temizlik, restoran — her departman ayrı raporlanır.' },
            { t: 'OTA entegrasyonu', d: 'Booking.com, Expedia, Agoda — yorumları panele çeker, yanıt şablonları çalışır.' },
            { t: 'Misafir profili', d: 'Tekrar gelen misafiri tanı, geçmiş yorumlarıyla bağlantı kur.' },
          ].map(f => (
            <div key={f.t} style={{ padding: 24, border: '1px solid #EDEDED', borderRadius: 14 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>{f.t}</div>
              <div style={{ fontSize: 13, color: '#525252', marginTop: 8, lineHeight: 1.55 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// SEKTÖR: KLİNİK — /cozumler/klinik
// ================================================================
function ClinicSolutionPage() {
  const { SiteNav, SiteFooter, IllusShield } = S4();
  const { PlatformLogo } = PL2();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="solutions" />
      <div style={{ padding: '72px 48px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', background: '#FAFAFA' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sektör · Klinik & Sağlık</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 68, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Hasta güveni,<br/>dijitale<br/><span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>taşınır.</span>
          </div>
          <div style={{ fontSize: 16, color: '#525252', marginTop: 18, maxWidth: 500, lineHeight: 1.6 }}>
            KVKK uyumlu hasta geri bildirimi. Tedavi sonrası QR ile deneyim toplayın, Google profilinizi güçlendirin. Sağlık sektörüne özel hassas akış.
          </div>
          <div style={{ marginTop: 20, padding: 16, background: '#EAF9B8', borderRadius: 10, fontSize: 13, lineHeight: 1.5, maxWidth: 480 }}>
            <b>KVKK Notu:</b> Hasta verileri hiçbir zaman üçüncü tarafla paylaşılmaz. Anket ve yorum akışları anonimleştirilebilir.
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Ücretsiz başla →</div>
          </div>
        </div>
        <IllusShield size={300} />
      </div>

      <div style={{ padding: '60px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}>
          <SG label="Randevu artışı (90 gün)" value="+62%" up />
          <SG label="Google ort. puan" value="4.8/5" />
          <SG label="Hasta memnuniyet skoru" value="%94" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
            { t: 'Tedavi sonrası anket', d: 'Randevu sisteminden otomatik tetiklenebilir. Hastaya SMS/QR ile gönderilir.' },
            { t: 'Doktor bazlı raporlama', d: 'Her hekimin bireysel memnuniyet skoru ve yorum dağılımı ayrı görünür.' },
            { t: 'Google\'a yönlendirme', d: 'Memnun hasta Google\'a, şikayet eden hasta iç forma — KVKK uyumlu akış.' },
            { t: 'Çok dilli destek', d: 'Medikal turizm için otomatik dil tespiti, Arapça dahil 12 dil.' },
          ].map(f => (
            <div key={f.t} style={{ padding: 24, border: '1px solid #EDEDED', borderRadius: 14, background: '#FAFAFA' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: '-0.015em' }}>{f.t}</div>
              <div style={{ fontSize: 14, color: '#525252', marginTop: 8, lineHeight: 1.55 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// SEKTÖR: HUKUK OFİSİ — /cozumler/hukuk
// ================================================================
function LegalSolutionPage() {
  const { SiteNav, SiteFooter } = S4();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="solutions" />
      <div style={{ padding: '72px 48px 40px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sektör · Hukuk Ofisi</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 68, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Müvekkil güveni<br/>en güçlü<br/><span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>referanstır.</span>
          </div>
          <div style={{ fontSize: 16, color: '#525252', marginTop: 18, maxWidth: 500, lineHeight: 1.6 }}>
            Danışmanlık sonrası müvekkilden geri bildirim toplayın. Google arama sıralamanızı yükseltin. Etik kurallara uyumlu, saygın bir dijital profil oluşturun.
          </div>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {['Avukatlık meslek kurallarına uyumlu', 'Yanıltıcı reklam yok', 'Müvekkil sırrı korunur', 'Organik SEO artışı'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <div style={{ width: 16, height: 16, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>✓</div>
                {t}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Ücretsiz başla →</div>
            <div style={{ padding: '14px 22px', border: '1px solid #0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Demo iste</div>
          </div>
        </div>
        {/* Illustration */}
        <svg viewBox="0 0 320 300" style={{ width: '100%', maxWidth: 400 }}>
          <rect x="60" y="20" width="200" height="260" rx="8" fill="#FAFAFA" stroke="#0A0A0A" strokeWidth="2" />
          <rect x="60" y="20" width="200" height="32" rx="8" fill="#0A0A0A" />
          <rect x="60" y="36" width="200" height="16" fill="#0A0A0A" />
          <rect x="80" y="70" width="100" height="6" rx="3" fill="#0A0A0A" />
          <rect x="80" y="84" width="140" height="4" rx="2" fill="#D4D4D4" />
          <rect x="80" y="96" width="120" height="4" rx="2" fill="#D4D4D4" />
          <rect x="80" y="118" width="120" height="6" rx="3" fill="#0A0A0A" />
          <rect x="80" y="132" width="150" height="4" rx="2" fill="#D4D4D4" />
          <rect x="80" y="144" width="100" height="4" rx="2" fill="#D4D4D4" />
          {/* Signature */}
          <path d="M80 195 Q100 185 120 195 Q140 205 160 195" fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" />
          <line x1="80" y1="210" x2="200" y2="210" stroke="#0A0A0A" strokeWidth="1" />
          {/* Seal */}
          <circle cx="240" cy="240" r="32" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
          <path d="M228 240 L236 248 L252 232" fill="none" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {/* Stars */}
          {[0,1,2,3,4].map(i => {
            const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
            return <circle key={i} cx={240 + Math.cos(a) * 26} cy={240 + Math.sin(a) * 26} r="2" fill="#0A0A0A" />;
          })}
        </svg>
      </div>

      <div style={{ padding: '0 48px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <SG label="Ortalama Google puan artışı" value="+1.2" up />
          <SG label="90 günde yeni yorum" value="+90" up />
          <SG label="Müvekkil başvuru artışı" value="%38" up />
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// SEKTÖR: GÜZELLIK & SPA — /cozumler/spa
// ================================================================
function SpaSolutionPage() {
  const { SiteNav, SiteFooter, IllusMountain } = S4();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="solutions" />
      <div style={{ padding: '72px 48px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', background: '#FAFAFA' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sektör · Güzellik & Spa</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 68, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
            Randevu sonrası<br/>en güçlü<br/><span style={{ background: '#C6F24E', padding: '0 10px', borderRadius: 6 }}>an.</span>
          </div>
          <div style={{ fontSize: 16, color: '#525252', marginTop: 18, maxWidth: 500, lineHeight: 1.6 }}>
            Hizmet biter bitmez müşteriniz QR'ı tarar. Instagram, Google ve Foursquare'de puanınız organik büyür. Usta bazlı performans raporları.
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <div style={{ padding: '14px 22px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Ücretsiz başla →</div>
          </div>
        </div>
        <IllusMountain size={280} />
      </div>
      <div style={{ padding: '60px 48px 80px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        <SG label="Usta bazlı müşteri skoru" value="4.9" />
        <SG label="Instagram yorum artışı" value="+148%" up />
        <SG label="Tekrar randevu oranı" value="%72" up />
        <SG label="Yorum→randevu dönüşüm" value="%18" />
      </div>
      <div style={{ padding: '0 48px 80px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {[
          { t: 'Usta bazlı QR', d: 'Her ustanın masa/bölümüne özel QR. Kim hangi yorumu aldı, tek bakışta.' },
          { t: 'Instagram entegrasyonu', d: 'Güzellik sektörünün önde gelen platformu. DM yorumlarını inbox\'a çek.' },
          { t: 'Randevu tetikleyici', d: 'Randevu yazılımınızla bağlan — hizmet bitince otomatik yorum daveti.' },
        ].map(f => (
          <div key={f.t} style={{ padding: 24, border: '1px solid #EDEDED', borderRadius: 14 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>{f.t}</div>
            <div style={{ fontSize: 13, color: '#525252', marginTop: 8, lineHeight: 1.55 }}>{f.d}</div>
          </div>
        ))}
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// SEKTÖR: PERAKENDE — /cozumler/perakende
// ================================================================
function RetailSolutionPage() {
  const { SiteNav, SiteFooter, IllusChart } = S4();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="solutions" />
      <div style={{ padding: '72px 48px 40px', background: '#0A0A0A', color: '#fff' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sektör · Perakende & Mağaza</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 68, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
              Fiş altına koy,<br/>yorum<br/><span style={{ background: '#C6F24E', color: '#0A0A0A', padding: '0 10px', borderRadius: 6 }}>patlasın.</span>
            </div>
            <div style={{ fontSize: 16, color: '#A3A3A3', marginTop: 18, maxWidth: 500, lineHeight: 1.6 }}>
              Müşteri kasadan çıkarken fişinin altındaki QR'ı tarar. Google ve Yandex'e yönlendirilir. Çok mağaza, tek panel.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <div style={{ padding: '14px 22px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>14 gün ücretsiz başla →</div>
              <div style={{ padding: '14px 22px', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 15, fontWeight: 500 }}>Demo iste</div>
            </div>
          </div>
          <IllusChart size={260} />
        </div>
      </div>
      <div style={{ padding: '60px 48px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 48 }}>
          <SG label="Yorum artışı (ilk 30 gün)" value="+210%" up />
          <SG label="Çok mağaza desteği" value="Sınırsız" />
          <SG label="Google sıralama iyileşme" value="%88" up />
          <SG label="Ortalama yorum süresi" value="25sn" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { t: 'Fiş QR entegrasyonu', d: 'POS sistemine plug-in veya ERP\'den API ile fiş altına otomatik QR basılır.' },
            { t: 'Mağaza bazlı analiz', d: 'Zincir genelinde en iyi/en kötü mağazayı karşılaştır. Bölge yöneticisine haftalık özet.' },
            { t: 'Sezonsal kampanya', d: '"Yılbaşı indirimi" gibi dönemsel kampanyalarda anlık yorum takibi.' },
          ].map(f => (
            <div key={f.t} style={{ padding: 24, border: '1px solid #EDEDED', borderRadius: 14 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>{f.t}</div>
              <div style={{ fontSize: 13, color: '#525252', marginTop: 8, lineHeight: 1.55 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// ÖZELLİK DETAY: AI Co-Pilot — /ozellikler/ai-copilot
// ================================================================
function FeatureAIPage() {
  const { SiteNav, SiteFooter } = S4();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      {/* Dark hero */}
      <div style={{ background: '#0A0A0A', color: '#fff', padding: '80px 48px 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: 'rgba(198,242,78,0.15)', borderRadius: 999, border: '1px solid rgba(198,242,78,0.3)', marginBottom: 18 }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: '#C6F24E' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.12em' }}>YENİ · AI Co-Pilot v2.4</span>
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 68, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95 }}>
              Her yoruma 30 sn'de <span style={{ color: '#C6F24E' }}>mükemmel yanıt.</span>
            </div>
            <div style={{ fontSize: 17, color: '#A3A3A3', marginTop: 20, lineHeight: 1.6, maxWidth: 520 }}>
              Buaze AI, işletmenizin sesini öğrenir. GPT-4 + Claude kombinasyonu ile markaya özel, doğal, Türkçe yanıtlar üretir. Siz onaylarsınız, sistem gönderir.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              <div style={{ padding: '14px 22px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, fontSize: 15, fontWeight: 600 }}>Co-Pilot'u dene →</div>
              <div style={{ padding: '14px 22px', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 15 }}>Nasıl çalışır?</div>
            </div>
          </div>
          {/* AI reply mockup */}
          <div style={{ background: '#1A1A1A', border: '1px solid #333', borderRadius: 18, padding: 24 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', marginBottom: 14 }}>GELEN YORUM</div>
            <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14, border: '1px solid #333', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#A3A3A3', marginBottom: 6 }}>
                <span>Ayşe K. · Google</span>
                <span style={{ color: '#C6F24E' }}>★★★★★</span>
              </div>
              <div style={{ fontSize: 14, color: '#D4D4D4', lineHeight: 1.5 }}>"Servisi biraz bekledik ama yemekler harikaydı. Şef'in özel makarnasını mutlaka deneyin!"</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9 }}>AI</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em' }}>CO-PILOT ÖNERİSİ · 1.2sn</div>
            </div>
            <div style={{ background: '#0F0F0F', border: '1px solid #2A2A2A', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 13, color: '#E4E4E4', lineHeight: 1.65 }}>
                "Ayşe Hanım, nazik yorumunuz için çok teşekkür ederiz! Biraz beklettiğimiz için özür dileriz — büyük talep nedeniyle zaman zaman yoğunluk yaşıyoruz. Makarna övgünüz Şef Musa'ya büyük motivasyon oldu. Sizi yeniden ağırlamak için sabırsızlanıyoruz. 🙏"
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <div style={{ padding: '6px 14px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, fontSize: 11, fontWeight: 600 }}>Gönder</div>
                <div style={{ padding: '6px 14px', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 11 }}>Düzenle</div>
                <div style={{ padding: '6px 14px', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 11 }}>Yeniden yaz</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Stats */}
      <div style={{ padding: '60px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 56 }}>
          <SG label="Ortalama yanıt süresi" value="30sn" />
          <SG label="Yanıt kalite skoru" value="4.9/5" />
          <SG label="Dil desteği" value="12" />
          <SG label="İnsan onayı oranı" value="%94" up />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            { t: 'Marka ses öğrenmesi', d: 'İlk 50 yorumu okur, işletmenizin tonunu, sıklıkla kullandığı kelimeleri öğrenir.' },
            { t: 'Çok dilli yanıt', d: '12 dilde yorum gelirse, aynı dilde yanıt önerir. Arapça, İngilizce, Almanca dahil.' },
            { t: 'Duygu uyumu', d: 'Şikayete empatik, övgüye sıcak, nötre dengeli yanıt tonu otomatik seçilir.' },
            { t: 'Platform uyumu', d: 'Google tarzı, Booking tarzı veya Yemeksepeti tarzı farklı biçimde önerir.' },
            { t: 'Toplu yanıt', d: 'Benzer içerikli 20 yoruma tek tıkla hafifçe kişiselleştirilmiş yanıt.' },
            { t: 'SLA alarm', d: 'Belirlenen sürede yanıtlanmamış yorum için ekibe push bildirimi.' },
          ].map(f => (
            <div key={f.t} style={{ padding: 24, border: '1px solid #EDEDED', borderRadius: 14, background: '#FAFAFA' }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>{f.t}</div>
              <div style={{ fontSize: 13, color: '#525252', marginTop: 8, lineHeight: 1.55 }}>{f.d}</div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// KARŞILAŞTIRMA — /karsilastir
// ================================================================
function ComparePage() {
  const { SiteNav, SiteFooter } = S4();
  const { Lockup } = PB7();
  const competitors = ['ReviewTrackers', 'Yotpo', 'Podium', 'Birdeye'];
  const features = [
    { name: 'QR tabanlı geri bildirim', buaze: true, rt: false, yotpo: false, podium: true, birdeye: false },
    { name: 'Türkiye\'ye özel platformlar (Yemeksepeti, Getir)', buaze: true, rt: false, yotpo: false, podium: false, birdeye: false },
    { name: 'AI yanıt önerisi', buaze: true, rt: true, yotpo: true, podium: true, birdeye: true },
    { name: 'Google politika uyumu motoru', buaze: true, rt: false, yotpo: false, podium: false, birdeye: false },
    { name: 'Türkçe arayüz & destek', buaze: true, rt: false, yotpo: false, podium: false, birdeye: false },
    { name: 'Paket servis entegrasyonu', buaze: true, rt: false, yotpo: false, podium: false, birdeye: false },
    { name: 'Ücretsiz plan', buaze: true, rt: false, yotpo: false, podium: false, birdeye: false },
    { name: 'Fiyat (aylık, 5 konum)', buaze: '₺890', rt: '$299', yotpo: '$250', podium: '$399', birdeye: '$350' },
  ];
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="product" />
      <div style={{ padding: '72px 48px 40px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Karşılaştırma</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 64, fontWeight: 500, letterSpacing: '-0.035em', lineHeight: 0.95, marginTop: 12 }}>
          Buaze neden farklı?
        </div>
        <div style={{ fontSize: 16, color: '#525252', marginTop: 14, maxWidth: 560, margin: '14px auto 0' }}>
          Türk işletmesi için yapıldı. Yemeksepeti'ni bilir, KVKK'yı bilir, Türkçe konuşur.
        </div>
      </div>

      <div style={{ padding: '20px 48px 80px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '16px 20px', width: '35%', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', textTransform: 'uppercase', borderBottom: '2px solid #0A0A0A' }}>Özellik</th>
              <th style={{ padding: '16px 20px', borderBottom: '2px solid #0A0A0A', background: '#EAF9B8', borderRadius: '12px 12px 0 0' }}>
                <div style={{ display: 'flex', justifyContent: 'center' }}><Lockup size="sm" color="#0A0A0A" accent="#0A0A0A" /></div>
              </th>
              {competitors.map(c => (
                <th key={c} style={{ padding: '16px 20px', borderBottom: '2px solid #0A0A0A', fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 500, color: '#A3A3A3', textAlign: 'center' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr key={f.name} style={{ background: i % 2 === 0 ? '#FAFAFA' : '#FFFFFF' }}>
                <td style={{ padding: '16px 20px', fontSize: 14, fontWeight: 500, borderBottom: '1px solid #EDEDED' }}>{f.name}</td>
                {[f.buaze, f.rt, f.yotpo, f.podium, f.birdeye].map((v, vi) => (
                  <td key={vi} style={{ padding: '16px 20px', textAlign: 'center', borderBottom: '1px solid #EDEDED', background: vi === 0 ? 'rgba(198,242,78,0.08)' : 'transparent' }}>
                    {typeof v === 'boolean' ? (
                      <span style={{ display: 'inline-block', width: 26, height: 26, borderRadius: 999, background: v ? '#C6F24E' : '#F5F5F5', color: v ? '#0A0A0A' : '#A3A3A3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                        {v ? '✓' : '✕'}
                      </span>
                    ) : (
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 600, color: vi === 0 ? '#0A0A0A' : '#737373' }}>{v}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// BLOG DETAY — /blog/[slug]
// ================================================================
function BlogPostPage() {
  const { SiteNav, SiteFooter } = S4();
  const { Lockup } = PB7();
  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}>
      <SiteNav active="blog" />

      {/* Hero */}
      <div style={{ background: '#C6F24E', padding: '60px 48px 80px', position: 'relative', overflow: 'hidden' }}>
        <svg style={{ position: 'absolute', right: 48, bottom: 0, opacity: 0.15 }} viewBox="0 0 300 200" width="400" height="260">
          <path d="M0 150 L40 120 L80 140 L120 90 L160 100 L200 60 L240 80 L280 40 L300 30" fill="none" stroke="#0A0A0A" strokeWidth="3" />
          <circle cx="200" cy="60" r="12" fill="#0A0A0A" />
          <circle cx="280" cy="40" r="8" fill="#0A0A0A" />
        </svg>
        <div style={{ maxWidth: 800 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 14 }}>STRATEJİ · 8 DK OKUMA</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 56, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1, color: '#0A0A0A' }}>
            Google yorum politikaları 2026: yeni kurallar ve 7 ipucu
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13 }}>EK</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Emre Kaya</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Buaze · Kurucu</div>
              </div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>14 Nisan 2026</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '60px 48px', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 48, maxWidth: 1200, margin: '0 auto' }}>
        <div>
          {/* Lead */}
          <div style={{ fontSize: 20, color: '#0A0A0A', lineHeight: 1.6, marginBottom: 32, fontWeight: 400 }}>
            Google 2026'da sahte yorum savaşını yoğunlaştırdı. İki güncelleme işletmelerin puanını etkiledi — ama sistemi doğru kuranlar için bu bir fırsat.
          </div>

          {[
            { h: 'Neler değişti?', p: 'Google\'ın algoritması artık "aynı cihazdan gelen birden fazla yorum" ve "coğrafi eşleşme olmayan yorumlar" için filtreleme uyguluyor. Sahte yorum satın alanlar için bu yıkıcı; organik yorum toplamak için kurulmuş işletmeler için ise rakiplerinden önde başlamak anlamına geliyor.' },
            { h: '1. QR tabanlı akış kurun', p: 'Gerçek müşteriden gelen yorum, Google\'ın sensörlerine görünmez. QR ile yorum topladığınızda IP+cihaz eşleşmesi organiktir. Buaze bu eşleşmeyi platform genelinde izler.' },
            { h: '2. Yorum daveti zamanlaması', p: 'Ödeme anında veya hizmet bitiminden 1-4 saat sonra gönderilen davet en yüksek dönüşümü sağlıyor. 24 saati geçince oran yarıya iniyor.' },
            { h: '3. Teşvik yasağına dikkat', p: '"Google\'da yorum bırakana indirim" → Google politika ihlali → yorum silinebilir, hesap işaretlenebilir. Teşvik asla platform yorum linki ile bağlanmamalı.' },
          ].map(s => (
            <div key={s.h} style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 12 }}>{s.h}</div>
              <div style={{ fontSize: 16, color: '#525252', lineHeight: 1.7 }}>{s.p}</div>
            </div>
          ))}

          {/* CTA box */}
          <div style={{ background: '#0A0A0A', color: '#fff', borderRadius: 16, padding: 32, marginTop: 40 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>Google politikalarına uyumlu büyümeye hazır mısınız?</div>
            <div style={{ fontSize: 14, color: '#A3A3A3', marginTop: 8 }}>Buaze, akışın her adımını denetler. 14 gün ücretsiz başlayın.</div>
            <div style={{ padding: '12px 22px', background: '#C6F24E', color: '#0A0A0A', display: 'inline-block', borderRadius: 999, fontWeight: 600, marginTop: 20 }}>Ücretsiz başla →</div>
          </div>
        </div>

        {/* TOC + author */}
        <div>
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ padding: 20, background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, marginBottom: 24 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', marginBottom: 12 }}>İÇERİK</div>
              {['Neler değişti?', '1. QR tabanlı akış', '2. Davet zamanlaması', '3. Teşvik yasağı'].map((t, i) => (
                <div key={t} style={{ fontSize: 13, color: i === 0 ? '#0A0A0A' : '#525252', padding: '6px 0', borderLeft: i === 0 ? '2px solid #C6F24E' : '2px solid transparent', paddingLeft: 10, fontWeight: i === 0 ? 600 : 400 }}>{t}</div>
              ))}
            </div>
            <div style={{ padding: 20, background: '#EAF9B8', borderRadius: 12 }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#737373', letterSpacing: '0.14em', marginBottom: 10 }}>YAZAR</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>EK</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Emre Kaya</div>
                  <div style={{ fontSize: 12, color: '#525252' }}>Buaze · Kurucu</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

// ================================================================
// ŞİFRE SIFIRLA — /sifre-sifirla
// ================================================================
function ResetPasswordPage() {
  const { Lockup } = PB7();
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#FAFAFA', fontFamily: "'Inter', sans-serif", padding: 32 }}>
      <div style={{ width: 420, background: '#fff', border: '1px solid #EDEDED', borderRadius: 20, padding: 40 }}>
        <div style={{ marginBottom: 28 }}><Lockup size="sm" color="#0A0A0A" accent="#C6F24E" /></div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.1 }}>Şifrenizi<br/>sıfırlayın.</div>
        <div style={{ fontSize: 13, color: '#737373', marginTop: 10 }}>E-posta adresinizi girin, sıfırlama bağlantısı gönderelim.</div>
        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', color: '#737373', textTransform: 'uppercase' }}>E-posta</label>
            <div style={{ marginTop: 6, padding: '14px 16px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14 }}>emre@arkbistro.com</div>
          </div>
          <div style={{ padding: '14px 20px', background: '#0A0A0A', color: '#fff', borderRadius: 999, textAlign: 'center', fontSize: 15, fontWeight: 500 }}>Bağlantı gönder →</div>
          <div style={{ textAlign: 'center', fontSize: 13, color: '#737373' }}>Hatırladın mı? <span style={{ color: '#0A0A0A', fontWeight: 600 }}>Giriş yap</span></div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 404 SAYFASI
// ================================================================
function NotFoundPage() {
  const { Lockup } = PB7();
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#0A0A0A', color: '#fff', fontFamily: "'Inter', sans-serif", padding: 48, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {/* ECG background */}
      <svg style={{ position: 'absolute', top: '50%', left: 0, right: 0, transform: 'translateY(-50%)', width: '100%', opacity: 0.06 }} viewBox="0 0 1440 200">
        <path d="M0 100 L200 100 L260 40 L320 160 L380 80 L440 120 L600 100 L700 100 L760 40 L820 160 L880 80 L940 120 L1440 100" fill="none" stroke="#C6F24E" strokeWidth="4" />
      </svg>
      <div style={{ position: 'relative' }}>
        <Lockup size="sm" color="#fff" accent="#C6F24E" />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 180, fontWeight: 500, letterSpacing: '-0.05em', lineHeight: 0.9, color: '#C6F24E', marginTop: 24 }}>404</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 500, letterSpacing: '-0.025em', marginTop: 16 }}>Bu sayfa nabız vermiyor.</div>
        <div style={{ fontSize: 16, color: '#A3A3A3', marginTop: 10, maxWidth: 480, lineHeight: 1.6 }}>
          Aradığınız sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.
        </div>
        <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <div style={{ padding: '12px 22px', background: '#C6F24E', color: '#0A0A0A', borderRadius: 999, fontSize: 14, fontWeight: 600 }}>Ana sayfaya dön</div>
          <div style={{ padding: '12px 22px', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 14 }}>Yardım al</div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ADMIN: API & WEBHOOK — /app/api
// ================================================================
function AdminAPIPage() {
  const { Lockup } = PB7();
  const endpoints = [
    { m: 'GET', p: '/v1/reviews', d: 'Tüm yorumları listele' },
    { m: 'POST', p: '/v1/reviews/{id}/reply', d: 'Yoruma yanıt gönder' },
    { m: 'GET', p: '/v1/locations', d: 'Konum listesi' },
    { m: 'POST', p: '/v1/qr-codes', d: 'Yeni QR kodu oluştur' },
    { m: 'GET', p: '/v1/analytics/nps', d: 'NPS verisini getir' },
    { m: 'DELETE', p: '/v1/webhooks/{id}', d: 'Webhook sil' },
  ];
  const mCol = { GET: '#C6F24E', POST: '#2563EB', DELETE: '#DC2626', PATCH: '#F59E0B' };
  return (
    <div style={{ background: '#FAFAFA', display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100%', fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ background: '#0A0A0A', color: '#fff', padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ padding: '0 6px 20px' }}><Lockup size="sm" color="#fff" accent="#C6F24E" /></div>
        {['Genel bakış','Yorumlar','QR Kodlar','Analitik','Konumlar','Kampanyalar','Ekip','Bildirimler','Faturalandırma','API & Webhook'].map((it, i) => (
          <div key={it} style={{ padding: '10px 12px', borderRadius: 8, background: i === 9 ? '#C6F24E' : 'transparent', color: i === 9 ? '#0A0A0A' : '#A3A3A3', fontSize: 13, fontWeight: i === 9 ? 600 : 400 }}>{it}</div>
        ))}
      </div>
      <div>
        <div style={{ background: '#fff', borderBottom: '1px solid #EDEDED', padding: '14px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#737373' }}>API & Webhook</div>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12 }}>EK</div>
        </div>
        <div style={{ padding: '24px 32px' }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8 }}>API & Webhook</div>
          <div style={{ fontSize: 13, color: '#737373', marginBottom: 24 }}>Buaze'yi kendi sistemlerinize entegre edin.</div>

          {/* API Key */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24, marginBottom: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600, marginBottom: 16 }}>API Anahtarı</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, alignItems: 'center' }}>
              <div style={{ padding: '12px 14px', background: '#0A0A0A', borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#C6F24E', letterSpacing: '0.06em' }}>
                bz_live_sk_4Xa9mR2kJP7nY1qZvWt8sL3eFdCbNuHo
              </div>
              <div style={{ padding: '10px 14px', border: '1px solid #EDEDED', borderRadius: 8, fontSize: 12, fontWeight: 500 }}>Kopyala</div>
              <div style={{ padding: '10px 14px', background: '#0A0A0A', color: '#fff', borderRadius: 8, fontSize: 12, fontWeight: 500 }}>Yenile</div>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: '#737373' }}>⚠ Anahtarı kimseyle paylaşmayın. Yenilenirse eski anahtar geçersiz olur.</div>
          </div>

          {/* Endpoints */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #EDEDED', fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Endpoints</div>
            {endpoints.map((ep, i) => (
              <div key={ep.p} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 16, padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid #F5F5F5', alignItems: 'center' }}>
                <div style={{ padding: '3px 8px', background: mCol[ep.m] + '20', color: mCol[ep.m], borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textAlign: 'center', display: 'inline-block' }}>{ep.m}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#0A0A0A' }}>{ep.p}</div>
                <div style={{ fontSize: 13, color: '#737373' }}>{ep.d}</div>
              </div>
            ))}
          </div>

          {/* Webhooks */}
          <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 600 }}>Webhook'lar</div>
              <div style={{ padding: '8px 14px', background: '#0A0A0A', color: '#fff', borderRadius: 999, fontSize: 12, fontWeight: 500 }}>+ Ekle</div>
            </div>
            {[
              { url: 'https://arkbistro.com/api/buaze/review', events: ['review.created', 'review.replied'], status: 'Aktif' },
              { url: 'https://n8n.arkbistro.com/webhook/abc123', events: ['review.created'], status: 'Aktif' },
            ].map((w, i) => (
              <div key={w.url} style={{ padding: '14px 0', borderTop: i === 0 ? '1px solid #EDEDED' : '1px solid #F5F5F5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#0A0A0A' }}>{w.url}</div>
                  <span style={{ padding: '2px 8px', background: '#EAF9B8', borderRadius: 999, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>{w.status.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {w.events.map(e => <span key={e} style={{ padding: '2px 8px', background: '#F5F5F5', borderRadius: 4, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{e}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.SitePages4 = {
  HotelSolutionPage, ClinicSolutionPage, LegalSolutionPage, SpaSolutionPage, RetailSolutionPage,
  FeatureAIPage, ComparePage, BlogPostPage,
  ResetPasswordPage, NotFoundPage, AdminAPIPage,
};
