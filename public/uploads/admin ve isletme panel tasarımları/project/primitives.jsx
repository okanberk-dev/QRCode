/* Buaze design primitives — shared building blocks */
const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

/* ───────────────────────────────────────────── i18n context */
const LocaleCtx = createContext({ locale: 'tr', setLocale: () => {} });
const useLocale = () => useContext(LocaleCtx);
const T = (tr, en) => {
  const { locale } = useLocale();
  return locale === 'tr' ? tr : en;
};

/* ───────────────────────────────────────────── Buaze Logo (faithful to repo) */
function BuazeLogo({ size = 32, variant = 'default' }) {
  const fg = variant === 'on-dark' ? '#FFFFFF' : '#0A0A0A';
  const accent = '#C6F24E';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-label="Buaze">
      <path
        d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z"
        fill="none" stroke={fg} strokeWidth="3.2" strokeLinejoin="round"
      />
      <path
        d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28"
        fill="none" stroke={fg} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="54" cy="10" r="5" fill={accent} />
    </svg>
  );
}
function BuazeWordmark({ size = 18, dark }) {
  return (
    <span className="bz-wordmark" style={{ fontSize: size, color: dark ? '#fff' : '#0A0A0A' }}>
      buaze<span className="dot">.</span>
    </span>
  );
}

