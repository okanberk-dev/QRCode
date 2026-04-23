// Buaze Homepage v3 — Gerçek buaze.com içeriğine sadık, premium redesign
// Kaynak: www.buaze.com (EN) — Nisan 2026

const { useState: useHP3, useEffect: useHP3E, useRef: useHP3R } = React;
const PB10 = () => window.PulseBrand;
const PL5 = () => window.Platforms;
const BP2 = () => window.BuazePremium;

// ── Animated counter ──
function Counter({ to, suffix = '', decimals = 0 }) {
  const [v, setV] = useHP3(0);
  const ref = useHP3R(null);
  useHP3E(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; obs.disconnect();
      const s = Date.now(), d = 1600;
      const run = () => {
        const p = Math.min((Date.now()-s)/d, 1);
        const ease = 1 - Math.pow(1-p, 3);
        setV(+(ease * to).toFixed(decimals));
        if (p < 1) requestAnimationFrame(run);
      };
      run();
    }, { threshold: 0.4 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return <span ref={ref}>{v.toLocaleString('en')}{suffix}</span>;
}

// ── Real nav (matches buaze.com exactly) ──
function BuazeNav({ lang = 'en' }) {
  const [scroll, setScroll] = useHP3(false);
  const [mob, setMob] = useHP3(false);
  const [langOpen, setLangOpen] = useHP3(false);

  useHP3E(() => {
    const fn = () => setScroll(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const learnItems = [
    { l: 'Features', d: 'Everything Buaze can do' },
    { l: 'How It Works', d: 'QR → Review → Panel' },
    { l: 'QR Generator', badge: 'NEW', d: 'Free, no signup needed' },
    { l: 'Customer Stories', d: 'Real results, real businesses' },
    { l: 'Blog & Guides', d: 'Tips, tactics, policy updates' },
    { l: 'Compare', d: 'Buaze vs. the market' },
  ];

  const solutionGroups = [
    {
      label: 'Hospitality',
      items: ['Restaurants & Cafes', 'Hotels & Hospitality', 'Boutique Hotels'],
    },
    {
      label: 'Healthcare',
      items: ['Clinics & Healthcare', 'Dentists', 'Aesthetic Clinics', 'Veterinary Clinics'],
    },
    {
      label: 'Professional',
      items: ['Real Estate', 'Law Firms', 'Private Schools', 'Auto Services', 'Beauty Salons', 'Gyms'],
    },
  ];

  const navBase = {
    position: 'sticky', top: 0, zIndex: 200,
    background: scroll ? 'rgba(255,255,255,.96)' : 'rgba(255,255,255,.9)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid ' + (scroll ? '#E5E5E5' : '#F0F0F0'),
    boxShadow: scroll ? '0 2px 20px rgba(0,0,0,.06)' : 'none',
    transition: 'all .24s ease',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <nav style={navBase}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 4 }}>
        {/* Logo */}
        <a style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.03em', textDecoration: 'none', marginRight: 8, flexShrink: 0 }}>
          buaze<span style={{ color: '#C6F24E' }}>.</span>
        </a>

        {/* Desktop links */}
        <div className="bz-hide-mobile" style={{ display: 'flex', gap: 2, flex: 1, alignItems: 'center' }}>
          {/* Learn dropdown */}
          <div className="bz-nav-item" style={{ position: 'relative' }}>
            <button style={navBtn(false)}>Learn ↓</button>
            <div className="bz-dropdown" style={{ gridTemplateColumns: '1fr 1fr', minWidth: 520, left: '-40px', transform: 'none' }}>
              {learnItems.map(it => (
                <div key={it.l} style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {it.l}
                      {it.badge && <span style={{ padding: '1px 6px', background: '#C6F24E', borderRadius: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: 9, letterSpacing: '0.1em', color: '#0A0A0A' }}>{it.badge}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#737373', marginTop: 1 }}>{it.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solutions mega-menu */}
          <div className="bz-nav-item" style={{ position: 'relative' }}>
            <button style={navBtn(false)}>Solutions ↓</button>
            <div className="bz-dropdown" style={{ gridTemplateColumns: 'repeat(3,1fr)', minWidth: 620, left: '-80px', transform: 'none' }}>
              {solutionGroups.map(g => (
                <div key={g.label} style={{ padding: '12px 6px' }}>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8, paddingLeft: 8 }}>{g.label}</div>
                  {g.items.map(i => (
                    <div key={i} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#333', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#FAFAFA'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>{i}</div>
                  ))}
                </div>
              ))}
              <div style={{ gridColumn: '1/-1', borderTop: '1px solid #F0F0F0', padding: '12px 8px 4px', display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 12, color: '#C6F24E', fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.1em' }}>VIEW ALL PLANS →</span>
              </div>
            </div>
          </div>

          <button style={navBtn(false)}>Pricing</button>
          <button style={navBtn(false)}>About Us</button>
          <button style={navBtn(false)}>Contact</button>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {/* Lang toggle */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setLangOpen(!langOpen)} style={{ ...navBtn(false), display: 'flex', alignItems: 'center', gap: 4 }}>
              🌐 {lang.toUpperCase()} ↓
            </button>
            {langOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', background: '#fff', border: '1px solid #EDEDED', borderRadius: 10, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,.1)', zIndex: 300 }}>
                {['EN', 'TR'].map(l => (
                  <div key={l} onClick={() => setLangOpen(false)} style={{ padding: '8px 14px', fontSize: 13, borderRadius: 6, cursor: 'pointer', fontWeight: 600, background: l === lang.toUpperCase() ? '#EAF9B8' : 'transparent' }}>{l}</div>
                ))}
              </div>
            )}
          </div>
          <button className="bz-hide-mobile" style={navBtn(false)}>Log In</button>
          <button className="bz-btn-primary" style={{ padding: '9px 18px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif", whiteSpace: 'nowrap' }}>
            Start Free →
          </button>
        </div>
      </div>

      {/* Mobile full-menu */}
      {mob && (
        <div style={{ background: '#fff', padding: 20, borderTop: '1px solid #EDEDED', animation: 'bz-slide-down .2s ease' }}>
          {['Learn', 'Solutions', 'Pricing', 'About Us', 'Contact', 'Log In'].map(l => (
            <div key={l} style={{ padding: '12px 0', borderBottom: '1px solid #F5F5F5', fontSize: 16, fontWeight: 500 }}>{l}</div>
          ))}
        </div>
      )}
    </nav>
  );
}

const navBtn = (active) => ({
  padding: '8px 12px', fontSize: 14, fontFamily: "'Inter',sans-serif",
  background: 'none', border: 'none', cursor: 'pointer',
  color: active ? '#0A0A0A' : '#525252', fontWeight: active ? 600 : 400,
  borderRadius: 8, whiteSpace: 'nowrap',
});

// ── Hero product mockup — live dashboard ──
function HeroProduct() {
  const [p, setP] = useHP3(0);
  const reviews = [
    { init: 'A', name: 'Alice K.', stars: 5, text: 'Service was fast, desserts were great.' },
    { init: 'M', name: 'Mark D.', stars: 5, text: 'Nice place, just a bit loud.' },
    { init: 'J', name: 'Jenny A.', stars: 5, text: 'Coffee came exactly how I ordered.' },
    { init: 'S', name: 'Sarah B.', stars: 5, text: 'Great atmosphere and friendly staff!' },
  ];
  useHP3E(() => {
    const t = setInterval(() => setP(i => (i + 1) % reviews.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Main dashboard card */}
      <div style={{
        background: '#FFFFFF', border: '1px solid #EDEDED', borderRadius: 22,
        boxShadow: '0 32px 80px -20px rgba(0,0,0,.18)', overflow: 'hidden',
      }}>
        {/* topbar */}
        <div style={{ background: '#0A0A0A', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.16em' }}>LIVE STREAM</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A', animation: 'bz-pulse-dot 1.5s ease infinite' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#A3A3A3' }}>3 new today</span>
          </div>
        </div>
        {/* Reviews list */}
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(3)].map((_, i) => {
            const r = reviews[(p + i) % reviews.length];
            return (
              <div key={`${p}-${i}`} className={i === 0 ? 'bz-fade-up' : ''} style={{
                background: i === 0 ? '#EAF9B8' : '#FAFAFA',
                border: '1px solid ' + (i === 0 ? '#C6F24E' : '#EDEDED'),
                borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start',
                transition: 'all .3s',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{r.init}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', background: '#0A0A0A', padding: '2px 5px', borderRadius: 4 }}>{'★'.repeat(r.stars)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#525252', marginTop: 2 }}>{r.text}</div>
                </div>
              </div>
            );
          })}
        </div>
        {/* chart strip */}
        <div style={{ padding: '0 16px 16px' }}>
          <svg viewBox="0 0 380 56" style={{ width: '100%' }}>
            <defs>
              <linearGradient id="hpg3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C6F24E" stopOpacity=".35" />
                <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 40 L40 35 L80 30 L120 20 L160 25 L200 15 L240 18 L280 8 L320 12 L360 6 L380 4 L380 56 L0 56 Z" fill="url(#hpg3)" />
            <path d="M0 40 L40 35 L80 30 L120 20 L160 25 L200 15 L240 18 L280 8 L320 12 L360 6 L380 4" fill="none" stroke="#C6F24E" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Floating badge — +184% */}
      <div className="bz-float" style={{
        position: 'absolute', top: -18, right: -18,
        background: '#0A0A0A', color: '#fff', borderRadius: 16,
        padding: '12px 18px', boxShadow: '0 12px 40px rgba(0,0,0,.25)',
      }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', color: '#C6F24E' }}>+184%</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#737373', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Review growth</div>
      </div>

      {/* Floating NPS badge */}
      <div className="bz-float" style={{
        position: 'absolute', bottom: -14, left: -18, animationDelay: '1.2s',
        background: '#fff', border: '1px solid #EDEDED', borderRadius: 14,
        padding: '10px 16px', boxShadow: '0 8px 32px rgba(0,0,0,.1)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 999, background: '#EAF9B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15 }}>72</div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#737373', letterSpacing: '0.1em' }}>NPS SCORE</div>
          <div style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>↑ Excellent</div>
        </div>
      </div>
    </div>
  );
}

// ── 3-step card ──
function StepCard({ n, icon, title, sub, desc, visual }) {
  return (
    <div className="bz-card-hover" style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -10, right: 6, fontFamily: "'Space Grotesk',sans-serif", fontSize: 100, fontWeight: 800, color: '#F5F5F5', letterSpacing: '-0.05em', lineHeight: 1, userSelect: 'none' }}>0{n}</div>
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: n === 1 ? '#C6F24E' : n === 2 ? '#0A0A0A' : '#EAF9B8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: n === 2 ? '#C6F24E' : '#0A0A0A' }}>{icon}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.16em', fontWeight: 700, background: '#0A0A0A', padding: '3px 8px', borderRadius: 4 }}>STEP 0{n}</div>
        </div>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ fontSize: 14, color: '#525252', lineHeight: 1.6, marginTop: 8 }}>{desc}</div>
        {visual && <div style={{ marginTop: 16 }}>{visual}</div>}
      </div>
    </div>
  );
}

// ── Platform grid ──
function PlatformGrid({ ids, label, type }) {
  const { PlatformLogo } = PL5();
  return (
    <div style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 18, padding: 24 }}>
      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#737373', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>{type}</div>
      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {ids.map(({ id, name, tag }) => (
          <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#FAFAFA', borderRadius: 10, border: '1px solid #F0F0F0' }}>
            <PlatformLogo id={id} size={32} rounded={8} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 10, color: '#737373', fontFamily: "'JetBrains Mono',monospace" }}>{tag}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Real footer (matches buaze.com) ──
function BuazeFooter() {
  const [email, setEmail] = useHP3('');
  const [ok, setOk] = useHP3(false);

  const cols = [
    { title: 'Product', items: ['Features', 'Solutions', 'Delivery', 'QR Generator', 'Integrations', 'How It Works', 'Pricing', 'Compare'] },
    { title: 'Discover', items: ['Customer Stories', 'ROI Calculator', 'Blog', 'Help Center', 'FAQ', 'About Us', 'Careers', 'Contact'] },
    { title: 'Legal', items: ['Terms of Service', 'Privacy Policy', 'Google Compliance', 'Cookie Settings'] },
    { title: 'Platform', items: ['Log In', 'Try for Free'] },
  ];

  return (
    <footer style={{ background: '#0A0A0A', color: '#fff', fontFamily: "'Inter',sans-serif" }}>
      {/* ECG divider */}
      <div style={{ overflow: 'hidden', height: 44, borderTop: '1px solid #1A1A1A' }}>
        <svg viewBox="0 0 1440 44" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
          <path d="M0 22 L160 22 L200 6 L240 38 L280 14 L320 30 L440 22 L640 22 L680 6 L720 38 L760 14 L800 30 L920 22 L1120 22 L1160 6 L1200 38 L1240 14 L1280 30 L1440 22"
            fill="none" stroke="#C6F24E" strokeWidth="1.5" opacity="0.4"
            style={{ strokeDasharray: 2000, strokeDashoffset: 2000, animation: 'bz-ecg 2.5s .5s ease forwards' }} />
        </svg>
      </div>

      {/* Newsletter */}
      <div style={{ borderBottom: '1px solid #1A1A1A', padding: '40px 64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 40, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em' }}>
            Weekly reputation playbook. <span style={{ color: '#C6F24E' }}>Free.</span>
          </div>
          <div style={{ fontSize: 13, color: '#737373', marginTop: 4 }}>Google policy updates, QR tips, case studies. Once a week, no noise.</div>
        </div>
        {ok ? (
          <div style={{ padding: '14px 20px', background: '#EAF9B8', borderRadius: 12, color: '#0A0A0A', fontWeight: 600, fontSize: 14 }}>
            ✓ You're subscribed — see you Monday!
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, minWidth: 320 }}>
            <input type="email" placeholder="your@business.com" value={email} onChange={e => setEmail(e.target.value)}
              style={{ flex: 1, padding: '12px 16px', background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 999, fontSize: 14, color: '#fff', fontFamily: "'Inter',sans-serif", outline: 'none' }} />
            <button onClick={() => email && setOk(true)} className="bz-btn-primary"
              style={{ padding: '12px 20px', background: '#C6F24E', color: '#0A0A0A', border: 'none', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>
              Subscribe →
            </button>
          </div>
        )}
      </div>

      {/* Links */}
      <div style={{ padding: '48px 64px', display: 'grid', gridTemplateColumns: '1.8fr repeat(4,1fr)', gap: 32 }}>
        <div>
          <a style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.025em', textDecoration: 'none' }}>
            buaze<span style={{ color: '#C6F24E' }}>.</span>
          </a>
          <div style={{ fontSize: 13, color: '#737373', marginTop: 14, lineHeight: 1.7, maxWidth: 280 }}>
            Digital Reputation and Feedback Management for Businesses. Professionalize customer feedback via QR technology and protect your brand reputation.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            {[{ l: 'X', c: '#000' }, { l: 'in', c: '#0A66C2' }, { l: 'IG', c: '#E1306C' }].map(s => (
              <div key={s.l} style={{ width: 32, height: 32, borderRadius: 8, background: s.c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'transform .15s' }}
                onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>{s.l}</div>
            ))}
          </div>
        </div>
        {cols.map(c => (
          <div key={c.title}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>{c.title}</div>
            {c.items.map(it => (
              <div key={it} style={{ fontSize: 13, color: '#A3A3A3', marginBottom: 10, cursor: 'pointer', transition: 'color .12s' }}
                onMouseEnter={e => e.currentTarget.style.color='#fff'}
                onMouseLeave={e => e.currentTarget.style.color='#A3A3A3'}>{it}</div>
            ))}
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 64px 24px', borderTop: '1px solid #1A1A1A', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#525252', letterSpacing: '0.12em' }}>© 2026 BUAZE. ALL RIGHTS RESERVED.</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 8, height: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 999, background: '#16A34A' }} />
            <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: '#16A34A', animation: 'bz-ping 1.5s ease infinite' }} />
          </div>
          <span style={{ fontSize: 12, color: '#737373' }}>All systems operational</span>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#525252' }}>
          <span style={{ cursor: 'pointer' }}>Terms</span>
          <span style={{ cursor: 'pointer' }}>Privacy</span>
          <span style={{ cursor: 'pointer' }}>Google Compliance</span>
        </div>
      </div>
    </footer>
  );
}

// ── MAIN HOMEPAGE V3 ──
function HomePageV3() {
  const { ConversionLayer } = BP2();
  const { PlatformLogo } = PL5();
  const [videoOpen, setVideoOpen] = useHP3(false);
  const [activeSector, setActiveSector] = useHP3(0);

  const sectors = [
    { label: 'Restaurant & Café', count: '1,200+ venues' },
    { label: 'Hotel', count: '340+ properties' },
    { label: 'Clinic & Practice', count: '520+ providers' },
    { label: 'Legal', count: '180+ offices' },
    { label: 'Beauty & Spa', count: '410+ salons' },
    { label: 'Retail', count: '260+ stores' },
    { label: 'Sports & Fitness', count: '140+ facilities' },
    { label: 'Education', count: '90+ institutions' },
  ];

  const reviewPlatforms = [
    { id: 'google', name: 'Google', tag: 'Reviews & Search' },
    { id: 'yelp', name: 'Yelp', tag: 'Local reviews' },
    { id: 'tripadvisor', name: 'Tripadvisor', tag: 'Travel & hospitality' },
    { id: 'trustpilot', name: 'Trustpilot', tag: 'Verified reviews' },
    { id: 'facebook', name: 'Facebook', tag: 'Social' },
    { id: 'booking', name: 'Booking.com', tag: 'Hotel' },
    { id: 'opentable', name: 'OpenTable', tag: 'Restaurant' },
  ];

  const deliveryPlatforms = [
    { id: 'ubereats', name: 'Uber Eats', tag: 'Delivery · Global' },
    { id: 'doordash', name: 'DoorDash', tag: 'Delivery · US' },
    { id: 'zomato', name: 'Zomato', tag: 'Delivery · Global' },
  ];

  return (
    <div style={{ background: '#FFFFFF', fontFamily: "'Inter',sans-serif" }}>
      <BuazeNav lang="en" />
      <ConversionLayer />

      {/* ── HERO ── */}
      <section style={{ padding: '88px 64px 80px', maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 60, alignItems: 'center' }}>
        <div>
          {/* badge */}
          <div className="bz-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: '#EAF9B8', borderRadius: 999, marginBottom: 24, border: '1px solid #C6F24E' }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A', animation: 'bz-pulse-dot 1.5s ease infinite' }} />
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, letterSpacing: '0.1em', fontWeight: 600 }}>
              <Counter to={2400} suffix="+" /> businesses using it
            </span>
          </div>

          {/* headline — exact from real site */}
          <h1 className="bz-fade-up bz-d1" style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 72, fontWeight: 600, lineHeight: 0.95, letterSpacing: '-0.04em', color: '#0A0A0A', margin: '0 0 20px' }}>
            Track your reputation<br/>
            like a <span style={{ background: '#C6F24E', padding: '2px 14px 4px', borderRadius: 10, display: 'inline-block', transform: 'rotate(-0.4deg)' }}>pulse</span>.
          </h1>

          <p className="bz-fade-up bz-d2" style={{ fontSize: 18, lineHeight: 1.65, color: '#525252', maxWidth: 540, margin: '0 0 28px' }}>
            Collect feedback from real customers via QR, manage every review from one panel, grow your reputation in a way that stays compliant with Google policies.
          </p>

          {/* CTAs */}
          <div className="bz-fade-up bz-d3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <button className="bz-btn-primary" style={{ padding: '16px 28px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>
              Start 14-day free trial →
            </button>
            <button className="bz-btn-ghost" onClick={() => setVideoOpen(true)} style={{ padding: '15px 22px', background: '#FAFAFA', border: '1px solid #E5E5E5', borderRadius: 999, fontSize: 15, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: '#0A0A0A', fontFamily: "'Inter',sans-serif" }}>
              <span style={{ width: 30, height: 30, borderRadius: 999, background: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#C6F24E' }}>▶</span>
              Watch demo (2 min)
            </button>
          </div>

          {/* Trust marks */}
          <div className="bz-fade-up bz-d4" style={{ display: 'flex', gap: 22, color: '#737373', fontSize: 13 }}>
            {['✓ No credit card required', '✓ 5-minute setup', '✓ Turkish support'].map(t => (
              <span key={t}>{t}</span>
            ))}
          </div>
        </div>
        <div className="bz-fade-in bz-d2"><HeroProduct /></div>
      </section>

      {/* ── TRUSTED BY — marquee ── */}
      <section style={{ borderTop: '1px solid #EDEDED', borderBottom: '1px solid #EDEDED', padding: '18px 0', overflow: 'hidden', background: '#FAFAFA' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flexShrink: 0, padding: '0 40px 0 48px', fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#A3A3A3', letterSpacing: '0.18em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Trusted by</div>
          <div style={{ flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)' }}>
            <div className="bz-marquee-track">
              {[...Array(2)].flatMap(() => ['ARK BISTRO', 'HOTEL NORA', 'DERMA+', 'LAW&CO', 'KAHVE DUKKAN', 'SPA REN', 'GÜLER KLİNİK', 'LOTUS SPA', 'AKDAĞ HUKUK', 'TASTY BURGER']).map((b, i) => (
                <div key={i} style={{ padding: '0 48px', fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: '#D4D4D4', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{b}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '96px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#737373', letterSpacing: '0.2em', textTransform: 'uppercase' }}>How it works</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 10, marginBottom: 0 }}>Three steps, three seconds.</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <StepCard n={1} icon="▦" title="Collect" desc="A customer scans the QR on your table and leaves a review in 20 seconds. Zero friction."
            visual={
              <div style={{ background: '#EAF9B8', borderRadius: 10, padding: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, background: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700 }}>M</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>M. Demir</div>
                  <div style={{ fontSize: 11, color: '#737373' }}>Left a review · just now</div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: '#0A0A0A', background: '#C6F24E', padding: '2px 6px', borderRadius: 4 }}>★★★★★</div>
              </div>
            }
          />
          <StepCard n={2} icon="✦" title="Manage" desc="Reply to every review from one panel. Route negatives to your team, push positives to Google."
            visual={
              <div style={{ background: '#0A0A0A', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 999, background: '#C6F24E', animation: 'bz-pulse-dot 1.5s ease infinite' }} />
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#A3A3A3', letterSpacing: '0.12em' }}>+184%</span>
                </div>
                <div style={{ fontSize: 12, color: '#737373' }}>All reviews in one place. Assign, reply, close.</div>
              </div>
            }
          />
          <StepCard n={3} icon="◉" title="Grow" desc="Track your score with live analytics, lift your Google ranking, capture organic growth."
            visual={
              <svg viewBox="0 0 200 48" style={{ width: '100%' }}>
                {[12, 24, 36].map(y => <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="#EDEDED" strokeWidth="0.8" />)}
                <path d="M0 36 L30 30 L60 24 L90 18 L120 14 L150 8 L180 6 L200 4" fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="200" cy="4" r="4" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2" />
              </svg>
            }
          />
        </div>
      </section>

      {/* ── DARK PANEL ── */}
      <section style={{ background: '#0A0A0A', color: '#fff', padding: '88px 64px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          {/* Mock panel */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 20, overflow: 'hidden' }}>
            <div style={{ background: '#0A0A0A', padding: '14px 18px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.16em' }}>LIVE STREAM</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: 999, background: '#16A34A' }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#A3A3A3' }}>LIVE</span>
              </div>
            </div>
            <div style={{ padding: 18 }}>
              {[
                { init: 'A', name: 'Alice K.', stars: 5, text: 'Service was fast, desserts were great.', platform: 'Google' },
                { init: 'M', name: 'Mark D.', stars: 5, text: 'Nice place, just a bit loud.', platform: 'Yelp' },
                { init: 'J', name: 'Jenny A.', stars: 5, text: 'Coffee came exactly how I ordered.', platform: 'Tripadvisor' },
              ].map((r, i) => (
                <div key={i} style={{ padding: '12px 14px', marginBottom: 8, background: '#161616', borderRadius: 12, border: '1px solid #222', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 999, background: i === 0 ? '#C6F24E' : '#1A1A1A', color: i === 0 ? '#0A0A0A' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{r.init}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E' }}>{'★'.repeat(r.stars)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#737373', marginTop: 2 }}>{r.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              <div style={{ background: '#161616', border: '1px solid #2A2A2A', borderRadius: 10, padding: 14 }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#737373', letterSpacing: '0.14em', marginBottom: 6 }}>SUPPORTED PLATFORMS</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['yemeksepeti','getir-yemek','trendyol-go','google','tripadvisor'].map(id => (
                    <PlatformLogo key={id} id={id} size={28} rounded={6} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#C6F24E', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Central control</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, color: '#fff', marginBottom: 18 }}>
              Every review in a<br/>single panel.
            </h2>
            <p style={{ fontSize: 17, color: '#A3A3A3', lineHeight: 1.65, maxWidth: 460, marginBottom: 28 }}>
              Google, Tripadvisor, Yemeksepeti, Getir — reviews from every platform meet inside Buaze. Spot the negative first and resolve it before it grows.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Auto-tagging', sub: 'By keyword and sentiment.' },
                { label: 'Sentiment analysis (AI)', sub: 'Positive / neutral / negative.' },
                { label: 'Team assignment', sub: 'Reviews land on the right person.' },
                { label: 'SLA tracking', sub: 'Hit your response-time targets.' },
              ].map(f => (
                <div key={f.label} style={{ padding: '14px 16px', background: '#161616', border: '1px solid #222', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 999, background: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#0A0A0A' }}>✓</div>
                    <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600 }}>{f.label}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#737373' }}>{f.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── GOOGLE SAFE ── */}
      <section style={{ padding: '88px 64px', maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        {/* Shield visual */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div className="bz-glow" style={{ width: 280, height: 280, borderRadius: 999, background: '#EAF9B8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 200 240" width="160">
                <path d="M100 10 L175 38 L175 120 Q175 178 100 220 Q25 178 25 120 L25 38 Z" fill="#C6F24E" stroke="#0A0A0A" strokeWidth="2.5" strokeLinejoin="round" />
                <circle cx="100" cy="108" r="34" fill="#FFFFFF" stroke="#0A0A0A" strokeWidth="2.5" />
                <path d="M82 108 L95 121 L118 96" fill="none" stroke="#0A0A0A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="68" y="40" width="64" height="14" rx="3" fill="#0A0A0A" />
                <text x="100" y="51" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#C6F24E" fontWeight="700" letterSpacing="0.1">GOOGLE SAFE</text>
              </svg>
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Google safe</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 18 }}>Policy compliant.<br/>Organic growth.</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { n: '01', t: 'Preference-first', d: 'The QR routes the customer to real feedback first.' },
              { n: '02', t: 'Transparent flow', d: "Negative reviews aren't filtered; they reach your team for resolution." },
              { n: '03', t: 'Rule engine', d: 'Every campaign is auto-audited against Google policy.' },
            ].map(x => (
              <div key={x.n} style={{ display: 'flex', gap: 14, paddingBottom: 16, borderBottom: '1px solid #EDEDED' }}>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#A3A3A3', minWidth: 24, marginTop: 2 }}>{x.n}</div>
                <div>
                  <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600 }}>{x.t}</div>
                  <div style={{ fontSize: 14, color: '#525252', marginTop: 3, lineHeight: 1.55 }}>{x.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTORS ── */}
      <section style={{ padding: '80px 64px', background: '#FAFAFA' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Industries</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 10, marginBottom: 0 }}>Fits every industry, perfectly.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {sectors.map((s, i) => (
              <div key={s.label} className="bz-card-hover" onClick={() => setActiveSector(i)} style={{
                padding: 20, background: activeSector === i ? '#0A0A0A' : '#fff',
                border: `1px solid ${activeSector === i ? '#0A0A0A' : '#EDEDED'}`,
                borderRadius: 16, cursor: 'pointer', transition: 'all .2s',
              }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 600, color: activeSector === i ? '#fff' : '#0A0A0A' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: activeSector === i ? '#C6F24E' : '#737373', marginTop: 6, fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.08em' }}>{s.count}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLATFORMS ── */}
      <section style={{ padding: '88px 64px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase' }}>One dashboard · Every platform</div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 52, fontWeight: 600, letterSpacing: '-0.03em', marginTop: 10, marginBottom: 0 }}>
              From Yelp to Tripadvisor to DoorDash.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 20 }}>
            <PlatformGrid ids={reviewPlatforms} label="Your brand's trust signals" type="Review platforms" />
            <PlatformGrid ids={deliveryPlatforms} label="Where orders happen" type="Delivery & booking" />
          </div>
        </div>
      </section>

      {/* ── QR GENERATOR CTA ── */}
      <section style={{ background: '#0A0A0A', color: '#fff', padding: '72px 64px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', padding: '4px 12px', background: 'rgba(198,242,78,.12)', border: '1px solid rgba(198,242,78,.3)', borderRadius: 999, marginBottom: 16 }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: '#C6F24E', letterSpacing: '0.14em' }}>FREE TOOL · NEW</span>
            </div>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 48, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 14 }}>
              Generate a QR code<br/>in seconds.
            </h2>
            <p style={{ fontSize: 16, color: '#A3A3A3', lineHeight: 1.65, maxWidth: 440, marginBottom: 24 }}>
              Instantly download a high-resolution QR code for your website, menu or any link. No signup needed — a tool you can use while warming up to the Buaze experience.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="bz-btn-primary" style={{ padding: '14px 24px', background: '#C6F24E', color: '#0A0A0A', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>
                Open the generator →
              </button>
              <button style={{ padding: '14px 22px', background: 'none', border: '1px solid #333', color: '#fff', borderRadius: 999, fontSize: 14, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>
                See all solutions
              </button>
            </div>
          </div>
          {/* QR preview */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 260, background: '#C6F24E', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: '#0A0A0A' }}>Your Business</div>
              <div style={{ background: '#fff', borderRadius: 12, padding: 12 }}>
                <svg viewBox="0 0 100 100" width="160" height="160">
                  <rect width="100" height="100" fill="#fff" />
                  {[[5,5],[65,5],[5,65]].map(([fx,fy],i) => (
                    <g key={i}><rect x={fx} y={fy} width="22" height="22" fill="none" stroke="#0A0A0A" strokeWidth="4"/><rect x={fx+7} y={fy+7} width="8" height="8" fill="#0A0A0A"/></g>
                  ))}
                  {Array.from({length: 120}).map((_,i) => {
                    const x = (i*37+13)%90, y = (i*53+7)%90;
                    if ((x<28&&y<28)||(x>62&&y<28)||(x<28&&y>62)) return null;
                    return <rect key={i} x={x+5} y={y+5} width="4" height="4" fill="#0A0A0A" opacity=".9" />;
                  })}
                </svg>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: '#0A0A0A', opacity: 0.6, letterSpacing: '0.14em', textAlign: 'center' }}>buaze.com/r/your-link</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CASE STUDY ── */}
      <section style={{ padding: '88px 64px', maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: '#737373', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 12 }}>Case · Kadıköy Bistro</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 64, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 0.95, marginBottom: 20 }}>
            +184% organic reviews in 90 days.
          </h2>
          <p style={{ fontSize: 17, color: '#525252', lineHeight: 1.65, fontStyle: 'italic', marginBottom: 24 }}>
            "We put QRs on the tables. Within the first month our Google average went from 4.2 to 4.8. We don't spend time waiting for reviews anymore — the system runs itself."
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 32 }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: '#0A0A0A', color: '#C6F24E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>EK</div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15 }}>Emre Kaya</div>
              <div style={{ fontSize: 12, color: '#737373' }}>Kadıköy Bistro · Founder</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            {[{ k: '4.2 → 4.8', l: 'Google avg.' }, { k: '+184%', l: 'Reviews/mo' }, { k: '12 min', l: 'Reply time' }].map(x => (
              <div key={x.l} style={{ borderTop: '2px solid #0A0A0A', paddingTop: 10 }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>{x.k}</div>
                <div style={{ fontSize: 11, color: '#737373', marginTop: 3 }}>{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Second testimonial — Julia Martens */}
        <div style={{ background: '#0A0A0A', color: '#fff', borderRadius: 24, padding: 40 }}>
          <div style={{ fontSize: 40, color: '#C6F24E', lineHeight: 1, marginBottom: 16, fontFamily: "'Space Grotesk',sans-serif" }}>"</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 28 }}>
            We went from 3.9 on Yelp to 4.7 in six months. The Tripadvisor sync alone paid for Buaze.
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 20, borderTop: '1px solid #1A1A1A' }}>
            <div style={{ width: 44, height: 44, borderRadius: 999, background: '#C6F24E', color: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>JM</div>
            <div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>Julia Martens</div>
              <div style={{ fontSize: 12, color: '#737373' }}>Hotel Nora · Amsterdam</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: '#C6F24E', padding: '88px 64px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 64, fontWeight: 700, letterSpacing: '-0.035em', color: '#0A0A0A', lineHeight: 1, marginBottom: 14 }}>
          Start today, get your<br/>first review tomorrow.
        </h2>
        <div style={{ fontSize: 16, color: '#0A0A0A', opacity: 0.65, marginBottom: 32 }}>
          14-day free trial · No credit card required · Cancel anytime
        </div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          <button className="bz-btn-primary" style={{ padding: '18px 36px', background: '#0A0A0A', color: '#fff', border: 'none', borderRadius: 999, fontSize: 18, fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>Start free →</button>
          <button style={{ padding: '18px 28px', background: 'transparent', border: '2px solid #0A0A0A', borderRadius: 999, fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}>See pricing</button>
        </div>
      </section>

      <BuazeFooter />

      {/* Video modal */}
      {videoOpen && (
        <div className="bz-fade-in" onClick={() => setVideoOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
          <div className="bz-scale-in" onClick={e => e.stopPropagation()} style={{ background: '#111', borderRadius: 20, width: 740, aspectRatio: '16/9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #222' }}>
            <div style={{ textAlign: 'center', color: '#fff' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 600 }}>2-minute product tour</div>
              <div style={{ fontSize: 14, color: '#737373', marginTop: 8, marginBottom: 20 }}>Coming soon — book a live demo meanwhile</div>
              <button className="bz-btn-primary" style={{ padding: '12px 24px', background: '#C6F24E', color: '#0A0A0A', border: 'none', borderRadius: 999, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Book a demo →</button>
            </div>
            <button onClick={() => setVideoOpen(false)} style={{ position: 'absolute', top: 14, right: 14, width: 34, height: 34, borderRadius: 999, background: '#222', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

window.HomePageV3 = HomePageV3;
window.BuazeNav = BuazeNav;
window.BuazeFooter = BuazeFooter;
