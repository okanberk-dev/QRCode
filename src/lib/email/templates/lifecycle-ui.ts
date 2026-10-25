// Layout building blocks shared by the g4 lifecycle & onboarding mails
// (welcome, trial-ending, upgrade-suggestion, inactive-reactivation,
// qr-not-downloaded, qr-no-scans-reminder, first-feedback-tips).
//
// Everything is table + inline-style so it survives Gmail / Outlook / iOS Mail:
// no flex, no inline SVG, no negative margins. Content rows use `bz-pad`
// (28/22 on phones, see layout.ts) so copy never touches the shell edge.

import { PULSE, FONTS, mailAssetUrl } from '../tokens';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderP, spacer } from '../components';

/** Amber status palette (contrast-safe: 7:1 text on tint). */
export const WARN = { bg: '#FEF3C7', fg: '#92400E', line: '#FDE68A', dot: PULSE.warning } as const;

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

/** Wraps rows in the single full-width table that pulseLayout expects. */
export function lcPage(rows: string[]): string {
  return `<table ${TABLE} width="100%" style="width:100%;">${rows.join('')}</table>`;
}

/** One content row. Phones get the shared gutters from layout.ts: `bz-pad`
 *  (28/22) for hero bands, `bz-pad-tight` (22/22) for the rows that follow so
 *  stacked sections don't open a 56px gap between each other. The wrap guard is
 *  inline (inherited by everything inside) so a long name / price / URL still
 *  breaks when a client strips the <style> block (Gmail app, non-Google accounts). */
export function lcSection(
  inner: string,
  opts: { bg?: string; padding?: string; hero?: boolean } = {},
): string {
  const bg = opts.bg ? `background:${opts.bg};` : '';
  const cls = opts.hero ? 'bz-pad' : 'bz-pad-tight';
  return `<tr><td class="${cls}" style="${bg}padding:${opts.padding ?? '36px 40px'};overflow-wrap:anywhere;word-break:break-word;">${inner}</td></tr>`;
}

/** Full-bleed ECG line in its own row (replaces the old negative-margin trick). */
export function lcEcgRow(bg: string, tone: 'graphite' | 'lime'): string {
  const asset = tone === 'graphite' ? 'buaze-ecg-graphite.png' : 'buaze-ecg-lime.png';
  return `<tr><td style="background:${bg};padding:0;font-size:0;line-height:0;"><img src="${mailAssetUrl(asset)}" width="640" height="30" alt="" class="bz-fluid" style="display:block;width:100%;max-width:100%;height:auto;border:0;outline:none;"></td></tr>`;
}

export function lcH1(html: string, opts: { color?: string; size?: number } = {}): string {
  const size = opts.size ?? 34;
  const cls = size >= 40 ? 'bz-h1-lg' : 'bz-h1';
  return `<h1 class="${cls}" style="font-family:${FONTS.heading};font-size:${size}px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${opts.color ?? PULSE.graphite};margin:0;overflow-wrap:anywhere;word-break:break-word;">${html}</h1>`;
}

/** Second tier of a two-line headline ("Merhaba Mert." / "Şimdi başlıyoruz."). A
 *  block with a small top margin instead of `<br/>`: Poppins' glyph box (1.4em)
 *  is taller than the 1.12-1.18 line-height the phone layout forces on h1, so
 *  adjacent lines otherwise collide. `titleSize` is the h1 font size. */
export function lcSubLine(html: string, titleSize: number, style = ''): string {
  return `<span style="display:block;margin-top:${Math.round(titleSize * 0.19)}px;${style}">${html}</span>`;
}

/** Amber pill used as an eyebrow when a mail flags something that needs attention. */
export function lcWarnPill(text: string): string {
  return `<span style="display:inline-block;max-width:100%;font-family:${FONTS.label};font-size:11px;font-weight:600;letter-spacing:0.12em;line-height:1.45;text-transform:uppercase;color:${WARN.fg};background:${WARN.bg};padding:6px 12px;border-radius:999px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${WARN.dot};margin-right:8px;vertical-align:middle;"></span><span style="vertical-align:middle;">${text}</span></span>`;
}

export interface LcHeroOpts {
  eyebrow: string;
  /** Plain uppercase label (default) or the amber attention pill. */
  eyebrowTone?: 'plain' | 'warn';
  eyebrowColor?: string;
  /** HTML (copy-owned). */
  title: string;
  titleSize?: number;
  titleColor?: string;
  /** HTML paragraphs rendered under the title. */
  intro?: string[];
  introColor?: string;
  introSize?: number;
  bg?: string;
  /** Adds a full-bleed ECG row under the hero band. */
  ecg?: 'graphite' | 'lime';
  padding?: string;
}

