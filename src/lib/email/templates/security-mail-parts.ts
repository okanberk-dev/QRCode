// Shared building blocks for the security & account mails (forgot-password,
// password-changed, new-device-login, verify-email, data-export-confirmation,
// account-deletion-scheduled, account-deletion-canceled).
//
// Table-based, inline-styled, no flex/grid/svg so Gmail + Outlook render it the
// same as Apple Mail. Mobile behaviour comes from the shared layout.ts classes
// (bz-pad, stack-row, stack-col, col-half, bz-btn, bz-break, bz-code).
//
// Every string passed in is expected to be HTML-safe already (templates escape
// user values and run copy through deepSubstitute before calling these).

import { PULSE, FONTS } from '../tokens';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, spacer } from '../components';

export type SecurityTone = 'neutral' | 'danger' | 'success';

const TONES: Record<SecurityTone, { bg: string; border: string; rule: string }> = {
  neutral: { bg: PULSE.n50, border: PULSE.n200, rule: PULSE.n200 },
  danger: { bg: '#FEF2F2', border: '#FECACA', rule: '#FBD5D5' },
  success: { bg: PULSE.limeSoft, border: PULSE.lime, rule: '#D2EA8A' },
};

/** Padded content cell — the layout shell has no padding of its own. */
export function securityContent(inner: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 40px;">${inner}</td>
      </tr>
    </table>
  `;
}

export interface SecurityHeroOpts {
  eyebrow: string;
  eyebrowColor?: string;
  title: string;
  accent: string;
  accentColor: string;
  /** Put the accent on its own line (<br/>) instead of after a space. */
  breakBeforeAccent?: boolean;
  /** Trailing glyph appended after the accent (e.g. a lime full stop). */
  accentSuffix?: string;
  intro: string;
}

export function securityHero(o: SecurityHeroOpts): string {
  const sep = o.breakBeforeAccent ? '<br/>' : ' ';
  const heading = `${o.title}${sep}<span style="color:${o.accentColor};">${o.accent}</span>${o.accentSuffix ?? ''}`;
  return `
    ${renderEyebrow(o.eyebrow, o.eyebrowColor ?? PULSE.n500)}
    ${spacer(14)}
    ${renderH1(heading)}
    ${spacer(16)}
    ${renderP(o.intro)}
  `;
}

export interface StatusPillOpts {
  text: string;
  dotColor: string;
  bgColor: string;
  textColor?: string;
}

/** Status chip that is allowed to wrap (renderStatusPill is nowrap, which
 *  overflows on 320px when the status copy is long). */
export function securityPill(o: StatusPillOpts): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:${o.bgColor};border-radius:14px;border-collapse:separate;border-spacing:0;">
    <tr>
      <td valign="middle" style="padding:8px 0 8px 12px;width:8px;line-height:1px;font-size:1px;"><div style="width:8px;height:8px;border-radius:4px;background:${o.dotColor};line-height:8px;font-size:1px;">&nbsp;</div></td>
      <td valign="middle" style="padding:8px 14px 8px 8px;font-family:${FONTS.body};font-size:12px;font-weight:500;line-height:1.4;color:${o.textColor ?? PULSE.graphite};">${o.text}</td>
    </tr>
  </table>`;
}

export interface SecurityCardOpts {
  tone: SecurityTone;
  eyebrow: string;
  pill?: StatusPillOpts;
  body: string;
}

