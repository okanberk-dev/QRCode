/* Mobile app shell — orchestrator */

const { useState: useSM } = React;

const M_OWNER_NAV = [
  { id: 'home', icon: <Icon.dashboard/>, label: { tr: 'Anasayfa', en: 'Home' } },
  { id: 'feedback', icon: <Icon.message/>, label: { tr: 'Yorum', en: 'Feedback' } },
  { id: 'qr', icon: <Icon.qr/>, label: { tr: 'QR', en: 'QR' } },
  { id: 'platforms', icon: <Icon.link/>, label: { tr: 'Platform', en: 'Links' } },
  { id: 'settings', icon: <Icon.settings/>, label: { tr: 'Ayarlar', en: 'Settings' } },
];

const M_OWNER_DRAWER = [
  { id: 'home', icon: <Icon.dashboard/>, label: { tr: 'Anasayfa', en: 'Home' } },
  { id: 'feedback', icon: <Icon.message/>, label: { tr: 'Yorumlar', en: 'Feedback' } },
  { id: 'qr', icon: <Icon.qr/>, label: { tr: 'QR kodları', en: 'QR codes' } },
  { id: 'platforms', icon: <Icon.link/>, label: { tr: 'Platformlar', en: 'Platforms' } },
  { id: 'analytics', icon: <Icon.chart/>, label: { tr: 'Analitik', en: 'Analytics' } },
  { id: 'menu', icon: <Icon.menu/>, label: { tr: 'Menü', en: 'Menu' } },
  { id: 'settings', icon: <Icon.settings/>, label: { tr: 'Ayarlar', en: 'Settings' } },
];

const M_ADMIN_NAV = [
  { id: 'home', icon: <Icon.dashboard/>, label: { tr: 'Genel', en: 'Overview' } },
  { id: 'businesses', icon: <Icon.store/>, label: { tr: 'İşletme', en: 'Business' } },
  { id: 'announcements', icon: <Icon.megaphone/>, label: { tr: 'Duyuru', en: 'News' } },
  { id: 'settings', icon: <Icon.settings/>, label: { tr: 'Ayarlar', en: 'Settings' } },
];

const M_ADMIN_DRAWER = [
  { id: 'home', icon: <Icon.dashboard/>, label: { tr: 'Genel görünüm', en: 'Overview' } },
  { id: 'businesses', icon: <Icon.store/>, label: { tr: 'İşletmeler', en: 'Businesses' } },
  { id: 'announcements', icon: <Icon.megaphone/>, label: { tr: 'Duyurular', en: 'Announcements' } },
  { id: 'blog', icon: <Icon.book/>, label: { tr: 'Blog', en: 'Blog' } },
  { id: 'settings', icon: <Icon.settings/>, label: { tr: 'Site ayarları', en: 'Site settings' } },
];

function MobileApp({ tweaks, setTweak }) {
  const [page, setPage] = useSM('home');
  const [drawer, setDrawer] = useSM(false);
  const [openFeedback, setOpenFeedback] = useSM(null);
  const persona = PERSONAS[tweaks.persona];
  const role = tweaks.role;

  // Public review surface — no chrome, no drawer, no nav
  if (tweaks.surface === 'public') {
    return <MPublicReview persona={persona}/>;
  }

  const isOwner = role === 'owner';
  const navItems = isOwner ? M_OWNER_NAV : M_ADMIN_NAV;
  const drawerItems = isOwner ? M_OWNER_DRAWER : M_ADMIN_DRAWER;

  let body;
  if (openFeedback) {
    return (
      <LocaleCtx.Provider value={{ locale: tweaks.locale, setLocale: () => {} }}>
        <div style={{ height: '100%', overflow: 'auto', background: '#FAFAFA' }}>
          <MFeedbackDetail f={openFeedback} onBack={() => setOpenFeedback(null)}/>
        </div>
      </LocaleCtx.Provider>
    );
  }

  if (isOwner) {
    if (page === 'home') body = <MOwnerHome persona={persona} plan={persona.plan} onNavigate={setPage} onMenu={() => setDrawer(true)}/>;
    else if (page === 'feedback') body = <MOwnerFeedback onMenu={() => setDrawer(true)} onOpen={setOpenFeedback}/>;
    else if (page === 'qr') body = <MOwnerQR onMenu={() => setDrawer(true)} onCreate={() => {}}/>;
    else if (page === 'platforms') body = <MOwnerPlatforms onMenu={() => setDrawer(true)}/>;
    else if (page === 'settings') body = <MOwnerSettings onMenu={() => setDrawer(true)} persona={persona}/>;
    else body = <MOwnerHome persona={persona} plan={persona.plan} onNavigate={setPage} onMenu={() => setDrawer(true)}/>;
  } else {
    if (page === 'home') body = <MAdminHome onMenu={() => setDrawer(true)} persona={persona}/>;
    else if (page === 'businesses') body = <MAdminBusinesses onMenu={() => setDrawer(true)}/>;
    else body = <MAdminHome onMenu={() => setDrawer(true)} persona={persona}/>;
  }

  return (
    <LocaleCtx.Provider value={{ locale: tweaks.locale, setLocale: () => {} }}>
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
          {body}
        </div>
        <MBottomNav items={navItems} page={page} onNavigate={setPage}/>
        <MDrawer
          open={drawer} onClose={() => setDrawer(false)}
          persona={persona} plan={persona.plan} role={role}
          items={drawerItems} page={page}
          onNavigate={setPage}
          onSwitchRole={(r) => setTweak('role', r)}
        />
      </div>
    </LocaleCtx.Provider>
  );
}

/* Mobile surface — wraps MobileApp in an IOSDevice frame, with tweaks for surface/role */
function MobileSurface({ tweaks, setTweak }) {
  // Mobile surface uses its own internal page state via MobileApp
  const mobileTweaks = {
    persona: tweaks.persona,
    role: tweaks.role,
    locale: tweaks.locale,
    surface: tweaks.mobileSurface || 'app',
  };
  const setMobileTweak = (k, v) => {
    if (k === 'surface') setTweak('mobileSurface', v);
    else setTweak(k, v);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'radial-gradient(ellipse at top, #1a1a1a, #0A0A0A 60%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflow: 'auto',
    }}>
      <IOSDevice
        width={402} height={874}
        dark={tweaks.mobileSurface === 'public'}
      >
        <MobileApp tweaks={mobileTweaks} setTweak={setMobileTweak}/>
      </IOSDevice>
    </div>
  );
}

window.MobileSurface = MobileSurface;
