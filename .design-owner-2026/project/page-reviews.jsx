/* Page: Yorumlar (Reviews) — 3-column inbox with AI Co-Pilot */

const REVIEWS = [
  { id: 1, name: 'Mert Demir', initials: 'MD', rating: 2, time: '14 dk önce', platform: 'Google', tableNo: 'Masa 7', preview: 'Servis çok yavaştı, masamıza gelmesi 25 dakika sürdü. Yemekler güzeldi ama bekleme süresi kötüydü.', sentiment: 'negative', selected: true, replied: false, source: 'qr' },
  { id: 2, name: 'Ayşe Yıldız', initials: 'AY', rating: 5, time: '38 dk önce', platform: 'Yemeksepeti', tableNo: 'Paket #482', preview: 'Mantar soslu makarna mükemmeldi. Sunum çok özenliydi, kesinlikle tekrar geleceğim.', sentiment: 'positive', selected: false, replied: true, source: 'platform' },
  { id: 3, name: 'Burak Şen', initials: 'BŞ', rating: 4, time: '1 sa önce', platform: 'Google', tableNo: 'Masa 12', preview: 'Atmosfer hoş, yemekler lezzetli. Tek eksik müzik biraz yüksekti.', sentiment: 'positive', selected: false, replied: false, source: 'qr' },
  { id: 4, name: 'Selin Tekin', initials: 'ST', rating: 3, time: '2 sa önce', platform: 'Trendyol GO', tableNo: 'Paket #481', preview: 'Pizzanın hamuru iyiydi ama soğuk geldi. Diğer her şey güzel.', sentiment: 'neutral', selected: false, replied: false, source: 'platform' },
  { id: 5, name: 'Can Aksoy', initials: 'CA', rating: 5, time: '3 sa önce', platform: 'Buaze QR', tableNo: 'Masa 3', preview: 'Şef çok ilgiliydi, doğum günümü unutmamış. Masaya pasta gönderdiler. Teşekkürler!', sentiment: 'positive', selected: false, replied: false, source: 'qr' },
  { id: 6, name: 'Deniz Polat', initials: 'DP', rating: 1, time: '4 sa önce', platform: 'Google', tableNo: 'Masa 18', preview: 'Rezervasyon yaptırdığımız halde 40 dakika beklettiler. Kabul edilemez.', sentiment: 'negative', selected: false, replied: false, source: 'qr' },
  { id: 7, name: 'Esra Korkmaz', initials: 'EK', rating: 4, time: '5 sa önce', platform: 'Getir', tableNo: 'Paket #476', preview: 'Lezzet harika, paketleme çok düzgündü. Sıcaklık biraz düşmüştü.', sentiment: 'positive', selected: false, replied: true, source: 'platform' },
  { id: 8, name: 'Furkan Aydın', initials: 'FA', rating: 5, time: 'dün', platform: 'Buaze QR', tableNo: 'Masa 5', preview: 'En sevdiğim mekan oldu. Garson Ali Bey çok ilgiliydi.', sentiment: 'positive', selected: false, replied: true, source: 'qr' },
];

const FILTERS = [
  { id: 'all', label: 'Tümü', count: 28, active: true },
  { id: 'unread', label: 'Okunmamış', count: 12 },
  { id: 'low', label: 'Düşük puan', count: 4, tone: 'danger' },
  { id: 'replied', label: 'Yanıtlandı', count: 14 },
  { id: 'pending', label: 'Beklemede', count: 6 },
];

const PLATFORMS = [
  { id: 'all', label: 'Tüm platformlar' },
  { id: 'google', label: 'Google' },
  { id: 'qr', label: 'Buaze QR' },
  { id: 'yemeksepeti', label: 'Yemeksepeti' },
  { id: 'getir', label: 'Getir' },
  { id: 'trendyol', label: 'Trendyol GO' },
];

