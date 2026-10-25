// Shared building blocks for the team mails (team-invite, team-member-joined,
// team-member-removed).
//
// Table-based + inline-styled (no flex/grid/svg) so Gmail and Outlook render it
// like Apple Mail. Mobile behaviour comes from the shared layout.ts classes
// (bz-pad, bz-pad-tight, bz-btn, bz-break, bz-h1).
//
// Every string passed in is expected to be HTML-safe already (templates escape
// user values and run copy through deepSubstitute before calling these).

import { PULSE, FONTS } from '../tokens';
import { escapeHtml } from '../escape';
import { renderEyebrow } from '../components';

export type TeamTone = 'lime' | 'neutral';

const TONES: Record<TeamTone, { bg: string; border: string; rule: string; label: string; avatarBg: string; chipBg: string; chipFg: string }> = {
  lime: {
    bg: PULSE.limeSoft,
    border: PULSE.lime,
    rule: '#D2EA8A',
    label: PULSE.n600,
    avatarBg: PULSE.lime,
    chipBg: PULSE.graphite,
    chipFg: PULSE.lime,
  },
  neutral: {
    bg: PULSE.n50,
    border: PULSE.n200,
    rule: PULSE.n200,
    label: PULSE.n500,
    avatarBg: PULSE.n200,
    chipBg: PULSE.n200,
    chipFg: PULSE.n700,
  },
};

/** Padded content cell — the layout shell has no padding of its own. */
export function teamContent(inner: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px;">${inner}</td>
      </tr>
    </table>
  `;
}

/** Rounded card. Border + radius live on the <td> of a border-collapse:separate
 *  table (the shared <style> sets collapse, which drops rounded borders). */
export function teamCard(tone: TeamTone, eyebrow: string | null, rows: string): string {
  const t = TONES[tone];
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:separate;border-spacing:0;">
      <tr>
        <td class="bz-pad-tight" style="background:${t.bg};border:1px solid ${t.border};border-radius:16px;padding:24px;">
          ${eyebrow ? renderEyebrow(eyebrow, t.label) : ''}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${eyebrow ? 'margin-top:14px;' : ''}">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  `;
}

/** One label/value row inside a card. `first` drops the top hairline, `last`
 *  drops the bottom padding. */
export function teamRow(
  tone: TeamTone,
  label: string,
  valueHtml: string,
  pos: { first?: boolean; last?: boolean } = {},
): string {
  const t = TONES[tone];
  const top = pos.first ? '0' : '14px';
  const bottom = pos.last ? '0' : '14px';
  const rule = pos.first ? '' : `border-top:1px solid ${t.rule};`;
  return `
    <tr>
      <td valign="top" style="padding:${top} 0 ${bottom};${rule}">
        <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.12em;line-height:1.5;text-transform:uppercase;font-weight:600;color:${t.label};">${label}</div>
        <div style="margin-top:6px;">${valueHtml}</div>
      </td>
    </tr>
  `;
}

/** Role label as a chip. Allowed to wrap: roles are free text from the caller. */
export function teamRoleChip(tone: TeamTone, roleHtml: string): string {
  const t = TONES[tone];
  return `<span style="display:inline-block;background:${t.chipBg};color:${t.chipFg};font-family:${FONTS.body};font-size:13px;font-weight:600;line-height:1.35;padding:6px 14px;border-radius:10px;">${roleHtml}</span>`;
}

/** Initial in a circle + name, side by side (table-based, no inline-block tricks).
 *  `nameHtml` is HTML-safe; the initial is derived from the raw name. */
export function teamPerson(tone: TeamTone, rawName: string, nameHtml: string, subHtml?: string): string {
  const t = TONES[tone];
  const first = Array.from(rawName.trim())[0] ?? '?';
  const initial = escapeHtml(first.toLocaleUpperCase());
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td valign="middle" width="44" style="width:44px;padding:0 12px 0 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44">
            <tr>
              <td width="44" height="44" align="center" valign="middle" style="width:44px;height:44px;background:${t.avatarBg};border-radius:22px;font-family:${FONTS.heading};font-size:17px;font-weight:600;line-height:44px;color:${PULSE.graphite};">${initial}</td>
            </tr>
          </table>
        </td>
        <td valign="middle" class="bz-break" style="font-family:${FONTS.heading};font-size:18px;font-weight:600;line-height:1.3;letter-spacing:-0.01em;color:${PULSE.graphite};">
          ${nameHtml}${subHtml ? `<div class="bz-break" style="margin-top:2px;font-family:${FONTS.body};font-size:13px;font-weight:400;letter-spacing:0;line-height:1.45;color:${PULSE.n600};">${subHtml}</div>` : ''}
        </td>
      </tr>
    </table>
  `;
}

/** Bulleted list of already-escaped items (one row each, wraps cleanly). */
export function teamBulletList(itemsHtml: string[], dotColor: string = PULSE.limeDeep): string {
  const rows = itemsHtml
    .map(
      (it, i) => `
        <tr>
          <td valign="top" width="18" style="width:18px;padding:${i === 0 ? '7px' : '15px'} 0 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="8" height="8" style="width:8px;height:8px;background:${dotColor};border-radius:4px;font-size:1px;line-height:1px;">&nbsp;</td></tr></table>
          </td>
          <td valign="top" class="bz-break" style="padding:${i === 0 ? '0' : '8px'} 0 0;font-family:${FONTS.body};font-size:14px;font-weight:500;line-height:1.5;color:${PULSE.graphite};">${it}</td>
        </tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>`;
}
