/* Owner pages part 2 — QR, Platforms, Analytics, Menu, Settings */

/* ───────── QR codes management */
function OwnerQR() {
  const [view, setView] = useState('grid');
  const [showCreate, setShowCreate] = useState(false);
  return (
    <div style={{ padding: '24px 28px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, marginBottom: 20 }}>
        <div>
          <Eyebrow>{T('QR YÖNETİMİ', 'QR MANAGEMENT')}</Eyebrow>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#525252', maxWidth: 580 }}>
            {T('Her QR kodu belirli bir platforma bağlanabilir. Müşteri 4–5 yıldız verdiğinde, QR\'ın bağlı olduğu platforma yönlendirilir; aksi halde varsayılan platforma gider.',
                'Each QR code can be linked to a specific platform. When a customer leaves 4–5 stars, they\'re redirected to that QR\'s linked platform; otherwise they go to your default.')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="bz-btn-ghost" onClick={() => setView(view === 'grid' ? 'list' : 'grid')}>
            {view === 'grid' ? <Icon.list size={14}/> : <Icon.grid size={14}/>}
            {view === 'grid' ? T('Liste', 'List') : T('Izgara', 'Grid')}
          </button>
          <button className="bz-btn-primary" onClick={() => setShowCreate(true)}>
            <Icon.plus size={14}/>{T('Yeni QR oluştur', 'Create QR')}
          </button>
        </div>
      </div>

      {/* Filter strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select className="bz-input" style={{ width: 'auto', paddingRight: 32 }}>
          <option>{T('Tüm şubeler', 'All branches')}</option>
          <option>Karaköy</option><option>Beşiktaş</option><option>Bostancı</option>
        </select>
        <select className="bz-input" style={{ width: 'auto', paddingRight: 32 }}>
          <option>{T('Tüm platformlar', 'All platforms')}</option>
          <option>Google Maps</option><option>Yemeksepeti</option>
        </select>
        <select className="bz-input" style={{ width: 'auto', paddingRight: 32 }}>
          <option>{T('Aktif', 'Active')}</option>
          <option>{T('Duraklatıldı', 'Paused')}</option>
        </select>
      </div>

      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {QR_CODES.map(q => <QRCard key={q.id} q={q}/>)}
        </div>
      ) : (
        <div className="bz-card" style={{ overflow: 'hidden' }}>
          <table className="bz-table">
            <thead>
              <tr>
                <th>{T('QR adı', 'Name')}</th>
                <th>{T('Şube', 'Branch')}</th>
                <th>{T('Platform', 'Platform')}</th>
                <th>{T('Taranma', 'Scans')}</th>
                <th>{T('Son taranma', 'Last scan')}</th>
                <th>{T('Durum', 'Status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {QR_CODES.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600 }}>{q.name}</td>
                  <td>{q.branch}</td>
                  <td>{q.platform ? <PlatformChip id={q.platform} withLabel/> : <span style={{ color: '#737373' }}>{T('Genel', 'General')}</span>}</td>
                  <td className="bz-mono" style={{ fontWeight: 600 }}>{q.scans.toLocaleString('tr-TR')}</td>
                  <td style={{ color: '#737373' }}>{q.lastScan ? T(q.lastScan, q.lastScanEn) : '—'}</td>
                  <td>{q.status === 'active' ? <Badge kind="ok">{T('Aktif', 'Active')}</Badge> : <Badge kind="warn">{T('Duraklatıldı', 'Paused')}</Badge>}</td>
                  <td><button className="bz-btn-icon"><Icon.more size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateQRModal onClose={() => setShowCreate(false)}/>}
    </div>
  );
}

function QRCard({ q }) {
  return (
    <div className="bz-card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bz-h-tight" style={{ fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.name}</div>
          <div style={{ marginTop: 4, fontSize: 11, color: '#737373' }}>{q.branch}</div>
        </div>
        {q.status === 'active' ? <Badge kind="ok" dot={false}>{T('Aktif', 'Active')}</Badge> : <Badge kind="warn" dot={false}>{T('Pasif', 'Paused')}</Badge>}
      </div>

      {/* QR preview */}
      <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'center' }}>
        <FakeQR/>
      </div>

      {/* Platform binding */}
      <div style={{ marginTop: 12, padding: '8px 10px', background: '#FAFAFA', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon.arrowUpRight size={12} color="#737373"/>
        {q.platform ? (
          <>
            <PlatformChip id={q.platform} size={16}/>
            <span style={{ fontSize: 12, color: '#525252', fontWeight: 500 }}>{PLATFORMS[q.platform].label}</span>
          </>
        ) : (
          <span style={{ fontSize: 12, color: '#737373' }}>{T('Varsayılan platform', 'Default platform')} · Google</span>
        )}
      </div>

      {/* Stats */}
      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
        <div>
          <Eyebrow>{T('Taranma', 'Scans')}</Eyebrow>
          <div className="bz-h-tight" style={{ fontSize: 17, marginTop: 2 }}>{q.scans.toLocaleString('tr-TR')}</div>
        </div>
        <div>
          <Eyebrow>{T('Son', 'Last')}</Eyebrow>
          <div style={{ fontSize: 12, color: '#525252', marginTop: 4 }}>{q.lastScan ? T(q.lastScan, q.lastScanEn) : '—'}</div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, paddingTop: 12, borderTop: '1px solid #EDEDED' }}>
        <button className="bz-btn-icon" style={{ width: '100%', height: 32 }}><Icon.download size={14}/></button>
        <button className="bz-btn-icon" style={{ width: '100%', height: 32 }}><Icon.copy size={14}/></button>
        <button className="bz-btn-icon" style={{ width: '100%', height: 32 }}><Icon.eye size={14}/></button>
        <button className="bz-btn-icon" style={{ width: '100%', height: 32 }}><Icon.more size={14}/></button>
      </div>
    </div>
  );
}

function FakeQR({ size = 128 }) {
  // Procedural QR-like grid: deterministic, looks like a real QR
  const cells = [];
  const n = 21;
  const seed = (i, j) => ((i * 7 + j * 13 + i*j*3) % 7) < 3;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Finder patterns
      const inFinder = (i < 7 && j < 7) || (i < 7 && j >= n - 7) || (i >= n - 7 && j < 7);
      let on = false;
      if (inFinder) {
        const ii = i < 7 ? i : i - (n - 7);
        const jj = j < 7 ? j : j - (n - 7);
        on = (ii === 0 || ii === 6 || jj === 0 || jj === 6) || (ii >= 2 && ii <= 4 && jj >= 2 && jj <= 4);
      } else {
        on = seed(i, j);
      }
      if (on) cells.push(<rect key={`${i},${j}`} x={j * (size/n)} y={i * (size/n)} width={size/n+0.3} height={size/n+0.3} fill="#0A0A0A"/>);
    }
  }
  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {cells}
    </svg>
  );
}

