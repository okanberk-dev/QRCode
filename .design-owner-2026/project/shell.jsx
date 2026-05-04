/* Buaze Pulse Panel — Shared Shell Components
 * BuazeLogo, PanelShell (collapsible sidebar + topbar)
 */

const BuazeLogo = ({ size = 28, onDark = false }) => {
  const ink = onDark ? '#FFFFFF' : '#0A0A0A';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="Buaze">
      <path d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z" fill="none" stroke={ink} strokeWidth="3.2" strokeLinejoin="round"/>
      <path d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28" fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="54" cy="10" r="5" fill="#C6F24E"/>
    </svg>
  );
};

const Wordmark = ({ size = 28 }) => (
  <div className="bz-brand-mark" style={{ fontSize: 18 }}>
    <BuazeLogo size={size} />
    <span>buaze<span style={{ color: '#C6F24E' }}>.</span></span>
  </div>
);

// Lucide-style icons (single-line, 16px default)
const Icon = ({ name, size = 16, color = 'currentColor' }) => {
  const paths = {
    inbox: <><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
    star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
    plug: <><path d="M12 22v-5"/><path d="M9 7V2"/><path d="M15 7V2"/><path d="M6 13V8h12v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z"/></>,
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    chart: <><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    chevronDown: <polyline points="6 9 12 15 18 9"/>,
    chevronRight: <polyline points="9 18 15 12 9 6"/>,
    chevronLeft: <polyline points="15 18 9 12 15 6"/>,
    chevronsLeft: <><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></>,
    chevronsRight: <><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    moreH: <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></>,
    reply: <><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></>,
    sparkle: <><path d="M12 3l1.9 5.6L19 10l-5.1 1.4L12 17l-1.9-5.6L5 10l5.1-1.4z"/><path d="M19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></>,
    google: <><path d="M21.35 11.1H12.18v3.2h5.27c-.46 2.49-2.5 3.85-5.27 3.85a5.85 5.85 0 0 1 0-11.7c1.4 0 2.7.5 3.7 1.4l2.4-2.4A9 9 0 0 0 12.18 3a9 9 0 0 0 0 18c5.07 0 8.84-3.55 8.84-8.95 0-.6-.07-1.1-.17-1.55z"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    qr: <><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="3" y="15" width="6" height="6"/><path d="M15 12h2v2h-2zM18 15h3v3h-3zM12 12h2v2h-2zM12 18h2v3h-2zM18 21h3"/></>,
    creditCard: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
    key: <><circle cx="8" cy="15" r="4"/><line x1="10.85" y1="12.15" x2="22" y2="1"/><line x1="18" y1="5" x2="22" y2="9"/><line x1="15" y1="8" x2="18" y2="11"/></>,
    location: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    mail: <><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/></>,
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    refresh: <><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    instagram: <><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></>,
    facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    lock: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    cube: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>,
    smile: <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
    frown: <><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
    meh: <><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
    archive: <><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>,
    menu: <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    helpCircle: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>,
    palette: <><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>,
    activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>,
    tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    trendingUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    alertCircle: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    checkCircle: <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
    messageSquare: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {paths[name] || null}
    </svg>
  );
};

const Stars = ({ value = 5, size = 12 }) => (
  <span className="bz-stars" style={{ gap: 1 }}>
    {[1,2,3,4,5].map(i => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= value ? '#FACC15' : '#E5E7EB'}>
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ))}
  </span>
);

const SIDEBAR_NAV = [
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
    { id: 'billing', label: 'Faturalama', icon: 'creditCard' },
  ]},
];

