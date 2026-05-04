/* Page: Hesabım */

const ACCOUNT_NAV = [
  { id: 'profile', label: 'Profil', icon: 'user', active: true },
  { id: 'business', label: 'İşletme bilgileri', icon: 'home' },
  { id: 'team', label: 'Ekip & Roller', icon: 'users' },
  { id: 'security', label: 'Güvenlik', icon: 'shield' },
  { id: 'notifications', label: 'Bildirimler', icon: 'bell' },
  { id: 'language', label: 'Dil & Bölge', icon: 'cube' },
  { id: 'billing', label: 'Plan & Faturalama', icon: 'creditCard' },
  { id: 'api', label: 'API & Webhook', icon: 'key' },
];

const TEAM = [
  { name: 'Emre Kara', email: 'emre@kadikoybistro.com', role: 'Owner', status: 'Aktif', last: 'şimdi', initials: 'EK' },
  { name: 'Selin Acar', email: 'selin@kadikoybistro.com', role: 'Manager', status: 'Aktif', last: '2 sa önce', initials: 'SA' },
  { name: 'Burak Tan', email: 'burak@kadikoybistro.com', role: 'Editor', status: 'Aktif', last: 'dün', initials: 'BT' },
  { name: 'Ayşe Yıldız', email: 'ayse@kadikoybistro.com', role: 'Viewer', status: 'Davet', last: '—', initials: 'AY' },
];

