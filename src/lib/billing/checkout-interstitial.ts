import { createHash } from 'node:crypto';
import { billingText } from './billing-copy';
import { formatIstanbulDate, formatTry, type BillingLocale } from './billing-format';

/**
 * The hand-off page between Buaze and PayNKolay's hosted card page (billing
 * spec §12.5, §6.1). A self-contained HTML document that auto-submits the
 * signed form to `${base}/Vpos` after a short pause.
 *
 * Hardening (S-13):
 *  - one constant inline <style> and one constant inline <script>, each
 *    allowed by its SHA-256 hash; nothing is ever interpolated into them —
 *    per-request values (delay, back URL) travel in `data-` attributes of the
 *    <form>, so the hashes never change;
 *  - no `style=""` attribute anywhere (a hash does not cover attributes);
 *  - `form-action https:` lets the 3D Secure redirect chain through
 *    (CLAUDE.md §44.2) but blocks javascript:, data: and http: targets;
 *  - every value is HTML-escaped (`& < > " '`); the customerKey appears only
 *    in its hidden input, and only on payments that save a card (D13);
 *  - `pageshow` from the back/forward cache sends the owner to the review
 *    page (a new payment), never re-enabling or resubmitting the old form.
 */

export interface InterstitialInput {
  /** `${cfg.baseUrl}/Vpos`. */
  action: string;
  /** Signed hosted-form fields (buildHostedCheckout). */
  fields: Record<string, string>;
  locale: BillingLocale;
  summary: {
    planName: string;
    cycle: 'monthly' | 'yearly';
    amountMinor: number;
    saveCard: boolean;
    autoRenewFrom: Date | null;
    intent: 'new' | 'renew' | 'replace_card';
  };
  /** Same-origin path of the review page; also where a bfcache `pageshow` navigates. */
  backUrl: string;
  /** Auto-submit delay in ms (default 900; 0 under prefers-reduced-motion). */
  delayMs?: number;
}

/** Escapes & < > " ' — enough for text content and double-quoted attribute values. */
export function htmlEscape(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Constant: reads its inputs from data- attributes only. Never interpolate into this string. */
export const INTERSTITIAL_SCRIPT = [
  '(function(){',
  "var f=document.getElementById('pnk');if(!f)return;",
  "var b=document.getElementById('pnk-go');var bar=document.getElementById('pnk-bar');var sent=false;",
  "function lock(){sent=true;if(b){b.disabled=true;b.setAttribute('aria-busy','true');}f.setAttribute('aria-busy','true');}",
  'function go(){if(sent)return;lock();f.submit();}',
  "f.addEventListener('submit',function(e){if(sent){e.preventDefault();return;}lock();});",
  "var back=f.getAttribute('data-back')||'';",
  "function safe(u){return u.charAt(0)==='/'&&u.charAt(1)!=='/'&&u.charAt(1)!=='\\\\';}",
  "window.addEventListener('pageshow',function(e){if(e.persisted&&safe(back)){location.replace(back);}});",
  "var d=parseInt(f.getAttribute('data-delay')||'900',10);if(!(d>=0&&d<=10000))d=900;",
  "var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;if(reduce)d=0;",
  "if(bar&&!reduce){bar.className+=' run';}",
  'setTimeout(go,d);',
  '})();',
].join('');

/** Constant stylesheet (system font stack: the policy has no font-src). Never interpolate into this string. */
export const INTERSTITIAL_STYLE = [
  '*{box-sizing:border-box}',
  'html,body{margin:0;padding:0}',
  'body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FAFAFA;color:#0A0A0A;',
  'font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;padding:24px 16px}',
  'main{width:100%;max-width:440px;text-align:center}',
  '.mark{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:18px;letter-spacing:-0.02em}',
  '.eyebrow{margin:20px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.18em;color:#737373;text-transform:uppercase}',
  'h1{margin:10px 0 0;font-size:22px;line-height:1.25;font-weight:600;letter-spacing:-0.02em}',
  '.lead{margin:10px auto 0;max-width:360px;font-size:14px;line-height:1.55;color:#525252}',
  '.card{margin:24px 0 0;background:#FFFFFF;border:1px solid #EDEDED;border-radius:14px;padding:16px 18px;text-align:left}',
  '.row{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
  '.plan{font-size:14px;font-weight:600}',
  '.amount{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:15px;font-weight:600;white-space:nowrap}',
  '.tick{position:relative;margin:10px 0 0;padding-left:26px;font-size:13px;line-height:1.45;color:#404040}',
  '.tick:before{content:"";position:absolute;left:0;top:1px;width:16px;height:16px;border-radius:50%;background:#C6F24E}',
  '.tick:after{content:"";position:absolute;left:6px;top:4px;width:4px;height:8px;border:solid #0A0A0A;border-width:0 2px 2px 0;transform:rotate(45deg)}',
  '.track{margin:24px auto 0;height:3px;width:100%;max-width:280px;border-radius:3px;background:#EDEDED;overflow:hidden}',
  '.bar{height:100%;width:100%;background:#C6F24E;transform-origin:left;transform:scaleX(1)}',
  '.bar.run{transform:scaleX(0);animation:fill .9s ease-out forwards}',
  '@keyframes fill{to{transform:scaleX(1)}}',
  'button{margin:20px auto 0;display:block;width:100%;max-width:320px;min-height:48px;border:0;border-radius:999px;background:#0A0A0A;color:#FFFFFF;',
  'font:inherit;font-size:15px;font-weight:600;cursor:pointer;transition:background .15s ease}',
  'button:hover{background:#262626}',
  'button:focus-visible,a:focus-visible{outline:2px solid #C6F24E;outline-offset:3px}',
  'button[disabled]{opacity:.75;cursor:progress}',
  '.cancel{display:inline-block;margin:14px 0 0;padding:8px 12px;font-size:14px;color:#525252;text-decoration:underline;text-underline-offset:3px}',
  '.trust{margin:20px 0 0;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#737373}',
  '.lock{flex:none}',
  'noscript p{margin:16px 0 0;font-size:13px;color:#525252}',
  '@media (prefers-reduced-motion: reduce){.bar.run{animation:none;transform:scaleX(1)}button{transition:none}}',
].join('');

function sha256Base64(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('base64');
}

export const INTERSTITIAL_SCRIPT_HASH = `sha256-${sha256Base64(INTERSTITIAL_SCRIPT)}`;
export const INTERSTITIAL_STYLE_HASH = `sha256-${sha256Base64(INTERSTITIAL_STYLE)}`;

/** The hand-off page's own policy (no nonce, no 'unsafe-inline'). */
export function interstitialCsp(): string {
  return [
    "default-src 'none'",
    `script-src '${INTERSTITIAL_SCRIPT_HASH}'`,
    `style-src '${INTERSTITIAL_STYLE_HASH}'`,
    'img-src data:',
    'form-action https:',
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Response headers of the hand-off page (§8.4 step 7). */
export function interstitialHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': interstitialCsp(),
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex',
  };
}

// Graphite speech bubble with the ECG line and the lime spark (BuazeLogo's mark).
const MARK_SVG =
  '<svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false">' +
  '<path d="M10 14 Q10 8 16 8 L48 8 Q54 8 54 14 L54 36 Q54 42 48 42 L30 42 L22 52 L22 42 L16 42 Q10 42 10 36 Z" fill="#0A0A0A"/>' +
  '<path d="M15 26 L22 26 L25 18 L30 34 L34 22 L38 28 L49 28" stroke="#FFFFFF" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<circle cx="54" cy="10" r="5" fill="#C6F24E"/></svg>';

const LOCK_SVG =
  '<svg class="lock" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#737373" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
  '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

function isSafeBackUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/\\');
}

