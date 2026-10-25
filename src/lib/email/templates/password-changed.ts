// Wave B1 (CLAUDE.md §38.B) — password change confirmation mail.
//
// Fires from /api/user/profile PUT whenever the owner saves a new password.
// Companion to forgot-password (reset flow) — that mail authorises a change,
// this mail confirms one happened. Same KVKK-locked "not you?" surface so
// owners can detect compromised accounts.

import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { spacer } from '../components';
import {
  securityContent,
  securityHero,
  securityCard,
  securityMetaGrid,
  securityNotYou,
} from './security-mail-parts';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface PasswordChangedParams {
  firstName?: string | null;
  /** Sıfırlama akışı linki — "bu sen değilsen hemen şifreni resetle" CTA. */
  resetUrl: string;
  /** Owner panel locale ilgisi yok — Resend recipient'ina giden mail dili. */
  ip?: string | null;
  device?: string | null;
  account?: string | null;
  /** Optional override for the timestamp shown in the mail body. */
  changedAt?: Date;
}

export async function renderPasswordChanged(
  params: PasswordChangedParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr ? 'Şifren az önce değiştirildi' : 'Your password was just changed';
  const preheader = isTr
    ? 'Sen yaptıysan başka bir şey gerekmiyor. Değilsen — hemen aksiyon al.'
    : 'If this was you, nothing else to do. If not — act now.';

  const firstName = params.firstName ? escapeHtml(params.firstName) : '';
  const account = params.account ? escapeHtml(params.account) : '—';
  const ip = params.ip ? escapeHtml(params.ip) : '—';
  const device = params.device ? escapeHtml(params.device) : '—';
  const changedAt = (params.changedAt ?? new Date()).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const inlineDefault = isTr ? {
    eyebrow: 'Güvenlik · Bildirim',
    title: 'Şifren',
    titleAccent: 'güncellendi',
    intro: firstName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, hesabının şifresi az önce başarıyla değiştirildi. Bu işlemi sen yaptıysan ek bir şey yapman gerekmiyor.`
      : 'Hesabının şifresi az önce başarıyla değiştirildi. Bu işlemi sen yaptıysan ek bir şey yapman gerekmiyor.',
    cardEyebrow: 'Değişiklik detayı',
    statusText: 'Başarılı · Şifre güncel',
    metaTime: 'Değişiklik saati',
    metaIp: 'IP',
    metaDevice: 'Cihaz',
    metaAccount: 'Hesap',
    notYouTitle: 'Sen değil misin?',
    notYouBody: 'Hesabını hemen koru: linki kullanarak yeni bir şifre belirle ve destek ekibine haber ver.',
    notYouLink: 'Şifreyi sıfırla →',
  } : {
    eyebrow: 'Security · Notice',
    title: 'Your password',
    titleAccent: 'was updated',
    intro: firstName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, the password on your account was just changed successfully. If you made this change, nothing else to do.`
      : 'The password on your account was just changed successfully. If you made this change, nothing else to do.',
    cardEyebrow: 'Change detail',
    statusText: 'Success · Password current',
    metaTime: 'Changed at',
    metaIp: 'IP',
    metaDevice: 'Device',
    metaAccount: 'Account',
    notYouTitle: 'Wasn\'t you?',
    notYouBody: 'Protect your account immediately: use the link below to set a new password and reach out to support.',
    notYouLink: 'Reset password →',
  };

  const merged = await loadMailCopy('password-changed', locale, inlineDefault);
  const vars = { firstName: params.firstName || '' };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      title: copy.title,
      accent: copy.titleAccent,
      accentColor: PULSE.limeDeep,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'neutral',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.statusText, dotColor: PULSE.success, bgColor: PULSE.limeSoft },
      body: securityMetaGrid([
        { label: copy.metaTime, value: changedAt },
        { label: copy.metaIp, value: ip, code: true },
        { label: copy.metaDevice, value: device, breakable: true },
        { label: copy.metaAccount, value: account, breakable: true, full: (params.account ?? '').length > 24 },
      ]),
    })}
    ${spacer(24)}
    ${securityNotYou({
      tone: 'danger',
      title: copy.notYouTitle,
      body: copy.notYouBody,
      cta: { href: params.resetUrl, label: copy.notYouLink },
    })}
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
    `  ${copy.metaTime}: ${changedAt}`,
    `  ${copy.metaIp}: ${ip}`,
    `  ${copy.metaDevice}: ${device}`,
    `  ${copy.metaAccount}: ${account}`,
    '',
    `${copy.notYouTitle}`,
    copyText.notYouBody,
    `${copy.notYouLink} ${params.resetUrl}`,
  ].join('\n');

  return { subject, html, text };
}
