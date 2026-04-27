/* Owner pages part 3 — Menu, Settings; Admin pages; Public review page */

/* ───────── Owner: Menu */
function OwnerMenu() {
  const [activeCat, setActiveCat] = useState('c3');
  const [tab, setTab] = useState('items');
  const items = MENU_ITEMS.filter(m => m.cat === activeCat);

  return (
    <div style={{ padding: '24px 28px 60px' }}>
      <div className="bz-tabs" style={{ marginBottom: 20 }}>
        <button className="bz-tab" aria-selected={tab === 'items'} onClick={() => setTab('items')}>{T('Menü öğeleri', 'Menu items')}</button>
        <button className="bz-tab" aria-selected={tab === 'analytics'} onClick={() => setTab('analytics')}>{T('Menü analitiği', 'Menu analytics')}</button>
      </div>

      {tab === 'items' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18 }}>
          {/* Categories sidebar */}
          <div className="bz-card" style={{ padding: 12, alignSelf: 'flex-start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px 8px' }}>
              <Eyebrow>{T('Kategoriler', 'Categories')}</Eyebrow>
              <button className="bz-btn-icon"><Icon.plus size={14}/></button>
            </div>
            {MENU_CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setActiveCat(c.id)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                  background: activeCat === c.id ? '#FAFAFA' : 'transparent',
                  border: 0, cursor: 'pointer', textAlign: 'left',
                  fontFamily: 'inherit',
                  borderLeft: `3px solid ${activeCat === c.id ? '#0A0A0A' : 'transparent'}`,
                }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: activeCat === c.id ? 600 : 500 }}>{c.name}</div>
                  <div style={{ fontSize: 10.5, color: '#A3A3A3', marginTop: 2 }}>{c.items} {T('ürün', 'items')}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Items table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="bz-h-tight" style={{ fontSize: 18 }}>{MENU_CATEGORIES.find(c => c.id === activeCat).name}</div>
              <button className="bz-btn-primary"><Icon.plus size={14}/>{T('Ürün ekle', 'Add item')}</button>
            </div>
            <div className="bz-card" style={{ overflow: 'hidden' }}>
              <table className="bz-table">
                <thead>
                  <tr>
                    <th>{T('Ürün', 'Item')}</th>
                    <th>{T('Fiyat', 'Price')}</th>
                    <th>{T('Görüntülenme', 'Views')}</th>
                    <th>{T('Tıklanma', 'Clicks')}</th>
                    <th>{T('Trend', 'Trend')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(it => (
                    <tr key={it.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{it.name}</div>
                        <div style={{ fontSize: 11, color: '#737373', marginTop: 2 }}>{it.desc}</div>
                      </td>
                      <td className="bz-mono" style={{ fontWeight: 600 }}>₺{it.price}</td>
                      <td>{it.views}</td>
                      <td>{it.clicks}</td>
                      <td>
                        {it.trend === 'up' && <span style={{ color: '#16A34A', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}><Icon.trendUp size={12}/> {T('Yükseliyor', 'Rising')}</span>}
                        {it.trend === 'down' && <span style={{ color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}><Icon.trendDown size={12}/> {T('Düşüyor', 'Falling')}</span>}
                        {it.trend === 'flat' && <span style={{ color: '#737373', fontSize: 12 }}>—</span>}
                      </td>
                      <td><button className="bz-btn-icon"><Icon.more size={14}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <MenuAnalytics/>
      )}
    </div>
  );
}

function MenuAnalytics() {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label={T('Menü görüntülenme', 'Menu views')} value="7,124" delta="+22%"/>
        <StatCard label={T('Kategori tıklanması', 'Category clicks')} value="2,872" delta="+14%"/>
        <StatCard label={T('Ürün tıklanması', 'Item clicks')} value="1,840" delta="+9%"/>
        <StatCard label={T('Etkileşim oranı', 'Engagement rate')} value="40%" delta="+3pp"/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
        <div className="bz-card" style={{ padding: 22 }}>
          <Eyebrow>{T('En çok görüntülenen ürünler', 'Most viewed items')}</Eyebrow>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MENU_ITEMS.slice(0, 4).sort((a,b) => b.views - a.views).map((it, i) => (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: i === 0 ? '#C6F24E' : '#F5F5F5', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-heading)', flexShrink: 0 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{it.name}</div>
                  <div style={{ fontSize: 11, color: '#737373' }}>{it.views} {T('görüntülenme', 'views')} · {it.clicks} {T('tıklanma', 'clicks')}</div>
                </div>
                <div style={{ width: 100 }}>
                  <ProgressBar value={it.views} max={500}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bz-card" style={{ padding: 22 }}>
          <Eyebrow color="#DC2626">{T('Düşük etkileşimli ürünler', 'Low engagement items')}</Eyebrow>
          <div className="bz-h-tight" style={{ fontSize: 14, marginTop: 4, color: '#525252' }}>{T('Görüntüleniyor ama tıklanmıyor', 'Viewed but not clicked')}</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MENU_ITEMS.filter(it => it.trend === 'down').map(it => (
              <div key={it.id} style={{ padding: 12, border: '1px solid #FECACA', background: '#FEF2F2', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#991B1B' }}>{Math.round(it.clicks/it.views*100)}% CTR</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#7F1D1D' }}>
                  {T('Açıklamayı veya fotoğrafı güncellemeyi düşünebilirsin.', 'Consider updating the description or photo.')}
                </p>
              </div>
            ))}
            {MENU_ITEMS.filter(it => it.trend === 'down').length === 0 && (
              <p style={{ fontSize: 12, color: '#737373' }}>{T('Tüm ürünler iyi performans gösteriyor.', 'All items performing well.')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="bz-card" style={{ padding: 22, marginTop: 14 }}>
        <Eyebrow>{T('Kategori performansı', 'Category performance')}</Eyebrow>
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MENU_CATEGORIES.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{c.name}</div>
              <div style={{ flex: 2, height: 8, background: '#F5F5F5', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(c.views / 2480) * 100}%`, height: '100%', background: '#0A0A0A', borderRadius: 4 }}/>
              </div>
              <div style={{ width: 80, textAlign: 'right', fontSize: 12, color: '#525252', fontFamily: 'var(--font-mono)' }}>{c.views} / {c.clicks}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Owner: Settings */
function OwnerSettings({ persona }) {
  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 920 }}>
      <div className="bz-card" style={{ padding: 24, marginBottom: 14 }}>
        <Eyebrow>{T('İŞLETME PROFİLİ', 'BUSINESS PROFILE')}</Eyebrow>
        <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4, marginBottom: 18 }}>{T('Genel bilgiler', 'General info')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label={T('İşletme adı', 'Business name')}><input className="bz-input" defaultValue={persona.name}/></Field>
          <Field label={T('İşletme türü', 'Business type')}>
            <select className="bz-input" defaultValue={persona.type}>
              <option value="restaurant">{T('Restoran', 'Restaurant')}</option>
              <option value="clinic">{T('Klinik', 'Clinic')}</option>
              <option value="salon">{T('Güzellik salonu', 'Beauty salon')}</option>
            </select>
          </Field>
          <Field label={T('Adres', 'Address')}><input className="bz-input" defaultValue={persona.address}/></Field>
          <Field label={T('Telefon', 'Phone')}><input className="bz-input" defaultValue={persona.phone}/></Field>
        </div>
      </div>

      <div className="bz-card" style={{ padding: 24, marginBottom: 14 }}>
        <Eyebrow>{T('GÖRSEL KİMLİK', 'BRAND')}</Eyebrow>
        <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4, marginBottom: 18 }}>{T('Logo ve renk', 'Logo & color')}</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: 16, background: '#FAFAFA', border: '1px dashed #D4D4D4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <Icon.image size={20} color="#A3A3A3"/>
            <span style={{ fontSize: 10, color: '#A3A3A3' }} className="pulse-eyebrow">LOGO</span>
          </div>
          <div>
            <button className="bz-btn-ghost"><Icon.upload size={14}/>{T('Logo yükle', 'Upload logo')}</button>
            <p style={{ fontSize: 11, color: '#737373', marginTop: 8 }}>{T('PNG/SVG · min 256×256 · max 1 MB', 'PNG/SVG · min 256×256 · max 1 MB')}</p>
          </div>
        </div>
      </div>

      <div className="bz-card" style={{ padding: 24 }}>
        <Eyebrow>{T('KVKK & RIZA YÖNETİMİ', 'KVKK & CONSENT')}</Eyebrow>
        <div className="bz-h-tight" style={{ fontSize: 18, marginTop: 4, marginBottom: 18 }}>{T('Yasal metinler', 'Legal documents')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { k: T('Aydınlatma metni', 'KVKK disclosure'), s: T('v2.0 · 18 Nis 2026', 'v2.0 · Apr 18 2026'), ok: true },
            { k: T('Açık rıza metni', 'Explicit consent'), s: T('v2.0 · 18 Nis 2026', 'v2.0 · Apr 18 2026'), ok: true },
            { k: T('Ticari elektronik ileti izni', 'Commercial email consent'), s: T('İYS kayıtlı', 'IYS registered'), ok: true },
          ].map((d, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, border: '1px solid #EDEDED', borderRadius: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.k}</div>
                <div style={{ fontSize: 11, color: '#737373', marginTop: 2 }}>{d.s}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {d.ok && <Badge kind="ok">{T('Aktif', 'Active')}</Badge>}
                <button className="bz-btn-ghost"><Icon.edit size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OwnerMenu, OwnerSettings, MenuAnalytics });