/* ───────────────────────────────────────────── Icons (line, stroke 1.7) */
const Icon = {};
const _icon = (name, paths) => {
  Icon[name] = ({ size = 16, color = 'currentColor', strokeWidth = 1.7, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths}
    </svg>
  );
};
_icon('home', <><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/></>);
_icon('inbox', <><path d="M3 12h5l2 3h4l2-3h5"/><rect x="3" y="4" width="18" height="16" rx="2"/></>);
_icon('qr', <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3z M14 19h2 M19 14v2 M21 21v-3 M16 21h2"/></>);
_icon('chart', <><path d="M3 20h18"/><path d="M6 16V9"/><path d="M11 16V5"/><path d="M16 16v-4"/><path d="M21 16V8"/></>);
_icon('store', <><path d="M3 9V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3"/><path d="M3 9l1.5 11A2 2 0 0 0 6.5 22h11a2 2 0 0 0 2-1l1.5-11"/><path d="M9 13a3 3 0 0 0 6 0"/></>);
_icon('utensils', <><path d="M5 3v18"/><path d="M5 9c2 0 3-1 3-3V3"/><path d="M5 9c-2 0-3-1-3-3V3"/><path d="M14 3c-1 4 0 8 4 9v9"/></>);
_icon('users', <><circle cx="9" cy="8" r="3"/><path d="M3 21c0-3 3-5 6-5s6 2 6 5"/><path d="M16 11a3 3 0 0 0 0-6"/><path d="M21 21c0-3-2-5-5-5"/></>);
_icon('settings', <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);
_icon('logout', <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></>);
_icon('star', <path d="M12 2 15 9l7 .5-5.5 4.5L18.5 21 12 17l-6.5 4 2-7L2 9.5 9 9z" fill="currentColor"/>);
_icon('starLine', <path d="M12 2 15 9l7 .5-5.5 4.5L18.5 21 12 17l-6.5 4 2-7L2 9.5 9 9z"/>);
_icon('plus', <><path d="M12 5v14"/><path d="M5 12h14"/></>);
_icon('search', <><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/></>);
_icon('chevronDown', <path d="m6 9 6 6 6-6"/>);
_icon('chevronRight', <path d="m9 6 6 6-6 6"/>);
_icon('chevronLeft', <path d="m15 6-6 6 6 6"/>);
_icon('check', <path d="M5 12l5 5L20 7"/>);
_icon('x', <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>);
_icon('arrowRight', <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>);
_icon('arrowUpRight', <><path d="M7 17 17 7"/><path d="M7 7h10v10"/></>);
_icon('trendUp', <><path d="M3 17 9 11l4 4 8-8"/><path d="M14 4h7v7"/></>);
_icon('trendDown', <><path d="M3 7l6 6 4-4 8 8"/><path d="M14 20h7v-7"/></>);
_icon('crown', <><path d="m3 17 2-9 4 5 3-7 3 7 4-5 2 9z"/><path d="M5 21h14"/></>);
_icon('bell', <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>);
_icon('mail', <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>);
_icon('phone', <path d="M22 17v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.7l1 4-2 1a13 13 0 0 0 6 6l1-2 4 1a2 2 0 0 1 1.7 2z"/>);
_icon('mapPin', <><path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="3"/></>);
_icon('calendar', <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></>);
_icon('filter', <path d="M3 4h18l-7 9v6l-4 2v-8z"/>);
_icon('more', <><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/></>);
_icon('download', <><path d="M12 3v13"/><path d="m6 11 6 6 6-6"/><path d="M5 21h14"/></>);
_icon('upload', <><path d="M12 21V7"/><path d="m6 13 6-6 6 6"/><path d="M5 3h14"/></>);
_icon('copy', <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>);
_icon('share', <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v14"/></>);
_icon('eye', <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>);
_icon('edit', <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></>);
_icon('trash', <><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></>);
_icon('alert', <><path d="m12 2 11 19H1z"/><path d="M12 9v5"/><circle cx="12" cy="18" r="0.6" fill="currentColor"/></>);
_icon('shield', <><path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/></>);
_icon('book', <><path d="M4 4v16a2 2 0 0 0 2 2h14V2H6a2 2 0 0 0-2 2z"/><path d="M4 18h16"/></>);
_icon('megaphone', <><path d="M3 11v2a3 3 0 0 0 3 3l1 5h3v-5l8 4V4z"/></>);
_icon('creditCard', <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></>);
_icon('zap', <path d="M13 2 4 14h7l-1 8 9-12h-7z"/>);
_icon('refresh', <><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>);
_icon('camera', <><path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/></>);
_icon('grid', <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>);
_icon('list', <><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></>);
_icon('clock', <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
_icon('image', <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></>);
_icon('lock', <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 1 1 8 0v3"/></>);
_icon('mousePointer', <><path d="M6 3 19 11l-7 1 4 8-3 2-4-8-3 5z"/></>);
_icon('dashboard', <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>);
_icon('message', <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>);
_icon('link', <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>);
_icon('menu', <><path d="M3 6h18M3 12h18M3 18h18"/></>);

/* ───────────────────────────────────────────── Star rating */
function StarRating({ value, onChange, size = 36, interactive = true, hover, setHover }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const active = (hover || value) >= s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => interactive && onChange?.(s)}
            onMouseEnter={() => interactive && setHover?.(s)}
            onMouseLeave={() => interactive && setHover?.(0)}
            aria-label={`${s} stars`}
            style={{
              width: size + 16, height: size + 16,
              borderRadius: '50%',
              background: active ? '#0A0A0A' : '#fff',
              border: `1px solid ${active ? '#C6F24E' : '#EAEAEA'}`,
              boxShadow: active ? '0 12px 24px -16px rgba(10,10,10,0.4)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: interactive ? 'pointer' : 'default',
              transition: 'all 200ms ease',
              flexShrink: 0,
            }}
          >
            <svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24"
                 fill={active ? '#C6F24E' : 'transparent'}
                 stroke={active ? '#C6F24E' : '#D4D4D4'}
                 strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 15 9l7 .5-5.5 4.5L18.5 21 12 17l-6.5 4 2-7L2 9.5 9 9z"/>
            </svg>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────────────────────── Status badge */
function Badge({ kind = 'off', children, dot = true, style }) {
  return (
    <span className={`bz-badge bz-badge--${kind}`} style={style}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

/* ───────────────────────────────────────────── Eyebrow */
const Eyebrow = ({ children, color, style }) => (
  <span className="pulse-eyebrow" style={{ color: color || 'var(--bz-fg-4)', ...style }}>{children}</span>
);

/* ───────────────────────────────────────────── Avatar */
function Avatar({ name, size = 32, color = '#0A0A0A', fg = '#C6F24E' }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="bz-avatar"
         style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: color, color: fg }}>
      {initial}
    </div>
  );
}

/* ───────────────────────────────────────────── Platform brand chip */
const PLATFORMS = {
  google: { label: 'Google', short: 'G', color: '#4285F4', urlHost: 'g.page/r/...' },
  tripadvisor: { label: 'Tripadvisor', short: 'TA', color: '#34E0A1', urlHost: 'tripadvisor.com/...' },
  yemeksepeti: { label: 'Yemeksepeti', short: 'YS', color: '#FA0050', urlHost: 'yemeksepeti.com/...' },
  trendyol: { label: 'Trendyol GO', short: 'TY', color: '#F27A1A', urlHost: 'tgoapp.com/...' },
  getir: { label: 'Getir Yemek', short: 'GT', color: '#5D3EBC', urlHost: 'getir.com/yemek/...' },
  foursquare: { label: 'Foursquare', short: '4SQ', color: '#F94877', urlHost: 'foursquare.com/...' },
  custom: { label: 'Custom', short: '★', color: '#525252', urlHost: '...' },
};

function PlatformChip({ id, size = 24, withLabel = false }) {
  const p = PLATFORMS[id] || PLATFORMS.custom;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: size, height: size, borderRadius: 6,
        background: p.color, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.42), fontWeight: 700,
        fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em',
        flexShrink: 0,
      }}>{p.short}</span>
      {withLabel && <span style={{ fontWeight: 600, fontSize: 13 }}>{p.label}</span>}
    </span>
  );
}

