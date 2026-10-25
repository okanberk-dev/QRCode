// Wave B4 (CLAUDE.md §38.B + §38.193) — account deletion canceled.
//
// Fires from /api/account/delete/cancel POST after a successful revoke.
// Reassures the owner that everything is intact and points them back to
// the dashboard. Companion to account-deletion-scheduled.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface AccountDeletionCanceledParams {
  firstName?: string | null;
  accountEmail: string;
  /** Dashboard URL — primary "you're back" CTA. */
  dashboardUrl: string;
}

export async function renderAccountDeletionCanceled(
  params: AccountDeletionCanceledParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const firstName = params.firstName ? escapeHtml(params.firstName) : '';
  const accountEmail = escapeHtml(params.accountEmail);

  const subject = isTr
    ? 'Hesap silme iptal edildi'
    : 'Account deletion canceled';
  const preheader = isTr
    ? 'Hesabın aktif kalıyor. Panel ve tüm veri olduğu gibi devam ediyor.'
    : 'Your account stays active. Panel and all data continue unchanged.';

  const inlineDefault = isTr ? {
    eyebrow: 'Hesap silme · İptal edildi',
    title: 'Hesabın',
    titleAccent: 'güvende',
    intro: firstName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, hesap silme talebini iptal ettin. Hesabın aktif kalıyor, hiçbir veri silinmedi.`
      : 'Hesap silme talebini iptal ettin. Hesabın aktif kalıyor, hiçbir veri silinmedi.',
    cardEyebrow: 'Durum güncellendi',
    accountLabel: 'Hesap',
    statusLabel: 'Durum',
    statusValue: 'Aktif · Veri güvende',
    cta: 'Panele dön →',
    footer: 'Bu maili saklayabilirsin — herhangi bir aksiyon gerekmiyor. İstediğin zaman ayarlardan tekrar başlatabilirsin.',
  } : {
    eyebrow: 'Account delete · Canceled',
    title: 'Your account',
    titleAccent: 'is safe',
    intro: firstName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, you canceled the deletion request. Your account stays active and no data was removed.`
      : 'You canceled the deletion request. Your account stays active and no data was removed.',
    cardEyebrow: 'Status updated',
    accountLabel: 'Account',
    statusLabel: 'Status',
    statusValue: 'Active · Data safe',
    cta: 'Back to panel →',
    footer: 'You can archive this mail — no action needed. You can restart from settings any time.',
  };

  const merged = await loadMailCopy('account-deletion-canceled', locale, inlineDefault);
  const vars = { firstName: params.firstName || '' };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const content = `
    ${renderEyebrow(copy.eyebrow, PULSE.success)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.limeDeep};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">
      ${copy.intro}
    </p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.limeSoft};border:1px solid ${PULSE.lime};border-radius:18px;">
      <tr>
        <td style="padding:24px;">
          <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n600};">
            ${copy.cardEyebrow}
          </div>
          ${spacer(14)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td valign="top" style="padding-bottom:12px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n600};">${copy.accountLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.label};font-size:13px;color:${PULSE.graphite};">${accountEmail}</div>
              </td>
            </tr>
            <tr>
              <td valign="top">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n600};">${copy.statusLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.heading};font-size:18px;font-weight:500;color:${PULSE.limeDeep};">${copy.statusValue}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${spacer(28)}
    ${renderButton({ href: params.dashboardUrl, label: copy.cta, variant: 'dark' })}
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:12.5px;line-height:1.55;color:${PULSE.n500};">
      ${copy.footer}
    </p>
  `;

  const html = pulseLayout({ subject, preheader, content });

  const text = [
    copyText.eyebrow,
    '',
    `${copy.title} ${copy.titleAccent}`,
    '',
    copyText.intro.replace(/<[^>]*>/g, ''),
    '',
    `${copy.cardEyebrow}:`,
    `  ${copy.accountLabel}: ${params.accountEmail}`,
    `  ${copy.statusLabel}: ${copyText.statusValue}`,
    '',
    `${copy.cta} ${params.dashboardUrl}`,
    '',
    copyText.footer,
  ].join('\n');

  return { subject, html, text };
}
