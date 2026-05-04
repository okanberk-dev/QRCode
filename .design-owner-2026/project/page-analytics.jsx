/* Page: Analitik */

const TREND_DATA = [4.32, 4.38, 4.41, 4.45, 4.42, 4.48, 4.52, 4.55, 4.51, 4.58, 4.62, 4.65, 4.68, 4.71];
const VOLUME_DATA = [82, 78, 92, 88, 96, 102, 118, 124, 132, 142, 156, 168, 174, 184];

const buildLinePath = (data, w, h, padX = 0, padY = 0) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (w - padX * 2) / (data.length - 1);
  return data.map((v, i) => {
    const x = padX + i * stepX;
    const y = h - padY - ((v - min) / range) * (h - padY * 2);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};

const buildAreaPath = (data, w, h, padX = 0, padY = 0) => {
  const line = buildLinePath(data, w, h, padX, padY);
  return `${line} L ${w - padX} ${h - padY} L ${padX} ${h - padY} Z`;
};

const HEATMAP = (() => {
  const days = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
  const data = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      let v = 0;
      if (h >= 11 && h <= 14) v = 0.4 + Math.random() * 0.4;
      else if (h >= 18 && h <= 22) v = 0.6 + Math.random() * 0.4;
      else if (h >= 8 && h <= 23) v = 0.1 + Math.random() * 0.25;
      if (d >= 4) v *= 1.2;
      data.push({ day: days[d], hour: h, v: Math.min(v, 1) });
    }
  }
  return { days, data };
})();

const TOPICS = [
  { topic: 'Lezzet & sunum', n: 482, pct: 38, sentiment: 78 },
  { topic: 'Servis hızı', n: 318, pct: 25, sentiment: 42 },
  { topic: 'Atmosfer', n: 256, pct: 20, sentiment: 84 },
  { topic: 'Fiyat & değer', n: 184, pct: 14, sentiment: 38 },
  { topic: 'Park & ulaşım', n: 64, pct: 5, sentiment: 28 },
];

