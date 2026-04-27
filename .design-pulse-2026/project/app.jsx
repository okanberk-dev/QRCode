/* App root — controls persona/role/page/locale, wires Tweaks + Design Canvas */

const { useState: useStateApp } = React;

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Superadmin' },
];

const PERSONA_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'salon', label: 'Salon' },
];

const OWNER_PAGES = [
  { id: 'home', label: { tr: 'Panel', en: 'Dashboard' } },
  { id: 'feedback', label: { tr: 'Yorumlar', en: 'Reviews' } },
  { id: 'qr', label: { tr: 'QR kodlar', en: 'QR codes' } },
  { id: 'platforms', label: { tr: 'Platformlar', en: 'Platforms' } },
  { id: 'analytics', label: { tr: 'Analitik', en: 'Analytics' } },
  { id: 'menu', label: { tr: 'Menü', en: 'Menu' } },
  { id: 'settings', label: { tr: 'Ayarlar', en: 'Settings' } },
];

const ADMIN_PAGES = [
  { id: 'admin-home', label: { tr: 'Panel', en: 'Dashboard' } },
  { id: 'admin-restaurants', label: { tr: 'İşletmeler', en: 'Businesses' } },
  { id: 'admin-announcements', label: { tr: 'Duyurular', en: 'Announcements' } },
  { id: 'admin-blog', label: { tr: 'Blog', en: 'Blog' } },
];

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "locale": "tr",
  "role": "owner",
  "persona": "restaurant",
  "page": "home",
  "surface": "desktop",
  "mobileSurface": "app"
}/*EDITMODE-END*/;

function App() {
  const persisted = window.useTweaks ? window.useTweaks(DEFAULT_TWEAKS) : [DEFAULT_TWEAKS, () => {}];
  const [tweaks, setTweak] = persisted;

  const persona = PERSONAS[tweaks.persona] || PERSONAS.restaurant;
  const isOwner = tweaks.role === 'owner';

  const setPage = (id) => setTweak('page', id);

  const ownerContent = (() => {
    switch (tweaks.page) {
      case 'home': return <OwnerDashboard persona={persona} onNavigate={setPage}/>;
      case 'feedback': return <OwnerFeedback/>;
      case 'qr': return <OwnerQR/>;
      case 'platforms': return <OwnerPlatforms/>;
      case 'analytics': return <OwnerAnalytics/>;
      case 'menu': return <OwnerMenu/>;
      case 'settings': return <OwnerSettings persona={persona}/>;
      default: return <OwnerDashboard persona={persona} onNavigate={setPage}/>;
    }
  })();

  const adminContent = (() => {
    switch (tweaks.page) {
      case 'admin-home': return <AdminDashboard/>;
      case 'admin-restaurants': return <AdminBusinesses/>;
      case 'admin-announcements': return <AdminAnnouncements/>;
      case 'admin-blog': return <AdminBlog/>;
      default: return <AdminDashboard/>;
    }
  })();

  // When role flips, snap page to a valid id
  React.useEffect(() => {
    if (isOwner && tweaks.page.startsWith('admin-')) setTweak('page', 'home');
    if (!isOwner && !tweaks.page.startsWith('admin-')) setTweak('page', 'admin-home');
  }, [tweaks.role]);

  const ownerPlan = { ...PLAN_DEFAULT, quotaLabel: T(PLAN_DEFAULT.quotaLabel.tr, PLAN_DEFAULT.quotaLabel.en), cta: T(PLAN_DEFAULT.cta.tr, PLAN_DEFAULT.cta.en) };
  const adminPlan = { ...PLAN_ADMIN, quotaLabel: T(PLAN_ADMIN.quotaLabel.tr, PLAN_ADMIN.quotaLabel.en), quotaValue: T(PLAN_ADMIN.quotaValue.tr, PLAN_ADMIN.quotaValue.en), cta: T(PLAN_ADMIN.cta.tr, PLAN_ADMIN.cta.en) };

  const dashTitle = (() => {
    const pages = isOwner ? OWNER_PAGES : ADMIN_PAGES;
    const p = pages.find(p => p.id === tweaks.page) || pages[0];
    return T(p.label.tr, p.label.en);
  })();

  return (
    <LocaleCtx.Provider value={{ locale: tweaks.locale, setLocale: (v) => setTweak('locale', v) }}>
      {tweaks.surface === 'canvas' ? (
        <CanvasView tweaks={tweaks} setTweak={setTweak}/>
      ) : tweaks.surface === 'mobile' ? (
        <MobileSurface tweaks={tweaks} setTweak={setTweak}/>
      ) : (
        <div style={{ height: '100vh' }}>
          <DashShell
            role={tweaks.role}
            page={tweaks.page}
            onNavigate={setPage}
            persona={persona}
            plan={isOwner ? ownerPlan : adminPlan}
          >
            <TopBar
              breadcrumb={isOwner ? T('İŞLETME PANELİ', 'BUSINESS WORKSPACE') : T('SİSTEM YÖNETİMİ', 'SYSTEM ADMIN')}
              title={dashTitle}
              actions={
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="bz-btn-ghost" onClick={() => setTweak('locale', tweaks.locale === 'tr' ? 'en' : 'tr')}>
                    <span className="bz-mono" style={{ fontSize: 11, fontWeight: 600 }}>{tweaks.locale.toUpperCase()}</span>
                  </button>
                </div>
              }
            />
            {isOwner ? ownerContent : adminContent}
          </DashShell>
        </div>
      )}

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Surface"/>
        <TweakRadio label="View" value={tweaks.surface} onChange={v => setTweak('surface', v)}
          options={[
            { value: 'desktop', label: 'Desktop' },
            { value: 'mobile', label: 'Mobile' },
            { value: 'canvas', label: 'Canvas' },
          ]}/>
        {tweaks.surface === 'mobile' && (
          <TweakRadio label="Mobile screen" value={tweaks.mobileSurface} onChange={v => setTweak('mobileSurface', v)}
            options={[{ value: 'app', label: 'App' }, { value: 'public', label: 'Review' }]}/>
        )}
        <TweakSection label="Workspace"/>
        <TweakRadio label="Role" value={tweaks.role} onChange={v => setTweak('role', v)}
          options={ROLE_OPTIONS}/>
        <TweakSelect label="Persona" value={tweaks.persona}
          onChange={v => setTweak('persona', v)} options={PERSONA_OPTIONS}/>
        <TweakRadio label="Locale" value={tweaks.locale} onChange={v => setTweak('locale', v)}
          options={[{ value: 'tr', label: 'TR' }, { value: 'en', label: 'EN' }]}/>
        {tweaks.surface === 'desktop' && <>
          <TweakSection label="Active page"/>
          <TweakSelect label="Page" value={tweaks.page}
            onChange={v => setTweak('page', v)}
            options={(isOwner ? OWNER_PAGES : ADMIN_PAGES).map(p => ({ value: p.id, label: p.label[tweaks.locale] }))}/>
        </>}
      </TweaksPanel>
    </LocaleCtx.Provider>
  );
}

/* ─── Multi-screen canvas */
function CanvasView({ tweaks, setTweak }) {
  return (
    <DesignCanvasView onBack={() => setTweak('showCanvas', false)} locale={tweaks.locale}/>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
