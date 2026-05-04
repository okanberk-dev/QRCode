// Owner panel shared shell — sidebar + topbar
const NAV_TR = [
  { id: 'dashboard', label: 'Genel Bakış', icon: 'IBarChart' },
  { id: 'feedbacks', label: 'Yorumlar', icon: 'IInbox', count: 24 },
  { id: 'google', label: 'Google Yorumları', icon: 'IGoogle' },
  { id: 'platforms', label: 'Platform Bağlantıları', icon: 'ILink' },
  { id: 'analytics', label: 'Analitik', icon: 'ITrendUp' },
  { id: 'customers', label: 'Müşteriler', icon: 'IUsers' },
];
const NAV_BOTTOM = [
  { id: 'account', label: 'Hesabım', icon: 'IUser' },
  { id: 'settings', label: 'Ayarlar', icon: 'ISettings' },
];

function Sidebar({ active }) {
  return (
    <aside style={{
      width: 232, background: '#0A0A0A', color: '#A3A3A3', borderRight: '1px solid #1A1A1A',
      display: 'flex', flexDirection: 'column', padding: '20px 14px', flexShrink: 0
    }}>
      <div style={{ padding: '4px 8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="bz-wordmark" style={{ color: '#FFF', fontSize: 22 }}>
          buaze<span className="dot">.</span>
        </div>
        <span className="pulse-eyebrow" style={{ fontSize: 9, color: '#525252' }}>OWNER</span>
      </div>

      <div className="pulse-eyebrow" style={{ color: '#525252', padding: '12px 8px 8px', fontSize: 10 }}>
        ÇALIŞMA ALANI
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_TR.map(item => {
          const isActive = item.id === active;
          const I = window[item.icon];
          return (
            <button key={item.id} className={isActive ? 'bz-side-item-active' : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 10, border: 0,
                background: isActive ? '#C6F24E' : 'transparent',
                color: isActive ? '#0A0A0A' : '#A3A3A3',
                fontSize: 13, fontWeight: isActive ? 600 : 500,
                fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                width: '100%', justifyContent: 'space-between'
              }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <I size={16} />
                {item.label}
              </span>
              {item.count && (
                <span style={{
                  background: isActive ? '#0A0A0A' : '#1A1A1A',
                  color: isActive ? '#C6F24E' : '#A3A3A3',
                  fontSize: 10, fontWeight: 600, padding: '2px 6px',
                  borderRadius: 999, fontFamily: 'var(--font-mono)'
                }}>{item.count}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 16 }}>
        {NAV_BOTTOM.map(item => {
          const isActive = item.id === active;
          const I = window[item.icon];
          return (
            <button key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 10, border: 0,
                background: isActive ? '#C6F24E' : 'transparent',
                color: isActive ? '#0A0A0A' : '#A3A3A3',
                fontSize: 13, fontWeight: isActive ? 600 : 500,
                fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left'
              }}>
              <I size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Workspace card */}
      <div style={{
        marginTop: 14, padding: 12, borderRadius: 12,
        background: '#171717', border: '1px solid #1A1A1A',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div className="bz-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>KB</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#FFF', fontSize: 12, fontWeight: 600 }}>Kadıköy Bistro</div>
          <div style={{ color: '#737373', fontSize: 10, fontFamily: 'var(--font-mono)' }}>3 KONUM</div>
        </div>
        <window.IChevronDown size={14} />
      </div>
    </aside>
  );
}

function Topbar({ title, eyebrow, sub, actions }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '22px 28px 18px', borderBottom: '1px solid #EDEDED',
      background: '#FFFFFF', gap: 24, flexWrap: 'wrap'
    }}>
      <div style={{ minWidth: 0 }}>
        <div className="pulse-eyebrow" style={{ color: '#737373', marginBottom: 8 }}>{eyebrow}</div>
        <h1 className="bz-h-tight-2" style={{ fontSize: 28, margin: 0, color: '#0A0A0A' }}>{title}</h1>
        {sub && <p style={{ color: '#737373', fontSize: 13, margin: '6px 0 0', maxWidth: 560 }}>{sub}</p>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>
    </header>
  );
}

function PageShell({ active, children, eyebrow, title, sub, actions }) {
  return (
    <div style={{
      display: 'flex', height: '100%', minHeight: 720, background: '#FFFFFF',
      fontFamily: 'var(--font-body)', color: '#0A0A0A'
    }}>
      <Sidebar active={active} />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: '#FAFAFA' }}>
        <Topbar title={title} eyebrow={eyebrow} sub={sub} actions={actions} />
        <div style={{ flex: 1, padding: '24px 28px 32px', overflow: 'hidden' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

// Reusable atoms
function Pill({ tone = 'ghost', children, dot = false }) {
  const tones = {
    ok: { bg: '#F0FDF4', fg: '#166534', bd: '#BBF7D0', dot: '#16A34A' },
    warn: { bg: '#FFFBEB', fg: '#92400E', bd: '#FDE68A', dot: '#D97706' },
    danger: { bg: '#FEF2F2', fg: '#991B1B', bd: '#FECACA', dot: '#DC2626' },
    lime: { bg: '#EAF9B8', fg: '#4D5C00', bd: '#D9EE7A', dot: '#A8D62E' },
    info: { bg: '#EFF6FF', fg: '#1E40AF', bd: '#BFDBFE', dot: '#2563EB' },
    ghost: { bg: '#F2F2F2', fg: '#525252', bd: '#EDEDED', dot: '#A3A3A3' },
    dark: { bg: '#0A0A0A', fg: '#FFFFFF', bd: '#0A0A0A', dot: '#C6F24E' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: 22,
      padding: '0 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, whiteSpace: 'nowrap'
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: t.dot }} />}
      {children}
    </span>
  );
}

function Stars({ value = 5, size = 12, color = '#C6F24E' }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1, color }}>
      {[1,2,3,4,5].map(i => (
        <window.IStar key={i} size={size} filled={i <= value} />
      ))}
    </span>
  );
}

function Avatar({ initials, size = 32 }) {
  return (
    <div className="bz-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, PageShell, Pill, Stars, Avatar });
