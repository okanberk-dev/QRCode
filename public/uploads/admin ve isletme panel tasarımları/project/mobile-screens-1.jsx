/* Buaze Mobile App — single-file mobile screens
   All key flows redesigned for mobile (393×852 viewport).
   Reuses tokens.css, primitives.jsx, data.jsx from the desktop project. */

const { useState: useS, useMemo: useM } = React;

/* ───────── Mobile chrome */
function MTopBar({ title, subtitle, onMenu, onBack, right, dark }) {
  const fg = dark ? '#fff' : '#0A0A0A';
  const sub = dark ? 'rgba(255,255,255,0.55)' : '#737373';
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: dark ? 'rgba(10,10,10,0.92)' : 'rgba(255,255,255,0.92)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#EDEDED'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', minHeight: 50 }}>
        {onBack ? (
          <button className="bz-btn-icon" onClick={onBack} style={{ width: 34, height: 34, marginLeft: -4, color: fg }}>
            <Icon.chevronLeft size={20} color={fg}/>
          </button>
        ) : onMenu ? (
          <button className="bz-btn-icon" onClick={onMenu} style={{ width: 34, height: 34, marginLeft: -4 }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ width: 16, height: 1.6, background: fg, borderRadius: 1 }}/>
              <span style={{ width: 12, height: 1.6, background: fg, borderRadius: 1 }}/>
            </span>
          </button>
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bz-h-tight" style={{ fontSize: 15, lineHeight: 1.2, color: fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
          {subtitle && <div className="pulse-eyebrow" style={{ fontSize: 9, color: sub, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}

function MBottomNav({ items, page, onNavigate }) {
  return (
    <div style={{
      position: 'sticky', bottom: 0, zIndex: 30,
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      borderTop: '1px solid #EDEDED',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, paddingTop: 6, paddingBottom: 10 }}>
        {items.map(it => {
          const active = it.id === page;
          return (
            <button key={it.id} onClick={() => onNavigate(it.id)}
              style={{
                background: 'transparent', border: 0, padding: '4px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                cursor: 'pointer', fontFamily: 'inherit',
                color: active ? '#0A0A0A' : '#737373',
              }}>
              <div style={{
                width: 38, height: 28, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? '#0A0A0A' : 'transparent',
                color: active ? '#C6F24E' : 'currentColor',
                transition: 'background 0.18s',
              }}>
                {React.cloneElement(it.icon, { size: 16, color: 'currentColor' })}
              </div>
              <span style={{ fontSize: 9.5, fontWeight: active ? 600 : 500 }}>
                {T(it.label.tr, it.label.en)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* FAB */
function MFab({ icon, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      position: 'absolute', bottom: 88, right: 16, zIndex: 25,
      width: 52, height: 52, borderRadius: 16,
      background: '#0A0A0A', color: '#C6F24E',
      border: 0, cursor: 'pointer',
      boxShadow: '0 12px 32px -8px rgba(10,10,10,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} aria-label={label}>
      {icon}
    </button>
  );
}

/* ───────── Owner — Mobile Dashboard */
function MOwnerHome({ persona, plan, onNavigate, onMenu }) {
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%' }}>
      <MTopBar title={persona.name} subtitle={T(persona.typeLabel.tr.toUpperCase(), persona.typeLabel.en.toUpperCase())} onMenu={onMenu}
        right={
          <button className="bz-btn-icon" style={{ width: 34, height: 34, position: 'relative' }}>
            <Icon.bell size={18}/>
            <span style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#C6F24E', border: '1.5px solid #fff' }}/>
          </button>
        }/>

      <div style={{ padding: '14px 16px 96px' }}>
        {/* Hero card — today */}
        <div style={{ background: '#0A0A0A', borderRadius: 20, padding: 18, color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(198,242,78,0.08)', filter: 'blur(20px)' }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <div className="pulse-eyebrow" style={{ fontSize: 9, color: '#C6F24E' }}>{T('BUGÜN', 'TODAY')}</div>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>26 {T('Nis', 'Apr')}</span>
          </div>
          <div className="bz-h-tight-2" style={{ fontSize: 38, marginTop: 10, fontFamily: 'var(--font-heading)' }}>
            {STATS_OWNER.scansToday}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{T('QR taraması', 'QR scans')} · {STATS_OWNER.reviewsToday} {T('yorum', 'reviews')}</div>

          <div style={{ marginTop: 14, height: 1, background: 'rgba(255,255,255,0.08)' }}/>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, marginTop: 14 }}>
            {[
              { l: T('30g taranma', '30d scans'), v: '9.4k', d: '+18%' },
              { l: T('Ort. puan', 'Avg rating'), v: STATS_OWNER.avgRating, d: '+0.2' },
              { l: T('Yönlend.', 'Redirect'), v: '73%', d: '+4pp' },
            ].map((s, i) => (
              <div key={i} style={{ borderLeft: i ? '1px solid rgba(255,255,255,0.08)' : 'none', paddingLeft: i ? 10 : 0, paddingRight: 10 }}>
                <div className="pulse-eyebrow" style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>{s.l}</div>
                <div className="bz-h-tight" style={{ fontSize: 16, marginTop: 4 }}>{s.v}</div>
                <div style={{ fontSize: 10, color: '#C6F24E', marginTop: 2, fontWeight: 600 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
          {[
            { id: 'qr', icon: <Icon.qr size={18}/>, l: T('QR', 'QR') },
            { id: 'feedback', icon: <Icon.message size={18}/>, l: T('Yorum', 'Reviews') },
            { id: 'menu', icon: <Icon.menu size={18}/>, l: T('Menü', 'Menu') },
            { id: 'platforms', icon: <Icon.link size={18}/>, l: T('Platform', 'Links') },
          ].map(a => (
            <button key={a.id} onClick={() => onNavigate(a.id)} style={{
              background: '#fff', border: '1px solid #EDEDED', borderRadius: 14,
              padding: '14px 4px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {a.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{a.l}</span>
            </button>
          ))}
        </div>

        {/* Trend chart */}
        <div className="bz-card" style={{ padding: 16, marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Eyebrow>{T('SON 7 GÜN', 'LAST 7 DAYS')}</Eyebrow>
            <span style={{ fontSize: 10, color: '#737373' }}>{T('Taranma', 'Scans')}</span>
          </div>
          <div className="bz-h-tight" style={{ fontSize: 20, marginTop: 4 }}>1,847</div>
          <div style={{ marginTop: 12 }}>
            <BarChart data={TREND_7D.map(d => ({ label: d.d, value: d.scans }))} height={100}/>
          </div>
        </div>

        {/* Recent feedback */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Eyebrow>{T('SON YORUMLAR', 'RECENT FEEDBACK')}</Eyebrow>
            <button onClick={() => onNavigate('feedback')} style={{ fontSize: 11, fontWeight: 500, color: '#525252', background: 'transparent', border: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              {T('Tümü', 'All')}<Icon.arrowRight size={11}/>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FEEDBACKS.slice(0, 3).map(f => <MFeedbackRow key={f.id} f={f}/>)}
          </div>
        </div>

        {/* Plan / quota */}
        {plan && (
          <div style={{ marginTop: 18, padding: 16, borderRadius: 16, background: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="pulse-eyebrow" style={{ fontSize: 9, color: '#C6F24E' }}>{plan.label}</div>
              <Icon.crown size={14} color="#C6F24E"/>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{T(plan.quotaLabel.tr, plan.quotaLabel.en)}</div>
            <div style={{ marginTop: 4, fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{plan.quotaValue}</div>
            <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${plan.progress}%`, height: '100%', background: '#C6F24E' }}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MFeedbackRow({ f, onClick }) {
  return (
    <button onClick={onClick} className="bz-card" style={{
      padding: 14, display: 'block', width: '100%', textAlign: 'left',
      background: '#fff', border: '1px solid #EDEDED', cursor: onClick ? 'pointer' : 'default',
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ display: 'flex', gap: 1 }}>
              {[1,2,3,4,5].map(s => (
                <Icon.star key={s} size={11} color={s <= f.rating ? '#C6F24E' : '#E5E5E5'}/>
              ))}
            </div>
            {f.replied ? <Badge kind="ok" dot={false}>{T('Yanıtlandı', 'Replied')}</Badge> : f.rating <= 3 ? <Badge kind="danger" dot={false}>{T('Bekliyor', 'Pending')}</Badge> : null}
          </div>
          <div style={{ fontSize: 12.5, color: '#0A0A0A', lineHeight: 1.45, fontWeight: 500, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
            {f.comment}
          </div>
          <div style={{ marginTop: 8, fontSize: 10.5, color: '#737373', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{f.author}</span><span>·</span><span>{f.branch}</span><span>·</span><span>{f.timeAgo}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ───────── Owner — Feedback Inbox */
function MOwnerFeedback({ onMenu, onOpen }) {
  const [filter, setFilter] = useS('all');
  const filtered = filter === 'all' ? FEEDBACKS :
                   filter === 'low' ? FEEDBACKS.filter(f => f.rating <= 3) :
                   filter === 'high' ? FEEDBACKS.filter(f => f.rating >= 4) :
                   FEEDBACKS.filter(f => !f.replied);
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%' }}>
      <MTopBar title={T('Yorumlar', 'Feedback')} onMenu={onMenu}
        right={<button className="bz-btn-icon" style={{ width: 34, height: 34 }}><Icon.search size={18}/></button>}/>

      {/* Filter chips */}
      <div style={{ padding: '10px 14px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { id: 'all', l: T('Tümü', 'All'), n: FEEDBACKS.length },
          { id: 'pending', l: T('Bekleyen', 'Pending'), n: FEEDBACKS.filter(f => !f.replied).length },
          { id: 'low', l: T('Düşük puan', 'Low rating'), n: FEEDBACKS.filter(f => f.rating <= 3).length },
          { id: 'high', l: T('Yüksek puan', 'High rating'), n: FEEDBACKS.filter(f => f.rating >= 4).length },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '7px 13px', borderRadius: 999,
            background: filter === f.id ? '#0A0A0A' : '#fff',
            color: filter === f.id ? '#fff' : '#0A0A0A',
            border: filter === f.id ? '1px solid #0A0A0A' : '1px solid #EDEDED',
            fontSize: 12, fontWeight: 500, cursor: 'pointer', flexShrink: 0,
            fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {f.l}
            <span style={{ fontSize: 10, color: filter === f.id ? '#C6F24E' : '#A3A3A3', fontFamily: 'var(--font-mono)' }}>{f.n}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding: '0 14px 96px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(f => <MFeedbackRow key={f.id} f={f} onClick={() => onOpen(f)}/>)}
      </div>
    </div>
  );
}

/* Feedback detail */
function MFeedbackDetail({ f, onBack }) {
  const [reply, setReply] = useS('');
  return (
    <div style={{ background: '#FAFAFA', minHeight: '100%' }}>
      <MTopBar title={T('Yorum', 'Feedback')} onBack={onBack}
        right={<button className="bz-btn-icon" style={{ width: 34, height: 34 }}><Icon.more size={18}/></button>}/>

      <div style={{ padding: '14px 16px 120px' }}>
        <div className="bz-card" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3,4,5].map(s => (
                <Icon.star key={s} size={20} color={s <= f.rating ? '#C6F24E' : '#E5E5E5'}/>
              ))}
            </div>
            {f.replied ? <Badge kind="ok">{T('Yanıtlandı', 'Replied')}</Badge> : <Badge kind="warn">{T('Yanıt bekliyor', 'Awaiting reply')}</Badge>}
          </div>
          <div style={{ fontSize: 15, color: '#0A0A0A', lineHeight: 1.6, fontWeight: 500 }}>
            "{f.comment}"
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #EDEDED', display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#525252' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#737373' }}>{T('Müşteri', 'Customer')}</span><span style={{ fontWeight: 500 }}>{f.author}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#737373' }}>{T('Şube', 'Branch')}</span><span style={{ fontWeight: 500 }}>{f.branch}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#737373' }}>{T('Zaman', 'Time')}</span><span style={{ fontWeight: 500 }}>{f.timeAgo}</span></div>
            {f.email && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#737373' }}>{T('E-posta', 'Email')}</span><span className="bz-mono" style={{ fontSize: 11 }}>{f.email}</span></div>}
          </div>
        </div>

        {/* Reply box */}
        {!f.replied && (
          <div className="bz-card" style={{ padding: 18, marginTop: 14 }}>
            <Eyebrow>{T('YANIT GÖNDER', 'SEND REPLY')}</Eyebrow>
            <div className="bz-h-tight" style={{ fontSize: 15, marginTop: 4, marginBottom: 12 }}>{T('Müşteriye özel yanıt', 'Direct reply to customer')}</div>
            <textarea className="bz-input" rows={5} placeholder={T('Geri bildiriminiz için teşekkürler…', 'Thank you for your feedback…')}
              value={reply} onChange={e => setReply(e.target.value)}
              style={{ resize: 'none', fontFamily: 'inherit' }}/>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[T('Teşekkür', 'Thanks'), T('Özür', 'Apology'), T('Açıklama', 'Explanation')].map(t => (
                <button key={t} className="bz-btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }}>
                  <Icon.sparkle size={11}/>{T('AI:', 'AI:')} {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!f.replied && (
        <div style={{ position: 'sticky', bottom: 0, padding: 14, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)', borderTop: '1px solid #EDEDED' }}>
          <button className="bz-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 14 }}>
            <Icon.send size={14}/>{T('Yanıtı gönder', 'Send reply')}
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MTopBar, MBottomNav, MFab, MOwnerHome, MFeedbackRow, MOwnerFeedback, MFeedbackDetail });
