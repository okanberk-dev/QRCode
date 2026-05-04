/* Mobile screens v2 — drawer sidebar + dashboard + google + account */

const MobileDrawer = ({ active = 'dashboard', onClose }) => (
  <>
    <div className="bz-drawer-overlay" onClick={onClose}/>
    <aside className="bz-drawer" style={{ padding: '16px 14px 16px' }}>
      <div className="bz-row" style={{ justifyContent: 'space-between', padding: '4px 6px 14px' }}>
        <Wordmark size={26}/>
        <button className="bz-btn-icon" onClick={onClose} aria-label="Kapat">
          <Icon name="x" size={16}/>
        </button>
      </div>

      <div style={{ position: 'relative', padding: '0 4px 14px' }}>
        <input className="bz-input" placeholder="Ara…" style={{ paddingLeft: 34, fontSize: 13 }}/>
        <span style={{ position: 'absolute', left: 16, top: 11, color: 'var(--bz-n400)' }}>
          <Icon name="search" size={14}/>
        </span>
      </div>

      <button className="bz-side-cta" style={{ marginBottom: 14 }}>
        <Icon name="plus" size={14}/> Yorum İste
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, overflow: 'auto' }} className="bz-scroll">
        {[
          { section: 'GENEL', items: [
            { id: 'dashboard', label: 'Genel Bakış', icon: 'home' },
            { id: 'reviews', label: 'Yorumlar', icon: 'inbox', count: 28 },
            { id: 'google', label: 'Google Yorumları', icon: 'star', count: 142 },
          ]},
          { section: 'CRM', items: [
            { id: 'customers', label: 'Müşteriler', icon: 'users', count: '2.4K' },
            { id: 'analytics', label: 'Analitik', icon: 'chart' },
            { id: 'campaigns', label: 'Kampanyalar', icon: 'zap', isNew: true },
          ]},
          { section: 'AYARLAR', items: [
            { id: 'platforms', label: 'Platform Bağlantıları', icon: 'plug' },
            { id: 'qr', label: 'QR Kodlar', icon: 'qr' },
            { id: 'account', label: 'Hesabım', icon: 'user' },
          ]},
        ].map(group => (
          <div key={group.section} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="bz-side-section">{group.section}</div>
            {group.items.map(item => (
              <div key={item.id} className={`bz-side-item ${active === item.id ? 'active' : ''}`}>
                <Icon name={item.icon} size={16}/>
                <span className="label">{item.label}</span>
                {item.count != null && <span className="count">{item.count}</span>}
                {item.isNew && <span className="badge-new">YENİ</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>

      <div style={{
        background: 'var(--bz-n50)', border: '1px solid var(--bz-n200)',
        borderRadius: 12, padding: 12, marginTop: 12,
      }}>
        <div className="bz-row" style={{ gap: 10 }}>
          <div className="bz-avatar">EK</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Emre Kara</div>
            <div style={{ fontSize: 10.5, color: 'var(--bz-n500)' }}>Kadıköy Bistro</div>
          </div>
          <Icon name="logout" size={14} color="var(--bz-n500)"/>
        </div>
      </div>
    </aside>
  </>
);

const MobileBottomNav = ({ active }) => (
  <div className="bz-bottomnav" style={{ flexShrink: 0 }}>
    {[
      { id: 'dashboard', i: 'home', l: 'Genel' },
      { id: 'reviews', i: 'inbox', l: 'Yorum', badge: 12 },
      { id: 'add', i: 'plus', l: '', special: true },
      { id: 'analytics', i: 'chart', l: 'Analitik' },
      { id: 'account', i: 'user', l: 'Profil' },
    ].map(t => (
      <div key={t.id} className={`bz-bottomnav-item ${active === t.id ? 'active' : ''}`}>
        {t.special ? (
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'var(--bz-graphite)', color: 'var(--bz-lime)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -8,
          }}>
            <Icon name={t.i} size={20} color="#C6F24E"/>
          </div>
        ) : (
          <>
            <Icon name={t.i} size={22}/>
            {t.badge && <span className="badge-tip">{t.badge}</span>}
          </>
        )}
        {t.l && <span>{t.l}</span>}
      </div>
    ))}
  </div>
);

// Mobile Dashboard
const MobileDashboard = ({ withDrawer = false }) => (
  <PhoneFrame>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {withDrawer && <MobileDrawer active="dashboard"/>}

      {/* Topbar */}
      <div style={{ padding: '8px 16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="bz-btn-icon" style={{ width: 36, height: 36, border: '1px solid var(--bz-n200)' }}>
          <Icon name="menu" size={18}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bz-eyebrow" style={{ fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            KADIKÖY BISTRO <span className="bz-pulse-dot"/>
          </div>
          <h2 style={{ fontSize: 19, lineHeight: 1.05 }}>Genel Bakış</h2>
        </div>
        <button className="bz-btn-icon" style={{ width: 36, height: 36, border: '1px solid var(--bz-n200)', position: 'relative' }}>
          <Icon name="bell" size={16}/>
          <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--bz-danger)', border: '2px solid #FFF' }}/>
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }} className="bz-scroll">
        {/* Hero card */}
        <div style={{
          background: 'var(--bz-graphite)', color: '#FFF',
          borderRadius: 18, padding: 18, marginBottom: 12,
          position: 'relative', overflow: 'hidden',
        }}>
          <div className="bz-eyebrow" style={{ color: 'var(--bz-n400)', fontSize: 9.5 }}>BUGÜN · 4 MAYIS</div>
          <div style={{ marginTop: 8, marginBottom: 12 }}>
            <div className="bz-row" style={{ gap: 6, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: 44, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'var(--bz-lime)' }}>4.71</span>
              <Stars value={5} size={13}/>
            </div>
            <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)', marginTop: 6 }}>
              <span style={{ color: 'var(--bz-lime)' }}>↑ 0.18</span> · 142 yorum bu ay
            </div>
          </div>
          <div style={{ height: 50 }}>
            <svg width="100%" height="50" viewBox="0 0 320 50" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mhero" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#C6F24E" stopOpacity="0.4"/>
                  <stop offset="1" stopColor="#C6F24E" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path d="M0 40 L20 38 L40 36 L60 32 L80 34 L100 28 L120 26 L140 22 L160 24 L180 18 L200 16 L220 14 L240 18 L260 12 L280 10 L300 8 L320 4 L320 50 L0 50 Z" fill="url(#mhero)"/>
              <path d="M0 40 L20 38 L40 36 L60 32 L80 34 L100 28 L120 26 L140 22 L160 24 L180 18 L200 16 L220 14 L240 18 L260 12 L280 10 L300 8 L320 4" fill="none" stroke="#C6F24E" strokeWidth="2"/>
            </svg>
          </div>
        </div>

        {/* AI banner */}
        <div className="bz-card-soft" style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--bz-lime)' }}>
          <div className="bz-eyebrow" style={{ marginBottom: 4, color: 'var(--bz-lime-deep)', fontSize: 9.5 }}>
            <Icon name="sparkle" size={10} color="#A8D62E"/> AI İÇGÖRÜ
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--bz-n800)', margin: 0, lineHeight: 1.5 }}>
            "Servis hızı" şikayetleri %23 arttı — Cuma 19:00–21:00 yoğunluğuna dikkat.
          </p>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { l: 'BEKLEYEN', v: '12', d: 'yanıt', tone: 'warn' },
            { l: 'YENİ', v: '8', d: 'bugün', tone: 'ok' },
            { l: 'YANIT', v: '%87', d: '↑ 12pt', tone: 'lime' },
            { l: 'NPS', v: '64', d: '↑ 12', tone: 'ghost' },
          ].map((k, i) => (
            <div key={i} className="bz-card" style={{ padding: 12 }}>
              <div className="bz-row" style={{ justifyContent: 'space-between' }}>
                <span className="bz-eyebrow" style={{ fontSize: 9 }}>{k.l}</span>
              </div>
              <div className="bz-h-tight-2" style={{ fontSize: 22, marginTop: 4 }}>{k.v}</div>
              <div className="bz-mono" style={{ fontSize: 10, color: k.tone === 'warn' ? 'var(--bz-warn)' : 'var(--bz-n500)' }}>{k.d}</div>
            </div>
          ))}
        </div>

        {/* Bekleyen görevler */}
        <div className="bz-card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="bz-eyebrow">BEKLEYEN GÖREVLER</span>
            <a className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-graphite)', fontWeight: 600 }}>Tümü 4</a>
          </div>
          {[
            { i: 'reply', l: '12 yorum yanıtsız', t: 'high' },
            { i: 'plug', l: 'Yemeksepeti senk hatası', t: 'mid' },
            { i: 'zap', l: 'Bahar kampanyası bitiyor', t: 'mid' },
          ].map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0',
              borderBottom: i < 2 ? '1px solid var(--bz-n100)' : 'none',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'var(--bz-n50)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name={t.i} size={13}/>
              </div>
              <span style={{ flex: 1, fontSize: 12.5, fontWeight: 500 }}>{t.l}</span>
              <span className={`bz-badge ${t.t === 'high' ? 'bz-badge--danger' : 'bz-badge--warn'}`} style={{ fontSize: 10 }}>
                {t.t === 'high' ? 'Acil' : 'Orta'}
              </span>
            </div>
          ))}
        </div>

        {/* Kanallar */}
        <div style={{ marginBottom: 14 }}>
          <div className="bz-eyebrow" style={{ marginBottom: 8 }}>KANALLAR</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }} className="bz-scroll">
            {[
              { n: 'Google', i: 'google', r: 4.8, c: 84, t: '#4285F4' },
              { n: 'Yemekse...', i: 'cube', r: 4.5, c: 32, t: '#FA0050' },
              { n: 'Trendyol', i: 'tag', r: 4.6, c: 18, t: '#F27A1A' },
              { n: 'Zomato', i: 'star', r: 4.4, c: 8, t: '#E23744' },
            ].map((c, i) => (
              <div key={i} className="bz-card" style={{ padding: 12, minWidth: 130, flexShrink: 0 }}>
                <div className="bz-row" style={{ gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6,
                    background: c.t, color: '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={c.i} size={12}/>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.n}</span>
                </div>
                <div className="bz-row" style={{ alignItems: 'baseline', gap: 4 }}>
                  <span className="bz-mono bz-tnum" style={{ fontSize: 18, fontWeight: 600 }}>{c.r}</span>
                  <Stars value={Math.round(c.r)} size={9}/>
                </div>
                <div className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)', marginTop: 2 }}>{c.c} yorum</div>
              </div>
            ))}
          </div>
        </div>

        {/* Aktivite */}
        <div className="bz-card" style={{ padding: 14 }}>
          <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="bz-eyebrow">CANLI AKIŞ</span>
            <span className="bz-pulse-dot"/>
          </div>
          {[
            { t: '09:42', n: 'Ayşe D.', a: '★★★★★ Google', s: 'pos' },
            { t: '09:18', n: 'AI Asistan', a: 'yanıt önerisi', s: 'neu' },
            { t: '08:55', n: 'Selin K.', a: '★★ Yemeksepeti', s: 'neg' },
          ].map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '8px 0',
              alignItems: 'center',
              borderBottom: i < 2 ? '1px solid var(--bz-n100)' : 'none',
            }}>
              <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)', width: 36 }}>{a.t}</span>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: a.s === 'pos' ? '#16A34A' : a.s === 'neg' ? '#DC2626' : '#A3A3A3',
              }}/>
              <span style={{ flex: 1, fontSize: 12 }}>
                <strong>{a.n}</strong> · {a.a}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <MobileBottomNav active="dashboard"/>
  </PhoneFrame>
);

