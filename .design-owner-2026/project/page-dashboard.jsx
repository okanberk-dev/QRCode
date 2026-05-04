/* Dashboard / Genel Bakış — Buaze Pulse */

const dashKPIs = [
  { label: 'GENEL PUAN', value: '4.7', sub: '/ 5.0', delta: '+0.2', dir: 'up', detail: 'Geçen aya göre' },
  { label: 'TOPLAM YORUM', value: '142', sub: 'son 30 gün', delta: '+18', dir: 'up', detail: '%14.5 artış' },
  { label: 'YANIT ORANI', value: '%87', sub: 'hedef %90', delta: '+12pt', dir: 'up', detail: 'Ortalama 3.4 saat' },
  { label: 'YENİ MÜŞTERİ', value: '328', sub: 'kayıt', delta: '+42', dir: 'up', detail: 'CRM\'de aktif' },
];

const dashTasks = [
  { type: 'reply', label: '12 yorum yanıtlanmayı bekliyor', meta: 'Google · Trendyol · Zomato', urgency: 'high' },
  { type: 'platform', label: 'Yemeksepeti senkronizasyon hatası', meta: '2 saat önce', urgency: 'mid' },
  { type: 'campaign', label: 'Bahar kampanyası yarın sona eriyor', meta: '47 müşteri etkilendi', urgency: 'mid' },
  { type: 'reminder', label: '8 müşteri 30 gündür dönüş yapmadı', meta: 'Geri kazanma kampanyası öner', urgency: 'low' },
];

const dashActivity = [
  { time: '09:42', actor: 'Ayşe D.', action: 'yorum bıraktı', target: '★★★★★ Google', sentiment: 'pos' },
  { time: '09:18', actor: 'AI Asistan', action: 'yanıt önerisi hazırladı', target: 'Mehmet T.', sentiment: 'neu' },
  { time: '08:55', actor: 'Selin K.', action: 'olumsuz yorum', target: '★★ Yemeksepeti', sentiment: 'neg' },
  { time: '08:30', actor: 'Sistem', action: 'günlük rapor gönderildi', target: 'emre@kadikoybistro.com', sentiment: 'neu' },
  { time: '07:12', actor: 'Can A.', action: 'QR kod ile yorum', target: '★★★★ Buaze', sentiment: 'pos' },
];

const dashChannels = [
  { name: 'Google', icon: 'google', count: 84, rating: 4.8, change: '+0.1', tone: '#4285F4' },
  { name: 'Yemeksepeti', icon: 'cube', count: 32, rating: 4.5, change: '−0.2', tone: '#FA0050' },
  { name: 'Trendyol', icon: 'tag', count: 18, rating: 4.6, change: '+0.3', tone: '#F27A1A' },
  { name: 'Zomato', icon: 'star', count: 8, rating: 4.4, change: '+0.0', tone: '#E23744' },
];

