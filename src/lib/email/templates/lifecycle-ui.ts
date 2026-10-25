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
 *  stacked sections don't open a 56px gap between each other. */
export function lcSection(
  inner: string,
  opts: { bg?: string; padding?: string; hero?: boolean } = {},
): string {
  const bg = opts.bg ? `background:${opts.bg};` : '';
  const cls = opts.hero ? 'bz-pad' : 'bz-pad-tight';
  return `<tr><td class="${cls}" style="${bg}padding:${opts.padding ?? '36px 40px'};">${inner}</td></tr>`;
}

/** Full-bleed ECG line in its own row (replaces the old negative-margin trick). */
export function lcEcgRow(bg: string, tone: 'graphite' | 'lime'): string {
  const asset = tone === 'graphite' ? 'buaze-ecg-graphite.png' : 'buaze-ecg-lime.png';
  return `<tr><td style="background:${bg};padding:0;font-size:0;line-height:0;"><img src="${mailAssetUrl(asset)}" width="640" height="30" alt="" class="bz-fluid" style="display:block;width:100%;max-width:100%;height:auto;border:0;outline:none;"></td></tr>`;
}

export function lcH1(html: string, opts: { color?: string; size?: number } = {}): string {
  const size = opts.size ?? 34;
  const cls = size >= 40 ? 'bz-h1-lg' : 'bz-h1';
  return `<h1 class="${cls}" style="font-family:${FONTS.heading};font-size:${size}px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:${opts.color ?? PULSE.graphite};margin:0;">${html}</h1>`;
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

export { TABLE as LC_TABLE };
