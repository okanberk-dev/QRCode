/* Multi-screen overview using DesignCanvas */

function CanvasViewInner({ onBack, locale }) {
  const persona = PERSONAS.restaurant;
  const wrap = (children) => (
    <LocaleCtx.Provider value={{ locale, setLocale: () => {} }}>
      <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#fff' }}>{children}</div>
    </LocaleCtx.Provider>
  );

  return (
    <div style={{ position: 'relative', height: '100vh' }}>
      <button onClick={onBack} style={{
        position: 'fixed', top: 16, left: 16, zIndex: 50,
        padding: '8px 14px', borderRadius: 999, border: 0,
        background: '#0A0A0A', color: '#fff', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>← Back to dashboard</button>

      <DesignCanvas>
        <DCSection id="public" title="Public Review Page" subtitle="The QR landing — mobile, KVKK-aware, star-routed">
          <DCArtboard id="rate" label="01 · Rate (step 1)" width={400} height={800}>
            {wrap(<MockPhone><PublicReview persona={persona}/></MockPhone>)}
          </DCArtboard>
          <DCArtboard id="high" label="02 · 4-5 stars → Google" width={400} height={800}>
            {wrap(<MockPhone><PublicReviewState step={2} rating={5} persona={persona}/></MockPhone>)}
          </DCArtboard>
          <DCArtboard id="low" label="03 · 1-3 stars → Internal form" width={400} height={800}>
            {wrap(<MockPhone><PublicReviewState step={2} rating={2} persona={persona}/></MockPhone>)}
          </DCArtboard>
          <DCArtboard id="thanks" label="04 · Thanks" width={400} height={800}>
            {wrap(<MockPhone><PublicReviewState step={3} rating={5} persona={persona}/></MockPhone>)}
          </DCArtboard>
        </DCSection>

        <DCSection id="owner" title="Business Workspace" subtitle="Owner-facing dashboard, TR copy, lime accent">
          <DCArtboard id="dash" label="01 · Dashboard" width={1280} height={820}>
            {wrap(<OwnerShellMock page="home" persona={persona}/>)}
          </DCArtboard>
          <DCArtboard id="inbox" label="02 · Review inbox" width={1280} height={820}>
            {wrap(<OwnerShellMock page="feedback" persona={persona}/>)}
          </DCArtboard>
          <DCArtboard id="qr" label="03 · QR codes" width={1280} height={820}>
            {wrap(<OwnerShellMock page="qr" persona={persona}/>)}
          </DCArtboard>
          <DCArtboard id="plat" label="04 · Platforms" width={1280} height={820}>
            {wrap(<OwnerShellMock page="platforms" persona={persona}/>)}
          </DCArtboard>
          <DCArtboard id="ana" label="05 · Analytics" width={1280} height={820}>
            {wrap(<OwnerShellMock page="analytics" persona={persona}/>)}
          </DCArtboard>
          <DCArtboard id="menu" label="06 · Menu" width={1280} height={820}>
            {wrap(<OwnerShellMock page="menu" persona={persona}/>)}
          </DCArtboard>
        </DCSection>

        <DCSection id="admin" title="Superadmin" subtitle="Buaze internal — manage all businesses">
          <DCArtboard id="adash" label="01 · System overview" width={1280} height={820}>
            {wrap(<AdminShellMock page="admin-home"/>)}
          </DCArtboard>
          <DCArtboard id="abiz" label="02 · Businesses list" width={1280} height={820}>
            {wrap(<AdminShellMock page="admin-restaurants"/>)}
          </DCArtboard>
          <DCArtboard id="aann" label="03 · Announcements" width={1280} height={820}>
            {wrap(<AdminShellMock page="admin-announcements"/>)}
          </DCArtboard>
          <DCArtboard id="ablog" label="04 · Blog CMS" width={1280} height={820}>
            {wrap(<AdminShellMock page="admin-blog"/>)}
          </DCArtboard>
        </DCSection>

        <DCPostIt top={0} left={1340} rotate={-3} width={200}>
          KVKK-first: 1–3★ stays internal, 4–5★ goes to the QR's bound platform (or default).
        </DCPostIt>
        <DCPostIt top={920} left={1640} rotate={2} width={200}>
          Owner uses TR by default. Switch with the locale chip in the top bar.
        </DCPostIt>
      </DesignCanvas>
    </div>
  );
}

function MockPhone({ children }) {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#0A0A0A' }}>
      <div style={{ height: 28, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-heading)' }}>
        <span>9:41</span><span style={{ display: 'flex', gap: 4 }}><span>•••</span><span>5G</span><span>100%</span></span>
      </div>
      <div style={{ height: 'calc(100% - 28px)', overflowY: 'auto' }}>{children}</div>
    </div>
  );
}

/* PublicReview state-injected variant — bypasses internal step state */
function PublicReviewState({ step, rating, persona }) {
  const [_, set] = React.useState(0);
  React.useEffect(() => {
    // Force the form into the requested state by mounting a copy with hardcoded step
  }, []);
  return <PublicReviewFixed step={step} rating={rating} persona={persona}/>;
}

function PublicReviewFixed({ step, rating, persona }) {
  const isHigh = rating >= 4;
  return (
    <div style={{ background: '#0A0A0A', minHeight: '100%', padding: 24, fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: 360, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: '#0A0A0A' }}>{persona.name.charAt(0)}</div>
          <div style={{ marginTop: 14, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{persona.name}</div>
          <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{persona.address}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
          {step === 2 && isHigh && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <h2 className="bz-h-tight-2" style={{ fontSize: 22 }}>{T('Çok teşekkürler!', 'Thank you so much!')}</h2>
              <p style={{ fontSize: 13, color: '#525252', margin: '8px 0 18px', lineHeight: 1.6 }}>
                {T('Yorumunu Google\'da paylaşır mısın?', 'Would you share your review on Google?')}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 12, background: '#0A0A0A', color: '#fff', fontSize: 14, fontWeight: 600 }}>
                <PlatformChip id="google" size={20}/>
                {T('Google\'da yorum bırak', 'Review on Google')}
              </div>
            </div>
          )}
          {step === 2 && !isHigh && (
            <div>
              <Eyebrow>{T('2. ADIM', 'STEP 2')}</Eyebrow>
              <h2 className="bz-h-tight-2" style={{ fontSize: 20, marginTop: 6 }}>{T('Bize biraz daha anlatır mısın?', 'Tell us a little more')}</h2>
              <p style={{ fontSize: 12.5, color: '#525252', margin: '8px 0 18px', lineHeight: 1.55 }}>
                {T('Geri bildirimin yalnızca işletme yönetimine iletilecek.', 'Your feedback goes directly to management.')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="bz-input" placeholder={T('Adın (opsiyonel)', 'Your name (optional)')}/>
                <input className="bz-input" placeholder={T('E-posta (opsiyonel)', 'Email (optional)')}/>
                <textarea className="bz-input" placeholder={T('Deneyimini bizimle paylaş…', 'Share your experience…')} rows={4} style={{ resize: 'none', fontFamily: 'inherit' }}/>
                <label style={{ display: 'flex', gap: 8, fontSize: 11.5, color: '#525252', alignItems: 'flex-start' }}>
                  <input type="checkbox"/><span>{T('KVKK kapsamında verilerimin işletmeyle paylaşılmasını kabul ediyorum.', 'I consent to KVKK data sharing with the business.')}</span>
                </label>
                <button className="bz-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>{T('Geri bildirimi gönder', 'Submit feedback')}</button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#C6F24E', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.check size={28} strokeWidth={3} color="#0A0A0A"/>
              </div>
              <h2 className="bz-h-tight-2" style={{ fontSize: 22, marginTop: 18 }}>{T('Teşekkürler!', 'Thank you!')}</h2>
              <p style={{ fontSize: 13, color: '#525252', margin: '8px 0 0' }}>{T('Geri bildirimin alındı.', 'Your feedback has been received.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Owner shell mock — uses real DashShell + TopBar + page */
function OwnerShellMock({ page, persona }) {
  const plan = { ...PLAN_DEFAULT, quotaLabel: PLAN_DEFAULT.quotaLabel.tr, cta: PLAN_DEFAULT.cta.tr };
  const content = (() => {
    switch (page) {
      case 'home': return <OwnerDashboard persona={persona} onNavigate={() => {}}/>;
      case 'feedback': return <OwnerFeedback/>;
      case 'qr': return <OwnerQR/>;
      case 'platforms': return <OwnerPlatforms/>;
      case 'analytics': return <OwnerAnalytics/>;
      case 'menu': return <OwnerMenu/>;
      default: return null;
    }
  })();
  return (
    <DashShell role="owner" page={page} onNavigate={() => {}} persona={persona} plan={plan}>
      <TopBar breadcrumb="İŞLETME PANELİ" title={page} actions={null}/>
      {content}
    </DashShell>
  );
}

function AdminShellMock({ page }) {
  const plan = { ...PLAN_ADMIN, quotaLabel: PLAN_ADMIN.quotaLabel.tr, quotaValue: PLAN_ADMIN.quotaValue.tr, cta: PLAN_ADMIN.cta.tr };
  const content = (() => {
    switch (page) {
      case 'admin-home': return <AdminDashboard/>;
      case 'admin-restaurants': return <AdminBusinesses/>;
      case 'admin-announcements': return <AdminAnnouncements/>;
      case 'admin-blog': return <AdminBlog/>;
      default: return null;
    }
  })();
  return (
    <DashShell role="admin" page={page} onNavigate={() => {}} persona={PERSONAS.restaurant} plan={plan}>
      <TopBar breadcrumb="SİSTEM YÖNETİMİ" title={page} actions={null}/>
      {content}
    </DashShell>
  );
}

window.DesignCanvasView = CanvasViewInner;
