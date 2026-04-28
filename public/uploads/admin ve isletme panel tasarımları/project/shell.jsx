/* Dashboard shell — sidebar + topbar + workspace layout */

function DashShell({ role, page, onNavigate, persona, plan, children, density }) {
  const { locale } = useLocale();
  const isOwner = role === 'owner';
  const workspaceName = isOwner ? persona.name : (locale === 'tr' ? 'Buaze Yönetim' : 'Buaze Admin');
  const workspaceMeta = isOwner
    ? `${persona.locations} ${locale === 'tr' ? 'KONUM' : 'LOCATIONS'}`
    : (locale === 'tr' ? 'YÖNETİM PANELİ' : 'ADMIN WORKSPACE');

  // Owner nav
  const ownerNav = [
    { id: 'home', icon: <Icon.home size={16}/>, label: T('Panel', 'Dashboard') },
    { id: 'feedback', icon: <Icon.inbox size={16}/>, label: T('Yorum gelen kutusu', 'Review inbox'), badge: 7 },
    { id: 'qr', icon: <Icon.qr size={16}/>, label: T('QR kodlar', 'QR codes') },
    { id: 'platforms', icon: <Icon.share size={16}/>, label: T('Platform bağlantıları', 'Review platforms') },
    { id: 'analytics', icon: <Icon.chart size={16}/>, label: T('Analitik', 'Analytics') },
    { id: 'menu', icon: <Icon.utensils size={16}/>, label: T('Menü', 'Menu') },
    { id: 'leads', icon: <Icon.users size={16}/>, label: T('Müşteri listesi', 'Customers') },
    { id: 'announcements', icon: <Icon.megaphone size={16}/>, label: T('Duyurular', 'Announcements') },
    { id: 'guide', icon: <Icon.book size={16}/>, label: T('Kılavuz', 'Guide') },
    { id: 'settings', icon: <Icon.settings size={16}/>, label: T('Ayarlar', 'Settings') },
  ];

  // Admin nav (superadmin)
  const adminNav = [
    { id: 'admin-home', icon: <Icon.home size={16}/>, label: T('Panel', 'Dashboard') },
    { id: 'admin-restaurants', icon: <Icon.store size={16}/>, label: T('İşletmeler', 'Businesses'), badge: '128' },
    { id: 'admin-restaurant-detail', icon: <Icon.store size={16}/>, label: T('Detay', 'Detail'), nested: true },
    { id: 'admin-feedback', icon: <Icon.inbox size={16}/>, label: T('Yorumlar', 'Reviews') },
    { id: 'admin-qr', icon: <Icon.qr size={16}/>, label: T('QR yönetimi', 'QR management') },
    { id: 'admin-members', icon: <Icon.crown size={16}/>, label: T('İşletme sahipleri', 'Owners') },
    { id: 'admin-users', icon: <Icon.users size={16}/>, label: T('Yöneticiler', 'Admins') },
    { id: 'admin-customers', icon: <Icon.users size={16}/>, label: T('Müşteriler', 'Customers') },
    { id: 'admin-blog', icon: <Icon.book size={16}/>, label: T('Blog', 'Blog') },
    { id: 'admin-announcements', icon: <Icon.megaphone size={16}/>, label: T('Duyurular', 'Announcements') },
    { id: 'admin-plans', icon: <Icon.creditCard size={16}/>, label: T('Abonelikler', 'Subscriptions') },
    { id: 'admin-settings', icon: <Icon.settings size={16}/>, label: T('Site ayarları', 'Site settings') },
  ];

  const nav = isOwner ? ownerNav : adminNav;
  const visibleNav = nav.filter(n => !n.nested);

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 760, background: '#F5F5F5', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 248, flexShrink: 0,
        background: '#0A0A0A', color: '#fff',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <BuazeLogo size={28} variant="on-dark"/>
          <BuazeWordmark size={17} dark/>
        </div>

        {/* Workspace switcher */}
        <div style={{ padding: '0 12px 12px' }}>
          <div style={{
            background: '#1A1A1A', borderRadius: 10,
            padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: '#C6F24E', color: '#0A0A0A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-heading)',
            }}>{workspaceName.charAt(0).toUpperCase()}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{workspaceName}</div>
              <div className="pulse-eyebrow" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{workspaceMeta}</div>
            </div>
            <Icon.chevronDown size={14} color="rgba(255,255,255,0.4)"/>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto' }}>
          {visibleNav.map(item => {
            const isActive = page === item.id || (item.id === 'admin-restaurants' && page === 'admin-restaurant-detail');
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', marginBottom: 1,
                  border: 0, borderRadius: 10, cursor: 'pointer',
                  background: isActive ? '#C6F24E' : 'transparent',
                  color: isActive ? '#0A0A0A' : 'rgba(255,255,255,0.7)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 13, textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'all 120ms',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}}
              >
                {item.icon}
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: isActive ? 'rgba(10,10,10,0.1)' : 'rgba(198,242,78,0.2)',
                    color: isActive ? '#0A0A0A' : '#C6F24E',
                    padding: '2px 7px', borderRadius: 999,
                  }}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Plan card */}
        <div style={{ margin: '12px', padding: 14, borderRadius: 10, background: '#1A1A1A' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon.crown size={11} color="#C6F24E"/>
            <span className="pulse-eyebrow" style={{ color: '#C6F24E' }}>{plan.label}</span>
          </div>
          <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.45 }}>
            {plan.quotaLabel}: <strong style={{ color: '#fff', fontFamily: 'var(--font-heading)' }}>{plan.quotaValue}</strong>
          </p>
          {plan.progress !== undefined && (
            <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${plan.progress}%`, height: '100%', background: '#C6F24E' }}/>
            </div>
          )}
          <button style={{
            marginTop: 10, width: '100%',
            background: '#C6F24E', color: '#0A0A0A',
            border: 0, borderRadius: 999, padding: '7px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>{plan.cta}</button>
        </div>

        {/* User card */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', padding: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)',
              color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontFamily: 'var(--font-heading)', fontSize: 13,
            }}>{persona.userInitial}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{persona.userName}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }} className="pulse-eyebrow">{T(persona.userRole.tr, persona.userRole.en)}</div>
            </div>
          </div>
          <button style={{
            marginTop: 8, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'transparent', color: 'rgba(255,255,255,0.6)',
            border: 0, padding: 9, borderRadius: 10,
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            <Icon.logout size={13}/>{T('Çıkış', 'Logout')}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────── Top bar inside content */
function TopBar({ breadcrumb, title, actions, search = true }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '14px 28px',
      borderBottom: '1px solid #EDEDED', background: '#fff',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ minWidth: 0 }}>
        {breadcrumb && <Eyebrow>{breadcrumb}</Eyebrow>}
        <h1 className="bz-h-tight" style={{ margin: '4px 0 0', fontSize: 22, lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {search && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid #EDEDED', borderRadius: 999,
            padding: '8px 12px', fontSize: 12, color: '#737373',
            cursor: 'pointer', background: '#fff',
          }}>
            <Icon.search size={12}/>
            <span>{T('Yorum, konum, ekip ara…', 'Search reviews, locations, team…')}</span>
            <span className="bz-mono" style={{ background: '#F5F5F5', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 500, color: '#525252', marginLeft: 6 }}>⌘K</span>
          </div>
        )}
        {actions}
        <button className="bz-btn-icon"><Icon.bell size={16}/></button>
        <Avatar name="A"/>
      </div>
    </div>
  );
}

Object.assign(window, { DashShell, TopBar });
