// Page 3: Platform Bağlantıları
function PagePlatforms({ lang = 'tr' }) {
  const t = (tr, en) => lang === 'tr' ? tr : en;

  const platforms = [
    { id: 'google', name: 'Google Business', cat: t('Yorumlar', 'Reviews'), status: 'connected', acct: 'Kadıköy Bistro', synced: t('5dk önce', '5m ago'), reviews: 2366, color: '#4285F4' },
    { id: 'tripadvisor', name: 'Tripadvisor', cat: t('Yorumlar', 'Reviews'), status: 'connected', acct: 'kadikoybistro_ist', synced: t('1sa önce', '1h ago'), reviews: 412, color: '#00AF87' },
    { id: 'yelp', name: 'Yelp', cat: t('Yorumlar', 'Reviews'), status: 'error', acct: 'kadikoy-bistro', synced: t('Token süresi doldu', 'Token expired'), reviews: 87, color: '#D32323' },
    { id: 'instagram', name: 'Instagram', cat: t('Sosyal', 'Social'), status: 'connected', acct: '@kadikoybistro', synced: t('12dk önce', '12m ago'), reviews: null, color: '#E4405F' },
    { id: 'facebook', name: 'Facebook', cat: t('Sosyal', 'Social'), status: 'connected', acct: 'Kadıköy Bistro', synced: t('1sa önce', '1h ago'), reviews: 234, color: '#1877F2' },
    { id: 'yemeksepeti', name: 'Yemeksepeti', cat: t('Sipariş', 'Ordering'), status: 'connected', acct: 'KAD-BISTRO-04', synced: t('2dk önce', '2m ago'), reviews: null, color: '#EA002A' },
    { id: 'getir', name: 'Getir Yemek', cat: t('Sipariş', 'Ordering'), status: 'available', acct: null, synced: null, reviews: null, color: '#5D3EBC' },
    { id: 'foursquare', name: 'Foursquare', cat: t('Yorumlar', 'Reviews'), status: 'available', acct: null, synced: null, reviews: null, color: '#F94877' },
    { id: 'whatsapp', name: 'WhatsApp Business', cat: t('Mesajlaşma', 'Messaging'), status: 'connected', acct: '+90 532 ••• 47 18', synced: t('8dk önce', '8m ago'), reviews: null, color: '#25D366' },
    { id: 'zapier', name: 'Zapier', cat: t('Otomasyon', 'Automation'), status: 'available', acct: null, synced: null, reviews: null, color: '#FF4F00' },
    { id: 'hubspot', name: 'HubSpot CRM', cat: t('CRM', 'CRM'), status: 'available', acct: null, synced: null, reviews: null, color: '#FF7A59' },
    { id: 'mailchimp', name: 'Mailchimp', cat: t('E-posta', 'Email'), status: 'available', acct: null, synced: null, reviews: null, color: '#FFE01B' },
  ];

  const cats = [
    { id: 'all', label: t('Tümü', 'All'), count: platforms.length, active: true },
    { id: 'reviews', label: t('Yorumlar', 'Reviews'), count: 4 },
    { id: 'social', label: t('Sosyal medya', 'Social'), count: 2 },
    { id: 'ordering', label: t('Sipariş', 'Ordering'), count: 2 },
    { id: 'messaging', label: t('Mesajlaşma', 'Messaging'), count: 1 },
    { id: 'crm', label: 'CRM', count: 1 },
    { id: 'automation', label: t('Otomasyon', 'Automation'), count: 1 },
  ];

  const statusBadge = (s) => {
    if (s === 'connected') return <window.Pill tone="ok" dot>{t('Bağlı', 'Connected')}</window.Pill>;
    if (s === 'error') return <window.Pill tone="danger" dot>{t('Hata', 'Error')}</window.Pill>;
    return <window.Pill tone="ghost">{t('Bağlanılabilir', 'Available')}</window.Pill>;
  };

  return (
    <PageShell
      active="platforms"
      eyebrow={t('ENTEGRASYONLAR', 'INTEGRATIONS')}
      title={t('Platform Bağlantıları', 'Platform Connections')}
      sub={t('Yorum, sipariş, sosyal medya ve CRM kanallarınızı tek panelden yönetin. 12 platform desteklenir.', 'Manage your review, ordering, social and CRM channels from one panel. 12 platforms supported.')}
      actions={<>
        <button className="bz-btn"><window.IDownload size={13} /> {t('Bağlantı log\'u', 'Connection log')}</button>
        <button className="bz-btn bz-btn-primary"><window.IPlus size={13} /> {t('Yeni bağlantı', 'New connection')}</button>
      </>}
    >
      {/* Health summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { k: t('Bağlı kanal', 'Connected'), v: '7', s: t('12 destekleniyor', 'of 12 supported'), tone: 'ok' },
          { k: t('Bekleyen sorun', 'Pending issue'), v: '1', s: 'Yelp · token', tone: 'danger' },
          { k: t('Bugün senk.', 'Synced today'), v: '12.4K', s: t('olay', 'events'), tone: 'ok' },
          { k: t('API kullanım', 'API usage'), v: '%34', s: t('aylık kotanın', 'of monthly quota'), tone: 'ok' },
        ].map((kpi, i) => (
          <div key={i} className="bz-card" style={{ padding: 16 }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{kpi.k}</div>
            <div className="bz-h-tight-2 bz-num" style={{ fontSize: 28, marginTop: 10 }}>{kpi.v}</div>
            <div style={{ fontSize: 11.5, color: kpi.tone === 'danger' ? 'var(--red)' : 'var(--n-500)', marginTop: 4 }}>{kpi.s}</div>
          </div>
        ))}
      </div>

      {/* Categories + grid */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {cats.map(c => (
          <button key={c.id} className={`bz-tab ${c.active ? 'bz-tab-active' : ''}`}>
            {c.label} <span className="bz-num" style={{ color: 'var(--n-400)', fontSize: 10 }}>{c.count}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {platforms.map(p => (
          <div key={p.id} className="bz-card" style={{ padding: 18, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: p.color, color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 18, fontFamily: 'var(--font-display)'
              }}>
                {p.name[0]}
              </div>
              {statusBadge(p.status)}
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--n-950)' }}>{p.name}</div>
              <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', marginTop: 4 }}>{p.cat}</div>
            </div>

            {p.status !== 'available' && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--n-200)', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--n-500)' }}>{t('Hesap', 'Account')}</span>
                  <span className="bz-num" style={{ color: 'var(--n-800)', fontWeight: 500 }}>{p.acct}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--n-500)' }}>{t('Son senk.', 'Last sync')}</span>
                  <span className="bz-num" style={{ color: p.status === 'error' ? 'var(--red)' : 'var(--n-800)' }}>{p.synced}</span>
                </div>
                {p.reviews && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--n-500)' }}>{t('Çekilen yorum', 'Pulled reviews')}</span>
                    <span className="bz-num" style={{ color: 'var(--n-800)', fontWeight: 600 }}>{p.reviews.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 14, display: 'flex', gap: 6 }}>
              {p.status === 'available' ? (
                <button className="bz-btn bz-btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <window.ILink size={12} /> {t('Bağlan', 'Connect')}
                </button>
              ) : p.status === 'error' ? (
                <>
                  <button className="bz-btn bz-btn-lime" style={{ flex: 1, justifyContent: 'center' }}>
                    <window.IRefresh size={12} /> {t('Yeniden bağla', 'Reconnect')}
                  </button>
                  <button className="bz-btn"><window.ISettings size={12} /></button>
                </>
              ) : (
                <>
                  <button className="bz-btn" style={{ flex: 1, justifyContent: 'center' }}>
                    <window.ISettings size={12} /> {t('Yapılandır', 'Configure')}
                  </button>
                  <button className="bz-btn"><window.IMoreH size={12} /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

window.PagePlatforms = PagePlatforms;
