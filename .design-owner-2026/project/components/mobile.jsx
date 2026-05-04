// Mobile mockups — owner panel on phone
function MobileShell({ children, title, showNav = true }) {
  return (
    <div className="bz-mob-shell">
      <div className="bz-mob-screen">
        <div className="bz-mob-notch" />
        {/* status bar */}
        <div style={{
          height: 44, padding: '14px 24px 0', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-display)'
        }}>
          <span>9:41</span>
          <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ width: 16, height: 10, border: '1px solid #0A0A0A', borderRadius: 2, position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', inset: 1, background: '#0A0A0A', borderRadius: 1 }} />
            </span>
          </span>
        </div>
        {/* header */}
        <div style={{ padding: '10px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--n-150)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="bz-wordmark" style={{ fontSize: 16 }}>buaze<span className="dot">.</span></span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <window.IBell size={16} stroke="var(--n-600)" />
            <window.Avatar initials="DK" size={26} />
          </div>
        </div>
        <div style={{ height: showNav ? 'calc(100% - 44px - 49px - 64px)' : 'calc(100% - 44px - 64px)', overflow: 'hidden' }}>
          {children}
        </div>
        {/* tab bar */}
        {showNav && (
          <div style={{
            position: 'absolute', bottom: 10, left: 10, right: 10, height: 64,
            background: 'var(--n-0)', borderTop: '1px solid var(--n-150)',
            borderRadius: '0 0 28px 28px',
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'center'
          }}>
            {[
              { i: 'IBarChart', l: 'Analitik', active: false },
              { i: 'IInbox', l: 'Yorumlar', active: true, badge: 24 },
              { i: 'IUsers', l: 'Müşteri', active: false },
              { i: 'IGoogle', l: 'Google', active: false },
              { i: 'IUser', l: 'Hesap', active: false },
            ].map((it, i) => {
              const I = window[it.i];
              return (
                <button key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  border: 0, background: 'transparent', cursor: 'pointer',
                  color: it.active ? 'var(--n-950)' : 'var(--n-400)',
                  position: 'relative', paddingTop: 6
                }}>
                  <I size={18} />
                  <span style={{ fontSize: 9.5, fontWeight: it.active ? 600 : 500 }}>{it.l}</span>
                  {it.badge && (
                    <span style={{
                      position: 'absolute', top: 4, right: '32%',
                      background: 'var(--lime-300)', color: 'var(--n-950)',
                      fontSize: 8.5, fontWeight: 700, borderRadius: 999,
                      padding: '1px 5px', fontFamily: 'var(--font-mono)'
                    }}>{it.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileFeedbacks() {
  const items = [
    { name: 'Selin Aydın', initials: 'SA', stars: 5, time: '2dk', source: 'QR · M.04', tone: 'pos',
      msg: 'Garson çok ilgiliydi, makarna mükemmeldi.', unread: true },
    { name: 'Murat Çelik', initials: 'MÇ', stars: 2, time: '14dk', source: 'NFC · B.12', tone: 'neg',
      msg: '35 dakika beklemek zorunda kaldık.', unread: true },
    { name: 'Ayşe Kara', initials: 'AK', stars: 5, time: '1sa', source: 'Google', tone: 'pos',
      msg: 'Teras manzarası harika. Müzik tam kararında.', unread: false },
    { name: 'Erkan Yıldız', initials: 'EY', stars: 4, time: '3sa', source: 'WhatsApp', tone: 'pos',
      msg: 'Vegan seçenekler arttırılırsa tam puan.', unread: false },
  ];
  return (
    <MobileShell>
      <div style={{ padding: '14px 18px 8px' }}>
        <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', fontSize: 9.5 }}>BU HAFTA</div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
          <h2 className="bz-h-tight-2" style={{ margin: 0, fontSize: 24 }}>Yorumlar</h2>
          <window.Pill tone="lime" dot>24 yeni</window.Pill>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, overflowX: 'auto' }}>
          {['Tümü 247','Yanıtlanmamış 24','Negatif 12','Pozitif 198'].map((tab, i) => (
            <button key={i} className={`bz-tab ${i === 0 ? 'bz-tab-active' : ''}`} style={{ height: 28, padding: '0 10px', fontSize: 11.5, flexShrink: 0 }}>{tab}</button>
          ))}
        </div>
      </div>
      <div className="bz-scroll" style={{ height: 'calc(100% - 90px)' }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: '12px 18px', borderTop: i ? '1px solid var(--n-100)' : 'none', display: 'flex', gap: 10 }}>
            <window.Avatar initials={it.initials} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{it.name}</span>
                <span className="bz-num" style={{ fontSize: 10, color: 'var(--n-400)' }}>{it.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <window.Stars value={it.stars} size={9} color={it.tone === 'pos' ? 'var(--lime-400)' : 'var(--amber)'} />
                <span className="bz-num" style={{ fontSize: 9.5, color: 'var(--n-500)' }}>{it.source}</span>
                {it.unread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime-300)', marginLeft: 'auto' }} />}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--n-600)', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

function MobileAnalytics() {
  return (
    <MobileShell>
      <div className="bz-scroll" style={{ height: '100%', padding: '14px 18px' }}>
        <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', fontSize: 9.5 }}>SON 30 GÜN</div>
        <h2 className="bz-h-tight-2" style={{ margin: '6px 0 0', fontSize: 24 }}>Analitik</h2>

        {/* Hero rating */}
        <div style={{ marginTop: 16, padding: 16, background: '#0A0A0A', color: '#FFF', borderRadius: 14 }}>
          <div className="pulse-eyebrow" style={{ color: '#737373', fontSize: 9 }}>ORTALAMA PUAN</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 8 }}>
            <span className="bz-num bz-h-tight-1" style={{ fontSize: 44, color: 'var(--lime-300)' }}>4.74</span>
            <div style={{ paddingBottom: 6 }}>
              <window.Stars value={5} size={11} color="var(--lime-300)" />
              <div className="bz-num" style={{ fontSize: 10, color: '#A3A3A3', marginTop: 2 }}>+0.18 (30g)</div>
            </div>
          </div>
          <svg viewBox="0 0 240 50" style={{ width: '100%', height: 40, marginTop: 8 }}>
            <path d="M0,40 L20,38 L40,32 L60,28 L80,30 L100,22 L120,18 L140,14 L160,16 L180,10 L200,8 L220,6 L240,4"
              fill="none" stroke="var(--lime-300)" strokeWidth="2" />
          </svg>
        </div>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          {[
            { k: 'Toplam yorum', v: '7.5K', d: '+12%' },
            { k: 'NPS', v: '67', d: '+4' },
            { k: 'Yanıt oranı', v: '%94', d: '+6%' },
            { k: 'Tekrar gelme', v: '%41', d: '-2%', neg: true },
          ].map((kpi, i) => (
            <div key={i} className="bz-card" style={{ padding: 12 }}>
              <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', fontSize: 9 }}>{kpi.k}</div>
              <div className="bz-h-tight-2 bz-num" style={{ fontSize: 18, marginTop: 6 }}>{kpi.v}</div>
              <div className="bz-num" style={{ fontSize: 10, color: kpi.neg ? 'var(--red)' : 'var(--green)', marginTop: 2 }}>{kpi.d}</div>
            </div>
          ))}
        </div>

        {/* Topic */}
        <div className="bz-card" style={{ padding: 14, marginTop: 12 }}>
          <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', fontSize: 9 }}>KONU SENTİMENT</div>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { l: 'Yemek lezzeti', p: 94 },
              { l: 'Atmosfer', p: 88 },
              { l: 'Servis hızı', p: 82 },
              { l: 'Fiyat', p: 67 },
            ].map(tp => (
              <div key={tp.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                  <span>{tp.l}</span>
                  <span className="bz-num" style={{ fontWeight: 600, color: tp.p > 80 ? 'var(--green)' : 'var(--amber)' }}>%{tp.p}</span>
                </div>
                <div style={{ height: 5, background: 'var(--n-100)', borderRadius: 3, marginTop: 4 }}>
                  <div style={{ width: `${tp.p}%`, height: '100%', background: tp.p > 80 ? 'var(--lime-300)' : 'var(--amber)', borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}

function MobileCustomers() {
  const customers = [
    { name: 'Selin Aydın', initials: 'SA', segment: 'VIP', visits: 7, ltv: '₺3.420', avg: 4.8 },
    { name: 'Ayşe Kara', initials: 'AK', segment: 'VIP', visits: 12, ltv: '₺5.840', avg: 4.9 },
    { name: 'Ceren Demir', initials: 'CD', segment: 'VIP', visits: 9, ltv: '₺4.120', avg: 4.7 },
    { name: 'Erkan Yıldız', initials: 'EY', segment: 'Loyal', visits: 4, ltv: '₺1.640', avg: 4.5 },
    { name: 'Murat Çelik', initials: 'MÇ', segment: 'Risk', visits: 3, ltv: '₺1.180', avg: 3.0 },
    { name: 'Burak Öz', initials: 'BÖ', segment: 'New', visits: 1, ltv: '₺480', avg: 4.0 },
  ];
  const segTone = (s) => s === 'VIP' ? 'dark' : s === 'Loyal' ? 'lime' : s === 'Risk' ? 'danger' : 'info';
  return (
    <MobileShell>
      <div style={{ padding: '14px 18px 8px' }}>
        <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', fontSize: 9.5 }}>8.420 KAYIT</div>
        <h2 className="bz-h-tight-2" style={{ margin: '6px 0 0', fontSize: 24 }}>Müşteriler</h2>
        <div style={{ position: 'relative', marginTop: 12 }}>
          <window.ISearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
          <input placeholder="İsim, e-posta ara…" style={{
            width: '100%', height: 32, paddingLeft: 30, paddingRight: 10,
            border: '1px solid var(--n-200)', borderRadius: 8, background: 'var(--n-50)',
            fontSize: 12, fontFamily: 'inherit'
          }} />
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 10, overflowX: 'auto' }}>
          {['Tümü','VIP 124','Sadık 642','Risk 87'].map((s, i) => (
            <button key={i} className={`bz-tab ${i === 0 ? 'bz-tab-active' : ''}`} style={{ height: 26, padding: '0 9px', fontSize: 11, flexShrink: 0 }}>{s}</button>
          ))}
        </div>
      </div>
      <div className="bz-scroll" style={{ height: 'calc(100% - 122px)' }}>
        {customers.map((c, i) => (
          <div key={i} style={{ padding: '12px 18px', borderTop: i ? '1px solid var(--n-100)' : 'none', display: 'flex', gap: 10, alignItems: 'center' }}>
            <window.Avatar initials={c.initials} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                <window.Pill tone={segTone(c.segment)} dot>{c.segment}</window.Pill>
              </div>
              <div className="bz-num" style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 3, display: 'flex', gap: 10 }}>
                <span>{c.visits} ziyaret</span>
                <span>{c.ltv}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  {c.avg} <window.IStar size={9} filled />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}

Object.assign(window, { MobileShell, MobileFeedbacks, MobileAnalytics, MobileCustomers });
