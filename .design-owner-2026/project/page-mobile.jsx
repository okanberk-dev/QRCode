/* Mobile screens — iPhone 14 Pro frame (390×844) for Reviews + Analytics */

const PhoneFrame = ({ children, label }) => (
  <div style={{
    width: 414, height: 880,
    background: 'var(--bz-graphite)',
    borderRadius: 56,
    padding: 12,
    boxShadow: '0 24px 60px -30px rgba(10,10,10,0.4), 0 0 0 1.5px var(--bz-n800)',
    position: 'relative',
  }}>
    <div style={{
      width: '100%', height: '100%',
      borderRadius: 44,
      background: '#FFF',
      overflow: 'hidden',
      position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Status bar */}
      <div style={{
        height: 44, padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span className="bz-mono" style={{ fontSize: 14, fontWeight: 600 }}>9:41</span>
        <div style={{ width: 110, height: 32, background: 'var(--bz-graphite)', borderRadius: 999, position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 8 }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="16" height="11" viewBox="0 0 16 11" fill="#0A0A0A"><path d="M1 8h2v3H1zM5 5h2v6H5zM9 2h2v9H9zM13 0h2v11h-2z"/></svg>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="#0A0A0A" strokeWidth="1.4"><path d="M1 6c2-2 4-3 6-3s4 1 6 3M3 8c1-1 2.5-1.5 4-1.5s3 .5 4 1.5"/></svg>
          <svg width="22" height="11" viewBox="0 0 22 11"><rect x="0.5" y="0.5" width="18" height="10" rx="2" fill="none" stroke="#0A0A0A"/><rect x="2" y="2" width="14" height="7" rx="1" fill="#0A0A0A"/><rect x="19" y="3" width="2" height="5" rx="1" fill="#0A0A0A"/></svg>
        </div>
      </div>
      {children}
    </div>
  </div>
);

const MobileTabBar = ({ active }) => (
  <div style={{
    height: 78,
    borderTop: '1px solid var(--bz-n200)',
    background: '#FFF',
    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
    flexShrink: 0,
    padding: '8px 4px 22px',
  }}>
    {[
      { id: 'home', i: 'home', l: 'Genel' },
      { id: 'reviews', i: 'inbox', l: 'Yorum' },
      { id: 'add', i: 'plus', l: '', special: true },
      { id: 'analytics', i: 'chart', l: 'Analitik' },
      { id: 'account', i: 'user', l: 'Profil' },
    ].map(t => (
      <div key={t.id} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4,
        color: active === t.id ? 'var(--bz-graphite)' : 'var(--bz-n400)',
      }}>
        {t.special ? (
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'var(--bz-graphite)', color: 'var(--bz-lime)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={t.i} size={20} color="#C6F24E"/>
          </div>
        ) : (
          <Icon name={t.i} size={22}/>
        )}
        {t.l && <span style={{ fontSize: 10, fontWeight: active === t.id ? 600 : 500 }}>{t.l}</span>}
      </div>
    ))}
  </div>
);

const MobileReviews = () => (
  <PhoneFrame>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '8px 20px 14px' }}>
        <div className="bz-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          KADIKÖY BISTRO <span className="bz-pulse-dot"/>
        </div>
        <h2 style={{ fontSize: 26, lineHeight: 1.05 }}>Yorumlar</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Stars value={5} size={12}/>
          <span className="bz-mono" style={{ fontSize: 12, fontWeight: 600 }}>4.71</span>
          <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>· 2,580 yorum</span>
          <span className="bz-kpi-delta up" style={{ marginLeft: 'auto' }}>
            <Icon name="arrowUp" size={11}/> 0.18
          </span>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6, overflowX: 'auto' }} className="bz-scroll">
        {['Tümü 28', 'Düşük 4', 'Yanıtsız 12', 'Bugün'].map((c, i) => (
          <button key={c} className={i === 0 ? 'bz-btn-primary bz-btn-sm' : 'bz-btn-ghost bz-btn-sm'} style={{ flexShrink: 0 }}>{c}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }} className="bz-scroll">
        {[
          { n: 'Mert Demir', i: 'MD', r: 2, t: '14 dk', p: 'Servis çok yavaştı. 25 dk bekledik. Yemek güzel ama bekleme süresi…', neg: true },
          { n: 'Ayşe Yıldız', i: 'AY', r: 5, t: '38 dk', p: 'Mantar makarna mükemmel. Sunum özenli, kesin tekrar geleceğim.', neg: false, replied: true },
          { n: 'Burak Şen', i: 'BŞ', r: 4, t: '1 sa', p: 'Atmosfer hoş, lezzet iyi. Müzik biraz yüksekti.' },
          { n: 'Selin Tekin', i: 'ST', r: 3, t: '2 sa', p: 'Pizza hamuru güzeldi ama soğuk geldi.' },
          { n: 'Can Aksoy', i: 'CA', r: 5, t: '3 sa', p: 'Şef çok ilgiliydi, doğum günümü unutmadılar.' },
        ].map((r, i) => (
          <div key={i} style={{
            padding: '14px 0',
            borderBottom: '1px solid var(--bz-n200)',
            display: 'flex', gap: 12,
          }}>
            <div className="bz-avatar bz-avatar--lg" style={{
              background: r.neg ? '#FEF2F2' : 'var(--bz-lime-soft)',
              color: r.neg ? '#991B1B' : 'var(--bz-graphite)',
            }}>{r.i}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.n}</span>
                {r.neg && !r.replied && <span style={{ width: 6, height: 6, background: 'var(--bz-danger)', borderRadius: '50%' }}/>}
                {r.replied && <Icon name="check" size={12} color="#16A34A"/>}
                <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)', marginLeft: 'auto' }}>{r.t}</span>
              </div>
              <div style={{ marginBottom: 6 }}><Stars value={r.r} size={11}/></div>
              <p style={{ fontSize: 13, color: 'var(--bz-n700)', margin: 0, lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.p}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky AI CTA */}
      <div style={{
        margin: '0 16px 12px', padding: '12px 14px',
        background: 'var(--bz-graphite)', color: '#FFF',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(198,242,78,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="sparkle" size={16} color="#C6F24E"/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>4 yoruma AI yanıt hazır</div>
          <div className="bz-mono" style={{ fontSize: 10.5, color: 'var(--bz-n400)' }}>Toplu onayla, saniyeler içinde gönder</div>
        </div>
        <button className="bz-btn-lime bz-btn-sm">Aç</button>
      </div>
    </div>
    <MobileTabBar active="reviews"/>
  </PhoneFrame>
);

const MobileAnalytics = () => (
  <PhoneFrame>
    <div style={{ flex: 1, overflow: 'auto', padding: '8px 20px 16px' }} className="bz-scroll">
      <div className="bz-eyebrow" style={{ marginBottom: 4 }}>NABIZ · BU AY</div>
      <h2 style={{ fontSize: 26, marginBottom: 14, lineHeight: 1.05 }}>İşletme nabzı</h2>

      {/* Score hero */}
      <div style={{
        background: 'var(--bz-graphite)', color: '#FFF',
        borderRadius: 18, padding: 18, marginBottom: 14,
      }}>
        <div className="bz-eyebrow" style={{ color: 'var(--bz-n400)' }}>ORTALAMA PUAN</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 56, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'var(--bz-lime)' }}>4.71</span>
          <span className="bz-kpi-delta up" style={{ color: '#C6F24E' }}>
            <Icon name="arrowUp" size={11} color="#C6F24E"/> 0.18
          </span>
        </div>
        <div style={{ height: 60, marginTop: 12 }}>
          <svg width="100%" height="60" viewBox="0 0 320 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="m1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#C6F24E" stopOpacity="0.5"/>
                <stop offset="1" stopColor="#C6F24E" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0 50 L24 46 L48 44 L72 40 L96 42 L120 36 L144 30 L168 28 L192 32 L216 24 L240 20 L264 18 L288 14 L320 10 L320 60 L0 60 Z" fill="url(#m1)"/>
            <path d="M0 50 L24 46 L48 44 L72 40 L96 42 L120 36 L144 30 L168 28 L192 32 L216 24 L240 20 L264 18 L288 14 L320 10" fill="none" stroke="#C6F24E" strokeWidth="2"/>
          </svg>
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { l: 'YORUM', v: '184', d: '+24%' },
          { l: 'YANIT ORANI', v: '%92', d: '+8%' },
          { l: 'NPS', v: '64', d: '+12' },
          { l: 'AI YANIT', v: '142', d: '%77' },
        ].map((k, i) => (
          <div key={i} className="bz-card" style={{ padding: 14 }}>
            <div className="bz-eyebrow" style={{ marginBottom: 6 }}>{k.l}</div>
            <div className="bz-h-tight-2" style={{ fontSize: 22 }}>{k.v}</div>
            <div className="bz-mono" style={{ fontSize: 10.5, color: 'var(--bz-success)' }}>↑ {k.d}</div>
          </div>
        ))}
      </div>

      {/* Topics */}
      <div className="bz-card" style={{ padding: 16, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
          <span className="bz-eyebrow">KONULAR</span>
          <span className="bz-badge bz-badge--lime" style={{ marginLeft: 'auto' }}><Icon name="sparkle" size={10}/> AI</span>
        </div>
        {[
          { t: 'Lezzet', n: 482, p: 78 },
          { t: 'Servis', n: 318, p: 42 },
          { t: 'Atmosfer', n: 256, p: 84 },
          { t: 'Fiyat', n: 184, p: 38 },
        ].map((x, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
              <span style={{ fontWeight: 500 }}>{x.t}</span>
              <span className="bz-mono" style={{ color: 'var(--bz-n500)', fontSize: 10.5 }}>{x.n} bahsi</span>
            </div>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: 'var(--bz-n100)' }}>
              <div style={{ width: `${x.p}%`, background: 'var(--bz-lime-deep)' }}/>
              <div style={{ width: `${100 - x.p}%`, background: 'var(--bz-n200)' }}/>
            </div>
          </div>
        ))}
      </div>

      {/* AI insight */}
      <div className="bz-card-soft" style={{ padding: 14, borderLeft: '3px solid var(--bz-lime)' }}>
        <div className="bz-eyebrow" style={{ marginBottom: 6, color: 'var(--bz-lime-deep)' }}>
          <Icon name="sparkle" size={11} color="#A8D62E"/> AI İÇGÖRÜ
        </div>
        <p style={{ fontSize: 13, color: 'var(--bz-n800)', margin: 0, lineHeight: 1.55 }}>
          Cuma & Cumartesi akşamları servis şikayetleri %42 artıyor. Ek garson planı yapın.
        </p>
      </div>
    </div>
    <MobileTabBar active="analytics"/>
  </PhoneFrame>
);

const MobileCustomers = () => (
  <PhoneFrame>
    <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 16px' }} className="bz-scroll">
      <div style={{ padding: '0 4px 14px' }}>
        <div className="bz-eyebrow" style={{ marginBottom: 4 }}>CRM</div>
        <h2 style={{ fontSize: 26, lineHeight: 1.05 }}>Müşteriler</h2>
        <div className="bz-mono" style={{ fontSize: 12, color: 'var(--bz-n500)', marginTop: 6 }}>
          2,418 misafir · ₺4.820 ort LTV
        </div>
      </div>

      <input className="bz-input" placeholder="Ara…" style={{ marginBottom: 12 }}/>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }} className="bz-scroll">
        {['Tümü', 'VIP', 'Düzenli', 'Yeni', 'Risk'].map((s, i) => (
          <button key={s} className={i === 0 ? 'bz-btn-primary bz-btn-sm' : 'bz-btn-ghost bz-btn-sm'} style={{ flexShrink: 0 }}>{s}</button>
        ))}
      </div>

      {[
        { n: 'Burak Şen', i: 'BŞ', s: 'VIP', v: 32, ltv: '₺22.100', last: '1 sa' },
        { n: 'Ayşe Yıldız', i: 'AY', s: 'VIP', v: 28, ltv: '₺18.420', last: '2 gün' },
        { n: 'Furkan Aydın', i: 'FA', s: 'VIP', v: 22, ltv: '₺14.580', last: 'dün' },
        { n: 'Esra Korkmaz', i: 'EK', s: 'Düzenli', v: 18, ltv: '₺11.220', last: '5 sa' },
        { n: 'Mert Demir', i: 'MD', s: 'Risk', v: 14, ltv: '₺9.840', last: '14 dk', neg: true },
        { n: 'Selin Tekin', i: 'ST', s: 'Düzenli', v: 6, ltv: '₺2.180', last: '2 sa' },
      ].map((c, i) => (
        <div key={i} className="bz-card" style={{ padding: 14, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="bz-avatar bz-avatar--lg" style={{
            background: c.neg ? '#FEF2F2' : c.s === 'VIP' ? 'var(--bz-graphite)' : 'var(--bz-lime-soft)',
            color: c.neg ? '#991B1B' : c.s === 'VIP' ? 'var(--bz-lime)' : 'var(--bz-graphite)',
          }}>{c.i}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{c.n}</span>
              <SegmentChip s={c.s}/>
            </div>
            <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)', marginTop: 2 }}>
              {c.v} ziyaret · {c.ltv} · {c.last}
            </div>
          </div>
          <Icon name="chevronRight" size={14} color="var(--bz-n400)"/>
        </div>
      ))}
    </div>
    <MobileTabBar active="account"/>
  </PhoneFrame>
);

Object.assign(window, { PhoneFrame, MobileReviews, MobileAnalytics, MobileCustomers });
