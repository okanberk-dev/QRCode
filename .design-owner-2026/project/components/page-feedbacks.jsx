// Page 1: Yorumlar (Feedbacks inbox)
function PageFeedbacks({ lang = 'tr' }) {
  const t = (tr, en) => lang === 'tr' ? tr : en;

  const filters = [
    { id: 'all', label: t('Tümü', 'All'), count: 247, active: true },
    { id: 'unread', label: t('Yanıtlanmamış', 'Unanswered'), count: 24 },
    { id: 'positive', label: t('Pozitif', 'Positive'), count: 198 },
    { id: 'negative', label: t('Negatif', 'Negative'), count: 12 },
    { id: 'flagged', label: t('İşaretli', 'Flagged'), count: 5 },
  ];

  const items = [
    { name: 'Selin Aydın', initials: 'SA', table: 'M.04', stars: 5, time: '2dk', source: 'QR', topic: t('Servis', 'Service'),
      msg: t('Garson çok ilgiliydi, makarna mükemmeldi. Tatlı menüsü biraz daha çeşitli olabilir.', 'Server was attentive, pasta was perfect. Dessert menu could use more variety.'),
      tags: ['servis','yemek'], replied: false, sentiment: 'pos', selected: true },
    { name: 'Murat Çelik', initials: 'MÇ', table: 'B.12', stars: 2, time: '14dk', source: 'NFC', topic: t('Bekleme', 'Wait time'),
      msg: t('Yemek lezzetliydi ama 35 dakika beklemek zorunda kaldık. Cumartesi akşamı bunu öngörmek lazım.', 'Food was tasty but waited 35 mins. Should be expected on Saturday.'),
      tags: ['hız'], replied: false, sentiment: 'neg' },
    { name: 'Ayşe Kara', initials: 'AK', table: 'T.02', stars: 5, time: '1sa', source: 'Google', topic: t('Atmosfer', 'Atmosphere'),
      msg: t('Teras manzarası harika. Müzik ses seviyesi tam kararında. Kesinlikle döneceğim.', 'Terrace view is amazing. Music volume is perfect. Will definitely return.'),
      tags: ['atmosfer'], replied: true, sentiment: 'pos' },
    { name: 'Erkan Yıldız', initials: 'EY', table: '—', stars: 4, time: '3sa', source: 'WhatsApp', topic: t('Menü', 'Menu'),
      msg: t('Vegan seçenekler arttırılırsa tam puan veririm. Quinoa salatası harikaydı.', 'If vegan options increase, I would give full marks. Quinoa salad was great.'),
      tags: ['menü','özel diyet'], replied: false, sentiment: 'pos' },
    { name: 'Ceren Demir', initials: 'CD', table: 'M.07', stars: 5, time: '6sa', source: 'QR', topic: t('Genel', 'Overall'),
      msg: t('Doğum günümü kutladık, ekstra ilgi gösterdiniz. Teşekkürler!', 'Celebrated my birthday, extra attention. Thank you!'),
      tags: ['özel gün'], replied: true, sentiment: 'pos' },
  ];

  return (
    <PageShell
      active="feedbacks"
      eyebrow={t('İŞLETME / KADIKÖY ŞUBE', 'BUSINESS / KADIKOY')}
      title={t('Yorumlar', 'Feedbacks')}
      sub={t('Tüm kanallardan gelen müşteri geri bildirimleri. Yanıt sürelerinin altında kalmaya çalışın.', 'Customer feedback from all channels. Try to stay under reply targets.')}
      actions={<>
        <button className="bz-btn"><window.IDownload size={14} /> {t('Dışa aktar', 'Export')}</button>
        <button className="bz-btn"><window.IFilter size={14} /> {t('Filtre', 'Filter')}</button>
        <button className="bz-btn bz-btn-primary"><window.IPlus size={14} /> {t('Manuel ekle', 'Add manual')}</button>
      </>}
    >
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { k: t('Bu hafta', 'This week'), v: '47', d: '+12', tone: 'pos' },
          { k: t('Ortalama puan', 'Avg rating'), v: '4.6', d: '+0.2', tone: 'pos', stars: true },
          { k: t('Yanıt süresi', 'Reply time'), v: '2.4sa', d: '-18m', tone: 'pos' },
          { k: t('Yanıt oranı', 'Reply rate'), v: '%92', d: '+4%', tone: 'pos' },
        ].map((kpi, i) => (
          <div key={i} className="bz-card" style={{ padding: 16 }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{kpi.k}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
              <span className="bz-h-tight-2 bz-num" style={{ fontSize: 28 }}>{kpi.v}</span>
              {kpi.stars && <window.Stars value={5} color="var(--lime-400)" size={11} />}
              <span className="bz-num" style={{ fontSize: 11, color: 'var(--green)', marginLeft: 'auto' }}>
                <window.ITrendUp size={11} /> {kpi.d}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Inbox layout */}
      <div className="bz-card" style={{ display: 'grid', gridTemplateColumns: '320px 1fr 360px', height: 620, overflow: 'hidden' }}>
        {/* Filter / list */}
        <div style={{ borderRight: '1px solid var(--n-150)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--n-150)' }}>
            <div style={{ position: 'relative' }}>
              <window.ISearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)' }} />
              <input placeholder={t('Yorumlarda ara…', 'Search feedbacks…')}
                style={{ width: '100%', height: 32, paddingLeft: 32, paddingRight: 10, border: '1px solid var(--n-200)',
                  borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', background: 'var(--n-50)' }} />
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 10 }}>
              {filters.map(f => (
                <button key={f.id} className={`bz-tab ${f.active ? 'bz-tab-active' : ''}`} style={{ height: 26, padding: '0 8px', fontSize: 11.5 }}>
                  {f.label} <span className="bz-num" style={{ color: 'var(--n-400)', fontSize: 10 }}>{f.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="bz-scroll" style={{ flex: 1 }}>
            {items.map((it, i) => (
              <div key={i} style={{
                padding: '14px 14px', borderBottom: '1px solid var(--n-100)',
                background: it.selected ? 'var(--lime-50)' : 'transparent',
                borderLeft: it.selected ? '2px solid var(--lime-300)' : '2px solid transparent',
                cursor: 'pointer'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <window.Avatar initials={it.initials} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{it.name}</span>
                      <span className="bz-num" style={{ fontSize: 10, color: 'var(--n-400)' }}>{it.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <window.Stars value={it.stars} size={10} color={it.stars >= 4 ? 'var(--lime-400)' : 'var(--amber)'} />
                      <span className="bz-num" style={{ fontSize: 10, color: 'var(--n-500)' }}>{it.source} · {it.table}</span>
                      {!it.replied && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime-300)', marginLeft: 'auto' }} />}
                    </div>
                  </div>
                </div>
                <p style={{
                  margin: '8px 0 0', fontSize: 12.5, color: 'var(--n-600)', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>{it.msg}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <window.Avatar initials="SA" size={40} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>Selin Aydın</span>
                  <window.Pill tone="ghost" dot>QR · Masa M.04</window.Pill>
                  <window.Pill tone="lime">{t('VIP misafir', 'VIP guest')}</window.Pill>
                </div>
                <div className="bz-num" style={{ fontSize: 11, color: 'var(--n-500)', marginTop: 4 }}>
                  04 MAY 2026 · 21:42 · selin.aydin@mail.com
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="bz-btn"><window.IBell size={13} /></button>
              <button className="bz-btn"><window.IMoreH size={13} /></button>
            </div>
          </div>

          <div className="bz-scroll" style={{ padding: '20px 22px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <window.Stars value={5} size={20} color="var(--lime-400)" />
              <span className="bz-num bz-h-tight-2" style={{ fontSize: 22 }}>5.0</span>
              <window.Pill tone="ok" dot>{t('Pozitif', 'Positive')}</window.Pill>
              <window.Pill tone="info">{t('Servis · Yemek', 'Service · Food')}</window.Pill>
            </div>

            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--n-900)', margin: 0 }}>
              "{t('Garson çok ilgiliydi, akşamımızı çok keyifli hale getirdi. Makarna gerçekten mükemmeldi — domates sosu klasik İtalyan tadında. Tatlı menüsü biraz daha çeşitli olabilir, sadece 2 seçenek vardı. Yine de tekrar geleceğim, kesinlikle tavsiye ederim.', 'Server was very attentive, made our evening very pleasant. The pasta was truly perfect — tomato sauce had classic Italian flavor. Dessert menu could be more varied, only 2 options. Will return for sure.')}"
            </p>

            <div style={{ marginTop: 24 }} className="bz-rule" />

            <div className="pulse-eyebrow" style={{ marginTop: 20, marginBottom: 10, color: 'var(--n-500)' }}>
              {t('AI ÖZET', 'AI SUMMARY')}
            </div>
            <div style={{ background: 'var(--n-50)', border: '1px solid var(--n-150)', borderRadius: 10, padding: 14, fontSize: 13, lineHeight: 1.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <window.IZap size={12} stroke="var(--lime-500)" /> <span style={{ fontWeight: 600 }}>{t('3 sinyal tespit edildi', '3 signals detected')}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--n-700)' }}>
                <li>{t('Pozitif: Servis kalitesi, yemek lezzeti', 'Positive: Service quality, food taste')}</li>
                <li>{t('İyileştirme: Tatlı menüsü çeşitliliği', 'Improvement: Dessert menu variety')}</li>
                <li>{t('Tekrar gelme niyeti: Yüksek', 'Return intent: High')}</li>
              </ul>
            </div>

            <div className="pulse-eyebrow" style={{ marginTop: 22, marginBottom: 10, color: 'var(--n-500)' }}>
              {t('YANIT TASLAĞI', 'REPLY DRAFT')}
            </div>
            <div style={{ border: '1px solid var(--n-200)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: 14, fontSize: 13.5, lineHeight: 1.55, color: 'var(--n-800)' }}>
                {t('Selin Hanım, yorumunuz için çok teşekkürler. Tatlı menümüzü Haziran itibarıyla 6 yeni seçenekle genişletiyoruz — bir sonraki ziyaretinizde size özel bir tadım hazırlatabiliriz. Tekrar görüşmek dileğiyle.', 'Thank you for your feedback Selin. We are expanding our dessert menu with 6 new options starting June — would love to prepare a special tasting for your next visit.')}
                <span style={{ color: 'var(--n-400)' }}> | </span>
              </div>
              <div style={{ borderTop: '1px solid var(--n-150)', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--n-50)' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="bz-btn" style={{ height: 26, fontSize: 11 }}><window.IZap size={11} /> {t('AI üret', 'AI generate')}</button>
                  <button className="bz-btn" style={{ height: 26, fontSize: 11 }}>{t('Şablon', 'Template')}</button>
                </div>
                <button className="bz-btn bz-btn-lime" style={{ height: 26, fontSize: 11 }}>
                  <window.IReply size={11} /> {t('Yanıtla', 'Send reply')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right meta */}
        <div style={{ borderLeft: '1px solid var(--n-150)', padding: 22, background: 'var(--n-50)' }} className="bz-scroll">
          <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', marginBottom: 12 }}>{t('MİSAFİR', 'GUEST')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {[
              { k: t('Toplam ziyaret', 'Total visits'), v: '7' },
              { k: t('Ortalama puan', 'Avg rating'), v: '4.8' },
              { k: t('Son ziyaret', 'Last visit'), v: '04 MAY' },
              { k: t('Tahmini LTV', 'Est. LTV'), v: '₺3.420' },
            ].map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: 'var(--n-500)' }}>{it.k}</span>
                <span className="bz-num" style={{ fontWeight: 600 }}>{it.v}</span>
              </div>
            ))}
          </div>

          <div className="bz-rule" style={{ margin: '20px 0' }} />

          <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', marginBottom: 12 }}>{t('ZAMAN ÇİZELGESİ', 'TIMELINE')}</div>
          <div style={{ position: 'relative', paddingLeft: 16 }}>
            <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 1, background: 'var(--n-200)' }} />
            {[
              { d: '04 MAY', t: t('5★ yorum bıraktı', 'Left 5★ review'), tone: 'lime' },
              { d: '17 NİS', t: t('QR ile ziyaret · ₺840', 'Visited via QR · ₺840'), tone: 'ghost' },
              { d: '02 NİS', t: t('Doğum günü promosyon', 'Birthday promo'), tone: 'ghost' },
              { d: '11 MAR', t: t('İlk ziyaret', 'First visit'), tone: 'ghost' },
            ].map((e, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
                <span style={{ position: 'absolute', left: -16, top: 4, width: 9, height: 9, borderRadius: '50%',
                  background: e.tone === 'lime' ? 'var(--lime-300)' : 'var(--n-300)', border: '2px solid var(--n-50)' }} />
                <div className="bz-num" style={{ fontSize: 10, color: 'var(--n-500)' }}>{e.d}</div>
                <div style={{ fontSize: 12.5, color: 'var(--n-800)', marginTop: 2 }}>{e.t}</div>
              </div>
            ))}
          </div>

          <div className="bz-rule" style={{ margin: '8px 0 20px' }} />

          <div className="pulse-eyebrow" style={{ color: 'var(--n-500)', marginBottom: 10 }}>{t('AKSİYON', 'ACTIONS')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="bz-btn" style={{ justifyContent: 'flex-start', width: '100%' }}>
              <window.IExternal size={13} /> {t('Google\'da yanıtla', 'Reply on Google')}
            </button>
            <button className="bz-btn" style={{ justifyContent: 'flex-start', width: '100%' }}>
              <window.IMail size={13} /> {t('E-posta gönder', 'Send email')}
            </button>
            <button className="bz-btn" style={{ justifyContent: 'flex-start', width: '100%' }}>
              <window.IUsers size={13} /> {t('CRM\'e ekle', 'Add to CRM')}
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

window.PageFeedbacks = PageFeedbacks;
