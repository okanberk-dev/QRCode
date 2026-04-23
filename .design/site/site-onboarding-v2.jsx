// Buaze Onboarding v2 — Tüm 5 adım, tam tasarım
// Adım 1: İşletme bilgileri
// Adım 2: Sektör seçimi
// Adım 3: Konum ekle
// Adım 4: Platform seçimi
// Adım 5: İlk QR oluştur + confetti

const { useState: useOB, useEffect: useOBE } = React;
const PB9 = () => window.PulseBrand;
const PL4 = () => window.Platforms;

// ── Confetti ──
function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.2 + Math.random() * 0.8,
    color: ['#C6F24E','#0A0A0A','#EAF9B8','#A8D62E'][Math.floor(Math.random() * 4)],
    size: 6 + Math.random() * 8,
    rot: Math.random() * 360,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 3000 }}>
      <style>{`
        @keyframes conf-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, top: 0,
          width: p.size, height: p.size * 0.4,
          background: p.color, borderRadius: 2,
          '--rot': `${p.rot}deg`,
          animation: `conf-fall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ── Progress bar ──
function OnboardingProgress({ step, total = 5 }) {
  const steps = ['İşletme', 'Sektör', 'Konum', 'Platformlar', 'İlk QR'];
  return (
    <div style={{ padding: '24px 48px', background: '#FFFFFF', borderBottom: '1px solid #EDEDED' }}>
      {/* Step numbers */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, maxWidth: 680, margin: '0 auto' }}>
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 'none' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 999,
                background: i < step ? '#C6F24E' : i === step ? '#0A0A0A' : '#F5F5F5',
                border: i === step ? '2px solid #0A0A0A' : i < step ? 'none' : '2px solid #E5E5E5',
                color: i < step ? '#0A0A0A' : i === step ? '#C6F24E' : '#A3A3A3',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15,
                transition: 'all .3s cubic-bezier(.34,1.56,.64,1)',
                boxShadow: i === step ? '0 0 0 6px rgba(198,242,78,0.2)' : 'none',
              }}>
                {i < step ? '✓' : i + 1}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: i === step ? '#0A0A0A' : i < step ? '#16A34A' : '#A3A3A3',
                fontWeight: i === step ? 700 : 500,
                whiteSpace: 'nowrap',
              }}>{s}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: i < step ? '#C6F24E' : '#EDEDED', margin: '0 4px', marginBottom: 28, transition: 'background .4s' }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── STEP 1: İşletme ──
