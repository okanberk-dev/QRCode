/* Page: Platform Bağlantıları */

const PLATFORMS_DATA = [
  { id: 'google', name: 'Google Business', cat: 'Yorum', status: 'connected', last: '2 dk önce', count: '2,580', accent: '#4285F4', icon: 'google' },
  { id: 'yemeksepeti', name: 'Yemeksepeti', cat: 'Sipariş', status: 'connected', last: '5 dk önce', count: '892', accent: '#FA0050', initials: 'YS' },
  { id: 'getir', name: 'Getir', cat: 'Sipariş', status: 'connected', last: '12 dk önce', count: '418', accent: '#5D3EBC', initials: 'G' },
  { id: 'trendyol', name: 'Trendyol GO', cat: 'Sipariş', status: 'error', last: '6 saat önce', count: '264', accent: '#F27A1A', initials: 'TY', error: 'Token süresi doldu' },
  { id: 'tripadvisor', name: 'Tripadvisor', cat: 'Yorum', status: 'connected', last: '1 saat önce', count: '186', accent: '#34E0A1', initials: 'TA' },
  { id: 'yelp', name: 'Yelp', cat: 'Yorum', status: 'pending', last: '—', count: '0', accent: '#D32323', initials: 'Y' },
  { id: 'foursquare', name: 'Foursquare', cat: 'Yorum', status: 'available', last: '—', count: '—', accent: '#F94877', initials: 'FS' },
  { id: 'instagram', name: 'Instagram', cat: 'Sosyal', status: 'connected', last: '34 dk önce', count: '1.2K', accent: '#E1306C', icon: 'instagram' },
  { id: 'facebook', name: 'Facebook', cat: 'Sosyal', status: 'connected', last: '2 saat önce', count: '482', accent: '#1877F2', icon: 'facebook' },
  { id: 'whatsapp', name: 'WhatsApp Business', cat: 'Mesaj', status: 'available', last: '—', count: '—', accent: '#25D366', initials: 'WA' },
  { id: 'slack', name: 'Slack', cat: 'Bildirim', status: 'connected', last: 'canlı', count: '#yorumlar', accent: '#4A154B', initials: 'SL' },
  { id: 'webhook', name: 'Webhook', cat: 'API', status: 'available', last: '—', count: '—', accent: '#0A0A0A', icon: 'link' },
];

const PlatformBadge = ({ status, error }) => {
  const map = {
    connected: { cls: 'ok', label: 'Bağlı' },
    error: { cls: 'danger', label: error || 'Hata' },
    pending: { cls: 'warn', label: 'Bekliyor' },
    available: { cls: 'ghost', label: 'Hazır' },
  };
  const m = map[status] || map.available;
  return <span className={`bz-badge bz-badge--${m.cls}`}><span className="dot"/>{m.label}</span>;
};

const PlatformLogo = ({ p }) => (
  <div style={{
    width: 40, height: 40, borderRadius: 10,
    background: p.status === 'available' ? 'var(--bz-n100)' : p.accent + '14',
    color: p.accent,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14,
    border: `1px solid ${p.status === 'available' ? 'var(--bz-n200)' : p.accent + '30'}`,
    flexShrink: 0,
  }}>
    {p.icon ? <Icon name={p.icon} size={20} color={p.accent} /> : p.initials}
  </div>
);

