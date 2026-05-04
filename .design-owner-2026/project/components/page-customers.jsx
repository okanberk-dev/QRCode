// Page 6: Müşteriler
function PageCustomers({ lang = 'tr' }) {
  const t = (tr, en) => lang === 'tr' ? tr : en;

  const customers = [
    { name: 'Selin Aydın', email: 'selin.aydin@mail.com', phone: '+90 532 ••• 47 18', initials: 'SA',
      visits: 7, ltv: 3420, avg: 4.8, last: '04 MAY', segment: 'VIP', lastTopic: t('Servis', 'Service'), source: 'QR' },
    { name: 'Murat Çelik', email: 'm.celik@mail.com', phone: '+90 533 ••• 12 04', initials: 'MÇ',
      visits: 3, ltv: 1180, avg: 3.0, last: '04 MAY', segment: 'Risk', lastTopic: t('Bekleme', 'Wait time'), source: 'NFC' },
    { name: 'Ayşe Kara', email: 'a.kara@mail.com', phone: '+90 535 ••• 88 32', initials: 'AK',
      visits: 12, ltv: 5840, avg: 4.9, last: '03 MAY', segment: 'VIP', lastTopic: t('Atmosfer', 'Atmosphere'), source: 'Google' },
    { name: 'Erkan Yıldız', email: 'erkan@yildiz.co', phone: '+90 530 ••• 45 12', initials: 'EY',
      visits: 4, ltv: 1640, avg: 4.5, last: '03 MAY', segment: 'Loyal', lastTopic: t('Menü', 'Menu'), source: 'WhatsApp' },
    { name: 'Ceren Demir', email: 'ceren.d@mail.com', phone: '+90 532 ••• 71 09', initials: 'CD',
      visits: 9, ltv: 4120, avg: 4.7, last: '02 MAY', segment: 'VIP', lastTopic: t('Genel', 'Overall'), source: 'QR' },
    { name: 'Burak Öz', email: 'burakoz@mail.com', phone: '+90 534 ••• 66 21', initials: 'BÖ',
      visits: 1, ltv: 480, avg: 4.0, last: '01 MAY', segment: 'New', lastTopic: '—', source: 'Google' },
    { name: 'Elif Arslan', email: 'elif.arslan@mail.com', phone: '+90 537 ••• 33 88', initials: 'EA',
      visits: 6, ltv: 2890, avg: 4.6, last: '30 NIS', segment: 'Loyal', lastTopic: t('Yemek', 'Food'), source: 'NFC' },
    { name: 'Tolga Aksoy', email: 't.aksoy@mail.com', phone: '+90 533 ••• 09 14', initials: 'TA',
      visits: 2, ltv: 720, avg: 3.5, last: '28 NIS', segment: 'Risk', lastTopic: t('Fiyat', 'Pricing'), source: 'Tripadvisor' },
  ];

  const segments = [
    { id: 'all', label: t('Tüm müşteriler', 'All customers'), count: 8420, active: true },
    { id: 'vip', label: 'VIP', count: 124, color: '#0A0A0A' },
    { id: 'loyal', label: t('Sadık', 'Loyal'), count: 642, color: 'var(--lime-400)' },
    { id: 'new', label: t('Yeni', 'New'), count: 1284, color: 'var(--blue)' },
    { id: 'risk', label: t('Risk', 'At risk'), count: 87, color: 'var(--red)' },
    { id: 'churned', label: t('Kayıp', 'Churned'), count: 312, color: 'var(--n-400)' },
  ];

  const segmentTone = (s) => {
    if (s === 'VIP') return 'dark';
    if (s === 'Loyal') return 'lime';
    if (s === 'Risk') return 'danger';
    if (s === 'New') return 'info';
    return 'ghost';
  };

  return (
    <PageShell
      active="customers"
      eyebrow={t('CRM · 8.420 KAYIT', 'CRM · 8,420 RECORDS')}
      title={t('Müşteriler', 'Customers')}
      sub={t('QR, NFC, Google ve diğer kanallardan toplanan misafirler. Segment, LTV ve son aktiviteyle birlikte.', 'Guests collected from QR, NFC, Google and other channels. With segment, LTV, and recent activity.')}
      actions={<>
        <button className="bz-btn"><window.IUpload size={13} /> {t('İçe aktar', 'Import')}</button>
        <button className="bz-btn"><window.IDownload size={13} /> {t('Dışa aktar', 'Export')}</button>
        <button className="bz-btn bz-btn-primary"><window.IPlus size={13} /> {t('Müşteri ekle', 'Add customer')}</button>
      </>}
    >
      {/* Segment summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { k: t('Toplam', 'Total'), v: '8.420', d: '+247', tone: 'up' },
          { k: 'VIP', v: '124', d: '+8', tone: 'up' },
          { k: t('Ortalama LTV', 'Avg LTV'), v: '₺1.847', d: '+₺120', tone: 'up' },
          { k: t('Tekrar gelme', 'Return rate'), v: '%41', d: '-2%', tone: 'down' },
          { k: t('Risk altında', 'At risk'), v: '87', d: '+12', tone: 'down' },
        ].map((kpi, i) => (
          <div key={i} className="bz-card" style={{ padding: 16 }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{kpi.k}</div>
            <div className="bz-h-tight-2 bz-num" style={{ fontSize: 26, marginTop: 8 }}>{kpi.v}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <span className="bz-num" style={{ fontSize: 11, color: kpi.tone === 'up' ? 'var(--green)' : 'var(--red)' }}>
                {kpi.tone === 'up' ? '↑' : '↓'} {kpi.d}
              </span>
              <span style={{ fontSize: 10, color: 'var(--n-400)', marginLeft: 'auto' }}>{t('30 günde', '30d')}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bz-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: 280 }}>
            <window.ISearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
            <input placeholder={t('İsim, e-posta veya telefon ara…', 'Search by name, email, phone…')}
              style={{ width: '100%', height: 32, paddingLeft: 32, paddingRight: 10, border: '1px solid var(--n-200)',
                borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', background: 'var(--n-50)' }} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
            {segments.map(s => (
              <button key={s.id} className={`bz-tab ${s.active ? 'bz-tab-active' : ''}`}>
                {s.color && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, marginRight: 4 }} />}
                {s.label} <span className="bz-num" style={{ color: 'var(--n-400)', fontSize: 10 }}>{s.count.toLocaleString()}</span>
              </button>
            ))}
          </div>
          <button className="bz-btn"><window.IFilter size={12} /> {t('Filtre', 'Filter')}</button>
        </div>

        {/* Bulk action bar (selected state) */}
        <div style={{ padding: '10px 18px', background: 'var(--lime-50)', borderBottom: '1px solid var(--lime-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12.5, color: 'var(--lime-600)' }}>
            <span style={{ fontWeight: 600 }}>3 {t('müşteri seçildi', 'customers selected')}</span> · {t('toplam ₺10.380 LTV', 'total ₺10,380 LTV')}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="bz-btn" style={{ height: 26, fontSize: 11 }}><window.IMail size={11} /> {t('E-posta gönder', 'Email')}</button>
            <button className="bz-btn" style={{ height: 26, fontSize: 11 }}><window.IZap size={11} /> {t('Kampanya', 'Campaign')}</button>
            <button className="bz-btn" style={{ height: 26, fontSize: 11 }}>{t('Segmente ekle', 'Add to segment')}</button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th className="bz-th" style={{ width: 36 }}>
                <input type="checkbox" />
              </th>
              <th className="bz-th">{t('Müşteri', 'Customer')}</th>
              <th className="bz-th">{t('Segment', 'Segment')}</th>
              <th className="bz-th" style={{ textAlign: 'right' }}>{t('Ziyaret', 'Visits')}</th>
              <th className="bz-th" style={{ textAlign: 'right' }}>LTV</th>
              <th className="bz-th" style={{ textAlign: 'right' }}>{t('Ort. puan', 'Avg ★')}</th>
              <th className="bz-th">{t('Son konu', 'Last topic')}</th>
              <th className="bz-th">{t('Kanal', 'Source')}</th>
              <th className="bz-th">{t('Son ziyaret', 'Last visit')}</th>
              <th className="bz-th" style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c, i) => (
              <tr key={i} className="bz-tr-hover" style={{ background: i < 3 ? 'rgba(247, 252, 219, 0.4)' : undefined }}>
                <td className="bz-td"><input type="checkbox" defaultChecked={i < 3} /></td>
                <td className="bz-td">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <window.Avatar initials={c.initials} size={32} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      <div className="bz-num" style={{ fontSize: 10.5, color: 'var(--n-500)' }}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td className="bz-td">
                  <window.Pill tone={segmentTone(c.segment)} dot>{c.segment}</window.Pill>
                </td>
                <td className="bz-td bz-num" style={{ textAlign: 'right', fontWeight: 600 }}>{c.visits}</td>
                <td className="bz-td bz-num" style={{ textAlign: 'right', fontWeight: 600 }}>₺{c.ltv.toLocaleString()}</td>
                <td className="bz-td" style={{ textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span className="bz-num" style={{ fontWeight: 600 }}>{c.avg}</span>
                    <window.IStar size={11} filled />
                  </div>
                </td>
                <td className="bz-td" style={{ color: 'var(--n-600)' }}>{c.lastTopic}</td>
                <td className="bz-td">
                  <span className="bz-num" style={{ fontSize: 11, padding: '3px 7px', borderRadius: 4, background: 'var(--n-100)', color: 'var(--n-700)' }}>
                    {c.source}
                  </span>
                </td>
                <td className="bz-td bz-num" style={{ color: 'var(--n-600)', fontSize: 12 }}>{c.last}</td>
                <td className="bz-td"><button className="bz-btn bz-btn-ghost"><window.IMoreH size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--n-150)' }}>
          <span className="bz-num" style={{ fontSize: 11.5, color: 'var(--n-500)' }}>
            1–8 / 8.420 {t('kayıt', 'records')}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="bz-btn" style={{ height: 26, padding: '0 8px' }}>‹</button>
            <button className="bz-btn bz-btn-primary" style={{ height: 26, padding: '0 10px' }}>1</button>
            <button className="bz-btn" style={{ height: 26, padding: '0 10px' }}>2</button>
            <button className="bz-btn" style={{ height: 26, padding: '0 10px' }}>3</button>
            <button className="bz-btn" style={{ height: 26, padding: '0 10px' }}>…</button>
            <button className="bz-btn" style={{ height: 26, padding: '0 10px' }}>1.052</button>
            <button className="bz-btn" style={{ height: 26, padding: '0 8px' }}>›</button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

window.PageCustomers = PageCustomers;