const UserMenu = () => (
  <div className="bz-user-menu">
    <div style={{ padding: '10px 10px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="bz-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>EK</div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Emre Kara</span>
        <span style={{ fontSize: 11, color: 'var(--bz-n500)' }}>emre@kadikoybistro.com</span>
      </div>
    </div>
    <div className="bz-user-menu-divider"></div>
    <div className="bz-user-menu-item"><Icon name="user" size={14}/> Profilim</div>
    <div className="bz-user-menu-item"><Icon name="settings" size={14}/> Ayarlar</div>
    <div className="bz-user-menu-item"><Icon name="moon" size={14}/> Koyu mod <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--bz-n400)' }}>Yakında</span></div>
    <div className="bz-user-menu-divider"></div>
    <div className="bz-user-menu-item"><Icon name="helpCircle" size={14}/> Yardım Merkezi</div>
    <div className="bz-user-menu-item"><Icon name="book" size={14}/> Doküman</div>
    <div className="bz-user-menu-divider"></div>
    <div className="bz-user-menu-item danger"><Icon name="logout" size={14}/> Çıkış yap</div>
  </div>
);

const PanelSidebar = ({ active, collapsed = false, onToggle }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const w = collapsed ? 68 : 248;

  return (
    <aside style={{
      width: w, flexShrink: 0,
      borderRight: '1px solid var(--bz-n200)',
      background: '#FFFFFF',
      padding: collapsed ? '20px 8px 16px' : '20px 14px 16px',
      display: 'flex', flexDirection: 'column', gap: 18,
      height: '100%',
      transition: 'width 220ms cubic-bezier(.4,0,.2,1), padding 220ms',
      position: 'relative',
    }}>
      {/* Brand + collapse toggle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? 0 : '4px 6px 0',
      }}>
        {collapsed ? (
          <BuazeLogo size={28}/>
        ) : (
          <Wordmark/>
        )}
        {!collapsed && onToggle && (
          <button className="bz-btn-icon" onClick={onToggle} aria-label="Daralt" title="Sidebar'ı daralt">
            <Icon name="chevronsLeft" size={16}/>
          </button>
        )}
      </div>

      {collapsed && onToggle && (
        <button className="bz-btn-icon" onClick={onToggle} aria-label="Genişlet" title="Sidebar'ı aç" style={{ margin: '0 auto' }}>
          <Icon name="chevronsRight" size={16}/>
        </button>
      )}

      {/* Search */}
      {!collapsed ? (
        <div style={{ position: 'relative', padding: '0 4px' }}>
          <input className="bz-input" placeholder="Ara…" style={{ paddingLeft: 34, fontSize: 13 }} />
          <span style={{ position: 'absolute', left: 16, top: 11, color: 'var(--bz-n400)' }}>
            <Icon name="search" size={14} />
          </span>
          <span className="bz-mono" style={{
            position: 'absolute', right: 12, top: 9,
            fontSize: 10, color: 'var(--bz-n400)',
            border: '1px solid var(--bz-n200)', borderRadius: 4, padding: '2px 5px', background: 'var(--bz-n50)',
          }}>⌘K</span>
        </div>
      ) : (
        <button className="bz-btn-icon" aria-label="Ara" title="Ara (⌘K)" style={{ margin: '0 auto' }}>
          <Icon name="search" size={16}/>
        </button>
      )}

      {/* CTA */}
      <button
        className={`bz-side-cta ${collapsed ? 'bz-side-cta--mini' : ''}`}
        title={collapsed ? 'Yeni Yorum İste' : ''}
      >
        <Icon name="plus" size={14}/>
        <span>Yorum İste</span>
      </button>

      {/* Nav */}
      <nav style={{
        display: 'flex', flexDirection: 'column',
        gap: collapsed ? 6 : 18,
        flex: 1, overflow: 'auto', minHeight: 0,
      }} className="bz-scroll">
        {SIDEBAR_NAV.map(group => (
          <div key={group.section} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className={`bz-side-section ${collapsed ? 'bz-side-section--mini' : ''}`}>
              <span>{group.section}</span>
            </div>
            {group.items.map(item => (
              <div
                key={item.id}
                className={`bz-side-item ${collapsed ? 'bz-side-item--mini' : ''} ${active === item.id ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
              >
                <Icon name={item.icon} size={16} />
                <span className="label">{item.label}</span>
                {item.count != null && <span className="count">{item.count}</span>}
                {item.isNew && <span className="badge-new">YENİ</span>}
                {collapsed && <span className="bz-side-tip">{item.label}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Storage / plan card */}
      {!collapsed && (
        <div style={{
          background: 'var(--bz-n50)',
          border: '1px solid var(--bz-n200)',
          borderRadius: 12,
          padding: 12,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="bz-eyebrow" style={{ fontSize: 9.5 }}>PRO PLAN</span>
            <span className="bz-mono bz-tnum" style={{ fontSize: 10.5, color: 'var(--bz-n500)' }}>14 gün</span>
          </div>
          <div className="bz-progress lime"><i style={{ width: '52%' }}/></div>
          <div style={{ fontSize: 11.5, color: 'var(--bz-n500)', lineHeight: 1.4 }}>
            520 / 1000 yanıt — <span style={{ color: 'var(--bz-graphite)', fontWeight: 600, textDecoration: 'underline' }}>Yükselt</span>
          </div>
        </div>
      )}

      {/* User pill */}
      <div style={{ position: 'relative' }}>
        {menuOpen && !collapsed && <UserMenu/>}
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            borderTop: '1px solid var(--bz-n200)',
            paddingTop: 12,
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            cursor: 'pointer',
          }}
          title={collapsed ? 'Emre Kara' : ''}
        >
          <div className="bz-avatar">EK</div>
          {!collapsed && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bz-graphite)' }}>Emre Kara</span>
                <span style={{ fontSize: 11, color: 'var(--bz-n500)' }}>Kadıköy Bistro · Owner</span>
              </div>
              <span className="bz-btn-icon" aria-label="Menü">
                <Icon name="chevronDown" size={14} />
              </span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

const PanelTopbar = ({ title, eyebrow, breadcrumb, actions, sub, onSidebarToggle, mobile = false }) => (
  <header style={{
    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
    padding: mobile ? '14px 16px 14px' : '20px 28px 18px',
    borderBottom: '1px solid var(--bz-n200)',
    background: '#FFFFFF',
    gap: 16,
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
      {onSidebarToggle && (
        <button
          className="bz-topbar-toggle"
          onClick={onSidebarToggle}
          aria-label="Menü"
          style={{ marginTop: eyebrow ? 16 : 4 }}
        >
          <Icon name="menu" size={18}/>
        </button>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
        {eyebrow && (
          <div className="bz-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
            {breadcrumb || `PANEL / ${eyebrow}`}
            <span className="bz-pulse-dot" style={{ marginLeft: 4 }}></span>
          </div>
        )}
        <h1 style={{
          fontSize: mobile ? 20 : 26,
          letterSpacing: '-0.03em', lineHeight: 1.05,
        }}>{title}</h1>
        {sub && <p style={{ color: 'var(--bz-n500)', fontSize: mobile ? 12 : 13.5, margin: 0, maxWidth: 640 }}>{sub}</p>}
      </div>
    </div>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
      {actions}
    </div>
  </header>
);

const PanelShell = ({ active, topbar, children, contentStyle, defaultCollapsed = false }) => {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  return (
    <div className="bz-frame" style={{
      width: '100%', height: '100%',
      display: 'flex',
      background: 'var(--bz-pure)',
      overflow: 'hidden',
    }}>
      <PanelSidebar active={active} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {topbar}
        <main style={{
          flex: 1, overflow: 'auto', padding: '24px 28px 32px',
          background: 'var(--bz-n50)',
          ...contentStyle,
        }} className="bz-scroll">
          {children}
        </main>
      </div>
    </div>
  );
};

Object.assign(window, { BuazeLogo, Wordmark, Icon, Stars, PanelShell, PanelSidebar, PanelTopbar, UserMenu });
