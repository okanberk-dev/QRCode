// Wave B4 (CLAUDE.md §38.B + §38.193) — account deletion canceled.
//
// Fires from /api/account/delete/cancel POST after a successful revoke.
// Reassures the owner that everything is intact and points them back to
// the dashboard. Companion to account-deletion-scheduled.

import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, renderP, spacer } from '../components';
import {
  securityContent,
  securityHero,
  securityCard,
  securityMetaGrid,
} from './security-mail-parts';
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

  const checkChip = `<span style="display:inline-block;width:24px;height:24px;border-radius:12px;background:${PULSE.lime};color:${PULSE.graphite};text-align:center;font-size:13px;font-weight:700;line-height:24px;vertical-align:middle;margin-right:10px;">&#10003;</span>`;

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      eyebrowColor: PULSE.success,
      title: copy.title,
      accent: copy.titleAccent,
      accentColor: PULSE.limeDeep,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'success',
      eyebrow: copy.cardEyebrow,
      body: securityMetaGrid(
        [
          { label: copy.accountLabel, value: accountEmail, breakable: true, full: true },
          {
            label: copy.statusLabel,
            value: `${checkChip}<span style="vertical-align:middle;">${copy.statusValue}</span>`,
            strong: true,
            full: true,
          },
        ],
        'success',
      ),
    })}
    ${spacer(24)}
    ${renderButton({ href: escapeHtml(params.dashboardUrl), label: copy.cta, variant: 'dark', size: 'lg' })}
    ${spacer(20)}
    ${renderP(copy.footer, { size: 13, color: PULSE.n500 })}
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
    `  ${copy.accountLabel}: ${params.accountEmail}`,
    `  ${copy.statusLabel}: ${copyText.statusValue}`,
    '',
    `${copy.cta} ${params.dashboardUrl}`,
    '',
    copyText.footer,
  ].join('\n');

  return { subject, html, text };
}