const PlatformsPage = () => {
  const connected = PLATFORMS_DATA.filter(p => p.status === 'connected').length;
  const errors = PLATFORMS_DATA.filter(p => p.status === 'error').length;
  const total = PLATFORMS_DATA.length;

  return (
    <PanelShell
      active="platforms"
      topbar={
        <PanelTopbar
          eyebrow="PLATFORM BAĞLANTILARI"
          title="Entegrasyonlar"
          sub="Her platformdan gelen yorumu, siparişi, mesajı tek panelde topla. Buaze 12+ servisle birebir konuşur."
          actions={<>
            <button className="bz-btn-ghost"><Icon name="key" size={14}/> API anahtarları</button>
            <button className="bz-btn-primary"><Icon name="plus" size={14}/> Yeni entegrasyon</button>
          </>}
        />
      }
    >
      {/* Health summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="bz-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="bz-eyebrow">BAĞLI</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="bz-h-tight-2" style={{ fontSize: 32 }}>{connected}</span>
            <span className="bz-mono" style={{ fontSize: 13, color: 'var(--bz-n400)' }}>/{total}</span>
          </div>
          <div style={{ height: 4, background: 'var(--bz-n100)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(connected/total)*100}%`, height: '100%', background: 'var(--bz-lime-deep)' }}></div>
          </div>
        </div>
        <div className="bz-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="bz-eyebrow">UYARI</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="bz-h-tight-2" style={{ fontSize: 32, color: errors ? 'var(--bz-danger)' : 'var(--bz-graphite)' }}>{errors}</span>
            <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>token yenileme</span>
          </div>
          <button className="bz-btn-ghost bz-btn-sm" style={{ alignSelf: 'flex-start', marginTop: 4 }}>Şimdi düzelt →</button>
        </div>
        <div className="bz-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="bz-eyebrow">SON 24 SA · OLAY</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="bz-h-tight-2" style={{ fontSize: 32 }}>1,284</span>
            <span className="bz-kpi-delta up"><Icon name="arrowUp" size={11}/> 12%</span>
          </div>
          <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>yorum + sipariş + mesaj</span>
        </div>
        <div className="bz-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bz-graphite)', color: '#FFF', border: 0 }}>
          <div className="bz-eyebrow" style={{ color: 'var(--bz-lime)' }}>WEBHOOK SAĞLIĞI</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span className="bz-h-tight-2" style={{ fontSize: 32, color: '#FFF' }}>99.94%</span>
            <span className="bz-pulse-dot"/>
          </div>
          <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)' }}>4,128 / 4,130 başarılı</span>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {['Tümü', 'Yorum', 'Sipariş', 'Sosyal', 'Mesaj', 'API'].map((c, i) => (
          <button key={c} className={i === 0 ? 'bz-btn-primary bz-btn-sm' : 'bz-btn-ghost bz-btn-sm'}>{c}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>{total} servis · alfabetik</span>
      </div>

      {/* Platform grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {PLATFORMS_DATA.map(p => (
          <div key={p.id} className="bz-card" style={{
            padding: 18,
            display: 'flex', flexDirection: 'column', gap: 14,
            opacity: p.status === 'available' ? 0.95 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <PlatformLogo p={p} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--bz-graphite)', letterSpacing: '-0.01em' }}>
                  {p.name}
                </div>
                <div className="bz-mono" style={{ fontSize: 10.5, color: 'var(--bz-n500)', marginTop: 2 }}>
                  {p.cat.toUpperCase()}
                </div>
              </div>
              <PlatformBadge status={p.status} error={p.error} />
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 1, background: 'var(--bz-n200)', borderRadius: 10, overflow: 'hidden',
              border: '1px solid var(--bz-n200)',
            }}>
              <div style={{ padding: '8px 10px', background: '#FFF' }}>
                <div className="bz-eyebrow" style={{ fontSize: 9.5, marginBottom: 2 }}>SON SENKRON</div>
                <div className="bz-mono" style={{ fontSize: 11.5, color: p.status === 'error' ? 'var(--bz-danger)' : 'var(--bz-graphite)', fontWeight: 600 }}>
                  {p.last}
                </div>
              </div>
              <div style={{ padding: '8px 10px', background: '#FFF' }}>
                <div className="bz-eyebrow" style={{ fontSize: 9.5, marginBottom: 2 }}>KAYIT</div>
                <div className="bz-mono" style={{ fontSize: 11.5, color: 'var(--bz-graphite)', fontWeight: 600 }}>
                  {p.count}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {p.status === 'connected' && (
                <>
                  <button className="bz-btn-ghost bz-btn-sm" style={{ flex: 1 }}><Icon name="settings" size={11}/> Ayarlar</button>
                  <button className="bz-btn-ghost bz-btn-sm"><Icon name="refresh" size={11}/></button>
                </>
              )}
              {p.status === 'error' && (
                <>
                  <button className="bz-btn-primary bz-btn-sm" style={{ flex: 1 }}>Yeniden bağla</button>
                  <button className="bz-btn-ghost bz-btn-sm"><Icon name="moreH" size={11}/></button>
                </>
              )}
              {p.status === 'pending' && (
                <button className="bz-btn-ghost bz-btn-sm" style={{ flex: 1 }}>Onay bekleniyor…</button>
              )}
              {p.status === 'available' && (
                <button className="bz-btn-lime bz-btn-sm" style={{ flex: 1 }}><Icon name="plus" size={11}/> Bağla</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Activity log */}
      <div className="bz-card" style={{ padding: 0, marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--bz-n200)' }}>
          <h3 style={{ fontSize: 14 }}>Son aktivite</h3>
          <span className="bz-pulse-dot" style={{ marginLeft: 8 }} />
          <div style={{ flex: 1 }} />
          <button className="bz-btn-ghost bz-btn-sm">Tüm log</button>
        </div>
        <table className="bz-table">
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Servis</th>
              <th>Olay</th>
              <th>Durum</th>
              <th>Süre</th>
            </tr>
          </thead>
          <tbody>
            {[
              { t: '14:32:08', s: 'Google', e: '3 yeni yorum çekildi', st: 'ok', d: '0.42s' },
              { t: '14:31:55', s: 'Yemeksepeti', e: 'Webhook · order.created', st: 'ok', d: '0.18s' },
              { t: '14:30:11', s: 'Slack', e: 'Düşük puan bildirimi gönderildi', st: 'ok', d: '0.09s' },
              { t: '14:28:42', s: 'Trendyol GO', e: 'OAuth refresh başarısız', st: 'danger', d: '—' },
              { t: '14:25:03', s: 'Instagram', e: '12 yeni mention sync', st: 'ok', d: '1.04s' },
            ].map((row, i) => (
              <tr key={i}>
                <td><span className="bz-mono" style={{ color: 'var(--bz-n500)', fontSize: 11.5 }}>{row.t}</span></td>
                <td style={{ fontWeight: 500 }}>{row.s}</td>
                <td>{row.e}</td>
                <td><span className={`bz-badge bz-badge--${row.st === 'ok' ? 'ok' : 'danger'}`}><span className="dot"/>{row.st === 'ok' ? '200 OK' : 'Hata'}</span></td>
                <td><span className="bz-mono" style={{ color: 'var(--bz-n500)', fontSize: 11.5 }}>{row.d}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
};

window.PlatformsPage = PlatformsPage;
