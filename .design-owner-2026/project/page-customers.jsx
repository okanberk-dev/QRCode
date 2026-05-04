/* Page: Müşteriler (CRM) */

const CUSTOMERS = [
  { name: 'Ayşe Yıldız', email: 'ayse.yildiz@gmail.com', phone: '+90 532 ** **', initials: 'AY', visits: 28, ltv: '₺18.420', last: '2 gün önce', sentiment: 'pos', sentScore: 92, segment: 'VIP', lastDish: 'Mantar makarna' },
  { name: 'Mert Demir', email: 'mert@demirholding.com', phone: '+90 555 ** **', initials: 'MD', visits: 14, ltv: '₺9.840', last: '14 dk önce', sentiment: 'neg', sentScore: 32, segment: 'Risk', lastDish: 'Bonfile' },
  { name: 'Selin Tekin', email: 'selintekin@yahoo.com', phone: '+90 533 ** **', initials: 'ST', visits: 6, ltv: '₺2.180', last: '2 sa önce', sentiment: 'mid', sentScore: 58, segment: 'Düzenli', lastDish: 'Pizza margherita' },
  { name: 'Burak Şen', email: 'b.sen@startup.io', phone: '+90 542 ** **', initials: 'BŞ', visits: 32, ltv: '₺22.100', last: '1 sa önce', sentiment: 'pos', sentScore: 88, segment: 'VIP', lastDish: 'Risotto' },
  { name: 'Can Aksoy', email: 'canaksoy@gmail.com', phone: '+90 532 ** **', initials: 'CA', visits: 4, ltv: '₺1.640', last: '3 sa önce', sentiment: 'pos', sentScore: 96, segment: 'Yeni', lastDish: 'Pasta tatlı' },
  { name: 'Esra Korkmaz', email: 'esra.k@design.co', phone: '+90 506 ** **', initials: 'EK', visits: 18, ltv: '₺11.220', last: '5 sa önce', sentiment: 'pos', sentScore: 74, segment: 'Düzenli', lastDish: 'Sezar salata' },
  { name: 'Furkan Aydın', email: 'furkan@aydinco.com', phone: '+90 535 ** **', initials: 'FA', visits: 22, ltv: '₺14.580', last: 'dün', sentiment: 'pos', sentScore: 86, segment: 'VIP', lastDish: 'Tagliatelle' },
  { name: 'Deniz Polat', email: 'd.polat@hotmail.com', phone: '+90 543 ** **', initials: 'DP', visits: 2, ltv: '₺680', last: '4 sa önce', sentiment: 'neg', sentScore: 18, segment: 'Risk', lastDish: 'Antipasti' },
];

const SegmentChip = ({ s }) => {
  const map = {
    'VIP': { cls: 'dark', i: 'star' },
    'Düzenli': { cls: 'lime', i: 'check' },
    'Yeni': { cls: 'info', i: 'sparkle' },
    'Risk': { cls: 'danger', i: 'flag' },
  };
  const m = map[s] || map['Düzenli'];
  return <span className={`bz-badge bz-badge--${m.cls}`}>{s}</span>;
};

