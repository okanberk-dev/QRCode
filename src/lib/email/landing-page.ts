// Standalone HTML pages reached from a mail link (unsubscribe, cancel account
// deletion, ...). One Pulse design in Poppins so the click-through from a mail
// lands on the same visual family instead of three ad-hoc pages.
//
// Pure + dependency-free (no Prisma / next): routes import the page builders
// from landing-pages.ts, fixtures and the visual audit import this file too.
//
// This is a real browser page, not an HTML mail, so flex and inline SVG are
// fine here; the page still works without JS, honours safe-area insets and
// prefers-reduced-motion, and is fluid from 320px up.

import { PULSE, FONTS, MAIL_FONT_CSS_URL, mailAssetUrl } from './tokens';
import { escapeHtml } from './escape';

export type LandingTone = 'success' | 'neutral' | 'warn' | 'danger';

export interface MailLandingPageParams {
  locale: 'tr' | 'en';
  tone: LandingTone;
  /** Small uppercase status chip above the title. */
  eyebrow: string;
  title: string;
  body: string;
  /** <title> of the document. Defaults to "<title without trailing dot> · Buaze". */
  documentTitle?: string;
  /** Long value shown in a code box (e.g. the e-mail address). */
  detail?: { label?: string; value: string };
  /** Primary action. Do not add an arrow to the label — one is drawn. */
  cta?: { href: string; label: string };
}

interface ToneStyle {
  /** Icon chip background / glyph colour. */
  chipBg: string;
  chipFg: string;
  /** Top accent bar + eyebrow dot. */
  accent: string;
  /** Eyebrow pill. */
  pillBg: string;
  pillBorder: string;
  pillFg: string;
  icon: string;
}

const ICONS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5" />',
  alert: '<path d="M12 7.5v6M12 17v.01" />',
  cross: '<path d="M7.5 7.5l9 9M16.5 7.5l-9 9" />',
  info: '<path d="M12 11v6M12 7.5v.01" />',
} as const;

const TONES: Record<LandingTone, ToneStyle> = {
  success: {
    chipBg: PULSE.lime,
    chipFg: PULSE.graphite,
    accent: PULSE.lime,
    pillBg: PULSE.limeSoft,
    pillBorder: '#D8F08A',
    pillFg: PULSE.graphite,
    icon: ICONS.check,
  },
  neutral: {
    chipBg: PULSE.n100,
    chipFg: PULSE.n700,
    accent: PULSE.n300,
    pillBg: PULSE.n100,
    pillBorder: PULSE.n200,
    pillFg: PULSE.n600,
    icon: ICONS.info,
  },
  warn: {
    chipBg: '#FEF3C7',
    chipFg: '#92400E',
    accent: PULSE.warning,
    pillBg: '#FFFBEB',
    pillBorder: '#FDE68A',
    pillFg: '#92400E',
    icon: ICONS.alert,
  },
  danger: {
    chipBg: '#FEE2E2',
    chipFg: '#991B1B',
    accent: PULSE.danger,
    pillBg: '#FEF2F2',
    pillBorder: '#FECACA',
    pillFg: '#991B1B',
    icon: ICONS.cross,
  },
};

const ARROW =
  '<svg class="arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>';

/** http(s) or site-relative only; anything else (javascript:, data:) becomes "#". */
function safeHref(href: string): string {
  const h = href.trim();
  return /^(https?:\/\/|\/(?!\/))/i.test(h) ? h : '#';
}

function stripTrailingDot(s: string): string {
  return s.replace(/[.\s]+$/, '');
}

