// Building blocks of the billing mails (billing-renewal-upcoming,
// billing-period-ended, billing-card-retention). Table + inline style only
// (Gmail / Outlook / phones, CLAUDE.md §21.39). Billing mails show only the
// plan name, the amount, dates and the last four digits of a saved card —
// never a token, a card number or a link with a secret.

import { PULSE, FONTS } from '../tokens';
import { escapeHtml } from '../escape';

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

export interface BillingDetailRow {
  label: string;
  /** Plain text (escaped here). */
  value: string;
  /** Small muted line under the value (plain text). */
  hint?: string;
}

/** Label / value list inside a soft card: plan, amount, period end, card. */
export function billingDetails(rows: BillingDetailRow[]): string {
  const body = rows
    .map((row, i) => {
      const border = i < rows.length - 1 ? `border-bottom:1px solid ${PULSE.n200};` : '';
      const hint = row.hint
        ? `<div style="margin-top:2px;font-family:${FONTS.body};font-size:12px;line-height:1.4;color:${PULSE.n500};">${escapeHtml(row.hint)}</div>`
        : '';
      return `<tr>
        <td valign="top" width="42%" style="width:42%;padding:12px 12px 12px 0;${border}font-family:${FONTS.body};font-size:13px;line-height:1.45;color:${PULSE.n500};">${escapeHtml(row.label)}</td>
        <td valign="top" style="padding:12px 0;${border}font-family:${FONTS.body};font-size:14px;font-weight:600;line-height:1.45;color:${PULSE.graphite};text-align:right;">${escapeHtml(row.value)}${hint}</td>
      </tr>`;
    })
    .join('');
  return `<div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:16px;padding:6px 18px;">
    <table ${TABLE} width="100%" style="width:100%;">${body}</table>
  </div>`;
}

/** Plain-text twin of billingDetails. */
export function billingDetailsText(rows: BillingDetailRow[]): string {
  return rows.map((r) => `${r.label}: ${r.value}${r.hint ? ` (${r.hint})` : ''}`).join('\n');
}

/** "•••• 4242" or an empty string. */
export function maskedCard(last4: string | null | undefined): string {
  return last4 && /^[0-9]{4}$/.test(last4) ? `•••• ${last4}` : '';
}

/**
 * The card as the source of a charge, inside a sentence: TR in the ablative
 * ("•••• 4242 ile biten kartınızdan"), EN as a noun phrase ("your card ending
 * in 4242"). Without last four digits: "kayıtlı kartınızdan" / "your saved card".
 */
export function chargeCardPhrase(last4: string | null | undefined, locale: 'tr' | 'en'): string {
  const masked = maskedCard(last4);
  if (locale === 'en') return masked ? `your card ending in ${last4}` : 'your saved card';
  return masked ? `${masked} ile biten kartınızdan` : 'kayıtlı kartınızdan';
}

/**
 * The closing block of every auto-mode mail (billing spec §13.4): the panel
 * path to turn auto-renew off and, in the mails that carry it (`on`,
 * `auto_notice`, `card_replaced`), the off-only link (§8.8). Copy is fixed
 * in code (`BILLING_AUTO_FOOTER`): leaving the instruction must always be
 * explained the same way.
 */
export function autoModeFooter(opts: {
  copy: { manage: string; offLead: string; offLabel: string };
  manageUrl: string;
  offLink?: string | null;
}): { html: string; text: string } {
  const link = `color:${PULSE.n700};text-decoration:underline;`;
  const p = `font-family:${FONTS.body};font-size:12px;line-height:1.6;color:${PULSE.n500};margin:0;`;
  const manage = `<p style="${p}"><a href="${escapeHtml(opts.manageUrl)}" style="${link}">${escapeHtml(opts.copy.manage)}</a></p>`;
  const off = opts.offLink
    ? `<p style="${p}margin-top:8px;">${escapeHtml(opts.copy.offLead)} <a href="${escapeHtml(opts.offLink)}" style="${link}font-weight:600;">${escapeHtml(opts.copy.offLabel)}</a></p>`
    : '';
  const html = `<div style="border-top:1px solid ${PULSE.n200};padding-top:20px;">${manage}${off}</div>`;
  const text = [
    `${opts.copy.manage}: ${opts.manageUrl}`,
    ...(opts.offLink ? [`${opts.copy.offLead} ${opts.offLink}`] : []),
  ].join('\n');
  return { html, text };
}