function CreateQRModal({ onClose }) {
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('Karaköy');
  const [linkType, setLinkType] = useState('default'); // default | platform
  const [platform, setPlatform] = useState('google');
  return (
    <Modal title={T('Yeni QR kodu oluştur', 'Create new QR code')} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label={T('QR adı', 'QR name')} hint={T('Sadece sen göreceksin', 'Internal label only')}>
          <input className="bz-input" value={name} onChange={e => setName(e.target.value)} placeholder={T('Örn. Karaköy — Vitrin', 'e.g. Karaköy — Window')}/>
        </Field>
        <Field label={T('Şube', 'Branch')}>
          <select className="bz-input" value={branch} onChange={e => setBranch(e.target.value)}>
            <option>Karaköy</option><option>Beşiktaş</option><option>Bostancı</option>
          </select>
        </Field>

        <Field label={T('Yüksek puan yönlendirmesi', 'High-rating redirect')}
               hint={T('1–3 yıldız her zaman dahili olarak kaydedilir.', '1–3 stars are always captured internally.')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <RadioCard active={linkType === 'default'} onClick={() => setLinkType('default')}
              title={T('Varsayılan platforma gönder', 'Use default platform')}
              body={T('İşletme ayarlarındaki varsayılan platform: Google Maps', 'Default from business settings: Google Maps')}/>
            <RadioCard active={linkType === 'platform'} onClick={() => setLinkType('platform')}
              title={T('Belirli bir platforma sabitle', 'Pin to specific platform')}
              body={T('Bu QR\'ı taradığında müşteri yalnızca bu platforma yönlendirilir', 'Customer who scans this QR is sent only to this platform')}/>
            {linkType === 'platform' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 4 }}>
                {Object.keys(PLATFORMS).filter(k => k !== 'custom').map(k => (
                  <button key={k} type="button" onClick={() => setPlatform(k)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      border: `1px solid ${platform === k ? '#0A0A0A' : '#EDEDED'}`,
                      background: platform === k ? '#FAFAFA' : '#fff',
                      cursor: 'pointer', fontSize: 12, fontWeight: 500,
                      fontFamily: 'inherit',
                    }}>
                    <PlatformChip id={k} size={18}/>{PLATFORMS[k].label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Field>

        <Field label={T('Masa numarası (opsiyonel)', 'Table number (optional)')}>
          <input className="bz-input" placeholder={T('Boş bırakılabilir', 'Optional')}/>
        </Field>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button className="bz-btn-ghost" onClick={onClose}>{T('İptal', 'Cancel')}</button>
          <button className="bz-btn-primary"><Icon.qr size={14}/>{T('QR oluştur', 'Generate QR')}</button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#0A0A0A', display: 'block', marginBottom: 6 }}>{label}</span>
      {hint && <span style={{ fontSize: 11.5, color: '#737373', display: 'block', marginBottom: 8, lineHeight: 1.45 }}>{hint}</span>}
      {children}
    </label>
  );
}

function RadioCard({ active, onClick, title, body }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        textAlign: 'left', padding: 14, borderRadius: 10,
        border: `1px solid ${active ? '#0A0A0A' : '#EDEDED'}`,
        background: active ? '#FAFAFA' : '#fff',
        cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
        fontFamily: 'inherit',
      }}>
      <span style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${active ? '#0A0A0A' : '#D4D4D4'}`,
        background: '#fff', position: 'relative', marginTop: 2,
      }}>
        {active && <span style={{ position: 'absolute', inset: 2, borderRadius: '50%', background: '#0A0A0A' }}/>}
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: '#737373', marginTop: 4, lineHeight: 1.5 }}>{body}</div>
      </div>
    </button>
  );
}

function Modal({ title, onClose, children, size = 480 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(10,10,10,0.4)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bz-fade-in" style={{
        background: '#fff', borderRadius: 20, width: size, maxWidth: '92vw', maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 80px -20px rgba(0,0,0,0.4)',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #EDEDED', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="bz-h-tight" style={{ fontSize: 17 }}>{title}</div>
          <button className="bz-btn-icon" onClick={onClose}><Icon.x size={16}/></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

/* ───────── Owner: Review platforms */
function OwnerPlatforms() {
  const [platforms, setPlatforms] = useState(REVIEW_PLATFORMS);
  const setDefault = (id) => setPlatforms(ps => ps.map(p => ({ ...p, isDefault: p.id === id })));
  const toggleEnabled = (id) => setPlatforms(ps => ps.map(p => p.id === id ? { ...p, enabled: !p.enabled, isDefault: !p.enabled ? p.isDefault : false } : p));

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 20 }}>
        <Eyebrow>{T('PLATFORM BAĞLANTILARI', 'REVIEW PLATFORMS')}</Eyebrow>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#525252', maxWidth: 620, lineHeight: 1.55 }}>
          {T('4–5 yıldızlı yorumlarda müşteriler aşağıdaki platformlardan birine yönlendirilir. QR\'ınız bir platforma sabitlenmediyse, varsayılan platform kullanılır.',
              '4–5 star ratings redirect customers to one of the platforms below. If a QR isn\'t pinned, the default platform is used.')}
        </p>
      </div>

      {/* Default redirect picker */}
      <div className="bz-card" style={{ padding: 22, marginBottom: 18, background: '#FAFAFA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.arrowUpRight size={16} color="#C6F24E"/>
          </div>
          <div>
            <div className="bz-h-tight" style={{ fontSize: 15 }}>{T('Varsayılan yönlendirme', 'Default redirect')}</div>
            <div style={{ fontSize: 12, color: '#737373' }}>{T('Belirli bir platforma sabitlenmemiş QR kodları buraya gönderir', 'QR codes without a pinned platform send here')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {platforms.filter(p => p.enabled && p.verified).map(p => (
            <button key={p.id} onClick={() => setDefault(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 999,
                border: `1px solid ${p.isDefault ? '#0A0A0A' : '#EDEDED'}`,
                background: p.isDefault ? '#0A0A0A' : '#fff',
                color: p.isDefault ? '#fff' : '#0A0A0A',
                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                fontFamily: 'inherit',
              }}>
              <PlatformChip id={p.id} size={18}/>{PLATFORMS[p.id].label}
              {p.isDefault && <Icon.check size={12} strokeWidth={2.5} color="#C6F24E"/>}
            </button>
          ))}
        </div>
      </div>

      {/* Platform cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {platforms.map(p => (
          <div key={p.id} className="bz-card" style={{ padding: 18, display: 'flex', alignItems: 'center', gap: 16, opacity: p.enabled ? 1 : 0.65 }}>
            <PlatformChip id={p.id} size={40}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="bz-h-tight" style={{ fontSize: 15 }}>{PLATFORMS[p.id].label}</div>
                {p.isDefault && <Badge kind="lime">{T('Varsayılan', 'Default')}</Badge>}
                {p.enabled && p.verified && <Badge kind="ok">{T('Doğrulandı', 'Verified')}</Badge>}
                {p.enabled && !p.verified && p.url && <Badge kind="warn">{T('Doğrulanmadı', 'Unverified')}</Badge>}
              </div>
              {p.url ? (
                <div className="bz-mono" style={{ marginTop: 4, fontSize: 11.5, color: '#737373', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.url}</div>
              ) : (
                <div style={{ marginTop: 4, fontSize: 12, color: '#A3A3A3' }}>{T('Henüz bağlanmadı', 'Not connected yet')}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', minWidth: 90 }}>
              <Eyebrow>{T('Bu ay tıklanma', 'This month')}</Eyebrow>
              <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4 }}>{p.monthlyClicks}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Toggle checked={p.enabled} onChange={() => toggleEnabled(p.id)}/>
              <button className="bz-btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}><Icon.edit size={12}/>{T('Düzenle', 'Edit')}</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 16, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', gap: 12 }}>
        <Icon.shield size={18} color="#92400E" style={{ flexShrink: 0, marginTop: 2 }}/>
        <div style={{ fontSize: 12.5, color: '#92400E', lineHeight: 1.55 }}>
          <strong>{T('Uyumluluk notu', 'Compliance note')}:</strong>{' '}
          {T('Buaze hiçbir zaman müşterileri yıldız sayısına göre filtrelemek için pazarlama yapmaz. 1–3 yıldız her zaman dahili olarak işletmeye iletilir; harici platforma yönlendirilmez. Bu yapı Google\'ın yorum politikasıyla uyumludur.',
              'Buaze never markets star-based filtering. 1–3 star ratings are always captured internally — never redirected externally. This is compliant with Google\'s review policies.')}
        </div>
      </div>
    </div>
  );
}

/* ───────── Owner: Analytics */
function OwnerAnalytics() {
  return (
    <div style={{ padding: '24px 28px 60px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label={T('30 gün taranma', '30d scans')} value="9,420" delta="+18%"/>
        <StatCard label={T('30 gün yorum', '30d reviews')} value="312" delta="+8%"/>
        <StatCard label={T('Yönlendirme oranı', 'Redirect rate')} value="73%" delta="+4pp"/>
        <StatCard label={T('Düşük puan oranı', 'Low rating rate')} value="6%" delta="-1.4pp" deltaKind="up"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="bz-card" style={{ padding: 22 }}>
          <Eyebrow>{T('30 günlük etkileşim', '30-day interaction')}</Eyebrow>
          <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4, marginBottom: 18 }}>{T('Taranma · Yorum · Yönlendirme', 'Scans · Reviews · Redirects')}</div>
          <BarChart
            data={Array.from({length: 30}, (_, i) => ({ label: '', value: 200 + Math.sin(i/3) * 80 + Math.random() * 60 }))}
            height={180}/>
        </div>
        <div className="bz-card" style={{ padding: 22 }}>
          <Eyebrow>{T('Platform paylaşımı', 'Platform share')}</Eyebrow>
          <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4 }}>522 {T('yönlendirme', 'redirects')}</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { id: 'google', val: 412, pct: 79 },
              { id: 'yemeksepeti', val: 87, pct: 17 },
              { id: 'tripadvisor', val: 23, pct: 4 },
            ].map(r => (
              <div key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PlatformChip id={r.id} size={16}/>{PLATFORMS[r.id].label}</span>
                  <span className="bz-mono" style={{ fontWeight: 600 }}>{r.val}</span>
                </div>
                <div style={{ height: 6, background: '#F5F5F5', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${r.pct}%`, height: '100%', background: PLATFORMS[r.id].color }}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day distribution + sentiment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="bz-card" style={{ padding: 22 }}>
          <Eyebrow>{T('Günlük dağılım', 'Day distribution')}</Eyebrow>
          <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4, marginBottom: 12 }}>{T('Hangi günler en çok yorum geliyor?', 'When are reviews coming in?')}</div>
          <BarChart data={TREND_7D.map(d => ({ label: d.d, value: d.scans }))} height={140}/>
        </div>
        <div className="bz-card" style={{ padding: 22 }}>
          <Eyebrow>{T('Duygu analizi', 'Sentiment analysis')}</Eyebrow>
          <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4, marginBottom: 14 }}>{T('Yorumlardan çıkan kelimeler', 'Words from reviews')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { w: 'lezzetli', n: 48, p: 'pos' }, { w: 'servis', n: 36, p: 'pos' }, { w: 'temiz', n: 32, p: 'pos' },
              { w: 'şef', n: 24, p: 'pos' }, { w: 'mekan', n: 22, p: 'pos' }, { w: 'soğuk', n: 12, p: 'neg' },
              { w: 'pahalı', n: 10, p: 'neg' }, { w: 'kibar', n: 18, p: 'pos' }, { w: 'köfte', n: 16, p: 'pos' },
              { w: 'yavaş', n: 8, p: 'neg' }, { w: 'manzara', n: 14, p: 'pos' }, { w: 'tatlı', n: 12, p: 'pos' },
              { w: 'hijyen', n: 6, p: 'neg' }, { w: 'önerilir', n: 22, p: 'pos' },
            ].map((t, i) => (
              <span key={i} style={{
                fontSize: 12 + Math.min(t.n / 4, 8),
                padding: '5px 12px', borderRadius: 999,
                background: t.p === 'pos' ? '#EAF9B8' : '#FEF2F2',
                color: t.p === 'pos' ? '#3D4D00' : '#991B1B',
                fontWeight: 500,
              }}>{t.w} <span style={{ opacity: 0.6, fontSize: 10 }}>{t.n}</span></span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OwnerQR, OwnerPlatforms, OwnerAnalytics, Modal, FakeQR, Field });