function Step1({ data, onChange }) {
  return (
    <div className="bz-fade-up" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
        İşletmenizi tanıyalım.
      </div>
      <div style={{ fontSize: 15, color: '#737373', marginBottom: 36 }}>Bu bilgiler QR kartlarınızda ve müşteri ekranlarında görünecek.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={labelStyle}>İşletme adı</label>
          <input style={inputStyle} placeholder="örn. Ark Bistro" value={data.bizName || ''} onChange={e => onChange('bizName', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>İletişim adı soyadı</label>
            <input style={inputStyle} placeholder="Emre Kaya" value={data.contactName || ''} onChange={e => onChange('contactName', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Telefon</label>
            <input style={inputStyle} placeholder="+90 5XX XXX XX XX" value={data.phone || ''} onChange={e => onChange('phone', e.target.value)} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Web sitesi / Google Business linki</label>
          <input style={inputStyle} placeholder="https://arkbistro.com veya g.page/r/..." value={data.website || ''} onChange={e => onChange('website', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Logo yükle <span style={{ color: '#A3A3A3', fontWeight: 400, letterSpacing: 0, fontSize: 11 }}>opsiyonel · PNG, SVG önerilir</span></label>
          <div style={{ border: '2px dashed #E5E5E5', borderRadius: 14, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: '#FAFAFA', transition: 'border-color .15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#C6F24E'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#E5E5E5'}>
            <div style={{ fontSize: 28 }}>↑</div>
            <div style={{ fontSize: 14, color: '#525252', marginTop: 4 }}>Dosyayı buraya sürükle veya <span style={{ color: '#0A0A0A', fontWeight: 600, borderBottom: '1px solid #0A0A0A' }}>seç</span></div>
            <div style={{ fontSize: 12, color: '#A3A3A3', marginTop: 2 }}>PNG, SVG, PDF · Maks. 4MB</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── STEP 2: Sektör ──
function Step2({ data, onChange }) {
  const sectors = [
    { id: 'restoran', icon: '🍽', label: 'Restoran & Kafe', desc: 'Masa, fatura ve paket QR' },
    { id: 'paket', icon: '📦', label: 'Paket Servis', desc: 'Yemeksepeti, Getir, Trendyol GO' },
    { id: 'otel', icon: '🏨', label: 'Otel & Konaklama', desc: 'Oda QR, Booking, Tripadvisor' },
    { id: 'klinik', icon: '🏥', label: 'Klinik & Sağlık', desc: 'KVKK uyumlu anket akışı' },
    { id: 'hukuk', icon: '⚖️', label: 'Hukuk Ofisi', desc: 'Danışmanlık sonrası yorum' },
    { id: 'spa', icon: '💆', label: 'Güzellik & Spa', desc: 'Randevu sonrası, usta bazlı' },
    { id: 'perakende', icon: '🛍', label: 'Perakende', desc: 'Fiş altı QR, çok mağaza' },
    { id: 'fitness', icon: '🏋️', label: 'Spor & Fitness', desc: 'Seans sonrası geri bildirim' },
    { id: 'egitim', icon: '🎓', label: 'Eğitim', desc: 'Kurs ve seminer değerlendirmesi' },
    { id: 'diger', icon: '◎', label: 'Diğer', desc: 'Sektörünüzü özelleştirin' },
  ];

  return (
    <div className="bz-fade-up" style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
        Hangi sektördesiniz?
      </div>
      <div style={{ fontSize: 15, color: '#737373', marginBottom: 36 }}>Sektörünüze göre akış ve entegrasyon önerilerini özelleştiriyoruz.</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {sectors.map(s => {
          const selected = data.sector === s.id;
          return (
            <div key={s.id} onClick={() => onChange('sector', s.id)} style={{
              padding: '18px 20px', borderRadius: 16, cursor: 'pointer',
              border: `2px solid ${selected ? '#0A0A0A' : '#E5E5E5'}`,
              background: selected ? '#EAF9B8' : '#fff',
              display: 'flex', alignItems: 'center', gap: 14,
              transition: 'all .18s cubic-bezier(.34,1.56,.64,1)',
              transform: selected ? 'scale(1.02)' : 'scale(1)',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: selected ? '#C6F24E' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, transition: 'background .18s' }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>{s.desc}</div>
              </div>
              {selected && <div style={{ marginLeft: 'auto', width: 24, height: 24, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STEP 3: Konum ──
function Step3({ data, onChange }) {
  return (
    <div className="bz-fade-up" style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
        İlk konumunuzu ekleyin.
      </div>
      <div style={{ fontSize: 15, color: '#737373', marginBottom: 36 }}>Her konum için ayrı QR kodları, ayrı analitik. Daha sonra şube ekleyebilirsiniz.</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Konum adı</label>
          <input style={inputStyle} placeholder="örn. Kadıköy Şubesi" value={data.locName || ''} onChange={e => onChange('locName', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Adres</label>
          <input style={inputStyle} placeholder="Mahalle, Cadde, Numara · İlçe / İl" value={data.address || ''} onChange={e => onChange('address', e.target.value)} />
        </div>
        {/* Map placeholder */}
        <div style={{ position: 'relative', height: 200, background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 14, overflow: 'hidden' }}>
          <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 600 200">
            <rect width="600" height="200" fill="#F5F5F5" />
            {/* fake streets */}
            <path d="M0 60 L200 60 L200 140 M200 100 L400 100 L400 60 L600 60 M300 0 L300 200 M100 0 L100 200 M500 0 L500 200 M0 140 L600 140" stroke="#E5E5E5" strokeWidth="1.5" fill="none" />
            <path d="M150 0 L150 200 M350 0 L350 200 M450 0 L450 200" stroke="#EDEDED" strokeWidth="1" fill="none" />
            <path d="M0 30 L600 30 M0 80 L600 80 M0 120 L600 120 M0 170 L600 170" stroke="#EDEDED" strokeWidth="1" fill="none" />
            {/* pin */}
            <circle cx="300" cy="100" r="28" fill="rgba(198,242,78,.25)" />
            <circle cx="300" cy="100" r="16" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" />
            <path d="M300 90 L305 100 L300 110 L295 100 Z" fill="#0A0A0A" />
          </svg>
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#fff', border: '1px solid #E5E5E5', borderRadius: 8, padding: '6px 12px', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,.08)' }}>
            📍 Konumu haritada sabitle
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>İlçe</label>
            <input style={inputStyle} placeholder="Kadıköy" value={data.district || ''} onChange={e => onChange('district', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>İl</label>
            <input style={inputStyle} placeholder="İstanbul" value={data.city || ''} onChange={e => onChange('city', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Posta kodu</label>
            <input style={inputStyle} placeholder="34710" value={data.postal || ''} onChange={e => onChange('postal', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Konum e-postası</label>
            <input style={inputStyle} placeholder="kadikoy@arkbistro.com" value={data.locEmail || ''} onChange={e => onChange('locEmail', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Konum telefonu</label>
            <input style={inputStyle} placeholder="+90 216 XXX XX XX" value={data.locPhone || ''} onChange={e => onChange('locPhone', e.target.value)} />
          </div>
        </div>

        <div style={{ padding: 16, background: '#EAF9B8', borderRadius: 12, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <div>Birden fazla şubeniz varsa endişelenmeyin. İlk konumu kurduktan sonra Ayarlar → Konumlar'dan kolayca ekleyebilirsiniz.</div>
        </div>
      </div>
    </div>
  );
}

// ── STEP 4: Platformlar ──
function Step4({ data, onChange }) {
  const { PlatformLogo, TR_DELIVERY, TR_REVIEW } = PL4();

  const groups = [
    {
      title: 'Yorum platformları',
      subtitle: 'Memnun müşteriler bu platformlara yönlendirilecek',
      items: TR_REVIEW,
    },
    {
      title: 'Paket servis',
      subtitle: 'Sipariş platformlarındaki yorumlar ayrı raporlanır',
      items: TR_DELIVERY,
      sectorHint: data.sector === 'paket' || data.sector === 'restoran',
    },
  ];

  const togglePlatform = (id) => {
    const current = data.platforms || [];
    if (current.includes(id)) {
      onChange('platforms', current.filter(p => p !== id));
    } else {
      onChange('platforms', [...current, id]);
    }
  };

  const platforms = data.platforms || ['google'];

  return (
    <div className="bz-fade-up" style={{ maxWidth: 740, margin: '0 auto' }}>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
        Hangi platformları bağlayalım?
      </div>
      <div style={{ fontSize: 15, color: '#737373', marginBottom: 36 }}>
        Müşterileriniz 4★ ve üstü verirse seçtiğiniz platforma yönlendirilir. Daha sonra değiştirebilirsiniz.
      </div>

      {groups.map((g, gi) => (
        <div key={g.title} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 18 }}>{g.title}</div>
              <div style={{ fontSize: 13, color: '#737373', marginTop: 2 }}>{g.subtitle}</div>
            </div>
            {g.sectorHint && (
              <div style={{ padding: '4px 10px', background: '#C6F24E', borderRadius: 999, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.1em' }}>
                ÖNERİLEN
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {g.items.map(p => {
              const active = platforms.includes(p.id);
              return (
                <div key={p.id} onClick={() => togglePlatform(p.id)} style={{
                  padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                  border: `2px solid ${active ? '#0A0A0A' : '#E5E5E5'}`,
                  background: active ? '#EAF9B8' : '#fff',
                  display: 'flex', alignItems: 'center', gap: 14,
                  transition: 'all .18s',
                }}>
                  <PlatformLogo id={p.id} size={40} rounded={10} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#737373', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>{p.tag}</div>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: active ? '#0A0A0A' : '#F5F5F5',
                    border: active ? 'none' : '2px solid #E5E5E5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#C6F24E', fontSize: 12, fontWeight: 700,
                    transition: 'all .18s',
                  }}>{active ? '✓' : ''}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ padding: 16, background: '#FAFAFA', border: '1px solid #EDEDED', borderRadius: 12, fontSize: 13, lineHeight: 1.5 }}>
        <b>Akıllı yönlendirme:</b> 4★+ → seçtiğiniz platforma · 1-3★ → size özel geri bildirim formu (halka açık değil)
      </div>
    </div>
  );
}

// ── STEP 5: İlk QR ──
function Step5({ data, onFinish }) {
  const { Lockup } = PB9();
  const { PlatformLogo } = PL4();
  const [template, setTemplate] = useOB('lime');
  const [showConfetti, setShowConfetti] = useOB(false);

  const templates = [
    { id: 'lime', bg: '#C6F24E', fg: '#0A0A0A', label: 'Lime' },
    { id: 'dark', bg: '#0A0A0A', fg: '#FFFFFF', label: 'Koyu' },
    { id: 'white', bg: '#FFFFFF', fg: '#0A0A0A', label: 'Beyaz', border: true },
    { id: 'minimal', bg: '#F5F5F5', fg: '#0A0A0A', label: 'Minimal', border: true },
  ];

  const t = templates.find(t => t.id === template);

  return (
    <div className="bz-fade-up" style={{ maxWidth: 820, margin: '0 auto' }}>
      {showConfetti && <Confetti />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 42, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>
            İlk QR'ınızı oluşturun.
          </div>
          <div style={{ fontSize: 15, color: '#737373', marginBottom: 28 }}>
            Tasarımı seçin, indirin ve masanıza yapıştırın. Kurulum tamamlandı.
          </div>

          <div>
            <div style={labelStyle}>Şablon seçin</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
              {templates.map(tp => (
                <div key={tp.id} onClick={() => setTemplate(tp.id)} style={{
                  background: tp.bg, borderRadius: 10, aspectRatio: '3/4',
                  border: template === tp.id ? '2.5px solid #0A0A0A' : tp.border ? '1px solid #E5E5E5' : '2.5px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform .18s', transform: template === tp.id ? 'scale(1.04)' : 'scale(1)',
                  boxShadow: template === tp.id ? '0 4px 16px rgba(0,0,0,.12)' : 'none',
                }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: tp.fg, opacity: 0.8, letterSpacing: '0.08em' }}>{tp.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={labelStyle}>Yazı</div>
            <input style={{ ...inputStyle, marginTop: 8 }} defaultValue="Deneyiminizi paylaşın" />
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={labelStyle}>Aktif platformlar</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {(data.platforms || ['google']).map(pid => (
                <PlatformLogo key={pid} id={pid} size={32} rounded={8} />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
            <button onClick={() => { setShowConfetti(true); setTimeout(onFinish, 2000); }} className="bz-btn-primary" style={{
              flex: 1, padding: '16px 0', background: '#0A0A0A', color: '#fff', border: 'none',
              borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>
              🎉 Yayınla & İndir
            </button>
          </div>
          <div style={{ marginTop: 10, textAlign: 'center', fontSize: 13, color: '#A3A3A3' }}>PDF + PNG + SVG olarak indirilecek</div>
        </div>

        {/* QR preview card */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={{
            background: t.bg, borderRadius: 20, padding: 28,
            border: t.border ? '1px solid #E5E5E5' : 'none',
            boxShadow: '0 30px 60px -20px rgba(0,0,0,.2)',
            aspectRatio: '3/4', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: t.fg, letterSpacing: '-0.01em' }}>
                {data.bizName || 'İşletme Adı'}
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: t.fg, opacity: 0.55, textAlign: 'right', lineHeight: 1.4 }}>
                MASA<br/><span style={{ fontSize: 18, opacity: 1 }}>01</span>
              </div>
            </div>

            {/* QR */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: '#FFFFFF', borderRadius: 14, padding: 14 }}>
                <svg viewBox="0 0 120 120" width="160" height="160">
                  <rect width="120" height="120" fill="#fff" />
                  {/* finder patterns */}
                  {[[6,6],[90,6],[6,90]].map(([x,y], i) => (
                    <g key={i}>
                      <rect x={x} y={y} width="24" height="24" fill="none" stroke={t.bg === '#C6F24E' ? '#0A0A0A' : '#0A0A0A'} strokeWidth="4" />
                      <rect x={x+7} y={y+7} width="10" height="10" fill="#0A0A0A" />
                    </g>
                  ))}
                  {/* data modules */}
                  {Array.from({length: 200}).map((_, i) => {
                    const x = (i * 37 + 13) % 100, y = (i * 53 + 7) % 100;
                    if (x < 36 && y < 36) return null;
                    if (x > 78 && y < 36) return null;
                    if (x < 36 && y > 78) return null;
                    return <rect key={i} x={x * 1.1 + 5} y={y * 1.1 + 5} width="4" height="4" fill="#0A0A0A" opacity={0.9} />;
                  })}
                </svg>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 600, color: t.fg, letterSpacing: '-0.01em' }}>
                Deneyiminizi paylaşın
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: t.fg, opacity: 0.55, marginTop: 4 }}>
                buaze.co/r/ark-kadikoy
              </div>
              {/* Platform badges */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10 }}>
                {(data.platforms || ['google']).slice(0, 3).map(pid => (
                  <PlatformLogo key={pid} id={pid} size={24} rounded={6} />
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, padding: '10px 16px', background: '#EAF9B8', borderRadius: 10, fontSize: 13, textAlign: 'center', display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
            <span>✓</span> Google politikalarına uyumlu · Tek tıkla değiştirilebilir
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Done screen ──
function OnboardingDone() {
  return (
    <div className="bz-scale-in" style={{ maxWidth: 540, margin: '0 auto', textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ width: 96, height: 96, borderRadius: 999, background: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 44 }}>
        🎉
      </div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 48, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        Kurulum tamamlandı!
      </div>
      <div style={{ fontSize: 16, color: '#525252', marginTop: 12, lineHeight: 1.6 }}>
        QR kodunuz hazır. Masanıza yapıştırdıktan sonra ilk yorumunuz aynı gün gelir.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 32 }}>
        <button className="bz-btn-primary" style={{ padding: '16px 0', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
          Panele git →
        </button>
        <button style={{ padding: '14px 0', background: '#EAF9B8', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          QR'ı tekrar indir
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 40 }}>
        {[
          { k: '1 dk', l: 'Bağlantı aşaması' },
          { k: 'Bugün', l: 'İlk yorum' },
          { k: '+184%', l: 'Yorum artışı (90 gün)' },
        ].map(x => (
          <div key={x.l} style={{ borderTop: '2px solid #EDEDED', paddingTop: 10 }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 600 }}>{x.k}</div>
            <div style={{ fontSize: 11, color: '#737373', marginTop: 3 }}>{x.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SHARED STYLES ──
const labelStyle = {
  display: 'block',
  fontFamily: "'JetBrains Mono',monospace", fontSize: 10, letterSpacing: '0.16em',
  color: '#737373', textTransform: 'uppercase', fontWeight: 600, marginBottom: 6,
};
const inputStyle = {
  width: '100%', padding: '14px 16px',
  border: '1.5px solid #E5E5E5', borderRadius: 12,
  fontSize: 15, fontFamily: "'Inter',sans-serif", color: '#0A0A0A',
  background: '#FFFFFF', outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
  boxSizing: 'border-box',
};

// ── MAIN ONBOARDING ──
function OnboardingV2() {
  const { Lockup } = PB9();
  const [step, setStep] = useOB(0);
  const [data, setData] = useOB({ platforms: ['google'] });
  const [done, setDone] = useOB(false);

  const onChange = (key, val) => setData(d => ({ ...d, [key]: val }));

  const canNext = () => {
    if (step === 0) return data.bizName && data.bizName.length > 1;
    if (step === 1) return !!data.sector;
    if (step === 2) return data.locName && data.address;
    if (step === 3) return (data.platforms || []).length > 0;
    return true;
  };

  const steps = [
    <Step1 data={data} onChange={onChange} />,
    <Step2 data={data} onChange={onChange} />,
    <Step3 data={data} onChange={onChange} />,
    <Step4 data={data} onChange={onChange} />,
    <Step5 data={data} onFinish={() => setDone(true)} />,
  ];

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAFA', fontFamily: "'Inter',sans-serif" }}>
        <div style={{ padding: '18px 48px', background: '#fff', borderBottom: '1px solid #EDEDED', display: 'flex', justifyContent: 'center' }}>
          <Lockup size="sm" color="#0A0A0A" accent="#C6F24E" />
        </div>
        <OnboardingDone />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: '#FAFAFA', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Logo bar */}
      <div style={{ padding: '18px 48px', background: '#fff', borderBottom: '1px solid #EDEDED', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Lockup size="sm" color="#0A0A0A" accent="#C6F24E" />
        <div style={{ fontSize: 13, color: '#A3A3A3' }}>
          Adım {step + 1} / 5 &nbsp;·&nbsp; <span style={{ color: '#0A0A0A', fontWeight: 600, cursor: 'pointer' }}>Sonra tamamla</span>
        </div>
      </div>

      {/* Progress */}
      <OnboardingProgress step={step} />

      {/* Content */}
      <div style={{ flex: 1, padding: '48px 48px 120px', overflowY: 'auto' }}>
        {steps[step]}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '1px solid #EDEDED', padding: '18px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          style={{ padding: '12px 24px', background: 'none', border: '1.5px solid #E5E5E5', borderRadius: 999, fontSize: 14, fontWeight: 500, cursor: step === 0 ? 'default' : 'pointer', opacity: step === 0 ? 0.35 : 1, fontFamily: "'Inter',sans-serif" }}>
          ← Geri
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 999, background: i <= step ? '#0A0A0A' : '#E5E5E5', transition: 'all .3s' }} />
          ))}
        </div>

        {step < 4 ? (
          <button
            onClick={() => { if (canNext()) setStep(s => s + 1); }}
            className="bz-btn-primary"
            style={{
              padding: '12px 28px', background: canNext() ? '#0A0A0A' : '#E5E5E5',
              color: canNext() ? '#fff' : '#A3A3A3',
              border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700,
              cursor: canNext() ? 'pointer' : 'default', fontFamily: "'Inter',sans-serif",
              transition: 'all .2s',
            }}>
            Devam et →
          </button>
        ) : (
          <div style={{ width: 130 }} />
        )}
      </div>
    </div>
  );
}

window.OnboardingV2 = OnboardingV2;
