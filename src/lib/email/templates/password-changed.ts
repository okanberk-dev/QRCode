// Wave B1 (CLAUDE.md §38.B) — password change confirmation mail.
//
// Fires from /api/user/profile PUT whenever the owner saves a new password.
// Companion to forgot-password (reset flow) — that mail authorises a change,
// this mail confirms one happened. Same KVKK-locked "not you?" surface so
// owners can detect compromised accounts.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderStatusPill, spacer } from '../components';
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

  const content = `
    ${renderEyebrow(copy.eyebrow)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.limeDeep};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">
      ${copy.intro}
    </p>
    ${spacer(32)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:18px;">
      <tr>
        <td style="padding:24px;">
          <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n500};">
            ${copy.cardEyebrow}
          </div>
          ${spacer(12)}
          ${renderStatusPill({ text: copy.statusText, dotColor: PULSE.success, textColor: PULSE.graphite, bgColor: PULSE.limeSoft })}
          ${spacer(20)}
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="stack-row">
            <tr>
              <td class="stack-col" width="50%" valign="top" style="padding-right:12px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaTime}</div>
                <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${changedAt}</div>
              </td>
              <td class="stack-col" width="50%" valign="top" style="padding-left:12px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaIp}</div>
                <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${ip}</div>
              </td>
            </tr>
            <tr>
              <td class="stack-col" width="50%" valign="top" style="padding-right:12px;padding-top:14px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaDevice}</div>
                <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${device}</div>
              </td>
              <td class="stack-col" width="50%" valign="top" style="padding-left:12px;padding-top:14px;">
                <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaAccount}</div>
                <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${account}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    ${spacer(28)}
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
          ${spacer(10)}
          <a href="${escapeHtml(params.resetUrl)}" style="font-family:${FONTS.body};font-size:13px;font-weight:500;color:${PULSE.graphite};text-decoration:underline;">${copy.notYouLink}</a>
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
