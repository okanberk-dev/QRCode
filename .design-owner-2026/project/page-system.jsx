/* Page: System Overview (00) — visual design system summary */

const SystemPage = () => (
  <div style={{
    width: '100%', minHeight: '100%',
    background: '#FFFFFF',
    padding: '40px 48px 56px',
    fontFamily: 'var(--font-body)',
    color: 'var(--bz-graphite)',
  }}>
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
        <Wordmark size={36}/>
        <div className="bz-eyebrow" style={{ marginTop: 6 }}>
          PULSE 2026 · OWNER PANEL · TASARIM SİSTEMİ
        </div>
        <h1 style={{ fontSize: 48, lineHeight: 1.05, letterSpacing: '-0.035em' }}>
          Restoran sahibinin nabzı.<br/>
          <span style={{ color: 'var(--bz-n400)' }}>Tek panel, her platform.</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--bz-n600)', lineHeight: 1.55, margin: 0 }}>
          Buaze owner paneli, mevcut <span className="bz-mono" style={{ background: 'var(--bz-lime-soft)', padding: '1px 6px', borderRadius: 4 }}>Pulse</span> tasarım sistemi temel alınarak yeniden inşa edildi: yoğun veri, sade arayüz, lime aksent.
        </p>
      </div>
      <div style={{
        width: 220, padding: 18,
        border: '1px solid var(--bz-n200)', borderRadius: 16,
        background: 'var(--bz-n50)',
      }}>
        <div className="bz-eyebrow" style={{ marginBottom: 8 }}>SAYFA İNDEKSİ</div>
        <ol style={{ paddingLeft: 16, margin: 0, fontSize: 12.5, color: 'var(--bz-n700)', lineHeight: 1.85 }}>
          <li>Yorumlar (Inbox)</li>
          <li>Google Yorumları</li>
          <li>Platform Bağlantıları</li>
          <li>Hesabım</li>
          <li>Analitik</li>
          <li>Müşteriler · CRM</li>
        </ol>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
      {/* Color */}
      <section>
        <div className="bz-eyebrow" style={{ marginBottom: 12 }}>RENK · BRAND PALETI</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          {[
            { c: '#0A0A0A', l: 'Graphite', code: '#0A0A0A', dark: true },
            { c: '#C6F24E', l: 'Lime', code: '#C6F24E' },
            { c: '#A8D62E', l: 'Lime Deep', code: '#A8D62E' },
            { c: '#EAF9B8', l: 'Lime Soft', code: '#EAF9B8' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{
                height: 88, borderRadius: 12,
                background: s.c, border: '1px solid var(--bz-n200)',
                display: 'flex', alignItems: 'flex-end', padding: 10,
                color: s.dark ? '#FFF' : 'var(--bz-graphite)',
              }}>
                <span className="bz-mono" style={{ fontSize: 10 }}>{s.code}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div className="bz-eyebrow" style={{ marginBottom: 8 }}>NÖTRLAR</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#FAFAFA','#F2F2F2','#EDEDED','#D4D4D4','#A3A3A3','#737373','#525252','#333333','#1A1A1A','#0A0A0A'].map((c, i) => (
            <div key={i} style={{ flex: 1, height: 36, background: c, borderRadius: 4 }}/>
          ))}
        </div>
      </section>

      {/* Type */}
      <section>
        <div className="bz-eyebrow" style={{ marginBottom: 12 }}>TİPOGRAFİ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 36, letterSpacing: '-0.035em', fontWeight: 500 }}>Space Grotesk</div>
            <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>display · 500 · -0.025em</div>
          </div>
          <div className="bz-divider"/>
          <div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 18 }}>Inter — yapı taşları, içerik, etiketler</div>
            <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>body · 400/500/600</div>
          </div>
          <div className="bz-divider"/>
          <div>
            <div className="bz-mono" style={{ fontSize: 16, fontWeight: 500 }}>JetBrains Mono · 1,284 · 4.71 · ₺2.490</div>
            <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>mono · sayılar, kodlar, eyebrow</div>
          </div>
        </div>
      </section>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 32 }}>
      {/* Buttons */}
      <section className="bz-card" style={{ padding: 22 }}>
        <div className="bz-eyebrow" style={{ marginBottom: 14 }}>DÜĞMELER</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <button className="bz-btn-primary"><Icon name="sparkle" size={13}/> Primary · Graphite</button>
          <button className="bz-btn-lime"><Icon name="check" size={13}/> Lime · Action</button>
          <button className="bz-btn-ghost"><Icon name="filter" size={13}/> Ghost · Secondary</button>
          <button className="bz-btn-primary bz-btn-sm"><Icon name="plus" size={11}/> Small</button>
        </div>
      </section>

      {/* Badges */}
      <section className="bz-card" style={{ padding: 22 }}>
        <div className="bz-eyebrow" style={{ marginBottom: 14 }}>DURUM ETİKETLERİ</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span className="bz-badge bz-badge--ok"><span className="dot"/>Bağlı</span>
          <span className="bz-badge bz-badge--lime"><span className="dot"/>VIP</span>
          <span className="bz-badge bz-badge--dark"><span className="dot"/>Owner</span>
          <span className="bz-badge bz-badge--warn"><span className="dot"/>Bekliyor</span>
          <span className="bz-badge bz-badge--danger"><span className="dot"/>Hata</span>
          <span className="bz-badge bz-badge--info"><span className="dot"/>Bilgi</span>
          <span className="bz-badge bz-badge--ghost">Nötr</span>
          <span className="bz-badge bz-badge--off"><span className="dot"/>Pasif</span>
        </div>
      </section>

      {/* Inputs */}
      <section className="bz-card" style={{ padding: 22 }}>
        <div className="bz-eyebrow" style={{ marginBottom: 14 }}>FORMLAR</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="bz-input" defaultValue="Kadıköy Bistro"/>
          <input className="bz-input" placeholder="Ara…" />
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="bz-pulse-dot"/>
            <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>canlı sync</span>
          </div>
        </div>
      </section>
    </div>

    {/* Anatomy */}
    <section style={{ marginBottom: 32 }}>
      <div className="bz-eyebrow" style={{ marginBottom: 14 }}>SAYFA ANATOMİSİ</div>
      <div style={{
        display: 'grid', gridTemplateColumns: '180px 1fr',
        height: 360, border: '1px solid var(--bz-n200)', borderRadius: 16, overflow: 'hidden',
      }}>
        <div style={{ background: '#FFF', borderRight: '1px solid var(--bz-n200)', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 24, background: 'var(--bz-n100)', borderRadius: 6 }}/>
          <div style={{ height: 32, background: 'var(--bz-n50)', borderRadius: 8, marginTop: 8 }}/>
          <div style={{ height: 12, background: 'var(--bz-lime)', borderRadius: 4, marginTop: 8 }}/>
          <div style={{ height: 12, background: 'var(--bz-n100)', borderRadius: 4 }}/>
          <div style={{ height: 12, background: 'var(--bz-n100)', borderRadius: 4 }}/>
          <div style={{ marginTop: 8, fontSize: 10, color: 'var(--bz-n500)', fontFamily: 'var(--font-mono)' }}>248px sidebar</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--bz-n200)', padding: 16, display: 'flex' }}>
            <div>
              <div style={{ height: 8, width: 80, background: 'var(--bz-n200)', borderRadius: 2, marginBottom: 6 }}/>
              <div style={{ height: 18, width: 220, background: 'var(--bz-graphite)', borderRadius: 4 }}/>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <div style={{ width: 80, height: 28, background: 'var(--bz-n100)', borderRadius: 999 }}/>
              <div style={{ width: 100, height: 28, background: 'var(--bz-graphite)', borderRadius: 999 }}/>
            </div>
          </div>
          <div style={{ flex: 1, padding: 16, background: 'var(--bz-n50)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background: '#FFF', border: '1px solid var(--bz-n200)', borderRadius: 12, padding: 12 }}>
                <div style={{ height: 8, width: 50, background: 'var(--bz-n200)', borderRadius: 2, marginBottom: 8 }}/>
                <div style={{ height: 22, width: '60%', background: 'var(--bz-graphite)', borderRadius: 4 }}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Principles */}
    <section>
      <div className="bz-eyebrow" style={{ marginBottom: 14 }}>TASARIM İLKELERİ</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { t: 'Yoğun veri, sakin yüzey', s: 'Linear/Vercel yoğunluğu, gereksiz dekorasyon yok.' },
          { t: 'Lime ile aksent', s: 'Tek vurgu rengi — sadece aksiyon, durum, marka anı.' },
          { t: 'Tabular sayılar', s: 'JetBrains Mono ile hizalı sütunlar, hızlı tarama.' },
          { t: 'Türkçe-öncelikli', s: 'Lokalize edilebilir kopya, EN varyant ikincil.' },
        ].map((p, i) => (
          <div key={i} style={{ padding: 18, border: '1px solid var(--bz-n200)', borderRadius: 14 }}>
            <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-lime-deep)', fontWeight: 600, marginBottom: 8 }}>0{i+1}</div>
            <h4 style={{ fontSize: 14, marginBottom: 6 }}>{p.t}</h4>
            <p style={{ fontSize: 12.5, color: 'var(--bz-n500)', margin: 0, lineHeight: 1.55 }}>{p.s}</p>
          </div>
        ))}
      </div>
    </section>
  </div>
);

window.SystemPage = SystemPage;
