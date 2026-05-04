// Page 2: Google Yorumları
function PageGoogle({ lang = 'tr' }) {
  const t = (tr, en) => lang === 'tr' ? tr : en;

  const reviews = [
    { name: 'Mehmet K.', initials: 'MK', stars: 5, time: t('2 gün önce', '2 days ago'), avatar: '#3B82F6',
      msg: t('Lokasyon mükemmel, manzara nefes kesici. Servis hızlı ve güleryüzlü. Pizza Margherita gerçekten İtalyan kalitesinde.', 'Location is perfect, view is breathtaking. Service is quick and friendly. Pizza Margherita is genuinely Italian quality.'),
      replied: true, replyTime: '4sa' },
    { name: 'Zeynep Y.', initials: 'ZY', stars: 4, time: t('5 gün önce', '5 days ago'), avatar: '#EC4899',
      msg: t('Yemekler çok lezzetli ama porsiyon biraz küçük. Fiyat-performans dengesi gözden geçirilebilir. Yine de tekrar geleceğim.', 'Food was very tasty but portions a bit small. Price-performance balance could be reviewed.'),
      replied: false },
    { name: 'Ali D.', initials: 'AD', stars: 2, time: t('1 hafta önce', '1 week ago'), avatar: '#F59E0B',
      msg: t('Rezervasyon saatimden 25 dakika sonra masaya oturabildim. Hostes çok ilgisizdi. Yemek iyiydi ama bu deneyim için 2 yıldız.', 'Sat 25 mins after my reservation time. Host was very dismissive. Food was good but 2 stars for this experience.'),
      replied: false, urgent: true },
    { name: 'İrem S.', initials: 'İS', stars: 5, time: t('1 hafta önce', '1 week ago'), avatar: '#10B981',
      msg: t('Doğum günümü kutladık ve sürpriz bir tatlı hazırlamıştınız. Çok teşekkürler ekip!', 'Celebrated my birthday and you prepared a surprise dessert. Thank you team!'),
      replied: true, replyTime: '1sa' },
  ];

  const distribution = [
    { stars: 5, count: 1842, pct: 78 },
    { stars: 4, count: 312, pct: 13 },
    { stars: 3, count: 118, pct: 5 },
    { stars: 2, count: 47, pct: 2 },
    { stars: 1, count: 47, pct: 2 },
  ];

  return (
    <PageShell
      active="google"
      eyebrow={t('GOOGLE BUSINESS PROFILE · KADIKÖY', 'GOOGLE BUSINESS PROFILE · KADIKOY')}
      title={t('Google Yorumları', 'Google Reviews')}
      sub={t('Google Business hesabınızdan otomatik senkronize edilir. Yanıtlar 1 saat içinde Google\'da görünür.', 'Auto-synced from Google Business. Replies appear on Google within 1 hour.')}
      actions={<>
        <window.Pill tone="ok" dot>{t('Bağlı', 'Connected')}</window.Pill>
        <button className="bz-btn"><window.IRefresh size={13} /> {t('Senkronize et', 'Sync')}</button>
        <button className="bz-btn bz-btn-primary"><window.IExternal size={13} /> {t('Google\'da aç', 'Open in Google')}</button>
      </>}
    >
      {/* Top metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
        {/* Hero rating card */}
        <div className="bz-card" style={{ padding: 22, background: 'linear-gradient(135deg, #0A0A0A 0%, #171717 100%)', color: '#FFF', position: 'relative', overflow: 'hidden' }}>
          <div className="pulse-eyebrow" style={{ color: '#737373' }}>{t('GENEL PUAN', 'OVERALL RATING')}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: 14 }}>
            <span className="bz-h-tight-1 bz-num" style={{ fontSize: 72, color: 'var(--lime-300)' }}>4.7</span>
            <div style={{ paddingBottom: 12 }}>
              <window.Stars value={5} size={18} color="var(--lime-300)" />
              <div className="bz-num" style={{ fontSize: 12, color: '#A3A3A3', marginTop: 4 }}>2.366 {t('yorum', 'reviews')}</div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div className="pulse-eyebrow" style={{ color: '#737373' }}>{t('30 GÜN', '30 DAYS')}</div>
              <div className="bz-num" style={{ fontSize: 18, color: 'var(--lime-300)', marginTop: 4 }}>+0.3</div>
            </div>
          </div>
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {distribution.map(d => (
              <div key={d.stars} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                <span className="bz-num" style={{ color: '#A3A3A3', width: 16 }}>{d.stars}★</span>
                <div style={{ flex: 1, height: 6, background: '#262626', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${d.pct}%`, height: '100%', background: d.stars >= 4 ? 'var(--lime-300)' : d.stars === 3 ? '#F59E0B' : '#DC2626' }} />
                </div>
                <span className="bz-num" style={{ color: '#A3A3A3', width: 60, textAlign: 'right' }}>{d.count.toLocaleString()} · %{d.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sub metrics */}
        {[
          { k: t('Görüntülenme', 'Profile views'), v: '12.4K', d: '+18%', sub: t('son 28 gün', 'last 28 days') },
          { k: t('Yön tarifi istekleri', 'Direction requests'), v: '847', d: '+24%', sub: t('Maps üzerinden', 'via Maps') },
          { k: t('Yanıt oranı', 'Reply rate'), v: '%94', d: '+6%', sub: t('hedef: %95', 'goal: 95%') },
          { k: t('Yanıtlanmamış', 'Unanswered'), v: '12', d: '-3', sub: t('1\'i acil', '1 urgent'), urgent: true },
        ].map((kpi, i) => (
          <div key={i} className="bz-card" style={{ padding: 16, gridColumn: i === 0 ? '2 / 3' : i === 1 ? '3 / 4' : i === 2 ? '2 / 3' : '3 / 4',
            gridRow: i < 2 ? '1' : '2' }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{kpi.k}</div>
            <div className="bz-h-tight-2 bz-num" style={{ fontSize: 26, marginTop: 10 }}>{kpi.v}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--n-500)' }}>{kpi.sub}</span>
              <span className="bz-num" style={{ fontSize: 11, color: kpi.urgent ? 'var(--red)' : 'var(--green)' }}>
                {kpi.d}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + reviews */}
      <div className="bz-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--n-150)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--n-100)', padding: 4, borderRadius: 10 }}>
            {[t('Tümü 2.366', 'All 2,366'), t('Yanıtlanmamış 12', 'Unanswered 12'), t('Negatif 47', 'Negative 47'), t('İşaretli 3', 'Flagged 3')].map((tab, i) => (
              <button key={i} className={`bz-tab ${i === 0 ? 'bz-tab-active' : ''}`}>{tab}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('SIRALA', 'SORT')}</span>
            <button className="bz-btn">{t('En yeni', 'Newest')} <window.IChevronDown size={12} /></button>
          </div>
        </div>

        <div>
          {reviews.map((r, i) => (
            <div key={i} style={{ padding: '20px 22px', borderBottom: '1px solid var(--n-100)', display: 'grid', gridTemplateColumns: '40px 1fr 240px', gap: 16 }}>
              <div className="bz-avatar" style={{ width: 40, height: 40, fontSize: 14, background: r.avatar, color: '#FFF' }}>
                {r.initials}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</span>
                  <window.Stars value={r.stars} size={13} color={r.stars >= 4 ? 'var(--lime-400)' : r.stars === 3 ? 'var(--amber)' : 'var(--red)'} />
                  <span className="bz-num" style={{ fontSize: 11, color: 'var(--n-500)' }}>· {r.time}</span>
                  {r.urgent && <window.Pill tone="danger" dot>{t('Acil yanıt', 'Urgent')}</window.Pill>}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--n-700)' }}>{r.msg}</p>
                {r.replied && (
                  <div style={{ marginTop: 12, padding: 12, background: 'var(--n-50)', borderRadius: 8, borderLeft: '2px solid var(--lime-300)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('İŞLETME YANITI', 'OWNER REPLY')}</span>
                      <span className="bz-num" style={{ fontSize: 10, color: 'var(--n-400)' }}>· {r.replyTime} {t('sonra', 'later')}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12.5, color: 'var(--n-700)', lineHeight: 1.5 }}>
                      {t('Yorumunuz için çok teşekkür ederiz. Görüşlerinizi ekibimizle paylaştık.', 'Thank you for your review. We shared your thoughts with our team.')}
                    </p>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                {r.replied ? (
                  <window.Pill tone="ok" dot>{t('Yanıtlandı', 'Replied')}</window.Pill>
                ) : (
                  <button className="bz-btn bz-btn-lime"><window.IReply size={12} /> {t('Yanıtla', 'Reply')}</button>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="bz-btn" style={{ height: 26, padding: '0 8px' }}><window.IZap size={12} /></button>
                  <button className="bz-btn" style={{ height: 26, padding: '0 8px' }}><window.IExternal size={12} /></button>
                  <button className="bz-btn" style={{ height: 26, padding: '0 8px' }}><window.IMoreH size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}

window.PageGoogle = PageGoogle;
