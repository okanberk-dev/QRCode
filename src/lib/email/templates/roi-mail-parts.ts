// ROI mail parts shared by roi-customer-report + roi-admin-notification.
// Not a template (no render contract) — only local building blocks so the two
// mails keep the same KPI grid, big number and numbered step list.
//
// Colours are SOLID (no rgba / 8-digit hex): Outlook desktop drops both, which
// used to erase card borders and turn muted text on the dark card black.

import { PULSE, FONTS } from '../tokens';
import { escapeHtml } from '../escape';

/** limeDeep @ 20% over white / over limeSoft, @ 33% over limeSoft. */
export const ROI_LIME_LINE_ON_WHITE = '#EEF7D5';
export const ROI_LIME_LINE_ON_SOFT = '#DDF29C';
export const ROI_LIME_LINE_STRONG = '#D4ED8A';
/** white @ 90 / 75 / 65 / 55 % over graphite. */
export const ROI_ON_DARK_90 = '#E7E7E7';
export const ROI_ON_DARK_75 = '#C2C2C2';
export const ROI_ON_DARK_65 = '#A9A9A9';
export const ROI_ON_DARK_55 = '#929292';
export const ROI_ON_DARK_DIVIDER = '#2B2B2B';

/**
 * Sector labels for the ROI sales mail. Unknown slugs never print raw: they
 * fall back to a title-cased key ("my_sector" → "My Sector"). Output is PLAIN
 * text — callers escape it at the HTML sink.
 */
export const ROI_SECTOR_LABEL_TR: Record<string, string> = {
  restaurant: 'Restoran',
  cafe: 'Kafe',
  hotel: 'Otel',
  clinic: 'Klinik',
  other: 'Diğer',
};
export const ROI_SECTOR_LABEL_EN: Record<string, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  hotel: 'Hotel',
  clinic: 'Clinic',
  other: 'Other',
};

function titleCaseSlug(slug: string): string {
  return slug
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

export function roiSectorLabel(slug: string, isTr: boolean): string {
  const map = isTr ? ROI_SECTOR_LABEL_TR : ROI_SECTOR_LABEL_EN;
  return hasOwn(map, slug) ? map[slug] : titleCaseSlug(slug) || slug;
}

export interface RoiKpi {
  value: string;
  label: string;
  accent?: boolean;
}

/**
 * 2 x 2 KPI tiles (48% + 10px gutter cell + 48%; fixed layout so the percent
 * widths are honoured and the gutter never collapses). Every tile is a real table cell (not a div) so the two tiles
 * of a row always share one height even when a Poppins label wraps at 320px —
 * the old 4-up inline-block grid ended up ragged there. `border-collapse:
 * separate` is inlined so the cell radius/border render (the global style sheet
 * collapses borders, which kills td radius). Outlook ignores the radius and
 * falls back to square tiles.
 */
export function renderRoiKpiGrid(items: RoiKpi[]): string {
  const tile = (k: RoiKpi | undefined): string => {
    if (!k) return '<td width="48%" style="width:48%;">&nbsp;</td>';
    // Short values keep 22px on phones; long ones (7-digit stress) opt into the
    // mobile step-down class so a tile never breaks a number mid-digit.
    const long = k.value.length > 7;
    return `<td class="bz-roi-kpi-cell" width="48%" valign="top" style="width:48%;background:${k.accent ? PULSE.limeSoft : PULSE.n50};border:1px solid ${k.accent ? ROI_LIME_LINE_ON_SOFT : PULSE.n200};border-radius:12px;padding:16px 16px 15px;">
      <div${long ? ' class="bz-roi-kpi-val"' : ''} style="font-family:${FONTS.heading};font-size:22px;line-height:1.15;letter-spacing:-0.02em;color:${PULSE.graphite};font-weight:600;">${escapeHtml(k.value)}</div>
      <div style="margin-top:6px;font-family:${FONTS.label};font-size:10px;line-height:1.45;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;color:${PULSE.n500};">${escapeHtml(k.label)}</div>
    </td>`;
  };
  const gapCell = '<td width="10" style="width:10px;font-size:1px;line-height:1px;">&nbsp;</td>';
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    if (rows.length > 0) {
      rows.push('<tr><td colspan="3" height="10" style="height:10px;font-size:1px;line-height:10px;">&nbsp;</td></tr>');
    }
    rows.push(`<tr>${tile(items[i])}${gapCell}${tile(items[i + 1])}</tr>`);
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;table-layout:fixed;border-collapse:separate;border-spacing:0;">${rows.join('')}</table>`;
}

/**
 * Hero money figure. Poppins digits are wide: 14-char values ("₺1.250.000.000")
 * overflow a 224px mobile card at the 32px step, so long values opt into the
 * smaller mobile class.
 */
export function renderRoiBigNumber(
  text: string,
  opts: { color: string; size: number; mt?: number },
): string {
  const long = text.length >= 13;
  const cls = long ? 'bz-roi-bignum-sm' : opts.size >= 38 ? 'bz-roi-bignum' : 'bz-roi-bignum-sm';
  return `<div class="${cls}" style="margin-top:${opts.mt ?? 8}px;font-family:${FONTS.heading};font-size:${opts.size}px;line-height:1.1;letter-spacing:-0.02em;color:${opts.color};font-weight:600;">${escapeHtml(text)}</div>`;
}

/**
 * Numbered action list. Number chip + text in a 2-cell table (never stacked).
 * `dark` = rendered on the graphite insight card.
 */
export function renderRoiSteps(steps: string[], opts: { dark?: boolean } = {}): string {
  const dark = !!opts.dark;
  const chipBg = dark ? PULSE.lime : PULSE.graphite;
  const chipFg = dark ? PULSE.graphite : PULSE.lime;
  const textColor = dark ? ROI_ON_DARK_90 : PULSE.graphite;
  const rows = steps
    .map(
      (s, i) => `<tr>
        <td valign="top" width="40" style="width:40px;padding:0 0 ${i === steps.length - 1 ? 0 : 12}px;">
          <div style="width:28px;height:28px;border-radius:9px;background:${chipBg};color:${chipFg};font-family:${FONTS.label};font-size:12px;line-height:28px;font-weight:600;text-align:center;">${String(i + 1).padStart(2, '0')}</div>
        </td>
        <td valign="top" style="padding:3px 0 ${i === steps.length - 1 ? 0 : 12}px;font-family:${FONTS.body};font-size:14px;line-height:1.6;color:${textColor};">${escapeHtml(s)}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>`;
}