export function securityCard(o: SecurityCardOpts): string {
  const t = TONES[o.tone];
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${t.bg};border:1px solid ${t.border};border-radius:16px;border-collapse:separate;border-spacing:0;">
      <tr>
        <td style="padding:22px 20px 18px;">
          ${renderEyebrow(o.eyebrow, o.tone === 'danger' ? '#B91C1C' : PULSE.n600)}
          ${o.pill ? `${spacer(10)}${securityPill(o.pill)}` : ''}
          ${spacer(12)}
          ${o.body}
        </td>
      </tr>
    </table>
  `;
}

export interface MetaItem {
  label: string;
  /** HTML-safe value. */
  value: string;
  /** IP / token style value → monospace + break-anywhere. */
  code?: boolean;
  /** Emails, device strings, long free text → break-anywhere, Poppins. */
  breakable?: boolean;
  /** Large display value (dates, counters). */
  strong?: boolean;
  color?: string;
  /** Own row spanning both columns. */
  full?: boolean;
}

function metaCell(item: MetaItem, side: 'left' | 'right' | 'full', rule: string): string {
  const pad = side === 'left' ? '0 12px 0 0' : side === 'right' ? '0 0 0 12px' : '0';
  const width = side === 'full' ? '' : 'width:50%;';
  const colspan = side === 'full' ? ' colspan="2"' : '';
  const valueStyle = item.strong
    ? `font-family:${FONTS.heading};font-size:20px;font-weight:600;letter-spacing:-0.01em;line-height:1.25;color:${item.color ?? PULSE.graphite};`
    : item.code
      ? `font-family:${FONTS.code};font-size:13px;font-weight:500;line-height:1.5;color:${item.color ?? PULSE.graphite};`
      : `font-family:${FONTS.body};font-size:13px;font-weight:500;line-height:1.5;color:${item.color ?? PULSE.graphite};`;
  const cls = item.code || item.breakable ? ' class="bz-break"' : '';
  // Hairline lives on the <td> (not an inner div) so the two columns of a row
  // join into one continuous rule, and on mobile (td padding is forced to
  // 6px 0 by layout.ts) the rule sits flush above the stacked cell.
  return `<td${colspan} class="stack-col col-half" valign="top" style="${width}padding:${pad};border-top:1px solid ${rule};">
      <div style="padding:9px 0 9px;">
        ${renderEyebrow(item.label, PULSE.n500)}
        <div${cls} style="margin-top:4px;${valueStyle}">${item.value}</div>
      </div>
    </td>`;
}

/** Label/value grid: 2 columns on desktop, 1 on mobile, hairline per row.
 *  Items pair up in order; `full` items (or an odd leftover) take a whole row. */
export function securityMetaGrid(items: MetaItem[], tone: SecurityTone = 'neutral'): string {
  const rule = TONES[tone].rule;
  const rows: MetaItem[][] = [];
  let pending: MetaItem | null = null;
  for (const item of items) {
    if (item.full) {
      if (pending) { rows.push([pending]); pending = null; }
      rows.push([item]);
    } else if (pending) {
      rows.push([pending, item]);
      pending = null;
    } else {
      pending = item;
    }
  }
  if (pending) rows.push([pending]);

  const trs = rows.map((r) =>
    r.length === 2
      ? `<tr>${metaCell(r[0], 'left', rule)}${metaCell(r[1], 'right', rule)}</tr>`
      : `<tr>${metaCell(r[0], 'full', rule)}</tr>`,
  ).join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">${trs}</table>`;
}

/** Monospace box for a reset / verify URL shown as text. */
export function securityUrlBox(displayUrl: string): string {
  return `<div class="bz-break" style="font-family:${FONTS.code};font-size:12px;line-height:1.55;color:${PULSE.n600};background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:10px;padding:11px 14px;">${displayUrl}</div>`;
}

/** Labelled one-time code box (OTP style). */
export function securityCodeBox(label: string, code: string): string {
  return `
    <div style="font-family:${FONTS.body};font-size:12px;line-height:1.5;color:${PULSE.n500};">${label}</div>
    <div class="bz-code bz-break" style="margin-top:8px;font-family:${FONTS.code};font-size:26px;font-weight:600;letter-spacing:0.22em;line-height:1.3;color:${PULSE.graphite};background:${PULSE.pure};border:1px dashed ${PULSE.n300};border-radius:10px;padding:12px 16px 12px 22px;text-align:center;">${code}</div>
  `;
}

export interface NotYouOpts {
  tone: 'danger' | 'calm';
  title: string;
  /** HTML-safe body (may contain a link). */
  body: string;
  cta?: { href: string; label: string };
}

/** The "not you?" card. Stays prominent: tinted surface, 4px accent rail, glyph
 *  chip, and (for action cases) a real full-width-on-mobile button. */
export function securityNotYou(o: NotYouOpts): string {
  const danger = o.tone === 'danger';
  const bg = danger ? '#FEF2F2' : PULSE.limeSoft;
  const rail = danger ? PULSE.danger : PULSE.limeDeep;
  const chipBg = danger ? PULSE.danger : PULSE.graphite;
  const chipFg = danger ? PULSE.pure : PULSE.lime;
  const glyph = danger ? '!' : '?';
  const btnBg = danger ? PULSE.danger : PULSE.graphite;
  const btnFg = PULSE.pure;
  const cta = o.cta
    ? `${spacer(14)}<a href="${escapeHtml(o.cta.href)}" class="bz-btn" style="display:inline-block;background:${btnBg};color:${btnFg};padding:13px 22px;border-radius:10px;font-family:${FONTS.body};font-weight:600;font-size:14px;line-height:1.2;text-decoration:none;mso-padding-alt:0;">${o.cta.label}</a>`
    : '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${bg};border-left:4px solid ${rail};border-radius:6px 14px 14px 6px;border-collapse:separate;border-spacing:0;">
      <tr>
        <td style="padding:18px 20px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="middle" style="width:40px;padding:0 12px 0 0;">
                <div style="width:28px;height:28px;border-radius:14px;background:${chipBg};color:${chipFg};text-align:center;font-family:${FONTS.heading};font-size:15px;font-weight:700;line-height:28px;">${glyph}</div>
              </td>
              <td valign="middle" style="font-family:${FONTS.heading};font-size:16px;font-weight:600;line-height:1.3;color:${PULSE.graphite};">${o.title}</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:10px 0 0;font-family:${FONTS.body};font-size:13.5px;line-height:1.65;color:${PULSE.n700};">${o.body}${cta}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}
