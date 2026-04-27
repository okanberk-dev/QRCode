/* Admin pages and Public review page */

/* ───────── Admin: Dashboard */
function AdminDashboard() {
  return (
    <div style={{ padding: '24px 28px 60px' }}>
      <div style={{ marginBottom: 20 }}>
        <Eyebrow color="#C6F24E">{T('SUPERADMIN', 'SUPERADMIN')}</Eyebrow>
        <h1 className="bz-h-tight-2" style={{ fontSize: 28, marginTop: 4 }}>{T('Sistem genel görünümü', 'System overview')}</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label={T('Toplam işletme', 'Total businesses')} value={ADMIN_STATS.businesses} delta={`+${ADMIN_STATS.activeBusinesses - 119} (24s)`} icon={<Icon.store size={14}/>}/>
        <StatCard label={T('Aylık MRR', 'Monthly MRR')} value={ADMIN_STATS.mrr} delta="+12.4%" deltaKind="up" accent="#C6F24E" icon={<Icon.zap size={14}/>}/>
        <StatCard label={T('Aktif denemeler', 'Active trials')} value={ADMIN_STATS.trialActive} delta={T('14 gün ort.', '14d avg')} deltaKind="neutral"/>
        <StatCard label={T('Aylık yorum', 'Monthly reviews')} value={ADMIN_STATS.monthlyReviews.toLocaleString('tr-TR')} delta="+8.4%" deltaKind="up"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="bz-card" style={{ padding: 22 }}>
          <Eyebrow>{T('İşletme büyümesi', 'Business growth')}</Eyebrow>
          <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4, marginBottom: 18 }}>{T('Son 12 hafta', 'Last 12 weeks')}</div>
          <BarChart data={Array.from({length: 12}, (_, i) => ({ label: `H${i+1}`, value: 60 + i * 8 + Math.random() * 14 }))} height={160}/>
        </div>
        <div className="bz-card" style={{ padding: 22 }}>
          <Eyebrow>{T('Plan dağılımı', 'Plan distribution')}</Eyebrow>
          <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4, marginBottom: 14 }}>{ADMIN_STATS.businesses} {T('işletme', 'businesses')}</div>
          {[
            { k: 'Pro', v: 18, c: '#0A0A0A' },
            { k: 'Growth', v: 42, c: '#525252' },
            { k: 'Starter', v: 45, c: '#A3A3A3' },
            { k: 'Trial', v: 23, c: '#C6F24E' },
          ].map(r => (
            <div key={r.k} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 500 }}>{r.k}</span>
                <span className="bz-mono" style={{ color: '#525252' }}>{r.v}</span>
              </div>
              <div style={{ height: 6, background: '#F5F5F5', borderRadius: 3 }}>
                <div style={{ width: `${(r.v / ADMIN_STATS.businesses) * 100}%`, height: '100%', background: r.c, borderRadius: 3 }}/>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="bz-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EDEDED' }}>
            <Eyebrow>{T('Son katılan işletmeler', 'Recently joined')}</Eyebrow>
          </div>
          {BUSINESSES.slice(-4).reverse().map(b => (
            <div key={b.id} style={{ padding: '12px 20px', borderBottom: '1px solid #F5F5F5', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={b.name} size={32}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: '#737373' }}>{b.city} · {b.joined}</div>
              </div>
              <Badge kind={b.plan === 'trial' ? 'warn' : 'ok'}>{b.plan}</Badge>
            </div>
          ))}
        </div>
        <div className="bz-card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #EDEDED' }}>
            <Eyebrow color="#DC2626">{T('Dikkat gerektiren', 'Needs attention')}</Eyebrow>
          </div>
          {[
            { k: T('KVKK metni eksik', 'Missing KVKK doc'), n: 4, kind: 'danger' },
            { k: T('14+ gün giriş yapılmadı', 'No login 14d+'), n: 7, kind: 'warn' },
            { k: T('Kota %90+ doldu', 'Quota 90%+'), n: 3, kind: 'warn' },
            { k: T('Doğrulanmamış platform', 'Unverified platform'), n: 11, kind: 'warn' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid #F5F5F5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>{r.k}</span>
              <Badge kind={r.kind}>{r.n}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Admin: Businesses list */
function AdminBusinesses() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? BUSINESSES : BUSINESSES.filter(b => b.plan === filter);
  return (
    <div style={{ padding: '24px 28px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <Eyebrow>{T('İŞLETMELER', 'BUSINESSES')}</Eyebrow>
          <h1 className="bz-h-tight-2" style={{ fontSize: 24, marginTop: 4 }}>{ADMIN_STATS.businesses} {T('kayıtlı işletme', 'registered businesses')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bz-btn-ghost"><Icon.download size={14}/>{T('Dışa aktar', 'Export')}</button>
          <button className="bz-btn-primary"><Icon.plus size={14}/>{T('Yeni işletme', 'New business')}</button>
        </div>
      </div>

      <div className="bz-tabs" style={{ marginBottom: 14 }}>
        {['all', 'pro', 'growth', 'starter', 'trial'].map(f => (
          <button key={f} className="bz-tab" aria-selected={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? T('Tümü', 'All') : f.charAt(0).toUpperCase() + f.slice(1)}
            <span style={{ marginLeft: 6, color: '#A3A3A3' }}>({f === 'all' ? BUSINESSES.length : BUSINESSES.filter(b => b.plan === f).length})</span>
          </button>
        ))}
      </div>

      <div className="bz-card" style={{ overflow: 'hidden' }}>
        <table className="bz-table">
          <thead>
            <tr>
              <th>{T('İşletme', 'Business')}</th>
              <th>{T('Tür', 'Type')}</th>
              <th>{T('Şehir', 'City')}</th>
              <th>{T('Plan', 'Plan')}</th>
              <th>{T('Şube', 'Locations')}</th>
              <th>{T('Yorum', 'Reviews')}</th>
              <th>{T('Puan', 'Rating')}</th>
              <th>{T('KVKK', 'KVKK')}</th>
              <th>{T('Durum', 'Status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id}>
                <td>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Avatar name={b.name} size={28}/>
                    <div>
                      <div style={{ fontWeight: 600 }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: '#737373' }}>{b.owner}</div>
                    </div>
                  </div>
                </td>
                <td><span style={{ fontSize: 12, color: '#525252', textTransform: 'capitalize' }}>{b.type}</span></td>
                <td>{b.city}</td>
                <td><Badge kind={b.plan === 'pro' ? 'lime' : b.plan === 'trial' ? 'warn' : 'ghost'}>{b.plan}</Badge></td>
                <td className="bz-mono">{b.locations}</td>
                <td className="bz-mono">{b.reviews}</td>
                <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}><Icon.star size={11} color="#C6F24E"/>{b.avg}</span></td>
                <td>{b.kvkk ? <Badge kind="ok">{T('Tam', 'OK')}</Badge> : <Badge kind="danger">{T('Eksik', 'Missing')}</Badge>}</td>
                <td>{b.status === 'active' ? <Badge kind="ok" dot>{T('Aktif', 'Active')}</Badge> : <Badge kind="warn">{T('Duraklatıldı', 'Paused')}</Badge>}</td>
                <td><button className="bz-btn-icon"><Icon.more size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Admin: Announcements */
function AdminAnnouncements() {
  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <Eyebrow>{T('SİSTEM DUYURULARI', 'SYSTEM ANNOUNCEMENTS')}</Eyebrow>
          <h1 className="bz-h-tight-2" style={{ fontSize: 24, marginTop: 4 }}>{T('Tüm işletmelere ulaş', 'Reach all businesses')}</h1>
        </div>
        <button className="bz-btn-primary"><Icon.plus size={14}/>{T('Yeni duyuru', 'New announcement')}</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ANNOUNCEMENTS.map(a => (
          <div key={a.id} className="bz-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  {a.status === 'active' ? <Badge kind="ok">{T('Yayında', 'Live')}</Badge> : <Badge kind="warn">{T('Planlı', 'Scheduled')}</Badge>}
                  <Badge kind="ghost">{a.audience}</Badge>
                </div>
                <div className="bz-h-tight" style={{ fontSize: 16, marginBottom: 6 }}>{a.title}</div>
                <p style={{ margin: 0, fontSize: 13, color: '#525252', lineHeight: 1.55 }}>{a.body}</p>
                <div style={{ marginTop: 8, fontSize: 11, color: '#A3A3A3' }}>{a.published}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="bz-btn-icon"><Icon.edit size={14}/></button>
                <button className="bz-btn-icon"><Icon.more size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Admin: Blog */
function AdminBlog() {
  return (
    <div style={{ padding: '24px 28px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <Eyebrow>{T('BLOG', 'BLOG')}</Eyebrow>
          <h1 className="bz-h-tight-2" style={{ fontSize: 24, marginTop: 4 }}>{T('İçerik yönetimi', 'Content management')}</h1>
        </div>
        <button className="bz-btn-primary"><Icon.plus size={14}/>{T('Yeni yazı', 'New post')}</button>
      </div>

      <div className="bz-card" style={{ overflow: 'hidden' }}>
        <table className="bz-table">
          <thead>
            <tr>
              <th>{T('Başlık', 'Title')}</th>
              <th>{T('Yazar', 'Author')}</th>
              <th>{T('Yayın tarihi', 'Published')}</th>
              <th>{T('Görüntülenme', 'Views')}</th>
              <th>{T('Durum', 'Status')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {BLOG_POSTS.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, maxWidth: 420 }}>{p.title}</td>
                <td>{p.author}</td>
                <td>{p.published || '—'}</td>
                <td className="bz-mono">{p.views.toLocaleString('tr-TR')}</td>
                <td>{p.status === 'published' ? <Badge kind="ok">{T('Yayında', 'Published')}</Badge> : <Badge kind="ghost">{T('Taslak', 'Draft')}</Badge>}</td>
                <td><button className="bz-btn-icon"><Icon.more size={14}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Public Review Page (mobile) */
function PublicReview({ persona }) {
  const [step, setStep] = useState(1); // 1: rating, 2a: high redirect, 2b: low form, 3: thanks
  const [rating, setRating] = useState(0);
  const [form, setForm] = useState({ name: '', email: '', phone: '', comment: '', kvkk: false, marketing: false });
  const isHigh = rating >= 4;

  const submitRating = () => {
    if (rating === 0) return;
    setStep(isHigh ? 2 : 2);
  };

  return (
    <div style={{ background: '#0A0A0A', minHeight: '100%', padding: 24, fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: 360, margin: '0 auto' }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fff', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 700, color: '#0A0A0A' }}>
            {persona.name.charAt(0)}
          </div>
          <div style={{ marginTop: 14, color: '#fff', fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{persona.name}</div>
          <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>{persona.address}</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
          {step === 1 && (
            <div className="bz-fade-in">
              <Eyebrow>{T('1. ADIM', 'STEP 1')}</Eyebrow>
              <h2 className="bz-h-tight-2" style={{ fontSize: 22, marginTop: 6 }}>{T('Deneyimini puanla', 'Rate your experience')}</h2>
              <p style={{ fontSize: 13, color: '#525252', margin: '8px 0 22px', lineHeight: 1.55 }}>
                {T('Senin görüşün önemli. Birkaç saniyeni alıyoruz.', 'Your opinion matters. Just a few seconds.')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 0' }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setRating(s)} style={{ background: 'transparent', border: 0, padding: 6, cursor: 'pointer' }}>
                    <Icon.star size={42} color={s <= rating ? '#C6F24E' : '#E5E5E5'} fill/>
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <div style={{ textAlign: 'center', fontSize: 13, color: '#525252', minHeight: 20, marginBottom: 16 }} className="bz-fade-in">
                  {[T('Çok kötü', 'Terrible'), T('Kötü', 'Poor'), T('İdare eder', 'Okay'), T('İyi', 'Good'), T('Mükemmel', 'Excellent')][rating - 1]}
                </div>
              )}
              <button className="bz-btn-primary" onClick={submitRating} disabled={rating === 0}
                style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 14, opacity: rating === 0 ? 0.4 : 1 }}>
                {T('Devam et', 'Continue')}<Icon.arrowRight size={14}/>
              </button>
            </div>
          )}

          {step === 2 && isHigh && (
            <div className="bz-fade-in" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <h2 className="bz-h-tight-2" style={{ fontSize: 22 }}>{T('Çok teşekkürler!', 'Thank you so much!')}</h2>
              <p style={{ fontSize: 13, color: '#525252', margin: '8px 0 18px', lineHeight: 1.6 }}>
                {T('Yorumunu Google\'da paylaşır mısın? Diğer müşterilerin de görmesi bizim için çok değerli.',
                    'Would you share your review on Google? It really helps other customers find us.')}
              </p>
              <a href="#" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: 16, borderRadius: 12, background: '#0A0A0A', color: '#fff',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}>
                <PlatformChip id="google" size={20}/>
                {T('Google\'da yorum bırak', 'Review on Google')}
                <Icon.arrowUpRight size={14}/>
              </a>
              <button onClick={() => setStep(3)} style={{ marginTop: 12, background: 'transparent', border: 0, color: '#737373', fontSize: 12, cursor: 'pointer' }}>
                {T('Belki sonra', 'Maybe later')}
              </button>
            </div>
          )}

          {step === 2 && !isHigh && (
            <div className="bz-fade-in">
              <Eyebrow>{T('2. ADIM', 'STEP 2')}</Eyebrow>
              <h2 className="bz-h-tight-2" style={{ fontSize: 20, marginTop: 6 }}>{T('Bize biraz daha anlatır mısın?', 'Tell us a little more')}</h2>
              <p style={{ fontSize: 12.5, color: '#525252', margin: '8px 0 18px', lineHeight: 1.55 }}>
                {T('Geri bildirimin yalnızca işletme yönetimine iletilecek. Daha iyisini sunabilmemiz için yardım et.',
                    'Your feedback goes directly to management — help us do better.')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input className="bz-input" placeholder={T('Adın (opsiyonel)', 'Your name (optional)')}
                       value={form.name} onChange={e => setForm({...form, name: e.target.value})}/>
                <input className="bz-input" placeholder={T('E-posta (opsiyonel)', 'Email (optional)')}
                       value={form.email} onChange={e => setForm({...form, email: e.target.value})}/>
                <textarea className="bz-input" placeholder={T('Deneyimini bizimle paylaş…', 'Share your experience…')}
                          rows={4} value={form.comment} onChange={e => setForm({...form, comment: e.target.value})}
                          style={{ resize: 'none', fontFamily: 'inherit' }}/>
                <label style={{ display: 'flex', gap: 8, fontSize: 11.5, color: '#525252', lineHeight: 1.5, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.kvkk} onChange={e => setForm({...form, kvkk: e.target.checked})} style={{ marginTop: 2 }}/>
                  <span>{T('KVKK kapsamında verilerimin işletmeyle paylaşılmasını kabul ediyorum.', 'I consent to sharing my data with the business under KVKK.')}</span>
                </label>
                <label style={{ display: 'flex', gap: 8, fontSize: 11.5, color: '#525252', lineHeight: 1.5, alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.marketing} onChange={e => setForm({...form, marketing: e.target.checked})} style={{ marginTop: 2 }}/>
                  <span>{T('Kampanya ve duyurulardan haberdar olmak istiyorum (opsiyonel).', 'I\'d like to receive promotions and announcements (optional).')}</span>
                </label>
                <button className="bz-btn-primary" onClick={() => setStep(3)} disabled={!form.kvkk}
                        style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 4, opacity: !form.kvkk ? 0.4 : 1 }}>
                  {T('Geri bildirimi gönder', 'Submit feedback')}<Icon.arrowRight size={14}/>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bz-fade-in" style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#C6F24E', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon.check size={28} strokeWidth={3} color="#0A0A0A"/>
              </div>
              <h2 className="bz-h-tight-2" style={{ fontSize: 22, marginTop: 18 }}>{T('Teşekkürler!', 'Thank you!')}</h2>
              <p style={{ fontSize: 13, color: '#525252', margin: '8px 0 0', lineHeight: 1.6 }}>
                {T('Geri bildirimin alındı. Tekrar görüşmek üzere.', 'Your feedback has been received. See you soon.')}
              </p>
            </div>
          )}
        </div>

        {/* Buaze badge */}
        <div style={{ textAlign: 'center', marginTop: 22, color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          POWERED BY BUAZE
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard, AdminBusinesses, AdminAnnouncements, AdminBlog, PublicReview });
