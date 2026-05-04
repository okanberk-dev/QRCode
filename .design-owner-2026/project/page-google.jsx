/* Page: Google Yorumları */

const GOOGLE_DIST = [
  { star: 5, count: 1842, pct: 71 },
  { star: 4, count: 412, pct: 16 },
  { star: 3, count: 156, pct: 6 },
  { star: 2, count: 92, pct: 4 },
  { star: 1, count: 78, pct: 3 },
];

const GOOGLE_REVIEWS = [
  { id: 1, name: 'Cansu Aktaş', initials: 'CA', rating: 5, time: '2 saat önce', body: 'Kadıköy\'de gerçekten kaliteli bir mekan. Özellikle ev yapımı makarnaları efsane. Şefin masamıza gelip sohbet etmesi de güzel bir detaydı.', replied: false, photos: 2 },
  { id: 2, name: 'Hakan Özkan', initials: 'HÖ', rating: 4, time: '5 saat önce', body: 'Yemekler çok lezzetli, atmosfer harika. Tek dezavantaj rezervasyon almak biraz zor. İnternetten önceden yer ayırmak lazım.', replied: true, photos: 0 },
  { id: 3, name: 'Zeynep Korkmaz', initials: 'ZK', rating: 2, time: '1 gün önce', body: 'Yemekleri beğendim ama 35 dakika beklemek zor oldu. Garsonlar da çok yoğundu, su istediğimizde unuttular.', replied: false, photos: 0 },
  { id: 4, name: 'Mert Yılmaz', initials: 'MY', rating: 5, time: '2 gün önce', body: 'Doğum günümü kutladık, ekip çok ilgiliydi. Pasta ikram ettiler. Teşekkürler!', replied: true, photos: 1 },
];

const KEYWORDS = [
  { word: 'lezzet', mentions: 482, sentiment: 'pos' },
  { word: 'servis', mentions: 318, sentiment: 'mixed' },
  { word: 'atmosfer', mentions: 256, sentiment: 'pos' },
  { word: 'fiyat', mentions: 184, sentiment: 'neg' },
  { word: 'müzik', mentions: 92, sentiment: 'mixed' },
  { word: 'park', mentions: 64, sentiment: 'neg' },
];