const PulseChart = ({ height = 180 }) => {
  // 30 günlük puan + hacim
  const days = 30;
  const ratings = [4.6,4.5,4.7,4.6,4.5,4.4,4.6,4.7,4.5,4.6,4.7,4.8,4.6,4.5,4.4,4.5,4.7,4.8,4.7,4.6,4.5,4.6,4.7,4.8,4.7,4.6,4.7,4.8,4.7,4.7];
  const volumes = [3,5,4,6,4,3,7,5,4,6,8,5,4,3,2,5,7,9,6,4,5,7,8,6,5,7,9,8,6,7];
  const w = 720, h = height, padX = 8, padY = 16;
  const xStep = (w - padX*2) / (days - 1);
  const minR = 4.2, maxR = 5.0;
  const yR = v => h - padY - ((v - minR) / (maxR - minR)) * (h - padY*2);
  const maxV = Math.max(...volumes);
  const yV = v => h - padY - (v / maxV) * (h - padY*2 - 60) - 12;

  const path = ratings.map((r, i) => `${i === 0 ? 'M' : 'L'} ${padX + i*xStep} ${yR(r)}`).join(' ');
  const fill = `${path} L ${padX + (days-1)*xStep} ${h-padY} L ${padX} ${h-padY} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {/* grid */}
      {[4.2, 4.4, 4.6, 4.8, 5.0].map(g => (
        <g key={g}>
          <line x1={padX} y1={yR(g)} x2={w-padX} y2={yR(g)} stroke="#EDEDED" strokeWidth="1" strokeDasharray={g === 5.0 ? '0' : '2 4'}/>
          <text x={w-padX-2} y={yR(g)-3} fontSize="9" fill="#A3A3A3" textAnchor="end" fontFamily="JetBrains Mono">{g.toFixed(1)}</text>
        </g>
      ))}
      {/* volume bars */}
      {volumes.map((v, i) => (
        <rect key={i} x={padX + i*xStep - 3} y={yV(v)} width="6" height={h - padY - yV(v)} fill="#EDEDED" rx="1.5"/>
      ))}
      {/* rating area + line */}
      <path d={fill} fill="url(#pulseGrad)" opacity="0.35"/>
      <path d={path} fill="none" stroke="#0A0A0A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {/* last point */}
      <circle cx={padX + (days-1)*xStep} cy={yR(ratings[ratings.length-1])} r="4" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="1.5"/>
      <defs>
        <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#C6F24E" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  );
};

const KpiCard = ({ k }) => (
  <div className="bz-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div className="bz-row" style={{ justifyContent: 'space-between' }}>
      <span className="bz-eyebrow" style={{ fontSize: 10 }}>{k.label}</span>
      <span className={`bz-kpi-delta ${k.dir}`}>
        <Icon name={k.dir === 'up' ? 'arrowUp' : 'arrowDown'} size={11}/> {k.delta}
      </span>
    </div>
    <div className="bz-row" style={{ alignItems: 'baseline', gap: 6 }}>
      <span className="bz-kpi-value">{k.value}</span>
      <span style={{ fontSize: 13, color: 'var(--bz-n500)' }}>{k.sub}</span>
    </div>
    <div style={{ fontSize: 11.5, color: 'var(--bz-n500)' }}>{k.detail}</div>
  </div>
);

const TaskRow = ({ t }) => {
  const tone = { high: 'bz-badge--danger', mid: 'bz-badge--warn', low: 'bz-badge--ghost' }[t.urgency];
  const icon = { reply: 'reply', platform: 'plug', campaign: 'zap', reminder: 'clock' }[t.type];
  return (
    <div className="bz-row" style={{ gap: 12, padding: '12px 4px', borderBottom: '1px solid var(--bz-n200)' }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: 'var(--bz-n50)', border: '1px solid var(--bz-n200)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--bz-n700)', flexShrink: 0,
      }}>
        <Icon name={icon} size={14}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--bz-graphite)' }}>{t.label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--bz-n500)', marginTop: 2 }}>{t.meta}</div>
      </div>
      <span className={`bz-badge ${tone}`}>
        <span className="dot"></span>
        {t.urgency === 'high' ? 'Acil' : t.urgency === 'mid' ? 'Orta' : 'Düşük'}
      </span>
      <button className="bz-btn-icon"><Icon name="chevronRight" size={14}/></button>
    </div>
  );
};

const SentimentDot = ({ s }) => {
  const c = s === 'pos' ? '#16A34A' : s === 'neg' ? '#DC2626' : '#A3A3A3';
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }}/>;
};

const ActivityRow = ({ a }) => (
  <div className="bz-row" style={{ gap: 12, padding: '10px 0', borderBottom: '1px solid var(--bz-n100)' }}>
    <span className="bz-mono bz-tnum" style={{ fontSize: 11, color: 'var(--bz-n500)', width: 40, flexShrink: 0 }}>{a.time}</span>
    <SentimentDot s={a.sentiment}/>
    <div style={{ flex: 1, fontSize: 12.5, color: 'var(--bz-n700)' }}>
      <span style={{ fontWeight: 600, color: 'var(--bz-graphite)' }}>{a.actor}</span>
      {' '}{a.action}{' — '}
      <span style={{ color: 'var(--bz-n500)' }}>{a.target}</span>
    </div>
  </div>
);

const ChannelCard = ({ c }) => (
  <div className="bz-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div className="bz-row" style={{ gap: 10, justifyContent: 'space-between' }}>
      <div className="bz-row" style={{ gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: c.tone, color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={c.icon} size={14}/>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
      </div>
      <span className={`bz-kpi-delta ${c.change.startsWith('+') ? 'up' : c.change.startsWith('−') ? 'down' : 'flat'}`}>{c.change}</span>
    </div>
    <div className="bz-row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
      <div className="bz-row" style={{ gap: 6, alignItems: 'baseline' }}>
        <span className="bz-mono bz-tnum" style={{ fontSize: 22, fontWeight: 600 }}>{c.rating}</span>
        <Stars value={Math.round(c.rating)} size={11}/>
      </div>
      <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>{c.count} yorum</span>
    </div>
  </div>
);

const DashboardPage = ({ defaultCollapsed = false }) => (
  <PanelShell
    active="dashboard"
    defaultCollapsed={defaultCollapsed}
    topbar={
      <PanelTopbar
        eyebrow="GENEL BAKIŞ"
        breadcrumb="PANEL / GENEL BAKIŞ"
        title="Günaydın, Emre. Bugün 12 yorum yanıt bekliyor."
        sub="Kadıköy Bistro · Salı, 4 Mayıs 2026 · Son güncelleme 2 dk önce"
        actions={
          <>
            <button className="bz-btn-ghost bz-btn-sm">
              <Icon name="download" size={13}/> Rapor indir
            </button>
            <button className="bz-btn-ghost bz-btn-sm">
              Bu hafta <Icon name="chevronDown" size={13}/>
            </button>
            <button className="bz-btn-primary bz-btn-sm">
              <Icon name="plus" size={13}/> Yorum İste
            </button>
          </>
        }
      />
    }
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* AI insight banner */}
      <div className="bz-card" style={{
        padding: '14px 18px',
        background: 'var(--bz-graphite)',
        color: '#FFFFFF',
        border: '1px solid var(--bz-graphite)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--bz-lime)', color: 'var(--bz-graphite)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon name="sparkle" size={18}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--bz-lime)', fontFamily: 'JetBrains Mono', letterSpacing: '0.12em', fontWeight: 600 }}>AI İÇGÖRÜ</div>
          <div style={{ fontSize: 13.5, marginTop: 3, lineHeight: 1.45 }}>
            Bu hafta <strong style={{ color: 'var(--bz-lime)' }}>"servis hızı"</strong> %23 daha sık geçiyor —
            ağırlıklı olumsuz. Cuma akşam 19:00–21:00 yoğunluğunda dikkat edilmeli.
          </div>
        </div>
        <button className="bz-btn-lime bz-btn-sm">İncele <Icon name="arrowRight" size={12}/></button>
        <button className="bz-btn-icon" style={{ color: '#A3A3A3' }} aria-label="kapat"><Icon name="x" size={14}/></button>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {dashKPIs.map(k => <KpiCard key={k.label} k={k}/>)}
      </div>

      {/* Pulse + side stack */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 12 }}>
        {/* Pulse chart */}
        <div className="bz-card" style={{ padding: 18 }}>
          <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="bz-eyebrow" style={{ fontSize: 10 }}>NABIZ · SON 30 GÜN</div>
              <div className="bz-row" style={{ gap: 10, alignItems: 'baseline', marginTop: 4 }}>
                <span style={{ fontFamily: 'Space Grotesk', fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em' }}>4.71</span>
                <span className="bz-kpi-delta up"><Icon name="arrowUp" size={11}/> +0.18</span>
                <span style={{ fontSize: 12, color: 'var(--bz-n500)' }}>vs. önceki 30 gün</span>
              </div>
            </div>
            <div className="bz-row" style={{ gap: 6 }}>
              <span className="bz-chip active">30G</span>
              <span className="bz-chip">90G</span>
              <span className="bz-chip">YTD</span>
            </div>
          </div>
          <PulseChart height={200}/>
          <div className="bz-row" style={{ gap: 18, marginTop: 14, fontSize: 11.5, color: 'var(--bz-n500)' }}>
            <span className="bz-row" style={{ gap: 6 }}>
              <span style={{ width: 14, height: 2, background: 'var(--bz-graphite)', borderRadius: 2 }}/>
              Ortalama puan
            </span>
            <span className="bz-row" style={{ gap: 6 }}>
              <span style={{ width: 8, height: 8, background: 'var(--bz-n200)', borderRadius: 2 }}/>
              Günlük yorum hacmi
            </span>
            <span style={{ marginLeft: 'auto' }} className="bz-mono">Pik: 4 Mayıs · 9 yorum</span>
          </div>
        </div>

        {/* Tasks */}
        <div className="bz-card" style={{ padding: 18 }}>
          <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <div className="bz-eyebrow" style={{ fontSize: 10 }}>BUGÜN BEKLEYEN</div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 500, marginTop: 2 }}>4 görev</div>
            </div>
            <button className="bz-btn-ghost bz-btn-sm">Tümü</button>
          </div>
          <div>
            {dashTasks.map((t, i) => <TaskRow key={i} t={t}/>)}
          </div>
        </div>
      </div>

      {/* Channels + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 12 }}>
        <div>
          <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="bz-eyebrow" style={{ fontSize: 10 }}>KANAL DAĞILIMI</div>
            <a className="bz-link" style={{ fontSize: 11.5 }}>Tüm kanallar →</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {dashChannels.map(c => <ChannelCard key={c.name} c={c}/>)}
          </div>

          {/* Topic breakdown */}
          <div className="bz-card" style={{ padding: 18, marginTop: 12 }}>
            <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="bz-eyebrow" style={{ fontSize: 10 }}>SIK BAHSEDİLEN KONULAR</div>
              <span className="bz-mono" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>SON 30 GÜN</span>
            </div>
            {[
              { topic: 'Lezzet', pos: 78, neg: 12, neu: 10, mentions: 89 },
              { topic: 'Servis hızı', pos: 35, neg: 48, neu: 17, mentions: 64 },
              { topic: 'Atmosfer', pos: 82, neg: 6, neu: 12, mentions: 51 },
              { topic: 'Fiyat / değer', pos: 54, neg: 28, neu: 18, mentions: 42 },
              { topic: 'Personel', pos: 71, neg: 14, neu: 15, mentions: 38 },
            ].map(t => (
              <div key={t.topic} style={{ marginBottom: 12 }}>
                <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{t.topic}</span>
                  <span className="bz-mono bz-tnum" style={{ fontSize: 11, color: 'var(--bz-n500)' }}>{t.mentions} bahsedilme</span>
                </div>
                <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'var(--bz-n100)' }}>
                  <div style={{ width: `${t.pos}%`, background: '#16A34A' }}/>
                  <div style={{ width: `${t.neu}%`, background: 'var(--bz-n300)' }}/>
                  <div style={{ width: `${t.neg}%`, background: '#DC2626' }}/>
                </div>
                <div className="bz-row bz-mono" style={{ gap: 14, marginTop: 5, fontSize: 11, color: 'var(--bz-n500)' }}>
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>+{t.pos}%</span>
                  <span>nötr {t.neu}%</span>
                  <span style={{ color: '#DC2626', fontWeight: 600 }}>−{t.neg}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bz-card" style={{ padding: 18 }}>
          <div className="bz-row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div className="bz-eyebrow" style={{ fontSize: 10 }}>CANLI AKIŞ</div>
              <div style={{ fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 500, marginTop: 2 }}>Son aktiviteler</div>
            </div>
            <span className="bz-pulse-dot"></span>
          </div>
          <div>
            {dashActivity.map((a, i) => <ActivityRow key={i} a={a}/>)}
          </div>
          <button className="bz-btn-ghost bz-btn-sm" style={{ width: '100%', marginTop: 12 }}>
            Tüm aktiviteyi gör
          </button>
        </div>
      </div>
    </div>
  </PanelShell>
);

Object.assign(window, { DashboardPage, PulseChart });
