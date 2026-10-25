// Wave B4 (CLAUDE.md §38.B + §38.193) — account deletion scheduled.
//
// Fires from /api/account/delete POST. Communicates the 30-day grace
// window + the cancel link to the owner. Single most-important CTA is
// "Vazgeç" — that's why the lime CTA is the cancel action, not a panel
// link. After the grace window the cron hard-deletes (cascade chain
// §37.9 + financial-record anonymisation).

import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderP, spacer } from '../components';
import {
  securityContent,
  securityHero,
  securityCard,
  securityMetaGrid,
  securityNotYou,
} from './security-mail-parts';
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

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      eyebrowColor: PULSE.danger,
      title: copy.title,
      accent: copy.titleAccent,
      accentColor: PULSE.danger,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'danger',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.statusText, dotColor: PULSE.danger, bgColor: PULSE.pure },
      body: securityMetaGrid(
        [
          { label: copy.metaAccountLabel, value: accountEmail, breakable: true, full: true },
          { label: copy.metaScheduledLabel, value: scheduledFormatted, strong: true },
          { label: copy.metaCountdownLabel, value: copy.metaCountdownValue, strong: true, color: PULSE.danger },
        ],
        'danger',
      ),
    })}
    ${spacer(24)}
    ${renderButton({ href: escapeHtml(params.cancelUrl), label: copy.cta, variant: 'lime', size: 'lg' })}
    ${spacer(20)}
    ${renderP(copy.note, { size: 13, color: PULSE.n500 })}
    ${spacer(24)}
    ${securityNotYou({ tone: 'calm', title: copy.notYouTitle, body: copy.notYouBody })}
  `);

  const html = pulseLayout({ subject, preheader, content, footer: { locale } });
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