const GooglePage = () => {
  const totalReviews = 2580;
  const avg = 4.7;

  return (
    <PanelShell
      active="google"
      topbar={
        <PanelTopbar
          eyebrow="GOOGLE YORUMLARI"
          title="Google Business Profile"
          sub="Kadıköy Bistro · Place ID: ChIJ9X8q...4mZ — son senkron 2 dakika önce."
          actions={<>
            <button className="bz-btn-ghost"><Icon name="link" size={14}/> Profili görüntüle</button>
            <button className="bz-btn-ghost"><Icon name="refresh" size={14}/> Senkronize et</button>
            <button className="bz-btn-primary"><Icon name="reply" size={14}/> Yanıt sırası ({GOOGLE_REVIEWS.filter(r=>!r.replied).length})</button>
          </>}
        />
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Hero rating card (dark) */}
        <div style={{
          background: 'var(--bz-graphite)',
          color: '#FFF',
          borderRadius: 18,
          padding: '26px 26px',
          display: 'flex', alignItems: 'center', gap: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* lime corner accent */}
          <div style={{
            position: 'absolute', top: 18, right: 22,
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'var(--bz-lime)',
          }}>
            <Icon name="google" size={14} color="#C6F24E"/>
            <span className="bz-mono" style={{ fontSize: 10, letterSpacing: '0.16em' }}>GOOGLE</span>
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 80, lineHeight: 0.9, letterSpacing: '-0.04em',
              fontWeight: 500, fontVariantNumeric: 'tabular-nums',
            }}>{avg}</div>
            <div style={{ display: 'flex', gap: 2, marginTop: 8, color: 'var(--bz-lime)' }}>
              {[1,2,3,4,5].map(i => (
                <svg key={i} width={18} height={18} viewBox="0 0 24 24" fill={i <= Math.round(avg) ? '#C6F24E' : '#262626'}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="bz-eyebrow" style={{ color: 'var(--bz-n400)', marginBottom: 6 }}>SON 12 AY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {GOOGLE_DIST.map(d => (
                <div key={d.star} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)', width: 16 }}>{d.star}★</span>
                  <div style={{ flex: 1, height: 6, background: '#262626', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${d.pct}%`, height: '100%', background: d.star >= 4 ? 'var(--bz-lime)' : d.star === 3 ? 'var(--bz-n400)' : '#7F1D1D' }}></div>
                  </div>
                  <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)', width: 40, textAlign: 'right' }}>{d.count.toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="bz-card" style={{ padding: 22, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignContent: 'space-between' }}>
          {[
            { label: 'TOPLAM YORUM', value: totalReviews.toLocaleString('tr-TR'), delta: '+184', dir: 'up', sub: 'son 30 gün' },
            { label: 'YANITLANAN', value: '92%', delta: '+8%', dir: 'up', sub: 'sektör ort. 64%' },
            { label: 'ORT. YANIT SÜRESİ', value: '1.6 sa', delta: '-22%', dir: 'up', sub: 'AI ile' },
            { label: 'BU AY YENİ', value: '142', delta: '+12%', dir: 'up', sub: 'haftalık 32' },
          ].map((s, i) => (
            <div key={i} className="bz-kpi">
              <span className="bz-kpi-label">{s.label}</span>
              <span className="bz-kpi-value" style={{ fontSize: 28 }}>{s.value}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`bz-kpi-delta ${s.dir}`}>
                  <Icon name="arrowUp" size={11}/> {s.delta}
                </span>
                <span className="bz-mono" style={{ fontSize: 10.5, color: 'var(--bz-n500)' }}>{s.sub}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Reviews stream */}
        <div className="bz-card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bz-n200)', gap: 12 }}>
            <h3 style={{ fontSize: 15 }}>Son Google yorumları</h3>
            <span className="bz-badge bz-badge--ghost">{GOOGLE_REVIEWS.length}</span>
            <div style={{ flex: 1 }} />
            <div className="bz-tabs" style={{ width: 'auto', borderBottom: 0 }}>
              <button className="bz-tab" aria-selected="true">Tümü</button>
              <button className="bz-tab">Yanıtsız</button>
              <button className="bz-tab">Düşük puan</button>
            </div>
          </div>
          <div>
            {GOOGLE_REVIEWS.map((r, i) => (
              <div key={r.id} style={{
                padding: '18px 20px',
                borderBottom: i < GOOGLE_REVIEWS.length - 1 ? '1px solid var(--bz-n200)' : 0,
                display: 'flex', gap: 14,
              }}>
                <div className="bz-avatar bz-avatar--lg" style={{
                  background: r.rating >= 4 ? 'var(--bz-lime-soft)' : '#FEF2F2',
                  color: r.rating >= 4 ? 'var(--bz-graphite)' : '#991B1B',
                }}>{r.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.name}</span>
                    <Stars value={r.rating} size={12} />
                    <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)' }}>· {r.time}</span>
                    {r.replied
                      ? <span className="bz-badge bz-badge--ok" style={{ marginLeft: 'auto' }}><Icon name="check" size={10}/> Yanıtlandı</span>
                      : <span className="bz-badge bz-badge--warn" style={{ marginLeft: 'auto' }}><span className="dot"/> Bekliyor</span>
                    }
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--bz-n800)', margin: '6px 0 10px', lineHeight: 1.6 }}>
                    {r.body}
                  </p>
                  {r.replied && (
                    <div style={{
                      borderLeft: '3px solid var(--bz-lime)',
                      background: 'var(--bz-n50)',
                      padding: '10px 14px',
                      borderRadius: '0 10px 10px 0',
                      marginTop: 8,
                    }}>
                      <div className="bz-eyebrow" style={{ marginBottom: 4 }}>Kadıköy Bistro yanıtladı · 1 gün önce</div>
                      <p style={{ fontSize: 12.5, color: 'var(--bz-n800)', margin: 0, lineHeight: 1.55 }}>
                        Hakan Bey, ilginiz için teşekkürler. Hafta içi 19:00 öncesi rezervasyon önermiyoruz, gelin tadını çıkarın.
                      </p>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    {!r.replied && <button className="bz-btn-primary bz-btn-sm"><Icon name="sparkle" size={12}/> AI yanıt</button>}
                    {!r.replied && <button className="bz-btn-ghost bz-btn-sm"><Icon name="reply" size={12}/> Manuel</button>}
                    {r.replied && <button className="bz-btn-ghost bz-btn-sm"><Icon name="edit" size={12}/> Yanıtı düzenle</button>}
                    <button className="bz-btn-ghost bz-btn-sm"><Icon name="flag" size={12}/> Bildir</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile health */}
          <div className="bz-card" style={{ padding: 18 }}>
            <div className="bz-eyebrow" style={{ marginBottom: 12 }}>PROFİL SAĞLIĞI</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
              <span className="bz-h-tight-2" style={{ fontSize: 30 }}>92<span style={{ color: 'var(--bz-n400)', fontSize: 18 }}>/100</span></span>
              <span className="bz-badge bz-badge--lime"><span className="dot"/> Mükemmel</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              {[
                { l: 'Profil tamlığı', v: '%100', ok: true },
                { l: 'Yanıt oranı', v: '%92', ok: true },
                { l: 'Fotoğraf sayısı', v: '34', ok: true },
                { l: 'Q&A bölümü', v: '6 boş soru', ok: false },
              ].map((x, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: x.ok ? 'var(--bz-lime-soft)' : '#FEF3C7',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: x.ok ? '#4D5C00' : '#92400E',
                  }}>
                    <Icon name={x.ok ? 'check' : 'x'} size={9} />
                  </span>
                  <span style={{ color: 'var(--bz-n600)' }}>{x.l}</span>
                  <span className="bz-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--bz-graphite)', fontWeight: 600 }}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="bz-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="bz-eyebrow">SIK GEÇEN KELİMELER</span>
              <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n400)', marginLeft: 'auto' }}>NLP</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {KEYWORDS.map(k => (
                <div key={k.word} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--bz-graphite)' }}>{k.word}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--bz-n100)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(k.mentions / 482) * 100}%`, height: '100%',
                      background: k.sentiment === 'pos' ? 'var(--bz-lime-deep)' : k.sentiment === 'neg' ? '#DC2626' : 'var(--bz-n400)',
                    }}></div>
                  </div>
                  <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>{k.mentions}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick reply templates */}
          <div className="bz-card-soft" style={{ padding: 16 }}>
            <div className="bz-eyebrow" style={{ marginBottom: 8 }}>HIZLI YANIT ŞABLONLARI</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Pozitif yorum teşekkürü', 'Düşük puan özrü', 'Şikayet sahibine arama', 'Doğum günü teşekkürü'].map((t, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 8,
                  background: '#FFF', border: '1px solid var(--bz-n200)',
                  fontSize: 12, color: 'var(--bz-n800)', cursor: 'pointer',
                }}>
                  <Icon name="reply" size={11} />
                  {t}
                  <Icon name="chevronRight" size={11} color="var(--bz-n400)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
};

window.GooglePage = GooglePage;