// Mobile Reviews v2 — with drawer toggle and bottom nav
const MobileReviewsV2 = () => (
  <PhoneFrame>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{ padding: '6px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="bz-btn-icon" style={{ width: 36, height: 36, border: '1px solid var(--bz-n200)' }}>
          <Icon name="menu" size={18}/>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bz-eyebrow" style={{ fontSize: 9.5 }}>YORUMLAR · 28 BEKLEYEN</div>
          <h2 style={{ fontSize: 19, lineHeight: 1.05 }}>Yorum kutusu</h2>
        </div>
        <button className="bz-btn-icon" style={{ width: 36, height: 36, border: '1px solid var(--bz-n200)' }}>
          <Icon name="filter" size={16}/>
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ padding: '0 16px 10px', display: 'flex', gap: 6, overflowX: 'auto' }} className="bz-scroll">
        {[
          { l: 'Tümü', n: 28, active: true },
          { l: 'Düşük', n: 4 },
          { l: 'Yanıtsız', n: 12 },
          { l: 'Bugün', n: 8 },
          { l: 'AI Hazır', n: 7 },
        ].map((c, i) => (
          <button key={c.l} className={`bz-chip ${c.active ? 'active' : ''}`} style={{ flexShrink: 0 }}>
            {c.l} <span className="bz-mono" style={{ opacity: 0.6 }}>{c.n}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 8px' }} className="bz-scroll">
        {[
          { n: 'Mert Demir', i: 'MD', r: 2, t: '14 dk', p: 'Servis çok yavaştı. 25 dk bekledik. Yemek güzel ama bekleme süresi kabul edilemez.', neg: true, ch: 'Google', ai: true },
          { n: 'Ayşe Yıldız', i: 'AY', r: 5, t: '38 dk', p: 'Mantar makarna mükemmel. Sunum özenli, kesin tekrar geleceğim.', replied: true, ch: 'Google' },
          { n: 'Burak Şen', i: 'BŞ', r: 4, t: '1 sa', p: 'Atmosfer hoş, lezzet iyi. Müzik biraz yüksekti.', ch: 'Yemeksepeti', ai: true },
          { n: 'Selin Tekin', i: 'ST', r: 3, t: '2 sa', p: 'Pizza hamuru güzeldi ama soğuk geldi.', ch: 'Trendyol' },
          { n: 'Can Aksoy', i: 'CA', r: 5, t: '3 sa', p: 'Şef çok ilgiliydi, doğum günümü unutmadılar.', replied: true, ch: 'Buaze' },
        ].map((r, i) => (
          <div key={i} style={{
            padding: 12, marginBottom: 8,
            background: '#FFFFFF',
            border: '1px solid var(--bz-n200)',
            borderRadius: 14,
            display: 'flex', gap: 10,
          }}>
            <div className="bz-avatar bz-avatar--lg" style={{
              background: r.neg ? '#FEF2F2' : 'var(--bz-lime-soft)',
              color: r.neg ? '#991B1B' : 'var(--bz-graphite)',
            }}>{r.i}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{r.n}</span>
                <span style={{ fontSize: 10, color: 'var(--bz-n500)' }}>· {r.ch}</span>
                <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)', marginLeft: 'auto' }}>{r.t}</span>
              </div>
              <div className="bz-row" style={{ gap: 6, marginBottom: 5 }}>
                <Stars value={r.r} size={11}/>
                {r.replied && <span className="bz-badge bz-badge--ok" style={{ fontSize: 9, height: 18 }}><Icon name="check" size={9}/> Yanıtlı</span>}
                {r.ai && !r.replied && <span className="bz-badge bz-badge--lime" style={{ fontSize: 9, height: 18 }}><Icon name="sparkle" size={9}/> AI hazır</span>}
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--bz-n700)', margin: 0, lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.p}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky AI bar */}
      <div style={{
        margin: '0 12px 10px', padding: '10px 12px',
        background: 'var(--bz-graphite)', color: '#FFF',
        borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <Icon name="sparkle" size={16} color="#C6F24E"/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>4 yoruma AI yanıt hazır</div>
        </div>
        <button className="bz-btn-lime bz-btn-sm" style={{ padding: '6px 12px' }}>Aç</button>
      </div>
    </div>
    <MobileBottomNav active="reviews"/>
  </PhoneFrame>
);

// Mobile Google
const MobileGoogle = () => (
  <PhoneFrame>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '6px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="bz-btn-icon" style={{ width: 36, height: 36, border: '1px solid var(--bz-n200)' }}>
          <Icon name="chevronLeft" size={18}/>
        </button>
        <div style={{ flex: 1 }}>
          <div className="bz-eyebrow" style={{ fontSize: 9.5 }}>GOOGLE BUSINESS</div>
          <h2 style={{ fontSize: 19, lineHeight: 1.05 }}>Google Yorumları</h2>
        </div>
        <button className="bz-btn-icon" style={{ width: 36, height: 36, border: '1px solid var(--bz-n200)' }}>
          <Icon name="refresh" size={16}/>
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }} className="bz-scroll">
        {/* Google hero card */}
        <div style={{
          background: 'var(--bz-graphite)', color: '#FFF',
          borderRadius: 18, padding: 18, marginBottom: 12,
        }}>
          <div className="bz-row" style={{ gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="google" size={18} color="#FFF"/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Kadıköy Bistro</div>
              <div className="bz-mono" style={{ fontSize: 10.5, color: 'var(--bz-n400)' }}>maps.google.com · Bağlı</div>
            </div>
            <span className="bz-badge bz-badge--dark" style={{ fontSize: 10 }}>
              <span className="dot"/> Aktif
            </span>
          </div>

          <div className="bz-row" style={{ alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: 48, lineHeight: 0.9, letterSpacing: '-0.04em', color: 'var(--bz-lime)' }}>4.7</span>
            <Stars value={5} size={14}/>
            <span className="bz-kpi-delta up" style={{ marginLeft: 'auto', color: '#C6F24E' }}>
              <Icon name="arrowUp" size={11} color="#C6F24E"/> 0.3
            </span>
          </div>
          <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)' }}>
            2,418 yorum · 89.5K görüntüleme · 1,240 yön tarifi
          </div>

          {/* Distribution bars */}
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { s: 5, p: 76, n: 1843 },
              { s: 4, p: 14, n: 339 },
              { s: 3, p: 6, n: 145 },
              { s: 2, p: 2, n: 48 },
              { s: 1, p: 2, n: 43 },
            ].map(b => (
              <div key={b.s} className="bz-row" style={{ gap: 8, fontSize: 10.5 }}>
                <span className="bz-mono" style={{ width: 12, color: 'var(--bz-n400)' }}>{b.s}★</span>
                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${b.p}%`, height: '100%', background: b.s === 5 ? 'var(--bz-lime)' : 'rgba(255,255,255,0.3)' }}/>
                </div>
                <span className="bz-mono bz-tnum" style={{ width: 36, textAlign: 'right', color: 'var(--bz-n400)' }}>{b.n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <button className="bz-card" style={{ padding: 12, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--bz-n200)' }}>
            <Icon name="qr" size={18}/>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>QR Yorum</div>
            <div className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)' }}>Yazdır / paylaş</div>
          </button>
          <button className="bz-card" style={{ padding: 12, textAlign: 'left', cursor: 'pointer', border: '1px solid var(--bz-n200)' }}>
            <Icon name="link" size={18}/>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>Direkt Link</div>
            <div className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)' }}>SMS ile gönder</div>
          </button>
        </div>

        {/* Reviews list */}
        <div className="bz-eyebrow" style={{ marginBottom: 8 }}>SON YORUMLAR · 142</div>
        {[
          { n: 'Burak Şen', i: 'BŞ', r: 5, t: '2 sa', p: 'Mantar makarna ve ev yapımı limonata harika. Garson Mehmet çok ilgili.', replied: true },
          { n: 'Ayşe Yıldız', i: 'AY', r: 5, t: '4 sa', p: 'Atmosfer çok hoş, fiyatlar makul. Tatlı menüsünü deneyin.' },
          { n: 'Mert D.', i: 'MD', r: 2, t: 'dün', p: 'Cuma akşamı 25 dakika bekledik. Yemek güzel ama servis çok yavaş.', neg: true },
        ].map((r, i) => (
          <div key={i} style={{
            padding: 12, marginBottom: 8,
            background: '#FFF', border: '1px solid var(--bz-n200)', borderRadius: 14,
          }}>
            <div className="bz-row" style={{ gap: 10, marginBottom: 6 }}>
              <div className="bz-avatar" style={{
                background: r.neg ? '#FEF2F2' : 'var(--bz-lime-soft)',
                color: r.neg ? '#991B1B' : 'var(--bz-graphite)',
              }}>{r.i}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r.n}</div>
                <div className="bz-row" style={{ gap: 6, marginTop: 2 }}>
                  <Stars value={r.r} size={10}/>
                  <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)' }}>· {r.t}</span>
                </div>
              </div>
              {r.replied && <span className="bz-badge bz-badge--ok" style={{ fontSize: 9, height: 18 }}><Icon name="check" size={9}/></span>}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--bz-n700)', margin: 0, lineHeight: 1.5 }}>{r.p}</p>
          </div>
        ))}
      </div>
    </div>
    <MobileBottomNav active="reviews"/>
  </PhoneFrame>
);

// Mobile Account
const MobileAccount = () => (
  <PhoneFrame>
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '6px 16px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="bz-btn-icon" style={{ width: 36, height: 36, border: '1px solid var(--bz-n200)' }}>
          <Icon name="menu" size={18}/>
        </button>
        <div style={{ flex: 1 }}>
          <div className="bz-eyebrow" style={{ fontSize: 9.5 }}>HESAP & AYARLAR</div>
          <h2 style={{ fontSize: 19, lineHeight: 1.05 }}>Profilim</h2>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }} className="bz-scroll">
        {/* Profile card */}
        <div className="bz-card" style={{ padding: 16, marginBottom: 14 }}>
          <div className="bz-row" style={{ gap: 12 }}>
            <div className="bz-avatar bz-avatar--xl">EK</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Emre Kara</div>
              <div style={{ fontSize: 11.5, color: 'var(--bz-n500)' }}>Kadıköy Bistro · Owner</div>
              <div className="bz-row" style={{ gap: 5, marginTop: 6 }}>
                <span className="bz-badge bz-badge--dark" style={{ fontSize: 9.5, height: 18 }}>
                  <span className="dot"/> PRO
                </span>
                <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)' }}>14 gün kaldı</span>
              </div>
            </div>
            <button className="bz-btn-icon"><Icon name="edit" size={14}/></button>
          </div>
        </div>

        {/* Plan progress */}
        <div className="bz-card" style={{ padding: 14, marginBottom: 14 }}>
          <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="bz-eyebrow">BU AY KULLANIM</span>
            <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>520 / 1000</span>
          </div>
          <div className="bz-progress lime"><i style={{ width: '52%' }}/></div>
          <div style={{ fontSize: 11.5, color: 'var(--bz-n500)', marginTop: 6 }}>
            AI yanıt kotası — 480 yanıt kaldı
          </div>
        </div>

        {/* Settings groups */}
        {[
          { title: 'HESAP', items: [
            { i: 'user', l: 'Profil bilgileri', s: 'emre@kadikoybistro.com' },
            { i: 'shield', l: 'Güvenlik', s: '2FA aktif' },
            { i: 'bell', l: 'Bildirimler', s: 'E-posta + Push' },
          ]},
          { title: 'İŞLETME', items: [
            { i: 'location', l: 'İşletme bilgileri', s: 'Kadıköy, İstanbul' },
            { i: 'users', l: 'Ekip & Roller', s: '3 üye' },
            { i: 'plug', l: 'Platformlar', s: '8 bağlı' },
          ]},
          { title: 'ABONELİK', items: [
            { i: 'creditCard', l: 'Faturalama', s: 'Visa ····4242' },
            { i: 'cube', l: 'Plan & Yükselt', s: 'PRO · ₺899/ay' },
          ]},
        ].map(g => (
          <div key={g.title} style={{ marginBottom: 14 }}>
            <div className="bz-eyebrow" style={{ marginBottom: 6, fontSize: 9.5 }}>{g.title}</div>
            <div className="bz-card" style={{ overflow: 'hidden' }}>
              {g.items.map((it, i) => (
                <div key={it.l} className="bz-row" style={{
                  padding: '12px 14px',
                  gap: 12,
                  borderBottom: i < g.items.length - 1 ? '1px solid var(--bz-n100)' : 'none',
                  cursor: 'pointer',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'var(--bz-n50)', border: '1px solid var(--bz-n200)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={it.i} size={14}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{it.l}</div>
                    <div style={{ fontSize: 11, color: 'var(--bz-n500)', marginTop: 1 }}>{it.s}</div>
                  </div>
                  <Icon name="chevronRight" size={14} color="var(--bz-n400)"/>
                </div>
              ))}
            </div>
          </div>
        ))}

        <button className="bz-btn-ghost" style={{ width: '100%', color: 'var(--bz-danger)', borderColor: '#FECACA' }}>
          <Icon name="logout" size={14}/> Çıkış yap
        </button>
        <div className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n400)', textAlign: 'center', marginTop: 16 }}>
          Buaze v2.6.1 · Build 2026.05
        </div>
      </div>
    </div>
    <MobileBottomNav active="account"/>
  </PhoneFrame>
);

Object.assign(window, {
  MobileDrawer, MobileBottomNav,
  MobileDashboard, MobileReviewsV2, MobileGoogle, MobileAccount,
});