/** Hero band: eyebrow, H1, intro. Returns one or two `<tr>` rows. */
export function lcHero(opts: LcHeroOpts): string {
  const bg = opts.bg ?? PULSE.pure;
  const eyebrow = opts.eyebrowTone === 'warn'
    ? lcWarnPill(opts.eyebrow)
    : renderEyebrow(opts.eyebrow, opts.eyebrowColor ?? PULSE.n500);
  const intro = (opts.intro ?? [])
    .map((p, i) => `${i > 0 ? spacer(12) : ''}${renderP(p, { size: opts.introSize ?? 15, color: opts.introColor ?? PULSE.n600 })}`)
    .join('');
  const inner = `${eyebrow}${spacer(16)}${lcH1(opts.title, { size: opts.titleSize, color: opts.titleColor })}${intro ? spacer(16) + intro : ''}`;
  const row = lcSection(inner, { bg, hero: true, padding: opts.padding ?? (opts.ecg ? '40px 40px 32px' : '40px 40px 8px') });
  return row + (opts.ecg ? lcEcgRow(bg, opts.ecg) : '');
}

/** Table-cell icon chip (a div + line-height collapses in Outlook, a cell does not). */
export function lcChip(
  label: string,
  opts: { size?: number; bg?: string; fg?: string; radius?: number; fontSize?: number } = {},
): string {
  const size = opts.size ?? 36;
  const bg = opts.bg ?? PULSE.graphite;
  const fg = opts.fg ?? PULSE.lime;
  const radius = opts.radius ?? Math.round(size * 0.28);
  const fontSize = opts.fontSize ?? Math.round(size * 0.34);
  return `<table ${TABLE} width="${size}" style="width:${size}px;border-collapse:separate;"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;background:${bg};border-radius:${radius}px;font-family:${FONTS.label};font-size:${fontSize}px;font-weight:600;line-height:1;color:${fg};text-align:center;">${label}</td></tr></table>`;
}

/** Quiet secondary action under a CTA. Padded so it is a real tap target. */
export function lcTextLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 0;font-family:${FONTS.body};font-size:14px;font-weight:500;line-height:1.4;color:${PULSE.n700};text-decoration:underline;">${label}</a>`;
}

/** Card surface. `separate` keeps border-radius working inside collapsed-border tables. */
export function lcCard(
  inner: string,
  opts: { bg?: string; border?: string; borderWidth?: number; radius?: number; padding?: string } = {},
): string {
  const bw = opts.borderWidth ?? 1;
  return `<div style="background:${opts.bg ?? PULSE.n50};border:${bw}px solid ${opts.border ?? PULSE.n200};border-radius:${opts.radius ?? 16}px;padding:${opts.padding ?? '20px'};">${inner}</div>`;
}

/** Muted closing note separated from the body by a hairline. */
export function lcFootnote(text: string): string {
  return lcSection(
    `<div style="border-top:1px solid ${PULSE.n200};padding-top:20px;">${renderP(text, { size: 12, color: PULSE.n500 })}</div>`,
    { padding: '4px 40px 40px' },
  );
}

/** Walks strings inside copy objects/arrays (non-strings pass through). */
export function lcMapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === 'string') return fn(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => lcMapStrings(v, fn)) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = lcMapStrings(v, fn);
    return out as T;
  }
  return value;
}

/** True when the recipient has a usable first name (whitespace-only counts as none). */
export function lcHasName(firstName?: string | null): boolean {
  return Boolean(firstName && firstName.trim());
}

const GREETING = '(?:Merhaba|Selam|Sevgili|Hi|Hello|Hey|Dear)';

/** Removes the `${firstName}` token from copy for recipients without a name, plus
 *  the greeting/punctuation that hung off it. "Merhaba ${firstName}, QR kodunuz
 *  sizi bekliyor" -> "QR kodunuz sizi bekliyor" (first letter re-capitalised for
 *  the locale); "Hi ${firstName}." -> "Hi."; mid-sentence tokens just disappear
 *  with their stray space/comma. Copy without the token is returned untouched,
 *  so call it only when there is no name (see {@link lcHasName}). */
export function lcDropNameToken<T>(value: T, locale: 'tr' | 'en'): T {
  const up = (c: string) => (locale === 'tr' ? c.toLocaleUpperCase('tr-TR') : c.toUpperCase());
  return lcMapStrings(value, (s) => {
    if (!s.includes('${firstName}')) return s;
    return s
      .replace(new RegExp(`^(\\s*)${GREETING}\\s+\\$\\{firstName\\}\\s*[,:;\\u2014-]\\s*(\\S)`, 'i'), (_m, lead: string, c: string) => `${lead}${up(c)}`)
      .replace(/\s*\$\{firstName\}/g, '')
      .replace(/\s+([,.!?:;])/g, '$1')
      .replace(/ {2,}/g, ' ');
  });
}

export { TABLE as LC_TABLE };
