// Page 5: Analitik
function PageAnalytics({ lang = 'tr' }) {
  const t = (tr, en) => lang === 'tr' ? tr : en;

  // Pre-computed line + bar data
  const linePts = [4.1,4.2,4.0,4.3,4.4,4.3,4.5,4.4,4.6,4.5,4.7,4.6,4.7,4.6,4.7,4.8,4.7,4.6,4.7,4.8,4.7,4.7,4.8,4.7,4.8,4.7,4.7,4.8,4.7,4.8];
  const volPts = [12,18,15,22,28,24,32,29,38,34,41,38,44,40,47,52,49,46,53,58,54,51,57,52,61,55,53,62,58,67];

  const buildPath = (pts, w, h, min, max) => {
    return pts.map((v, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((v - min) / (max - min)) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  const linePath = buildPath(linePts, 600, 140, 3.8, 5.0);
  const lineFill = `${linePath} L600,140 L0,140 Z`;
  const volPath = buildPath(volPts, 600, 80, 0, 70);

  const sources = [
    { name: 'QR Masa', pct: 38, count: 2847, color: 'var(--lime-300)' },
    { name: 'Google', pct: 28, count: 2102, color: '#0A0A0A' },
    { name: 'NFC', pct: 14, count: 1051, color: '#525252' },
    { name: 'WhatsApp', pct: 11, count: 825, color: '#A3A3A3' },
    { name: 'Tripadvisor', pct: 6, count: 450, color: '#D4D4D4' },
    { name: t('Diğer', 'Other'), pct: 3, count: 225, color: '#E5E5E5' },
  ];

  const topics = [
    { l: t('Servis hızı', 'Service speed'), pos: 82, neg: 18, total: 412 },
    { l: t('Yemek lezzeti', 'Food taste'), pos: 94, neg: 6, total: 1248 },
    { l: t('Atmosfer', 'Atmosphere'), pos: 88, neg: 12, total: 624 },
    { l: t('Fiyat', 'Pricing'), pos: 67, neg: 33, total: 287 },
    { l: t('Temizlik', 'Cleanliness'), pos: 91, neg: 9, total: 198 },
    { l: t('Personel', 'Staff'), pos: 89, neg: 11, total: 542 },
  ];

  return (
    <PageShell
      active="analytics"
      eyebrow={t('SON 30 GÜN · 04 NIS – 04 MAY 2026', 'LAST 30 DAYS · 04 APR – 04 MAY 2026')}
      title={t('Analitik', 'Analytics')}
      sub={t('Yorum hacmi, puan trendi, kanal dağılımı ve konu bazlı sentiment. Hedeflerle karşılaştırın.', 'Review volume, rating trend, channel split and topic-level sentiment. Compare to targets.')}
      actions={<>
        <div style={{ display: 'flex', gap: 4, background: 'var(--n-100)', padding: 4, borderRadius: 10 }}>
          {['7G', '30G', '90G', '1Y'].map((p, i) => (
            <button key={p} className={`bz-tab ${i === 1 ? 'bz-tab-active' : ''}`} style={{ height: 26, padding: '0 10px', fontSize: 11.5 }}>{p}</button>
          ))}
        </div>
        <button className="bz-btn"><window.ICalendar size={13} /> {t('Özel aralık', 'Custom range')}</button>
        <button className="bz-btn bz-btn-primary"><window.IDownload size={13} /> {t('Rapor al', 'Export report')}</button>
      </>}
    >
      {/* Headline */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { k: t('Toplam yorum', 'Total reviews'), v: '7.500', d: '+12.4%', tone: 'up' },
          { k: t('Ortalama puan', 'Avg rating'), v: '4.74', d: '+0.18', tone: 'up' },
          { k: t('Yanıt süresi', 'Reply time'), v: '2h 18m', d: '-32m', tone: 'up' },
          { k: t('NPS', 'NPS'), v: '67', d: '+4', tone: 'up' },
          { k: t('Tekrar gelme', 'Return rate'), v: '%41', d: '-2%', tone: 'down' },
        ].map((kpi, i) => (
          <div key={i} className="bz-card" style={{ padding: 16 }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{kpi.k}</div>
            <div className="bz-h-tight-2 bz-num" style={{ fontSize: 26, marginTop: 8 }}>{kpi.v}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              {kpi.tone === 'up'
                ? <window.ITrendUp size={11} stroke="var(--green)" />
                : <window.ITrendDown size={11} stroke="var(--red)" />}
              <span className="bz-num" style={{ fontSize: 11, color: kpi.tone === 'up' ? 'var(--green)' : 'var(--red)' }}>{kpi.d}</span>
              <span style={{ fontSize: 10, color: 'var(--n-400)', marginLeft: 'auto' }}>{t('vs. önceki', 'vs prev')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Big trend chart */}
      <div className="bz-card" style={{ padding: 22, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('PUAN VE HACİM TRENDİ', 'RATING & VOLUME TREND')}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
              <span className="bz-h-tight-1 bz-num" style={{ fontSize: 36 }}>4.74</span>
              <window.Pill tone="ok" dot>+0.18 ({t('30g', '30d')})</window.Pill>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {[
              { l: t('Puan', 'Rating'), c: 'var(--lime-300)', sw: 'solid' },
              { l: t('Hacim', 'Volume'), c: 'var(--n-300)', sw: 'bar' },
              { l: t('Hedef 4.5', 'Target 4.5'), c: 'var(--n-400)', sw: 'dashed' },
            ].map((leg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                {leg.sw === 'solid' && <span style={{ width: 14, height: 2, background: leg.c, borderRadius: 1 }} />}
                {leg.sw === 'dashed' && <span style={{ width: 14, height: 1, borderTop: `1px dashed ${leg.c}` }} />}
                {leg.sw === 'bar' && <span style={{ width: 8, height: 8, background: leg.c, borderRadius: 1 }} />}
                <span style={{ color: 'var(--n-600)' }}>{leg.l}</span>
              </div>
            ))}
          </div>
        </div>

        <svg viewBox="0 0 600 240" style={{ width: '100%', height: 260, marginTop: 18 }} preserveAspectRatio="none">
          {/* gridlines */}
          {[0, 35, 70, 105, 140].map(y => (
            <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#EDEDED" strokeWidth="1" />
          ))}
          {/* target line */}
          <line x1="0" y1="82" x2="600" y2="82" stroke="#A3A3A3" strokeWidth="1" strokeDasharray="3,3" />
          {/* volume bars at bottom */}
          {volPts.map((v, i) => {
            const x = (i / (volPts.length - 1)) * 600;
            const h = (v / 70) * 70;
            return <rect key={i} x={x - 4} y={170 - h} width="8" height={h} fill="#E5E5E5" rx="1" />;
          })}
          {/* line area */}
          <path d={lineFill} fill="url(#limeGrad)" opacity="0.15" />
          <path d={linePath} fill="none" stroke="#A8D62E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* points */}
          {linePts.map((v, i) => {
            const x = (i / (linePts.length - 1)) * 600;
            const y = 140 - ((v - 3.8) / 1.2) * 140;
            return i % 5 === 0 ? <circle key={i} cx={x} cy={y} r="3" fill="#FFF" stroke="#A8D62E" strokeWidth="2" /> : null;
          })}
          <defs>
            <linearGradient id="limeGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#A8D62E" />
              <stop offset="100%" stopColor="#A8D62E" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* x-axis labels */}
          {['04 NIS', '11 NIS', '18 NIS', '25 NIS', '02 MAY'].map((l, i) => (
            <text key={l} x={i * 150} y="200" fontSize="10" fontFamily="ui-monospace, monospace" fill="#A3A3A3">{l}</text>
          ))}
        </svg>
      </div>

      {/* Two-up: Sources + Topics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 18 }}>
        {/* Channel split */}
        <div className="bz-card" style={{ padding: 22 }}>
          <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('KANAL DAĞILIMI', 'CHANNEL SPLIT')}</div>
          <div style={{ marginTop: 16, display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--n-150)' }}>
            {sources.map(s => (
              <div key={s.name} style={{ width: `${s.pct}%`, background: s.color }} title={s.name} />
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sources.map((s, i) => (
              <div key={s.name} style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto auto', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: i ? '1px solid var(--n-100)' : 'none' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
                <span style={{ fontSize: 13 }}>{s.name}</span>
                <span className="bz-num" style={{ fontSize: 11, color: 'var(--n-500)' }}>{s.count.toLocaleString()}</span>
                <span className="bz-num" style={{ fontSize: 13, fontWeight: 600, width: 36, textAlign: 'right' }}>%{s.pct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Topic sentiment */}
        <div className="bz-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('KONU SENTİMENT ANALİZİ', 'TOPIC SENTIMENT')}</div>
            <button className="bz-btn bz-btn-ghost" style={{ fontSize: 11 }}><window.IZap size={11} stroke="var(--lime-500)" /> {t('AI ile çıkarıldı', 'AI extracted')}</button>
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topics.map(tp => (
              <div key={tp.l}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{tp.l}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span className="bz-num" style={{ fontSize: 11, color: 'var(--n-400)' }}>{tp.total.toLocaleString()} {t('söz', 'mentions')}</span>
                    <span className="bz-num" style={{ fontSize: 12, fontWeight: 600, color: tp.pos > 80 ? 'var(--green)' : tp.pos > 70 ? 'var(--amber)' : 'var(--red)' }}>%{tp.pos}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--n-100)' }}>
                  <div style={{ width: `${tp.pos}%`, background: tp.pos > 80 ? 'var(--lime-300)' : tp.pos > 70 ? 'var(--amber)' : 'var(--red)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom — best day + heatmap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 18 }}>
        <div className="bz-card" style={{ padding: 22 }}>
          <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('GÜN / SAAT YOĞUNLUĞU', 'DAY / HOUR HEATMAP')}</div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '32px repeat(12, 1fr)', gap: 2 }}>
            <span />
            {['09','11','13','15','17','19','21','23','01','03','05','07'].map(h => (
              <span key={h} className="bz-num" style={{ fontSize: 9, color: 'var(--n-400)', textAlign: 'center' }}>{h}</span>
            ))}
            {(lang === 'tr' ? ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']).map((d, di) => (
              <React.Fragment key={d}>
                <span className="bz-num" style={{ fontSize: 9, color: 'var(--n-400)' }}>{d}</span>
                {Array.from({ length: 12 }).map((_, hi) => {
                  const intensity = Math.max(0, Math.min(1,
                    (Math.sin(hi * 0.7 + di) * 0.5 + 0.5) * (hi >= 4 && hi <= 7 ? 1 : 0.5) * (di === 5 || di === 6 ? 1.2 : 0.85)
                  ));
                  const op = 0.08 + intensity * 0.92;
                  return <div key={hi} style={{ aspectRatio: '1.4', background: `rgba(168, 214, 46, ${op})`, borderRadius: 2 }} />;
                })}
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: 11, color: 'var(--n-500)' }}>
            <span>{t('En yoğun: Cmt 21:00', 'Peak: Sat 21:00')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{t('düşük', 'low')}</span>
              {[0.1, 0.3, 0.55, 0.8, 1].map(o => (
                <span key={o} style={{ width: 12, height: 12, background: `rgba(168, 214, 46, ${o})`, borderRadius: 2 }} />
              ))}
              <span>{t('yüksek', 'high')}</span>
            </div>
          </div>
        </div>

        <div className="bz-card" style={{ padding: 22 }}>
          <div className="pulse-eyebrow" style={{ color: 'var(--n-500)' }}>{t('AI İÇGÖRÜLER', 'AI INSIGHTS')}</div>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { ic: 'IZap', tone: 'lime', t: t('Tatlı menüsü 18 kez geri bildirimde geçti', 'Dessert menu mentioned 18 times'),
                s: t('Negatif sentiment %72 — menü çeşitliliği eksikliği. Yeni 6 tatlı eklenmesi öneriliyor.', 'Negative sentiment 72% — limited variety. Adding 6 new desserts suggested.') },
              { ic: 'ITrendUp', tone: 'ok', t: t('Cumartesi geceleri %38 daha yoğun', 'Saturday nights 38% busier'),
                s: t('Bu süreçte ortalama puan 4.4\'e düşüyor. Servis ekibini güçlendirmeyi düşünün.', 'Avg rating drops to 4.4 in this window. Consider boosting service team.') },
              { ic: 'IShield', tone: 'warn', t: t('Yelp bağlantısı 2 gündür hata veriyor', 'Yelp connection erroring for 2 days'),
                s: t('Token süresi dolmuş — 87 yorum çekilemedi.', 'Token expired — 87 reviews missed.') },
            ].map((ins, i) => {
              const I = window[ins.ic];
              return (
                <div key={i} style={{ display: 'flex', gap: 12, padding: 12, background: 'var(--n-50)', borderRadius: 10, borderLeft: `2px solid ${ins.tone === 'lime' ? 'var(--lime-300)' : ins.tone === 'ok' ? 'var(--green)' : 'var(--amber)'}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--n-0)', border: '1px solid var(--n-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <I size={14} stroke={ins.tone === 'lime' ? 'var(--lime-500)' : ins.tone === 'ok' ? 'var(--green)' : 'var(--amber)'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{ins.t}</div>
                    <div style={{ fontSize: 12, color: 'var(--n-600)', marginTop: 4, lineHeight: 1.4 }}>{ins.s}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

window.PageAnalytics = PageAnalytics;
