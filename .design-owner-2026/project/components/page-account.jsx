// Page 4: Hesabım
function PageAccount({ lang = 'tr' }) {
  const t = (tr, en) => lang === 'tr' ? tr : en;

  const sections = [
    { id: 'profile', label: t('Profil', 'Profile'), icon: 'IUser', active: true },
    { id: 'business', label: t('İşletme', 'Business'), icon: 'IBuilding' },
    { id: 'team', label: t('Ekip', 'Team'), icon: 'IUsers' },
    { id: 'billing', label: t('Abonelik & Fatura', 'Billing'), icon: 'ICreditCard' },
    { id: 'security', label: t('Güvenlik', 'Security'), icon: 'IShield' },
    { id: 'api', label: t('API & Webhook', 'API & Webhook'), icon: 'IKey' },
    { id: 'notifications', label: t('Bildirimler', 'Notifications'), icon: 'IBell' },
  ];

  const team = [
    { name: 'Deniz Kaya', email: 'deniz@kadikoybistro.com', role: 'Owner', initials: 'DK', online: true },
    { name: 'Mert Şahin', email: 'mert@kadikoybistro.com', role: 'Manager', initials: 'MŞ', online: true },
    { name: 'Aslı Tunç', email: 'asli@kadikoybistro.com', role: 'Reviewer', initials: 'AT', online: false },
    { name: 'Burak Öz', email: 'burak@kadikoybistro.com', role: 'Reviewer', initials: 'BÖ', online: false },
  ];

  return (
    <PageShell
      active="account"
      eyebrow={t('AYARLAR', 'SETTINGS')}
      title={t('Hesabım', 'Account')}
      sub={t('Profilinizi, işletme bilgilerinizi, ekibinizi ve aboneliğinizi yönetin.', 'Manage your profile, business, team and subscription.')}
      actions={<>
        <button className="bz-btn"><window.IDownload size={13} /> {t('Veri indir', 'Export data')}</button>
        <button className="bz-btn bz-btn-primary"><window.ICheck size={13} /> {t('Değişiklikleri kaydet', 'Save changes')}</button>
      </>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 320px', gap: 18, height: 720, overflow: 'hidden' }}>
        {/* Sub nav */}
        <nav className="bz-card" style={{ padding: 10, height: 'fit-content' }}>
          {sections.map(s => {
            const I = window[s.icon];
            return (
              <button key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '10px 12px', borderRadius: 8, border: 0,
                background: s.active ? 'var(--n-100)' : 'transparent',
                color: s.active ? 'var(--n-950)' : 'var(--n-600)',
                fontSize: 13, fontWeight: s.active ? 600 : 500,
                fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left'
              }}>
                <I size={14} />
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Main panel */}
        <div className="bz-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingRight: 4 }}>
          <div className="bz-card" style={{ padding: 22 }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('PROFİL FOTOĞRAFI', 'PROFILE PHOTO')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14 }}>
              <window.Avatar initials="DK" size={72} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Deniz Kaya</div>
                <div style={{ color: 'var(--n-500)', fontSize: 13, marginTop: 2 }}>deniz@kadikoybistro.com · Owner</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <button className="bz-btn"><window.IUpload size={12} /> {t('Yeni fotoğraf yükle', 'Upload photo')}</button>
                  <button className="bz-btn bz-btn-ghost">{t('Kaldır', 'Remove')}</button>
                </div>
              </div>
            </div>
          </div>

          <div className="bz-card" style={{ padding: 22 }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('KİŞİSEL BİLGİLER', 'PERSONAL INFO')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
              {[
                { l: t('Ad', 'First name'), v: 'Deniz' },
                { l: t('Soyad', 'Last name'), v: 'Kaya' },
                { l: t('E-posta', 'Email'), v: 'deniz@kadikoybistro.com', verified: true },
                { l: t('Telefon', 'Phone'), v: '+90 532 444 88 12', verified: true },
                { l: t('Ülke', 'Country'), v: 'Türkiye' },
                { l: t('Saat dilimi', 'Timezone'), v: 'Europe/Istanbul (UTC+3)' },
              ].map((f, i) => (
                <div key={i}>
                  <label style={{ fontSize: 11, color: 'var(--n-500)', display: 'flex', justifyContent: 'space-between' }}>
                    {f.l}
                    {f.verified && <span style={{ color: 'var(--green)', fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <window.ICheck size={10} /> {t('Doğrulandı', 'Verified')}
                    </span>}
                  </label>
                  <input value={f.v} readOnly style={{
                    width: '100%', height: 36, padding: '0 12px', marginTop: 6,
                    border: '1px solid var(--n-200)', borderRadius: 8,
                    fontSize: 13, fontFamily: 'inherit', background: 'var(--n-0)'
                  }} />
                </div>
              ))}
            </div>
          </div>

          <div className="bz-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('EKİP ÜYELERİ', 'TEAM MEMBERS')}</div>
              <button className="bz-btn"><window.IPlus size={12} /> {t('Davet et', 'Invite')}</button>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {team.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i ? '1px solid var(--n-100)' : 'none' }}>
                  <div style={{ position: 'relative' }}>
                    <window.Avatar initials={m.initials} size={36} />
                    {m.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--n-0)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    <div className="bz-num" style={{ fontSize: 11, color: 'var(--n-500)' }}>{m.email}</div>
                  </div>
                  <window.Pill tone={m.role === 'Owner' ? 'dark' : m.role === 'Manager' ? 'lime' : 'ghost'}>{m.role}</window.Pill>
                  <button className="bz-btn bz-btn-ghost"><window.IMoreH size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="bz-card" style={{ padding: 22 }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('GÜVENLİK', 'SECURITY')}</div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { l: t('Şifre', 'Password'), v: t('45 gün önce değiştirildi', '45 days ago'), action: t('Değiştir', 'Change') },
                { l: t('İki adımlı doğrulama (2FA)', 'Two-factor (2FA)'), v: t('Authenticator uygulaması ile aktif', 'Active via Authenticator app'), action: t('Yönet', 'Manage'), enabled: true },
                { l: t('Aktif oturumlar', 'Active sessions'), v: t('3 cihaz · macOS, iOS, Chrome', '3 devices · macOS, iOS, Chrome'), action: t('Görüntüle', 'View') },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.l}
                      {s.enabled && <window.Pill tone="ok" dot>{t('Aktif', 'On')}</window.Pill>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--n-500)', marginTop: 3 }}>{s.v}</div>
                  </div>
                  <button className="bz-btn">{s.action}</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail — plan summary */}
        <div className="bz-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="bz-card" style={{ padding: 20, background: '#0A0A0A', color: '#FFF', border: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="pulse-eyebrow" style={{ color: '#737373' }}>{t('MEVCUT PLAN', 'CURRENT PLAN')}</span>
              <window.Pill tone="lime">{t('Aktif', 'Active')}</window.Pill>
            </div>
            <div className="bz-h-tight-2" style={{ fontSize: 28, marginTop: 14 }}>Growth</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <span className="bz-num bz-h-tight-2" style={{ fontSize: 30, color: 'var(--lime-300)' }}>₺2.490</span>
              <span style={{ fontSize: 13, color: '#A3A3A3' }}>/ {t('ay', 'mo')}</span>
            </div>
            <div className="bz-num" style={{ fontSize: 11, color: '#737373', marginTop: 8 }}>
              {t('Sonraki faturalandırma · 18 MAY 2026', 'Next billing · 18 MAY 2026')}
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { l: t('Konum', 'Locations'), c: 3, m: 5 },
                { l: t('Ekip üyesi', 'Team members'), c: 4, m: 10 },
                { l: t('AI yanıt / ay', 'AI replies / mo'), c: 847, m: 2000 },
                { l: t('API çağrısı / ay', 'API calls / mo'), c: 34, m: 100, suffix: 'K' },
              ].map((u, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: '#A3A3A3' }}>{u.l}</span>
                    <span className="bz-num" style={{ color: '#FFF' }}>{u.c}{u.suffix || ''} / {u.m}{u.suffix || ''}</span>
                  </div>
                  <div style={{ height: 4, background: '#262626', borderRadius: 2 }}>
                    <div style={{ width: `${(u.c / u.m) * 100}%`, height: '100%', background: 'var(--lime-300)', borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
            <button className="bz-btn bz-btn-lime" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }}>
              <window.IZap size={12} /> {t('Scale planına yükselt', 'Upgrade to Scale')}
            </button>
          </div>

          <div className="bz-card" style={{ padding: 20 }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('SON FATURALAR', 'RECENT INVOICES')}</div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column' }}>
              {[
                { d: '18 NIS 2026', a: '₺2.490', s: 'paid' },
                { d: '18 MAR 2026', a: '₺2.490', s: 'paid' },
                { d: '18 ŞUB 2026', a: '₺2.490', s: 'paid' },
                { d: '18 OCA 2026', a: '₺2.490', s: 'paid' },
              ].map((inv, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: i ? '1px solid var(--n-100)' : 'none' }}>
                  <div>
                    <div className="bz-num" style={{ fontSize: 12 }}>{inv.d}</div>
                    <div style={{ fontSize: 10, color: 'var(--n-500)', marginTop: 2 }}>VISA •••• 4218</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="bz-num" style={{ fontSize: 13, fontWeight: 600 }}>{inv.a}</span>
                    <button className="bz-btn bz-btn-ghost" style={{ height: 24, padding: '0 4px' }}><window.IDownload size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

window.PageAccount = PageAccount;