/** The full HTML document of the hand-off page. */
export function renderCheckoutInterstitial(input: InterstitialInput): string {
  const { locale, summary } = input;
  const t = (key: Parameters<typeof billingText>[0], vars?: Record<string, string | number>) => htmlEscape(billingText(key, locale, vars));
  if (!/^https:\/\/[^/?#\s]+\/Vpos$/.test(input.action)) throw new Error('interstitial: unexpected form action');
  const backUrl = isSafeBackUrl(input.backUrl) ? input.backUrl : `/${locale}/dashboard/account?section=billing`;
  const delay = Number.isInteger(input.delayMs) && (input.delayMs as number) >= 0 && (input.delayMs as number) <= 10_000 ? input.delayMs : 900;

  const inputs = Object.entries(input.fields)
    .map(([name, value]) => `<input type="hidden" name="${htmlEscape(name)}" value="${htmlEscape(value)}">`)
    .join('');
  const amount = formatTry(summary.amountMinor, locale);
  const cycle = billingText(summary.cycle === 'yearly' ? 'review.yearly' : 'review.monthly', locale);
  const kind =
    summary.intent === 'renew' ? ` · ${billingText('inter.renew', locale)}` : summary.intent === 'replace_card' ? ` · ${billingText('inter.replace', locale)}` : '';
  const ticks: string[] = [];
  if (summary.saveCard) ticks.push(`<p class="tick">${t('inter.save')}</p>`);
  if (summary.autoRenewFrom) {
    // The amount repeats once per billing cycle: a yearly plan must not read "every month".
    ticks.push(`<p class="tick">${t(summary.cycle === 'yearly' ? 'inter.autoYearly' : 'inter.auto', { date: formatIstanbulDate(summary.autoRenewFrom, locale), amount })}</p>`);
  }

  return (
    `<!doctype html><html lang="${locale}"><head><meta charset="utf-8">` +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">' +
    `<title>${t('inter.title')} · Buaze</title><style>${INTERSTITIAL_STYLE}</style></head>` +
    '<body><main>' +
    `<div class="mark">${MARK_SVG}<span>buaze</span></div>` +
    `<p class="eyebrow">${t('inter.eyebrow')}</p>` +
    `<h1>${t('inter.title')}</h1>` +
    `<p class="lead">${t('inter.body')}</p>` +
    `<div class="card"><div class="row"><span class="plan">${htmlEscape(summary.planName)} · ${htmlEscape(cycle)}${htmlEscape(kind)}</span>` +
    `<span class="amount">${htmlEscape(amount)}</span></div>${ticks.join('')}</div>` +
    `<form id="pnk" method="post" action="${htmlEscape(input.action)}" data-delay="${delay}" data-back="${htmlEscape(backUrl)}">` +
    inputs +
    '<div class="track" aria-hidden="true"><div id="pnk-bar" class="bar"></div></div>' +
    `<button id="pnk-go" type="submit">${t('inter.button')}</button>` +
    '</form>' +
    `<noscript><p>${t('inter.noscript')}</p></noscript>` +
    `<a class="cancel" href="${htmlEscape(backUrl)}">${t('inter.cancel')}</a>` +
    `<p class="trust">${LOCK_SVG}<span>${t('inter.trust')}</span></p>` +
    `</main><script>${INTERSTITIAL_SCRIPT}</script></body></html>`
  );
}