/* ───────────────────────────────────────────── Stat card */
function StatCard({ label, value, delta, deltaKind = 'up', icon, accent }) {
  return (
    <div className="bz-card" style={{ padding: 18, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Eyebrow>{label}</Eyebrow>
        {icon && <span style={{ color: 'var(--bz-fg-mute)' }}>{icon}</span>}
      </div>
      <div className="bz-h-tight" style={{ marginTop: 12, fontSize: 28, lineHeight: 1, letterSpacing: '-0.025em' }}>
        {value}
      </div>
      {delta && (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            color: deltaKind === 'up' ? 'var(--bz-positive)' : deltaKind === 'down' ? 'var(--bz-danger)' : 'var(--bz-fg-4)',
            fontWeight: 600,
          }}>
            {deltaKind === 'up' ? React.createElement(Icon.trendUp, { size: 12 }) : deltaKind === 'down' ? React.createElement(Icon.trendDown, { size: 12 }) : null}
            {delta}
          </span>
          <span style={{ color: 'var(--bz-fg-4)' }}>{T('son 7 gün', 'last 7 days')}</span>
        </div>
      )}
      {accent && (
        <span style={{ position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, background: accent }}/>
      )}
    </div>
  );
}

/* ───────────────────────────────────────────── Empty state */
function EmptyState({ title, body, action, icon }) {
  return (
    <div style={{
      padding: '52px 28px',
      borderRadius: 16,
      border: '1px dashed #E5E5E5',
      background: '#FAFAFA',
      textAlign: 'center',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {icon && (
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: '#fff', border: '1px solid #EDEDED',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: '#525252', marginBottom: 16,
        }}>{icon}</div>
      )}
      <div className="bz-h-tight" style={{ fontSize: 18, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--bz-fg-4)', lineHeight: 1.55, marginBottom: 18 }}>{body}</div>
      {action}
    </div>
  );
}

/* ───────────────────────────────────────────── Sparkline */
function Sparkline({ values, w = 80, h = 24, color = '#0A0A0A' }) {
  if (!values?.length) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1 || 1);
  const points = values.map((v, i) => `${i * stepX},${h - ((v - min) / range) * h}`).join(' ');
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polygon points={area} fill={color} opacity="0.07"/>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

/* ───────────────────────────────────────────── Bar chart (compact) */
function BarChart({ data, maxValue, accent = '#0A0A0A', height = 120 }) {
  const max = maxValue || Math.max(...data.map(d => d.value)) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 0 24px' }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 24);
        const isPeak = d.value === max;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%', maxWidth: 28,
              height: Math.max(h, 4),
              background: isPeak ? accent : '#E5E5E5',
              borderRadius: 4,
              transition: 'height 200ms ease',
            }}/>
            <div style={{ position: 'absolute', bottom: -22, fontSize: 10, color: 'var(--bz-fg-4)', fontWeight: 500 }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────────────────────── Toggle */
function Toggle({ checked, onChange, size = 'md' }) {
  const w = size === 'sm' ? 32 : 38, h = size === 'sm' ? 18 : 22, pad = 2, kn = h - pad * 2;
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative', width: w, height: h,
        background: checked ? '#0A0A0A' : '#E5E5E5',
        borderRadius: 999, border: 0, cursor: 'pointer',
        transition: 'background 150ms', padding: pad,
      }}
    >
      <span style={{
        position: 'absolute', top: pad,
        left: checked ? w - kn - pad : pad,
        width: kn, height: kn, borderRadius: '50%', background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transition: 'left 200ms ease',
      }}/>
    </button>
  );
}

/* ───────────────────────────────────────────── Top progress bar */
function ProgressBar({ value, max = 100, color = '#0A0A0A', height = 6 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div style={{ height, background: '#EDEDED', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 400ms ease' }}/>
    </div>
  );
}

/* Export */
Object.assign(window, {
  React, useState, useEffect, useRef, useMemo,
  LocaleCtx, useLocale, T,
  BuazeLogo, BuazeWordmark,
  Icon, StarRating, Badge, Eyebrow, Avatar,
  PLATFORMS, PlatformChip,
  StatCard, EmptyState, Sparkline, BarChart, Toggle, ProgressBar,
});
