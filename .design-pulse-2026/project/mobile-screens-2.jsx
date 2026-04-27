/* Mobile screens part 2: QR, Platforms, Settings, Drawer, Admin */

const { useState: useS2 } = React;

/* ───────── Side drawer */
function MDrawer({ open, onClose, persona, plan, role, onNavigate, items, page, onSwitchRole }) {
  if (!open) return null;
  return (
    <div onClick={onClose} className="bz-fade-in" style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'rgba(10,10,10,0.5)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '85%', maxWidth: 320, height: '100%',
        background: '#0A0A0A', color: '#fff',
        display: 'flex', flexDirection: 'column',
        animation: 'slidein 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BuazeLogo size={26} variant="on-dark"/>
            <BuazeWordmark size={17} dark/>
          </div>
        </div>

        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#0A0A0A' }}>
              {persona.userInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{persona.name}</div>
              <div className="pulse-eyebrow" style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                {persona.userName}
              </div>
            </div>
          </div>

          {plan && role === 'owner' && (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="pulse-eyebrow" style={{ fontSize: 9, color: '#C6F24E' }}>{plan.label}</span>
                <Icon.crown size={12} color="#C6F24E"/>
              </div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: 'rgba(255,255,255,0.6)' }}>{T(plan.quotaLabel.tr, plan.quotaLabel.en)}</div>
              <div style={{ marginTop: 4, fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{plan.quotaValue}</div>
              <div style={{ marginTop: 8, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                <div style={{ width: `${plan.progress}%`, height: '100%', background: '#C6F24E', borderRadius: 2 }}/>
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {items.map(it => {
            const active = it.id === page;
            return (
              <button key={it.id} onClick={() => { onNavigate(it.id); onClose(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 12px', borderRadius: 10, marginBottom: 2,
                  background: active ? 'rgba(198,242,78,0.1)' : 'transparent',
                  color: active ? '#C6F24E' : 'rgba(255,255,255,0.85)',
                  border: 0, cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit',
                }}>
                {it.icon && React.cloneElement(it.icon, { size: 16, color: 'currentColor' })}
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}>{T(it.label.tr, it.label.en)}</span>
              </button>
            );
          })}
        </div>

        {/* Role switcher */}
        <div style={{ padding: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => { onSwitchRole(role === 'admin' ? 'owner' : 'admin'); onClose(); }}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit',
            }}>
            <Icon.users size={14} color="#C6F24E"/>
            {role === 'admin'
              ? T('Owner görünümüne geç', 'Switch to owner view')
              : T('Admin görünümüne geç', 'Switch to admin view')}
          </button>
          <button style={{
            marginTop: 8, width: '100%', padding: '10px 12px', borderRadius: 10,
            background: 'transparent', border: 0,
            color: 'rgba(255,255,255,0.55)', fontSize: 11, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            {T('Çıkış yap', 'Sign out')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Owner — QR codes (mobile) */
function MOwnerQR({ onMenu, onCreate }) {
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%' }}>
      <MTopBar title={T('QR kodları', 'QR codes')} subtitle={`${QR_CODES.length} ${T('AKTİF', 'ACTIVE')}`} onMenu={onMenu}
        right={<button className="bz-btn-icon" style={{ width: 34, height: 34 }}><Icon.search size={18}/></button>}/>

      <div style={{ padding: '12px 14px 96px' }}>
        {/* Aggregate stats */}
        <div className="bz-card" style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { l: T('Toplam', 'Total'), v: QR_CODES.length },
            { l: T('Bu hafta', 'This week'), v: '847' },
            { l: T('Toplam', 'Total scans'), v: '12.4k' },
          ].map((s, i) => (
            <div key={i} style={{ borderLeft: i ? '1px solid #EDEDED' : 'none', paddingLeft: i ? 12 : 0 }}>
              <div className="pulse-eyebrow" style={{ fontSize: 9, color: '#737373' }}>{s.l}</div>
              <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4 }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* QR cards */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {QR_CODES.map(q => (
            <div key={q.id} className="bz-card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 10, background: '#fff', border: '1px solid #EDEDED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FakeQR size={52}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div className="bz-h-tight" style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
                </div>
                <div style={{ fontSize: 10.5, color: '#737373', marginBottom: 6 }}>{q.branch}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {q.platform ? <PlatformChip id={q.platform} size={14}/> : <span style={{ fontSize: 9, color: '#A3A3A3' }}>{T('Genel', 'Default')}</span>}
                  <span style={{ fontSize: 10.5, color: '#525252', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{q.scans.toLocaleString('tr-TR')}</span>
                  {q.status === 'active' ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }}/> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }}/>}
                </div>
              </div>
              <button className="bz-btn-icon" style={{ width: 32, height: 32 }}><Icon.more size={16}/></button>
            </div>
          ))}
        </div>
      </div>

      <MFab onClick={onCreate} icon={<Icon.plus size={22} color="#C6F24E"/>} label={T('Yeni QR', 'New QR')}/>
    </div>
  );
}

/* ───────── Owner — Platforms */
function MOwnerPlatforms({ onMenu }) {
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%' }}>
      <MTopBar title={T('Platformlar', 'Platforms')} subtitle={T('YORUM YÖNLENDİRMESİ', 'REVIEW REDIRECT')} onMenu={onMenu}/>

      <div style={{ padding: '14px 14px 96px' }}>
        <div className="bz-card" style={{ padding: 16, background: '#0A0A0A', color: '#fff' }}>
          <div className="pulse-eyebrow" style={{ fontSize: 9, color: '#C6F24E' }}>{T('VARSAYILAN PLATFORM', 'DEFAULT PLATFORM')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <PlatformChip id="google" size={36}/>
            <div style={{ flex: 1 }}>
              <div className="bz-h-tight" style={{ fontSize: 14 }}>Google Maps</div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}>maps.app.goo.gl/karak…</div>
            </div>
            <button style={{ background: '#C6F24E', color: '#0A0A0A', border: 0, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              {T('Değiştir', 'Change')}
            </button>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            {T('4–5 yıldızlı yorumlar bu platforma yönlendirilir.', '4–5 star reviews are redirected to this platform.')}
          </div>
        </div>

        <Eyebrow style={{ marginTop: 18, marginBottom: 8, paddingLeft: 4 }}>{T('TÜM PLATFORMLAR', 'ALL PLATFORMS')}</Eyebrow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {REVIEW_PLATFORMS.map(p => (
            <div key={p.id} className="bz-card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center', opacity: p.enabled ? 1 : 0.55 }}>
              <PlatformChip id={p.id} size={36}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="bz-h-tight" style={{ fontSize: 13 }}>{PLATFORMS[p.id].label}</div>
                  {p.isDefault && <Badge kind="lime" dot={false}>{T('Varsayılan', 'Default')}</Badge>}
                </div>
                {p.url ? (
                  <div className="bz-mono" style={{ fontSize: 10, color: '#737373', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.url}</div>
                ) : (
                  <div style={{ fontSize: 10.5, color: '#A3A3A3', marginTop: 2 }}>{T('Bağlanmadı', 'Not connected')}</div>
                )}
              </div>
              <Toggle checked={p.enabled} onChange={() => {}}/>
            </div>
          ))}
        </div>

        {/* Compliance banner */}
        <div style={{ marginTop: 16, padding: 14, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', gap: 10 }}>
          <Icon.shield size={16} color="#92400E" style={{ flexShrink: 0, marginTop: 2 }}/>
          <div style={{ fontSize: 11.5, color: '#92400E', lineHeight: 1.5 }}>
            <strong>{T('Uyumluluk', 'Compliance')}:</strong>{' '}
            {T('1–3 yıldız her zaman dahili olarak işletmeye iletilir; harici platforma yönlendirilmez.', '1–3 stars are captured internally; never redirected externally.')}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Owner — Settings (mobile) */
function MOwnerSettings({ onMenu, persona }) {
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%' }}>
      <MTopBar title={T('Ayarlar', 'Settings')} onMenu={onMenu}/>
      <div style={{ padding: '14px 14px 96px' }}>
        <SettingsGroup label={T('İŞLETME', 'BUSINESS')}>
          <SettingsRow icon={<Icon.store size={16}/>} title={T('İşletme bilgileri', 'Business info')} value={persona.name}/>
          <SettingsRow icon={<Icon.mapPin size={16}/>} title={T('Şubeler', 'Branches')} value="3"/>
          <SettingsRow icon={<Icon.image size={16}/>} title={T('Logo & marka', 'Logo & brand')}/>
          <SettingsRow icon={<Icon.menu size={16}/>} title={T('Menü', 'Menu')} value={`${MENU_CATEGORIES.length} ${T('kategori', 'categories')}`}/>
        </SettingsGroup>

        <SettingsGroup label={T('YORUM AKIŞI', 'REVIEW FLOW')}>
          <SettingsRow icon={<Icon.link size={16}/>} title={T('Platform bağlantıları', 'Platform links')} value={`${REVIEW_PLATFORMS.filter(p => p.enabled).length} ${T('aktif', 'active')}`}/>
          <SettingsRow icon={<Icon.qr size={16}/>} title={T('QR kodları', 'QR codes')} value={`${QR_CODES.length}`}/>
          <SettingsRow icon={<Icon.sparkle size={16}/>} title={T('AI yanıt asistanı', 'AI reply assistant')} value={T('Açık', 'On')}/>
        </SettingsGroup>

        <SettingsGroup label={T('YASAL', 'LEGAL')}>
          <SettingsRow icon={<Icon.shield size={16}/>} title={T('KVKK & rıza', 'KVKK & consent')} badge={<Badge kind="ok">{T('Tam', 'OK')}</Badge>}/>
          <SettingsRow icon={<Icon.book size={16}/>} title={T('Aydınlatma metni', 'Privacy disclosure')} value="v2.0"/>
          <SettingsRow icon={<Icon.bell size={16}/>} title={T('Pazarlama izinleri', 'Marketing consents')} value="142"/>
        </SettingsGroup>

        <SettingsGroup label={T('HESAP', 'ACCOUNT')}>
          <SettingsRow icon={<Icon.users size={16}/>} title={T('Ekip üyeleri', 'Team members')} value="4"/>
          <SettingsRow icon={<Icon.creditCard size={16}/>} title={T('Plan & faturalandırma', 'Plan & billing')} value={persona.plan?.label || 'Pro'}/>
          <SettingsRow icon={<Icon.bell size={16}/>} title={T('Bildirimler', 'Notifications')}/>
        </SettingsGroup>

        <button style={{
          marginTop: 12, width: '100%', padding: 14, borderRadius: 12,
          background: 'transparent', border: '1px solid #EDEDED',
          color: '#DC2626', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: 'inherit',
        }}>
          {T('Çıkış yap', 'Sign out')}
        </button>
      </div>
    </div>
  );
}

function SettingsGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Eyebrow style={{ marginBottom: 8, paddingLeft: 4 }}>{label}</Eyebrow>
      <div className="bz-card" style={{ overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
function SettingsRow({ icon, title, value, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #F5F5F5', cursor: 'pointer' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A' }}>{title}</div>
      </div>
      {badge}
      {value && <div style={{ fontSize: 12, color: '#737373', whiteSpace: 'nowrap' }}>{value}</div>}
      <Icon.chevronRight size={14} color="#A3A3A3"/>
    </div>
  );
}

/* ───────── Public Review Page (mobile-native) */
function MPublicReview({ persona }) {
  const [step, setStep] = useS2(1);
  const [rating, setRating] = useS2(0);
  const [hover, setHover] = useS2(0);
  const [form, setForm] = useS2({ name: '', email: '', comment: '', kvkk: false, marketing: false });
  const isHigh = rating >= 4;

  const labels = [T('Çok kötü', 'Terrible'), T('Kötü', 'Poor'), T('İdare eder', 'Okay'), T('İyi', 'Good'), T('Mükemmel', 'Excellent')];

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient gradient */}
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(198,242,78,0.15), transparent 70%)' }}/>

      <div style={{ position: 'relative', padding: '20px 18px 30px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: '#fff', margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-heading)', fontSize: 24, fontWeight: 700, color: '#0A0A0A',
            boxShadow: '0 12px 32px -10px rgba(198,242,78,0.4)',
          }}>
            {persona.name.charAt(0)}
          </div>
          <div style={{ marginTop: 14, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{persona.name}</div>
          <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{persona.address}</div>
        </div>

        {/* Card */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 24, padding: 22, boxShadow: '0 24px 60px -16px rgba(0,0,0,0.6)' }}>
          {step === 1 && (
            <div className="bz-fade-in">
              <Eyebrow>{T('1 / 2', '1 / 2')}</Eyebrow>
              <h2 className="bz-h-tight-2" style={{ fontSize: 24, marginTop: 6, lineHeight: 1.15 }}>{T('Deneyimini puanla', 'Rate your visit')}</h2>
              <p style={{ fontSize: 13, color: '#525252', margin: '8px 0 28px', lineHeight: 1.55 }}>
                {T('Senin görüşün önemli. Birkaç saniyeni alıyoruz.', 'Your opinion matters. Just a few seconds.')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, padding: '4px 0' }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s}
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
                    onTouchStart={() => setHover(s)}
                    style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', flex: 1, transition: 'transform 0.1s', transform: rating === s ? 'scale(1.15)' : 'scale(1)' }}>
                    <Icon.star size={42} color={s <= (hover || rating) ? '#C6F24E' : '#E5E5E5'} fill/>
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: 14, color: '#0A0A0A', minHeight: 22, marginTop: 14, fontWeight: 600 }}>
                {(hover || rating) ? labels[(hover || rating) - 1] : <span style={{ color: '#A3A3A3', fontWeight: 400 }}>{T('Yıldıza dokun', 'Tap a star')}</span>}
              </div>
              <button className="bz-btn-primary" onClick={() => setStep(2)} disabled={rating === 0}
                style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: 14, marginTop: 20, opacity: rating === 0 ? 0.4 : 1 }}>
                {T('Devam et', 'Continue')}<Icon.arrowRight size={14}/>
              </button>
            </div>
          )}

          {step === 2 && isHigh && (
            <div className="bz-fade-in" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 4, lineHeight: 1 }}>🎉</div>
              <h2 className="bz-h-tight-2" style={{ fontSize: 22, marginTop: 8 }}>{T('Çok teşekkürler!', 'Thank you so much!')}</h2>
              <p style={{ fontSize: 13, color: '#525252', margin: '8px 0 22px', lineHeight: 1.6 }}>
                {T('Yorumunu Google\'da paylaşır mısın? Diğer müşterilerin de görmesi bizim için çok değerli.',
                    'Would you share your review on Google? It really helps other customers find us.')}
              </p>
              <a href="#" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '15px', borderRadius: 14, background: '#0A0A0A', color: '#fff',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}>
                <PlatformChip id="google" size={20}/>
                {T('Google\'da paylaş', 'Share on Google')}
                <Icon.arrowUpRight size={14}/>
              </a>
              <button onClick={() => setStep(3)} style={{ marginTop: 14, background: 'transparent', border: 0, color: '#737373', fontSize: 12, cursor: 'pointer' }}>
                {T('Belki sonra', 'Maybe later')}
              </button>
            </div>
          )}

          {step === 2 && !isHigh && (
            <div className="bz-fade-in">
              <Eyebrow>{T('2 / 2', '2 / 2')}</Eyebrow>
              <h2 className="bz-h-tight-2" style={{ fontSize: 20, marginTop: 6, lineHeight: 1.2 }}>{T('Bize biraz daha anlatır mısın?', 'Tell us a bit more')}</h2>
              <p style={{ fontSize: 12.5, color: '#525252', margin: '8px 0 18px', lineHeight: 1.55 }}>
                {T('Geri bildirimin yalnızca işletme yönetimine iletilecek.', 'Your feedback goes directly to management.')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="bz-input" placeholder={T('Adın (opsiyonel)', 'Your name (optional)')}
                       value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
                <input className="bz-input" type="email" placeholder={T('E-posta (opsiyonel)', 'Email (optional)')}
                       value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
                <textarea className="bz-input" placeholder={T('Deneyimini bizimle paylaş…', 'Share your experience…')}
                          rows={4} value={form.comment} onChange={e => setForm({...form, comment: e.target.value})}
                          style={{ resize: 'none', fontFamily: 'inherit' }}/>
                <label style={{ display: 'flex', gap: 8, fontSize: 11.5, color: '#525252', lineHeight: 1.5, alignItems: 'flex-start', cursor: 'pointer', marginTop: 4 }}>
                  <input type="checkbox" checked={form.kvkk} onChange={e => setForm({...form, kvkk: e.target.checked})} style={{ marginTop: 2 }}/>
                  <span>{T('KVKK kapsamında verilerimin işletmeyle paylaşılmasını kabul ediyorum.', 'I consent to KVKK data sharing.')}</span>
                </label>
                <button className="bz-btn-primary" onClick={() => setStep(3)} disabled={!form.kvkk}
                        style={{ width: '100%', justifyContent: 'center', padding: '15px', marginTop: 6, opacity: !form.kvkk ? 0.4 : 1 }}>
                  {T('Gönder', 'Submit')}<Icon.arrowRight size={14}/>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bz-fade-in" style={{ textAlign: 'center', padding: '30px 0 20px' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#C6F24E', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px -10px rgba(198,242,78,0.5)' }}>
                <Icon.check size={32} strokeWidth={3} color="#0A0A0A"/>
              </div>
              <h2 className="bz-h-tight-2" style={{ fontSize: 24, marginTop: 18 }}>{T('Teşekkürler!', 'Thank you!')}</h2>
              <p style={{ fontSize: 13, color: '#525252', margin: '8px 0 0', lineHeight: 1.6 }}>
                {T('Geri bildirimin alındı. Tekrar görüşmek üzere.', 'Your feedback has been received.')}
              </p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, color: 'rgba(255,255,255,0.4)', fontSize: 9.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          POWERED BY BUAZE
        </div>
      </div>
    </div>
  );
}

/* ───────── Admin — Mobile dashboard */
function MAdminHome({ onMenu, persona }) {
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%' }}>
      <MTopBar title={T('Admin', 'Admin')} subtitle="SUPERADMIN" onMenu={onMenu}/>
      <div style={{ padding: '14px 14px 96px' }}>
        {/* Hero — system pulse */}
        <div style={{ background: '#0A0A0A', borderRadius: 20, padding: 18, color: '#fff' }}>
          <div className="pulse-eyebrow" style={{ fontSize: 9, color: '#C6F24E' }}>{T('SİSTEM NABZI', 'SYSTEM PULSE')}</div>
          <div className="bz-h-tight-2" style={{ fontSize: 32, marginTop: 8, fontFamily: 'var(--font-heading)' }}>{ADMIN_STATS.mrr}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{T('Aylık tekrarlayan gelir', 'Monthly recurring revenue')} · +12.4%</div>

          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
              <div className="pulse-eyebrow" style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>{T('İŞLETME', 'BUSINESSES')}</div>
              <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4 }}>{ADMIN_STATS.businesses}</div>
            </div>
            <div style={{ padding: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
              <div className="pulse-eyebrow" style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>{T('AKTİF DENEMELER', 'ACTIVE TRIALS')}</div>
              <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4 }}>{ADMIN_STATS.trialActive}</div>
            </div>
          </div>
        </div>

        {/* Recently joined */}
        <div style={{ marginTop: 18 }}>
          <Eyebrow style={{ marginBottom: 10, paddingLeft: 4 }}>{T('SON KATILAN', 'RECENTLY JOINED')}</Eyebrow>
          <div className="bz-card" style={{ overflow: 'hidden' }}>
            {BUSINESSES.slice(-4).reverse().map((b, i) => (
              <div key={b.id} style={{ padding: 12, borderBottom: i < 3 ? '1px solid #F5F5F5' : 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={b.name} size={32}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                  <div style={{ fontSize: 10.5, color: '#737373' }}>{b.city} · {b.joined}</div>
                </div>
                <Badge kind={b.plan === 'trial' ? 'warn' : 'ok'} dot={false}>{b.plan}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Needs attention */}
        <div style={{ marginTop: 14 }}>
          <Eyebrow color="#DC2626" style={{ marginBottom: 10, paddingLeft: 4 }}>{T('DİKKAT GEREKTİREN', 'NEEDS ATTENTION')}</Eyebrow>
          <div className="bz-card">
            {[
              { k: T('KVKK metni eksik', 'Missing KVKK doc'), n: 4, kind: 'danger' },
              { k: T('14+ gün giriş yapılmadı', 'No login 14d+'), n: 7, kind: 'warn' },
              { k: T('Kota %90+ doldu', 'Quota 90%+'), n: 3, kind: 'warn' },
            ].map((r, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: i < 2 ? '1px solid #F5F5F5' : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5 }}>{r.k}</span>
                <Badge kind={r.kind}>{r.n}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── Admin — Businesses (mobile) */
function MAdminBusinesses({ onMenu }) {
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%' }}>
      <MTopBar title={T('İşletmeler', 'Businesses')} subtitle={`${ADMIN_STATS.businesses} ${T('KAYITLI', 'REGISTERED')}`} onMenu={onMenu}
        right={<button className="bz-btn-icon" style={{ width: 34, height: 34 }}><Icon.search size={18}/></button>}/>

      <div style={{ padding: '10px 14px 96px' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10 }}>
          {['all', 'pro', 'growth', 'starter', 'trial'].map(f => (
            <button key={f} style={{
              padding: '7px 14px', borderRadius: 999,
              background: f === 'all' ? '#0A0A0A' : '#fff',
              color: f === 'all' ? '#fff' : '#0A0A0A',
              border: f === 'all' ? '1px solid #0A0A0A' : '1px solid #EDEDED',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
              fontFamily: 'inherit', textTransform: 'capitalize',
            }}>
              {f === 'all' ? T('Tümü', 'All') : f}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BUSINESSES.map(b => (
            <div key={b.id} className="bz-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={b.name} size={40}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{b.name}</div>
                  <Badge kind={b.plan === 'pro' ? 'lime' : b.plan === 'trial' ? 'warn' : 'ghost'} dot={false}>{b.plan}</Badge>
                </div>
                <div style={{ fontSize: 10.5, color: '#737373', display: 'flex', gap: 6 }}>
                  <span>{b.city}</span><span>·</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon.star size={9} color="#C6F24E"/>{b.avg}</span><span>·</span>
                  <span>{b.reviews} {T('yrm', 'rev')}</span>
                </div>
              </div>
              <Icon.chevronRight size={14} color="#A3A3A3"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MDrawer, MOwnerQR, MOwnerPlatforms, MOwnerSettings, MPublicReview, MAdminHome, MAdminBusinesses, SettingsGroup, SettingsRow });