const Sparkbar = ({ v }) => {
  const tone = v >= 70 ? 'var(--bz-lime-deep)' : v >= 50 ? '#A3A3A3' : 'var(--bz-danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 60, height: 5, background: 'var(--bz-n100)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${v}%`, height: '100%', background: tone }}/>
      </div>
      <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n600)', width: 24 }}>{v}</span>
    </div>
  );
};

const CustomersPage = () => (
  <PanelShell
    active="customers"
    topbar={
      <PanelTopbar
        eyebrow="MÜŞTERİLER · CRM"
        title="Misafir veritabanı"
        sub="QR yorum, sipariş ve rezervasyon kaynağından gelen müşterileri tek profilde topla."
        actions={<>
          <button className="bz-btn-ghost"><Icon name="upload" size={14}/> İçe aktar</button>
          <button className="bz-btn-ghost"><Icon name="download" size={14}/> Dışa aktar</button>
          <button className="bz-btn-primary"><Icon name="plus" size={14}/> Misafir ekle</button>
        </>}
      />
    }
  >
    {/* Stats */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
      {[
        { l: 'TOPLAM MİSAFİR', v: '2,418', d: '+184 bu ay' },
        { l: 'VIP', v: '184', d: '%7.6 segment' },
        { l: 'ORT. LTV', v: '₺4.820', d: '+12% YoY' },
        { l: 'GERİ DÖNÜŞ ORANI', v: '%62', d: 'sektör %48' },
      ].map((k, i) => (
        <div key={i} className="bz-card" style={{ padding: 18 }}>
          <div className="bz-eyebrow" style={{ marginBottom: 8 }}>{k.l}</div>
          <div className="bz-h-tight-2" style={{ fontSize: 28 }}>{k.v}</div>
          <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)', marginTop: 4 }}>{k.d}</div>
        </div>
      ))}
    </div>

    {/* Toolbar */}
    <div className="bz-card" style={{ padding: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
        <input className="bz-input" placeholder="İsim, e-posta veya telefon ara…" style={{ paddingLeft: 34 }}/>
        <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--bz-n400)' }}>
          <Icon name="search" size={14}/>
        </span>
      </div>
      <div style={{ height: 24, width: 1, background: 'var(--bz-n200)' }}/>
      {['Tümü · 2.4K', 'VIP · 184', 'Düzenli · 642', 'Yeni · 286', 'Risk · 38'].map((s, i) => (
        <button key={s} className={i === 0 ? 'bz-btn-primary bz-btn-sm' : 'bz-btn-ghost bz-btn-sm'}>{s}</button>
      ))}
      <div style={{ flex: 1 }}/>
      <button className="bz-btn-ghost bz-btn-sm"><Icon name="filter" size={12}/> Daha fazla filtre</button>
      <button className="bz-btn-ghost bz-btn-sm"><Icon name="layers" size={12}/> Görünüm</button>
    </div>

    {/* Bulk action bar (selected) */}
    <div style={{
      background: 'var(--bz-graphite)', color: '#FFF',
      borderRadius: 12, padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
    }}>
      <Icon name="check" size={14} color="#C6F24E"/>
      <span style={{ fontSize: 13, fontWeight: 600 }}>3 misafir seçildi</span>
      <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)', marginLeft: 4 }}>tüm filtre 8</span>
      <div style={{ flex: 1 }}/>
      <button className="bz-btn-lime bz-btn-sm"><Icon name="mail" size={11}/> Kampanya gönder</button>
      <button className="bz-btn-ghost bz-btn-sm" style={{ borderColor: 'rgba(255,255,255,0.18)', color: '#FFF' }}>
        <Icon name="bookmark" size={11}/> Segmentle
      </button>
      <button className="bz-btn-ghost bz-btn-sm" style={{ borderColor: 'rgba(255,255,255,0.18)', color: '#FFF' }}>
        <Icon name="archive" size={11}/> Arşivle
      </button>
    </div>

    {/* Table */}
    <div className="bz-card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="bz-table">
        <thead>
          <tr>
            <th style={{ width: 32, paddingRight: 0 }}>
              <input type="checkbox" defaultChecked style={{ accentColor: '#0A0A0A' }}/>
            </th>
            <th>Misafir</th>
            <th>Segment</th>
            <th>Ziyaret</th>
            <th>LTV</th>
            <th>Son ziyaret</th>
            <th>Sentiment</th>
            <th>Son sipariş</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {CUSTOMERS.map((c, i) => (
            <tr key={i}>
              <td style={{ paddingRight: 0 }}>
                <input type="checkbox" defaultChecked={i < 3} style={{ accentColor: '#0A0A0A' }}/>
              </td>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="bz-avatar" style={{
                    background: c.sentiment === 'neg' ? '#FEF2F2' : c.sentiment === 'pos' ? 'var(--bz-lime-soft)' : 'var(--bz-n100)',
                    color: c.sentiment === 'neg' ? '#991B1B' : 'var(--bz-graphite)',
                  }}>{c.initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                    <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>{c.email}</div>
                  </div>
                </div>
              </td>
              <td><SegmentChip s={c.segment}/></td>
              <td><span className="bz-mono" style={{ fontWeight: 600 }}>{c.visits}</span></td>
              <td><span className="bz-mono" style={{ fontWeight: 600 }}>{c.ltv}</span></td>
              <td><span className="bz-mono" style={{ fontSize: 11.5, color: 'var(--bz-n500)' }}>{c.last}</span></td>
              <td><Sparkbar v={c.sentScore}/></td>
              <td><span style={{ fontSize: 12.5, color: 'var(--bz-n600)' }}>{c.lastDish}</span></td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="bz-btn-icon"><Icon name="mail" size={13}/></button>
                  <button className="bz-btn-icon"><Icon name="moreH" size={13}/></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '12px 16px',
        borderTop: '1px solid var(--bz-n200)', background: 'var(--bz-n50)',
      }}>
        <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>
          1–8 / 2,418 misafir
        </span>
        <div style={{ flex: 1 }}/>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button className="bz-btn-icon" disabled style={{ opacity: 0.4 }}><Icon name="chevronRight" size={13} color="currentColor"/></button>
          <button className="bz-btn-ghost bz-btn-sm" style={{ padding: '4px 10px' }}>1</button>
          <button className="bz-btn-primary bz-btn-sm" style={{ padding: '4px 10px' }}>2</button>
          <button className="bz-btn-ghost bz-btn-sm" style={{ padding: '4px 10px' }}>3</button>
          <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)' }}>…</span>
          <button className="bz-btn-ghost bz-btn-sm" style={{ padding: '4px 10px' }}>302</button>
          <button className="bz-btn-icon"><Icon name="chevronRight" size={13}/></button>
        </div>
      </div>
    </div>
  </PanelShell>
);

window.CustomersPage = CustomersPage;