const AnalyticsPage = () => (
  <PanelShell
    active="analytics"
    topbar={
      <PanelTopbar
        eyebrow="ANALİTİK"
        title="İşletme nabzı"
        sub="Yorumların, puanların, trendlerin ve müşteri duygu analizinin özeti."
        actions={<>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', border: '1px solid var(--bz-n200)', borderRadius: 999, fontSize: 12, color: 'var(--bz-n600)' }}>
            <Icon name="clock" size={12}/>
            <span>Son 90 gün</span>
            <Icon name="chevronDown" size={12}/>
          </div>
          <button className="bz-btn-ghost"><Icon name="download" size={14}/> PDF rapor</button>
          <button className="bz-btn-primary"><Icon name="sparkle" size={14}/> AI özet</button>
        </>}
      />
    }
  >
    {/* KPI row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
      {[
        { l: 'ORTALAMA PUAN', v: '4.71', d: '+0.18', dir: 'up', sub: 'hedef 4.6' },
        { l: 'BU AY YORUM', v: '184', d: '+24%', dir: 'up', sub: '156 önceki ay' },
        { l: 'NPS SKORU', v: '64', d: '+12', dir: 'up', sub: 'Promoter %78' },
        { l: 'YANIT ORANI', v: '%92', d: '+8%', dir: 'up', sub: '1.6 sa ortalama' },
      ].map((k, i) => (
        <div key={i} className="bz-card" style={{ padding: 18 }}>
          <div className="bz-eyebrow" style={{ marginBottom: 10 }}>{k.l}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="bz-h-tight-2" style={{ fontSize: 32 }}>{k.v}</span>
            <span className={`bz-kpi-delta ${k.dir}`}><Icon name="arrowUp" size={11}/> {k.d}</span>
          </div>
          {/* mini sparkline */}
          <svg width="100%" height="32" viewBox="0 0 200 32" preserveAspectRatio="none" style={{ display: 'block', marginTop: 4 }}>
            <path d={buildAreaPath(TREND_DATA, 200, 32, 0, 4)} fill="var(--bz-lime-soft)"/>
            <path d={buildLinePath(TREND_DATA, 200, 32, 0, 4)} fill="none" stroke="var(--bz-graphite)" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
          <div className="bz-mono" style={{ fontSize: 10.5, color: 'var(--bz-n500)', marginTop: 4 }}>{k.sub}</div>
        </div>
      ))}
    </div>

    {/* Main trend */}
    <div className="bz-card" style={{ padding: 24, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div className="bz-eyebrow" style={{ marginBottom: 4 }}>PUAN & HACİM TRENDİ</div>
          <h3 style={{ fontSize: 18 }}>14 haftalık görünüm</h3>
          <p style={{ fontSize: 12.5, color: 'var(--bz-n500)', margin: '4px 0 0' }}>
            Hedef puan <span className="bz-mono" style={{ color: 'var(--bz-graphite)', fontWeight: 600 }}>4.60</span> · şu an <span className="bz-mono" style={{ color: 'var(--bz-success)', fontWeight: 600 }}>+0.11</span> üzerinde
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {['Puan', 'Hacim', 'Sentiment'].map((t, i) => (
            <button key={t} className={i === 0 ? 'bz-btn-primary bz-btn-sm' : 'bz-btn-ghost bz-btn-sm'}>{t}</button>
          ))}
        </div>
      </div>
      <svg width="100%" height="240" viewBox="0 0 800 240" style={{ display: 'block' }}>
        {/* Grid */}
        {[0, 60, 120, 180, 240].map(y => (
          <line key={y} x1="40" x2="780" y1={y} y2={y} stroke="var(--bz-n200)" strokeWidth="0.5"/>
        ))}
        {/* Y labels */}
        {[
          { y: 12, l: '4.8' }, { y: 72, l: '4.6' }, { y: 132, l: '4.4' }, { y: 192, l: '4.2' },
        ].map((t, i) => (
          <text key={i} x="32" y={t.y + 4} fontSize="10" fontFamily="JetBrains Mono" fill="#A3A3A3" textAnchor="end">{t.l}</text>
        ))}
        {/* X labels */}
        {TREND_DATA.map((_, i) => i % 2 === 0 && (
          <text key={i} x={40 + i * (740 / 13)} y="232" fontSize="10" fontFamily="JetBrains Mono" fill="#A3A3A3" textAnchor="middle">H{i+1}</text>
        ))}
        {/* Volume bars (background) */}
        {VOLUME_DATA.map((v, i) => {
          const x = 40 + i * (740 / 13) - 10;
          const h = (v / 200) * 200;
          return <rect key={i} x={x} y={220 - h} width="20" height={h} fill="var(--bz-n100)" rx="2"/>;
        })}
        {/* Target line */}
        <line x1="40" x2="780" y1="72" y2="72" stroke="#A3A3A3" strokeWidth="1" strokeDasharray="4 3"/>
        <text x="775" y="68" fontSize="10" fontFamily="JetBrains Mono" fill="#737373" textAnchor="end">HEDEF 4.60</text>
        {/* Area */}
        <path d={buildAreaPath(TREND_DATA, 740, 200, 40, 12).replace(/^M/, 'M')}
          transform="translate(0,0)" fill="url(#fadeFill)" />
        <defs>
          <linearGradient id="fadeFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#C6F24E" stopOpacity="0.4"/>
            <stop offset="1" stopColor="#C6F24E" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Line */}
        <path d={buildLinePath(TREND_DATA, 740, 200, 40, 12)} fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {/* Points */}
        {TREND_DATA.map((v, i) => {
          const min = Math.min(...TREND_DATA);
          const max = Math.max(...TREND_DATA);
          const x = 40 + i * (740 / 13);
          const y = 220 - 12 - ((v - min) / (max - min)) * (200 - 24);
          const last = i === TREND_DATA.length - 1;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={last ? 5 : 3} fill={last ? '#C6F24E' : '#0A0A0A'} stroke={last ? '#0A0A0A' : '#FFF'} strokeWidth={last ? 2 : 1.5}/>
              {last && (
                <g>
                  <rect x={x - 32} y={y - 36} width="64" height="24" rx="6" fill="#0A0A0A"/>
                  <text x={x} y={y - 19} fontSize="11" fontFamily="JetBrains Mono" fontWeight="600" fill="#C6F24E" textAnchor="middle">{v}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>

    {/* Heatmap + Topics */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      {/* Heatmap */}
      <div className="bz-card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16, gap: 8 }}>
          <div>
            <div className="bz-eyebrow">YORUM YOĞUNLUĞU</div>
            <h3 style={{ fontSize: 15, marginTop: 4 }}>Gün × Saat</h3>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)' }}>az</span>
            {[0.1, 0.3, 0.55, 0.8].map((o, i) => (
              <div key={i} style={{ width: 12, height: 12, background: `rgba(168, 214, 46, ${o + 0.15})`, borderRadius: 2 }}/>
            ))}
            <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-n500)' }}>çok</span>
          </div>
        </div>
        <svg width="100%" height="180" viewBox="0 0 480 180">
          {[0, 6, 12, 18, 23].map((h, i) => (
            <text key={i} x={28 + (h / 23) * 432} y="172" fontSize="9" fontFamily="JetBrains Mono" fill="#A3A3A3" textAnchor="middle">{String(h).padStart(2,'0')}:00</text>
          ))}
          {HEATMAP.days.map((day, di) => (
            <text key={day} x="20" y={20 + di * 20} fontSize="10" fontFamily="JetBrains Mono" fill="#737373" textAnchor="end">{day}</text>
          ))}
          {HEATMAP.data.map((c, i) => {
            const di = HEATMAP.days.indexOf(c.day);
            return (
              <rect
                key={i}
                x={28 + c.hour * 18}
                y={10 + di * 20}
                width="16"
                height="16"
                rx="3"
                fill={c.v < 0.05 ? '#F2F2F2' : `rgba(168, 214, 46, ${c.v * 0.85 + 0.15})`}
              />
            );
          })}
        </svg>
        <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)', marginTop: 6 }}>
          Pik · Cuma 20:00 · 14 yorum/saat
        </div>
      </div>

      {/* Topics */}
      <div className="bz-card" style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 16 }}>
          <div>
            <div className="bz-eyebrow">KONU & DUYGU</div>
            <h3 style={{ fontSize: 15, marginTop: 4 }}>NLP ile çıkarılan konular</h3>
          </div>
          <span className="bz-badge bz-badge--lime" style={{ marginLeft: 'auto' }}>
            <Icon name="sparkle" size={10}/> AI
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TOPICS.map((t, i) => (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.topic}</span>
                <span className="bz-mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--bz-n500)' }}>
                  {t.n} bahsi · %{t.pct}
                </span>
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--bz-n100)' }}>
                <div style={{ width: `${t.sentiment}%`, background: 'var(--bz-lime-deep)' }}/>
                <div style={{ width: `${100 - t.sentiment}%`, background: 'var(--bz-n200)' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-success)' }}>{t.sentiment}% pozitif</span>
                <span className="bz-mono" style={{ fontSize: 10, color: 'var(--bz-danger)' }}>{100 - t.sentiment}% negatif</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* AI insights + channel split */}
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
      <div style={{
        background: 'var(--bz-graphite)',
        color: '#FFF',
        borderRadius: 18,
        padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="sparkle" size={14} color="#C6F24E"/>
          <span className="bz-eyebrow" style={{ color: 'var(--bz-lime)' }}>AI İÇGÖRÜLER · BU HAFTA</span>
          <span className="bz-mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--bz-n400)' }}>haftalık özet</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { tag: 'TREND', body: 'Servis hızı şikayetleri Cuma ve Cumartesi akşamları %42 artıyor — ek garson planı düşünülmeli.', tone: 'lime' },
            { tag: 'KAZANIM', body: 'Yeni mantar makarna menü öğesi %94 pozitif yorum aldı — Instagram\'da öne çıkar.', tone: 'mute' },
            { tag: 'RİSK', body: '"Park" kelimesi 3 hafta üst üste negatif eğilim. Anlaşmalı park indirim kuponu deneyin.', tone: 'mute' },
          ].map((ins, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12,
              padding: 14, borderRadius: 12,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span className="bz-eyebrow" style={{
                color: ins.tone === 'lime' ? 'var(--bz-lime)' : 'var(--bz-n400)',
                width: 70, flexShrink: 0,
              }}>{ins.tag}</span>
              <p style={{ fontSize: 13, color: '#FFF', margin: 0, lineHeight: 1.6, flex: 1 }}>{ins.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bz-card" style={{ padding: 22 }}>
        <div className="bz-eyebrow" style={{ marginBottom: 14 }}>KANAL DAĞILIMI</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { l: 'Google', v: 1842, pct: 71, c: '#4285F4' },
            { l: 'Buaze QR', v: 624, pct: 24, c: '#A8D62E' },
            { l: 'Yemeksepeti', v: 92, pct: 4, c: '#FA0050' },
            { l: 'Tripadvisor', v: 22, pct: 1, c: '#34E0A1' },
          ].map((c, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c.c }}/>
                  {c.l}
                </span>
                <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>
                  {c.v.toLocaleString('tr-TR')} · %{c.pct}
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--bz-n100)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${c.pct}%`, height: '100%', background: c.c }}/>
              </div>
            </div>
          ))}
        </div>
        <div className="bz-divider" style={{ margin: '18px 0' }}/>
        <div className="bz-eyebrow" style={{ marginBottom: 10 }}>EN AKTİF KONUM</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="location" size={16}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Kadıköy Bistro · Bahariye</div>
            <div className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>1,284 yorum · 4.74 puan</div>
          </div>
          <Icon name="chevronRight" size={14} color="var(--bz-n400)"/>
        </div>
      </div>
    </div>
  </PanelShell>
);

window.AnalyticsPage = AnalyticsPage;
