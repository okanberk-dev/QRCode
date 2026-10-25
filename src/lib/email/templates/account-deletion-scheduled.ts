// Wave B4 (CLAUDE.md §38.B + §38.193) — account deletion scheduled.
//
// Fires from /api/account/delete POST. Communicates the 30-day grace
// window + the cancel link to the owner. Single most-important CTA is
// "Vazgeç" — that's why the lime CTA is the cancel action, not a panel
// link. After the grace window the cron hard-deletes (cascade chain
// §37.9 + financial-record anonymisation).

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderButton, renderStatusPill, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface AccountDeletionScheduledParams {
  firstName?: string | null;
  /** Account email — shown in audit detail card. */
  accountEmail: string;
  /** Deletion wall-clock — when the cron will execute the wipe. */
  scheduledFor: Date;
  /** Days remaining at send time (server-computed for accuracy). */
  daysRemaining: number;
  /** Tokenised cancel link — only this URL can revoke the schedule. */
  cancelUrl: string;
}

export async function renderAccountDeletionScheduled(
  params: AccountDeletionScheduledParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const firstName = params.firstName ? escapeHtml(params.firstName) : '';
  const accountEmail = escapeHtml(params.accountEmail);
  const scheduledFormatted = params.scheduledFor.toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const subject = isTr
    ? `Hesabın ${params.daysRemaining} gün içinde silinecek`
    : `Your account will be deleted in ${params.daysRemaining} days`;
  const preheader = isTr
    ? 'İptal etmek istiyorsan aşağıdaki butona tıkla. Süre dolduğunda tüm veri silinir.'
    : 'Click the button below if you want to cancel. After the window closes, all data is wiped.';

  const inlineDefault = isTr ? {
    eyebrow: 'Hesap silme · Onay alındı',
    title: 'Hesabın',
    titleAccent: '30 gün içinde silinecek',
    intro: firstName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, hesap silme talebini aldık. Aşağıdaki tarihte verin kalıcı olarak silinecek. İstediğin zaman vazgeçebilirsin.`
      : 'Hesap silme talebini aldık. Aşağıdaki tarihte verin kalıcı olarak silinecek. İstediğin zaman vazgeçebilirsin.',
    cardEyebrow: 'Silme detayı',
    statusText: '30 gün geri sayım · İptal hakkı saklı',
    metaAccountLabel: 'Hesap',
    metaScheduledLabel: 'Silinme tarihi',
    metaCountdownLabel: 'Kalan süre',
    metaCountdownValue: `${params.daysRemaining} gün`,
    cta: 'Hesap silmeyi iptal et →',
    note: 'Süre dolduğunda restoran kayıtları, yorumlar, QR\'lar ve abonelik geçmişin kalıcı olarak silinir. KVKK m.7 gereği mali kayıtlar anonim biçimde 10 yıl saklanır.',
    notYouTitle: 'Sen bunu yapmadıysan?',
    notYouBody: 'Yukarıdaki "İptal" butonuna hemen tıkla. Aksiyon olmadan hesabın 30 gün içinde silinir.',
  } : {
    eyebrow: 'Account delete · Confirmed',
    title: 'Your account',
    titleAccent: 'will be deleted in 30 days',
    intro: firstName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, we received your deletion request. Your data will be permanently removed on the date below — you can cancel any time.`
      : 'We received your deletion request. Your data will be permanently removed on the date below — you can cancel any time.',
    cardEyebrow: 'Deletion detail',
    statusText: '30-day countdown · Cancel any time',
    metaAccountLabel: 'Account',
    metaScheduledLabel: 'Deletion date',
    metaCountdownLabel: 'Time remaining',
    metaCountdownValue: `${params.daysRemaining} days`,
    cta: 'Cancel account deletion →',
    note: 'When the window closes, your restaurant records, reviews, QR codes and subscription history are permanently deleted. Per KVKK Article 7 financial records are retained anonymised for 10 years.',
    notYouTitle: "Didn't request this?",
    notYouBody: 'Click the "Cancel" button above immediately. Without action your account will be deleted in 30 days.',
  };

  const merged = await loadMailCopy('account-deletion-scheduled', locale, inlineDefault);
  const vars = {
    firstName: params.firstName || '',
    daysRemaining: params.daysRemaining,
    scheduledFor: scheduledFormatted,
  };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const content = `
    ${renderEyebrow(copy.eyebrow, PULSE.danger)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.danger};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">
      ${copy.intro}
    </p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FEF2F2;border:1px solid #FECACA;border-radius:18px;">
      <tr>
        <td style="padding:24px;">
          <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n600};">
            ${copy.cardEyebrow}
          </div>
          ${spacer(12)}
          ${renderStatusPill({ text: copy.statusText, dotColor: PULSE.danger, textColor: PULSE.graphite, bgColor: '#FFFBEB' })}
          ${spacer(18)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td valign="top" style="padding-bottom:12px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n600};">${copy.metaAccountLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.label};font-size:13px;color:${PULSE.graphite};">${accountEmail}</div>
              </td>
            </tr>
            <tr>
              <td valign="top" style="padding-bottom:12px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n600};">${copy.metaScheduledLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.heading};font-size:18px;font-weight:500;color:${PULSE.graphite};">${scheduledFormatted}</div>
              </td>
            </tr>
            <tr>
              <td valign="top">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n600};">${copy.metaCountdownLabel}</div>
                <div style="margin-top:4px;font-family:${FONTS.heading};font-size:18px;font-weight:500;color:${PULSE.danger};">${copy.metaCountdownValue}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${spacer(28)}
    ${renderButton({ href: params.cancelUrl, label: copy.cta, variant: 'lime' })}
    ${spacer(24)}
    <p style="margin:0;font-family:${FONTS.body};font-size:12.5px;line-height:1.55;color:${PULSE.n500};">
      ${copy.note}
    </p>
    ${spacer(24)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.limeSoft};border-left:3px solid ${PULSE.limeDeep};border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};">
            ${copy.notYouTitle}
          </div>
          ${spacer(8)}
          <p style="margin:0;font-family:${FONTS.body};font-size:13px;line-height:1.55;color:${PULSE.n700};">
            ${copy.notYouBody}
          </p>
        </td>
      </tr>
    </table>
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
    `  ${copy.metaAccountLabel}: ${params.accountEmail}`,
    `  ${copy.metaScheduledLabel}: ${scheduledFormatted}`,
    `  ${copy.metaCountdownLabel}: ${copy.metaCountdownValue}`,
    '',
    `${copy.cta} ${params.cancelUrl}`,
    '',
    copyText.note,
    '',
    `${copy.notYouTitle}: ${copyText.notYouBody}`,
  ].join('\n');

  return { subject, html, text };
}