export function renderMailLandingPage(params: MailLandingPageParams): string {
  const { locale, tone, eyebrow, title, body, detail, cta } = params;
  const t = TONES[tone];
  const isTr = locale !== 'en';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com').replace(/\/+$/, '');
  const documentTitle = params.documentTitle ?? `${stripTrailingDot(title)} · Buaze`;
  const tagline = isTr ? 'Her yorum bir nabız.' : 'Every review is a pulse.';

  const detailBlock = detail
    ? `<div class="detail">
        ${detail.label ? `<div class="label">${escapeHtml(detail.label)}</div>` : ''}
        <div class="value">${escapeHtml(detail.value)}</div>
      </div>`
    : '';

  const ctaBlock = cta
    ? `<div class="actions"><a class="cta" href="${escapeHtml(safeHref(cta.href))}"><span>${escapeHtml(cta.label)}</span>${ARROW}</a></div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${isTr ? 'tr' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="${PULSE.n100}">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(documentTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${MAIL_FONT_CSS_URL}" rel="stylesheet" type="text/css">
<style>
*,*::before,*::after{box-sizing:border-box;}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;}
body{margin:0;background:${PULSE.n100};color:${PULSE.graphite};font-family:${FONTS.body};font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
.page{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:max(32px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(32px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));}
.card{width:100%;max-width:480px;background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:20px;overflow:hidden;box-shadow:0 16px 40px -20px rgba(10,10,10,0.18);}
.bar{height:4px;background:${t.accent};}
.hdr{padding:20px 28px;border-bottom:1px solid ${PULSE.n200};}
.logo{display:inline-flex;align-items:center;gap:7px;text-decoration:none;color:${PULSE.graphite};}
.logo img{display:block;width:28px;height:28px;}
.logo span{font-weight:600;font-size:20px;letter-spacing:-0.03em;line-height:1;}
.main{padding:32px 28px 30px;}
.chip{width:56px;height:56px;border-radius:18px;background:${t.chipBg};color:${t.chipFg};display:flex;align-items:center;justify-content:center;}
.chip svg{display:block;width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;}
.eyebrow{display:inline-flex;align-items:center;gap:8px;max-width:100%;margin:20px 0 0;padding:6px 12px;border-radius:999px;background:${t.pillBg};border:1px solid ${t.pillBorder};color:${t.pillFg};font-weight:600;font-size:11px;line-height:1.4;letter-spacing:0.12em;text-transform:uppercase;}
.eyebrow i{flex:none;width:7px;height:7px;border-radius:50%;background:${t.accent};}
h1{margin:16px 0 12px;font-weight:600;font-size:28px;line-height:1.18;letter-spacing:-0.02em;color:${PULSE.graphite};overflow-wrap:anywhere;text-wrap:balance;}
.copy{margin:0;font-size:15px;line-height:1.65;color:${PULSE.n600};overflow-wrap:anywhere;}
.detail{margin-top:20px;}
.label{font-weight:600;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${PULSE.n500};margin-bottom:8px;}
.value{padding:11px 14px;border-radius:10px;background:${PULSE.n50};border:1px solid ${PULSE.n200};font-family:${FONTS.code};font-size:13px;line-height:1.5;color:${PULSE.n800};overflow-wrap:anywhere;word-break:break-all;}
.actions{margin-top:26px;}
.cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:13px 24px;border-radius:12px;background:${PULSE.graphite};color:${PULSE.pure};font-weight:600;font-size:14px;line-height:1.2;text-decoration:none;transition:background-color .18s ease,transform .18s ease;}
.cta:hover{background:${PULSE.n800};}
.cta:active{transform:scale(0.98);}
.cta:focus-visible,.logo:focus-visible,.ftr a:focus-visible{outline:3px solid ${PULSE.lime};outline-offset:3px;}
.cta .arrow{flex:none;}
.ftr{background:${PULSE.n50};border-top:1px solid ${PULSE.n200};padding:22px 28px 22px;}
.ftr img.ecg{display:block;width:100%;height:auto;margin:0 0 16px;border:0;}
.ftr .row{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 16px;font-size:12px;line-height:1.5;color:${PULSE.n500};}
.ftr a{color:${PULSE.n700};font-weight:500;text-decoration:none;border-bottom:1px solid ${PULSE.n300};}
@media (max-width:520px){
  .main{padding:28px 22px 26px;}
  .hdr{padding:18px 22px;}
  .ftr{padding:20px 22px;}
  h1{font-size:24px;}
  .cta{display:flex;width:100%;}
}
@media (prefers-reduced-motion:no-preference){
  .chip{animation:pop .5s cubic-bezier(0.2,0.9,0.3,1.2) both;}
  @keyframes pop{from{opacity:0;transform:scale(0.7);}to{opacity:1;transform:scale(1);}}
}
@media (prefers-reduced-motion:reduce){
  .cta{transition:none;}
}
</style>
</head>
<body>
<div class="page">
  <main class="card" data-audit-shell>
    <div class="bar"></div>
    <div class="hdr">
      <a class="logo" href="${escapeHtml(appUrl)}">
        <img src="${mailAssetUrl('buaze-mark-dark.png')}" width="28" height="28" alt="">
        <span>buaze</span>
      </a>
    </div>
    <div class="main">
      <div class="chip" aria-hidden="true"><svg viewBox="0 0 24 24">${t.icon}</svg></div>
      <div class="eyebrow"><i></i><span>${escapeHtml(eyebrow)}</span></div>
      <h1>${escapeHtml(title)}</h1>
      <p class="copy">${escapeHtml(body)}</p>
      ${detailBlock}
      ${ctaBlock}
    </div>
    <div class="ftr">
      <img class="ecg" src="${mailAssetUrl('buaze-ecg-lime.png')}" width="600" height="28" alt="">
      <div class="row">
        <a href="${escapeHtml(appUrl)}">buaze.com</a>
        <span>${tagline}</span>
      </div>
    </div>
  </main>
</div>
</body>
</html>`;
}