const ReviewsPage = () => {
  const selected = REVIEWS.find(r => r.selected) || REVIEWS[0];

  return (
    <PanelShell
      active="reviews"
      topbar={
        <PanelTopbar
          eyebrow="YORUMLAR"
          title="Yorum Kutusu"
          sub="Tüm platformlardan gelen geri bildirimler tek yerde. AI Co-Pilot ile saniyeler içinde profesyonel yanıt taslağı oluştur."
          actions={<>
            <button className="bz-btn-ghost"><Icon name="download" size={14}/> CSV</button>
            <button className="bz-btn-ghost"><Icon name="filter" size={14}/> Filtre</button>
            <button className="bz-btn-primary"><Icon name="sparkle" size={14}/> Toplu yanıtla</button>
          </>}
        />
      }
      contentStyle={{ padding: 0, background: '#FFFFFF' }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr 360px', height: '100%', minHeight: 0 }}>
        {/* Left: filter rail */}
        <div style={{
          borderRight: '1px solid var(--bz-n200)',
          padding: '20px 16px',
          display: 'flex', flexDirection: 'column', gap: 22,
          overflow: 'auto',
        }} className="bz-scroll">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="bz-eyebrow" style={{ padding: '0 8px 8px' }}>DURUM</div>
            {FILTERS.map(f => (
              <div key={f.id} className={`bz-side-item ${f.active ? 'active' : ''}`}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: f.tone === 'danger' ? 'var(--bz-danger)' : 'var(--bz-n400)',
                }}></span>
                <span>{f.label}</span>
                <span className="count">{f.count}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="bz-eyebrow" style={{ padding: '0 8px 8px' }}>PLATFORM</div>
            {PLATFORMS.map(p => (
              <div key={p.id} className="bz-side-item">
                <Icon name={p.id === 'google' ? 'google' : p.id === 'qr' ? 'qr' : 'plug'} size={14} />
                <span>{p.label}</span>
              </div>
            ))}
          </div>

          <div className="bz-card-soft" style={{ padding: 14 }}>
            <div className="bz-eyebrow" style={{ marginBottom: 6 }}>BU HAFTA</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span className="bz-h-tight-2" style={{ fontSize: 22 }}>4.62</span>
              <Stars value={5} size={11} />
            </div>
            <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>
              <span style={{ color: 'var(--bz-success)' }}>↑ 0.18</span> · 142 yorum
            </div>
          </div>
        </div>

        {/* Middle: review list */}
        <div style={{
          borderRight: '1px solid var(--bz-n200)',
          display: 'flex', flexDirection: 'column',
          minWidth: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid var(--bz-n200)',
            background: 'var(--bz-n50)',
          }}>
            <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)', letterSpacing: '0.1em' }}>
              28 YORUM · BUGÜN
            </span>
            <div style={{ flex: 1 }} />
            <button className="bz-btn-ghost bz-btn-sm"><Icon name="filter" size={12}/> En yeni</button>
          </div>

          <div style={{ overflow: 'auto', flex: 1 }} className="bz-scroll">
            {REVIEWS.map(r => (
              <div key={r.id} style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--bz-n200)',
                background: r.selected ? 'var(--bz-n50)' : '#FFF',
                borderLeft: r.selected ? '3px solid var(--bz-graphite)' : '3px solid transparent',
                cursor: 'pointer',
                display: 'flex', gap: 12,
              }}>
                <div className="bz-avatar" style={{
                  background: r.sentiment === 'negative' ? '#FEF2F2' : r.sentiment === 'positive' ? 'var(--bz-lime-soft)' : 'var(--bz-n100)',
                  color: r.sentiment === 'negative' ? '#991B1B' : 'var(--bz-graphite)',
                }}>{r.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bz-graphite)' }}>{r.name}</span>
                    {!r.replied && r.rating <= 3 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bz-danger)' }}></span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Stars value={r.rating} size={10} />
                    <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n400)' }}>·</span>
                    <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)' }}>{r.platform}</span>
                    <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n400)' }}>·</span>
                    <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)' }}>{r.tableNo}</span>
                  </div>
                  <p style={{
                    fontSize: 12.5, color: 'var(--bz-n600)', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    lineHeight: 1.5,
                  }}>{r.preview}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n400)' }}>{r.time}</span>
                    {r.replied && (
                      <span className="bz-badge bz-badge--ok" style={{ height: 18, fontSize: 10 }}>
                        <Icon name="check" size={10} /> Yanıtlandı
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ overflow: 'auto', flex: 1 }} className="bz-scroll">
            {/* Hero */}
            <div style={{ padding: '20px 22px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div className="bz-avatar bz-avatar--lg" style={{ background: '#FEF2F2', color: '#991B1B' }}>{selected.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, lineHeight: 1.2 }}>{selected.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Stars value={selected.rating} size={13} />
                    <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>{selected.rating}.0</span>
                  </div>
                </div>
                <button className="bz-btn-icon" aria-label="more"><Icon name="moreH" size={16}/></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--bz-n200)', border: '1px solid var(--bz-n200)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '10px 12px', background: '#FFF' }}>
                  <div className="bz-eyebrow" style={{ fontSize: 10, marginBottom: 3 }}>PLATFORM</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{selected.platform}</div>
                </div>
                <div style={{ padding: '10px 12px', background: '#FFF' }}>
                  <div className="bz-eyebrow" style={{ fontSize: 10, marginBottom: 3 }}>KAYNAK</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{selected.tableNo}</div>
                </div>
              </div>

              <div className="bz-card-soft" style={{ padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 13.5, color: 'var(--bz-n800)', margin: 0, lineHeight: 1.6 }}>
                  {selected.preview}
                </p>
              </div>

              {/* AI Co-Pilot */}
              <div style={{
                border: '1px solid var(--bz-graphite)',
                borderRadius: 14,
                background: 'var(--bz-graphite)',
                color: '#FFF',
                padding: 14,
                marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span className="bz-eyebrow" style={{ color: 'var(--bz-lime)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="sparkle" size={12} color="#C6F24E"/> AI CO-PILOT
                  </span>
                  <span className="bz-mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--bz-n400)' }}>1.4s · GPT-4o</span>
                </div>
                <p style={{ fontSize: 13, color: '#FFF', margin: 0, lineHeight: 1.6 }}>
                  Merhaba Mert Bey, gecikme için içtenlikle özür dileriz. O akşam mutfakta yoğunluk yaşadığımızı ve servis süremizi etkilediğini görüyoruz. Tekrar ziyaretinizde size özel bir tatlı ikramında bulunmak isteriz.
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                  <button className="bz-btn-lime bz-btn-sm">Onayla & Gönder</button>
                  <button className="bz-btn-ghost bz-btn-sm" style={{ color: '#FFF', borderColor: 'rgba(255,255,255,0.2)' }}>
                    <Icon name="refresh" size={12}/> Yeniden
                  </button>
                  <button className="bz-btn-ghost bz-btn-sm" style={{ color: '#FFF', borderColor: 'rgba(255,255,255,0.2)' }}>
                    <Icon name="edit" size={12}/> Düzenle
                  </button>
                </div>
              </div>

              {/* Timeline */}
              <div className="bz-eyebrow" style={{ marginBottom: 10 }}>ZAMAN ÇİZELGESİ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { dot: 'lime', label: 'Yorum alındı', sub: '14 dk önce · Google üzerinden' },
                  { dot: 'mute', label: 'Notification gönderildi', sub: '13 dk önce · Slack #yorumlar' },
                  { dot: 'mute', label: 'AI taslak hazırlandı', sub: '12 dk önce · 1.4s' },
                ].map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', marginTop: 5,
                      background: t.dot === 'lime' ? 'var(--bz-lime-deep)' : 'var(--bz-n300)',
                      flexShrink: 0,
                    }}></span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--bz-graphite)' }}>{t.label}</div>
                      <div className="bz-mono" style={{ fontSize: 10.5, color: 'var(--bz-n500)' }}>{t.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
};

window.ReviewsPage = ReviewsPage;