const AccountPage = () => (
  <PanelShell
    active="account"
    topbar={
      <PanelTopbar
        eyebrow="HESABIM"
        title="Profil & ayarlar"
        sub="Kişisel bilgilerin, ekibin, güvenlik ve faturalama ayarların."
        actions={<>
          <button className="bz-btn-ghost"><Icon name="download" size={14}/> Veri indir</button>
          <button className="bz-btn-primary">Değişiklikleri kaydet</button>
        </>}
      />
    }
  >
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 320px', gap: 20 }}>
      {/* Left nav */}
      <div className="bz-card" style={{ padding: 12, alignSelf: 'flex-start', position: 'sticky', top: 20 }}>
        <div className="bz-eyebrow" style={{ padding: '6px 10px 8px' }}>AYARLAR</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ACCOUNT_NAV.map(n => (
            <div key={n.id} className={`bz-side-item ${n.active ? 'active' : ''}`}>
              <Icon name={n.icon} size={15} />
              <span>{n.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Center column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Profile card */}
        <div className="bz-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
            <div className="bz-avatar bz-avatar--xl">EK</div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>Emre Kara</h2>
              <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>
                emre@kadikoybistro.com · Owner · Üye 2024'ten beri
              </div>
            </div>
            <button className="bz-btn-ghost"><Icon name="upload" size={13}/> Fotoğraf değiştir</button>
          </div>

          <div className="bz-divider" style={{ marginBottom: 22 }}/>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { l: 'Ad', v: 'Emre' },
              { l: 'Soyad', v: 'Kara' },
              { l: 'E-posta', v: 'emre@kadikoybistro.com' },
              { l: 'Telefon', v: '+90 532 482 ** **' },
              { l: 'Pozisyon', v: 'Genel Müdür' },
              { l: 'Saat dilimi', v: 'Europe/Istanbul (GMT+3)' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="bz-eyebrow" style={{ fontSize: 10.5 }}>{f.l}</label>
                <input className="bz-input" defaultValue={f.v} />
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="bz-card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--bz-n200)' }}>
            <h3 style={{ fontSize: 15 }}>Ekip & Roller</h3>
            <span className="bz-badge bz-badge--ghost" style={{ marginLeft: 10 }}>{TEAM.length} kişi</span>
            <div style={{ flex: 1 }} />
            <button className="bz-btn-ghost bz-btn-sm">Rol matrisi</button>
            <button className="bz-btn-primary bz-btn-sm" style={{ marginLeft: 8 }}><Icon name="plus" size={11}/> Davet et</button>
          </div>
          <table className="bz-table">
            <thead>
              <tr>
                <th>Üye</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Son giriş</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {TEAM.map((m, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="bz-avatar">{m.initials}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                        <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`bz-badge bz-badge--${m.role === 'Owner' ? 'dark' : m.role === 'Manager' ? 'lime' : 'ghost'}`}>
                      {m.role}
                    </span>
                  </td>
                  <td>
                    {m.status === 'Aktif'
                      ? <span className="bz-badge bz-badge--ok"><span className="dot"/>Aktif</span>
                      : <span className="bz-badge bz-badge--warn"><span className="dot"/>Davet beklemede</span>
                    }
                  </td>
                  <td><span className="bz-mono" style={{ fontSize: 11.5, color: 'var(--bz-n500)' }}>{m.last}</span></td>
                  <td><button className="bz-btn-icon"><Icon name="moreH" size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Security */}
        <div className="bz-card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 15, marginBottom: 16 }}>Güvenlik</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: 'lock', t: 'Şifre', s: '32 gün önce değiştirildi', cta: 'Değiştir' },
              { icon: 'shield', t: 'İki adımlı doğrulama', s: 'Authenticator + SMS yedek', cta: 'Yönet', ok: true },
              { icon: 'cube', t: 'Aktif oturumlar', s: '3 cihaz · iPhone, MacBook, iPad', cta: 'Görüntüle' },
              { icon: 'key', t: 'Single Sign-On', s: 'Pro plan ile dahil', cta: 'Yapılandır' },
            ].map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 14px', borderRadius: 12,
                background: 'var(--bz-n50)', border: '1px solid var(--bz-n200)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: '#FFF', border: '1px solid var(--bz-n200)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--bz-graphite)',
                }}>
                  <Icon name={s.icon} size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{s.t}</div>
                  <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>{s.s}</div>
                </div>
                {s.ok && <span className="bz-badge bz-badge--ok"><Icon name="check" size={10}/> Aktif</span>}
                <button className="bz-btn-ghost bz-btn-sm">{s.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right rail */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Plan card */}
        <div style={{
          background: 'var(--bz-graphite)',
          color: '#FFF',
          borderRadius: 18,
          padding: 22,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span className="bz-eyebrow" style={{ color: 'var(--bz-lime)' }}>PULSE PRO</span>
            <span className="bz-pulse-dot"/>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <span className="bz-h-tight-2" style={{ fontSize: 36, color: '#FFF' }}>₺2.490</span>
            <span className="bz-mono" style={{ fontSize: 12, color: 'var(--bz-n400)' }}>/ay</span>
          </div>
          <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n400)', marginBottom: 16 }}>
            Bir sonraki ödeme · 14 Mayıs 2026
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { l: 'Yorum (bu ay)', v: '1,284 / sınırsız' },
              { l: 'AI Co-Pilot', v: '2,180 / 5,000' },
              { l: 'Aktif konum', v: '3 / 5' },
              { l: 'Ekip üyesi', v: '4 / 10' },
            ].map((u, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--bz-n400)' }}>{u.l}</span>
                <span className="bz-mono" style={{ color: '#FFF', fontWeight: 600 }}>{u.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button className="bz-btn-lime bz-btn-sm" style={{ flex: 1 }}>Planı yükselt</button>
            <button className="bz-btn-ghost bz-btn-sm" style={{ borderColor: 'rgba(255,255,255,0.18)', color: '#FFF' }}>Yönet</button>
          </div>
        </div>

        {/* Recent invoices */}
        <div className="bz-card" style={{ padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--bz-n200)' }}>
            <h3 style={{ fontSize: 13.5 }}>Son faturalar</h3>
            <button className="bz-btn-ghost bz-btn-sm" style={{ marginLeft: 'auto', padding: '4px 8px' }}>Tümü →</button>
          </div>
          {[
            { d: '14 Nis 2026', a: '₺2.490', s: 'paid' },
            { d: '14 Mar 2026', a: '₺2.490', s: 'paid' },
            { d: '14 Şub 2026', a: '₺2.490', s: 'paid' },
            { d: '14 Oca 2026', a: '₺2.490', s: 'paid' },
          ].map((inv, i, arr) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--bz-n200)' : 0,
            }}>
              <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)', width: 100 }}>{inv.d}</div>
              <div className="bz-mono" style={{ fontSize: 13, color: 'var(--bz-graphite)', fontWeight: 600, flex: 1 }}>{inv.a}</div>
              <span className="bz-badge bz-badge--ok"><span className="dot"/>Ödendi</span>
              <button className="bz-btn-icon"><Icon name="download" size={13}/></button>
            </div>
          ))}
        </div>

        {/* Danger zone */}
        <div className="bz-card" style={{ padding: 18, borderColor: '#FECACA', background: '#FEF8F8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="shield" size={14} color="#991B1B"/>
            <span className="bz-eyebrow" style={{ color: '#991B1B' }}>TEHLİKELİ BÖLGE</span>
          </div>
          <p style={{ fontSize: 12.5, color: 'var(--bz-n600)', margin: '0 0 12px', lineHeight: 1.55 }}>
            Hesabı dondur veya kalıcı olarak sil. Veriler 30 gün geri alınabilir.
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="bz-btn-ghost bz-btn-sm">Hesabı dondur</button>
            <button className="bz-btn-ghost bz-btn-sm" style={{ color: '#991B1B', borderColor: '#FECACA' }}>Sil</button>
          </div>
        </div>
      </div>
    </div>
  </PanelShell>
);

window.AccountPage = AccountPage;
