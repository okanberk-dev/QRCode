/* Owner pages — dashboard, feedback, qr, platforms, analytics, menu, settings, onboarding */

/* ───────── Owner: Dashboard */
function OwnerDashboard({ persona, onNavigate }) {
  const peak = Math.max(...TREND_7D.map(d => d.scans));
  return (
    <div style={{ padding: '24px 28px 60px' }}>
      {/* Onboarding banner (collapsed when complete) */}
      <OnboardingNudge onNavigate={onNavigate}/>

      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 20 }}>
        <StatCard label={T('Toplam yorum', 'Total reviews')} value={STATS_OWNER.totalReviews}
                  delta="+8.4%" deltaKind="up" icon={<Icon.inbox size={14}/>}/>
        <StatCard label={T('Ortalama puan', 'Avg rating')} value={STATS_OWNER.avgRating.toFixed(1)}
                  delta="+0.2" deltaKind="up" icon={<Icon.star size={14} color="#C6F24E"/>} accent="#C6F24E"/>
        <StatCard label={T('QR taranma', 'QR scans')} value={STATS_OWNER.scans.toLocaleString('tr-TR')}
                  delta="+24%" deltaKind="up" icon={<Icon.qr size={14}/>}/>
        <StatCard label={T('Platforma yönlendirme', 'Platform redirects')} value={STATS_OWNER.redirects}
                  delta="+12%" deltaKind="up" icon={<Icon.arrowUpRight size={14}/>}/>
      </div>

      {/* Two-column: trend + star distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="bz-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
            <div>
              <Eyebrow>{T('Etkileşim eğilimi', 'Interaction trend')}</Eyebrow>
              <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4 }}>{T('Son 7 gün', 'Last 7 days')}</div>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
              <LegendDot color="#0A0A0A" label={T('Taranma', 'Scans')}/>
              <LegendDot color="#C6F24E" label={T('Puan', 'Rating')}/>
            </div>
          </div>
          <BarChart data={TREND_7D.map(d => ({ label: d.d, value: d.scans }))} maxValue={peak} accent="#0A0A0A" height={140}/>
          <div style={{ borderTop: '1px solid #EDEDED', marginTop: 22, paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#525252' }}>
            <span><strong style={{ color: '#0A0A0A' }}>2,340</strong> {T('toplam taranma', 'total scans')}</span>
            <span><strong style={{ color: '#0A0A0A' }}>4.6</strong> {T('ort. puan', 'avg rating')}</span>
            <span><strong style={{ color: '#0A0A0A' }}>26%</strong> {T('platform yönlendirme oranı', 'redirect rate')}</span>
          </div>
        </div>
        <div className="bz-card" style={{ padding: 20 }}>
          <Eyebrow>{T('Puan dağılımı', 'Rating distribution')}</Eyebrow>
          <div className="bz-h-tight-2" style={{ fontSize: 32, marginTop: 8 }}>4.6 <span style={{ fontSize: 14, color: '#737373', fontWeight: 400 }}>/ 5</span></div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {STAR_DIST.map(r => (
              <div key={r.star} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <span style={{ width: 12, color: '#525252', fontWeight: 600 }}>{r.star}</span>
                <Icon.star size={11} color="#C6F24E"/>
                <div style={{ flex: 1, height: 6, background: '#F5F5F5', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${r.pct}%`, height: '100%', background: r.star >= 4 ? '#0A0A0A' : r.star === 3 ? '#A3A3A3' : '#DC2626', borderRadius: 3 }}/>
                </div>
                <span style={{ width: 36, textAlign: 'right', color: '#737373' }}>{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent feedback + QR performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="bz-card">
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Eyebrow>{T('Son yorumlar', 'Recent reviews')}</Eyebrow>
              <div className="bz-h-tight" style={{ fontSize: 16, marginTop: 4 }}>{T('Gelen kutusu', 'Inbox')}</div>
            </div>
            <button onClick={() => onNavigate('feedback')} className="bz-btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }}>
              {T('Tümü', 'View all')} <Icon.arrowRight size={12}/>
            </button>
          </div>
          <div style={{ borderTop: '1px solid #EDEDED' }}>
            {FEEDBACKS.slice(0, 4).map(f => (
              <div key={f.id} style={{ padding: '14px 20px', borderBottom: '1px solid #F5F5F5', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Avatar name={f.name} size={32} color={f.rating >= 4 ? '#0A0A0A' : '#DC2626'} fg={f.rating >= 4 ? '#C6F24E' : '#fff'}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                    <span style={{ display: 'flex', gap: 1 }}>
                      {[1,2,3,4,5].map(s => (
                        <Icon.star key={s} size={11} color={s <= f.rating ? '#C6F24E' : '#E5E5E5'}/>
                      ))}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 6px', fontSize: 12.5, color: '#525252', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.comment}</p>
                  <div style={{ fontSize: 10.5, color: '#A3A3A3', display: 'flex', gap: 10 }}>
                    <span>{f.branch} · {T('Masa', 'Table')} {f.table}</span>
                    <span>·</span>
                    <span>{T(f.time, f.timeEn)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bz-card">
          <div style={{ padding: '16px 20px' }}>
            <Eyebrow>{T('QR performansı', 'QR performance')}</Eyebrow>
            <div className="bz-h-tight" style={{ fontSize: 16, marginTop: 4 }}>{T('En aktif QR kodları', 'Most active QRs')}</div>
          </div>
          <div style={{ borderTop: '1px solid #EDEDED' }}>
            {QR_CODES.slice(0, 5).map(q => (
              <div key={q.id} style={{ padding: '14px 20px', borderBottom: '1px solid #F5F5F5', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon.qr size={18} color="#C6F24E"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
                  <div style={{ fontSize: 11, color: '#737373', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {q.platform ? <PlatformChip id={q.platform} size={14}/> : <span>{T('Genel', 'General')}</span>}
                    <span>·</span>
                    <span>{q.scans.toLocaleString('tr-TR')} {T('taranma', 'scans')}</span>
                  </div>
                </div>
                <Sparkline values={[12,18,14,22,30,24,28,32,40,36]} w={56} h={20} color="#0A0A0A"/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#525252' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color }}/>{label}
    </span>
  );
}

/* ───────── Onboarding nudge */
function OnboardingNudge({ onNavigate }) {
  const steps = [
    { id: 1, label: T('İşletme profilini tamamla', 'Complete business profile'), done: true, action: 'settings' },
    { id: 2, label: T('Yorum platform bağlantılarını ekle', 'Add review platform links'), done: true, action: 'platforms' },
    { id: 3, label: T('Yüksek puan yönlendirmesini seç', 'Pick high-rating redirect destination'), done: true, action: 'platforms' },
    { id: 4, label: T('İlk QR kodunu oluştur', 'Generate your first QR code'), done: false, action: 'qr' },
    { id: 5, label: T('Müşteri yorumlarını izle', 'Track customer feedback'), done: false, action: 'feedback' },
  ];
  const completed = steps.filter(s => s.done).length;
  if (completed === steps.length) return null;
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%)',
      borderRadius: 16, padding: 20, color: '#fff',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <div style={{ flexShrink: 0 }}>
        <Eyebrow color="#C6F24E">{T('Kurulum', 'Setup')}</Eyebrow>
        <div className="bz-h-tight" style={{ fontSize: 17, marginTop: 4 }}>{T('Buaze\'ye hoş geldin', 'Welcome to Buaze')}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
          {completed} / {steps.length} {T('tamamlandı', 'completed')}
        </div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 8 }}>
        {steps.map(s => (
          <button key={s.id} onClick={() => onNavigate(s.action)}
            style={{
              background: s.done ? 'rgba(198,242,78,0.12)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${s.done ? 'rgba(198,242,78,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 10, padding: 10,
              display: 'flex', flexDirection: 'column', gap: 6,
              cursor: 'pointer', textAlign: 'left', color: '#fff',
              fontFamily: 'inherit',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: s.done ? '#C6F24E' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.done ? '#0A0A0A' : 'rgba(255,255,255,0.5)',
              }}>{s.done ? <Icon.check size={11} strokeWidth={2.5}/> : s.id}</span>
              {!s.done && <Icon.arrowRight size={11} color="rgba(255,255,255,0.5)"/>}
            </div>
            <span style={{ fontSize: 11, lineHeight: 1.3, color: s.done ? 'rgba(255,255,255,0.8)' : '#fff', fontWeight: s.done ? 400 : 500 }}>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── Owner: Feedback inbox */
function OwnerFeedback() {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(FEEDBACKS[1]);
  const filtered = useMemo(() => {
    if (filter === 'low') return FEEDBACKS.filter(f => f.rating <= 3);
    if (filter === 'high') return FEEDBACKS.filter(f => f.rating >= 4);
    if (filter === 'redirected') return FEEDBACKS.filter(f => f.redirected);
    return FEEDBACKS;
  }, [filter]);

  const tabs = [
    { id: 'all', label: T('Tümü', 'All'), count: FEEDBACKS.length },
    { id: 'low', label: T('Düşük puan (1-3)', 'Low (1-3)'), count: FEEDBACKS.filter(f => f.rating <= 3).length, kind: 'danger' },
    { id: 'high', label: T('Yüksek puan (4-5)', 'High (4-5)'), count: FEEDBACKS.filter(f => f.rating >= 4).length },
    { id: 'redirected', label: T('Yönlendirilen', 'Redirected'), count: FEEDBACKS.filter(f => f.redirected).length },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', height: '100%' }}>
      {/* List */}
      <div style={{ borderRight: '1px solid #EDEDED', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #EDEDED' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: 11, color: '#A3A3A3' }}><Icon.search size={14}/></span>
            <input className="bz-input" placeholder={T('Yorumlarda ara…', 'Search reviews…')} style={{ paddingLeft: 34, fontSize: 13 }}/>
          </div>
        </div>
        <div className="bz-tabs" style={{ padding: '0 8px', overflow: 'auto', flexShrink: 0 }}>
          {tabs.map(t => (
            <button key={t.id} className="bz-tab" aria-selected={filter === t.id} onClick={() => setFilter(t.id)}>
              {t.label} <span style={{ marginLeft: 4, color: '#A3A3A3', fontWeight: 500 }}>({t.count})</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.map(f => (
            <button key={f.id} onClick={() => setSelected(f)}
              style={{
                width: '100%', display: 'flex', gap: 12, padding: '14px 16px',
                background: selected?.id === f.id ? '#FAFAFA' : 'transparent',
                borderLeft: `3px solid ${selected?.id === f.id ? '#0A0A0A' : 'transparent'}`,
                borderTop: 0, borderRight: 0,
                borderBottom: '1px solid #F5F5F5',
                cursor: 'pointer', textAlign: 'left', alignItems: 'flex-start',
                fontFamily: 'inherit',
              }}>
              <Avatar name={f.name} size={36} color={f.rating >= 4 ? '#0A0A0A' : f.rating === 3 ? '#737373' : '#DC2626'} fg={f.rating >= 4 ? '#C6F24E' : '#fff'}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{f.name}</span>
                  <span style={{ fontSize: 10.5, color: '#A3A3A3' }}>{T(f.time, f.timeEn)}</span>
                </div>
                <div style={{ display: 'flex', gap: 1, margin: '4px 0' }}>
                  {[1,2,3,4,5].map(s => <Icon.star key={s} size={10} color={s <= f.rating ? '#C6F24E' : '#E5E5E5'}/>)}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#525252', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{f.comment}</p>
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  {f.priority === 'critical' && <Badge kind="danger">{T('Kritik', 'Critical')}</Badge>}
                  {f.priority === 'high' && <Badge kind="warn">{T('Öncelikli', 'Priority')}</Badge>}
                  {f.redirected && <Badge kind="lime">{PLATFORMS[f.platform].label}</Badge>}
                  {f.internal && !f.priority && <Badge kind="ghost">{T('Dahili', 'Internal')}</Badge>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      {selected && <FeedbackDetail f={selected}/>}
    </div>
  );
}

function FeedbackDetail({ f }) {
  return (
    <div style={{ padding: 28, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <Avatar name={f.name} size={56} color={f.rating >= 4 ? '#0A0A0A' : '#DC2626'} fg={f.rating >= 4 ? '#C6F24E' : '#fff'}/>
        <div style={{ flex: 1 }}>
          <div className="bz-h-tight" style={{ fontSize: 22 }}>{f.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, color: '#525252', fontSize: 13 }}>
            {f.email && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon.mail size={12}/>{f.email}</span>}
            {f.phone && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon.phone size={12}/>{f.phone}</span>}
            {!f.email && !f.phone && <span style={{ color: '#A3A3A3' }}>{T('İletişim bilgisi paylaşılmamış', 'No contact info shared')}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bz-btn-ghost"><Icon.mail size={14}/>{T('Yanıtla', 'Reply')}</button>
          <button className="bz-btn-ghost"><Icon.more size={14}/></button>
        </div>
      </div>

      {/* Rating + meta strip */}
      <div style={{ marginTop: 22, display: 'flex', gap: 24, flexWrap: 'wrap', padding: '16px 20px', background: '#FAFAFA', borderRadius: 12, border: '1px solid #EDEDED' }}>
        <Meta label={T('Puan', 'Rating')} value={
          <span style={{ display: 'flex', gap: 2 }}>
            {[1,2,3,4,5].map(s => <Icon.star key={s} size={16} color={s <= f.rating ? '#C6F24E' : '#E5E5E5'}/>)}
          </span>
        }/>
        <Meta label={T('Şube', 'Branch')} value={f.branch}/>
        <Meta label={T('Masa', 'Table')} value={`#${f.table}`}/>
        <Meta label={T('Kaynak', 'Source')} value="QR"/>
        <Meta label={T('Yönlendirme', 'Redirect')} value={f.redirected ? <PlatformChip id={f.platform} withLabel size={18}/> : T('Yapılmadı', 'No redirect')}/>
        <Meta label={T('KVKK', 'KVKK')} value={f.kvkk ? <Badge kind="ok">{T('Onaylı', 'Accepted')}</Badge> : <Badge kind="off">{T('Yok', 'None')}</Badge>}/>
      </div>

      {/* Comment */}
      <div style={{ marginTop: 18 }}>
        <Eyebrow>{T('Müşteri yorumu', 'Customer comment')}</Eyebrow>
        <p style={{ marginTop: 8, fontSize: 16, lineHeight: 1.7, color: '#0A0A0A' }}>"{f.comment}"</p>
      </div>

      {/* Internal action timeline */}
      {f.internal && (
        <div style={{ marginTop: 24 }}>
          <Eyebrow>{T('Dahili işlem akışı', 'Internal action flow')}</Eyebrow>
          <div style={{ marginTop: 10, padding: 16, border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Icon.alert size={16} color="#DC2626"/>
              <strong style={{ fontSize: 13, color: '#991B1B' }}>{T('Düşük puan — dahili olarak kaydedildi', 'Low rating — captured internally')}</strong>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: '#7F1D1D', lineHeight: 1.55 }}>
              {T('Bu yorum müşterinin onayıyla yalnızca işletme yönetimine iletildi. Harici platforma yönlendirme yapılmadı.', 'This review was kept internal with customer consent — no external platform redirect was performed.')}
            </p>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button className="bz-btn-primary" style={{ background: '#0A0A0A' }}>{T('Müşteriye ulaş', 'Reach customer')}</button>
              <button className="bz-btn-ghost">{T('Çözüldü olarak işaretle', 'Mark resolved')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Meta({ label, value }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500 }}>{value}</div>
    </div>
  );
}

Object.assign(window, { OwnerDashboard, OwnerFeedback, OnboardingNudge });
