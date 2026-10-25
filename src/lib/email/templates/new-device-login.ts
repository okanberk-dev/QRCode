// Wave D (CLAUDE.md §38.195) — new-device login security alert.
//
// Login flow detects a UserSession.fingerprint that has never appeared
// for this user before (fuzzy match: UA major + IP /16). The mail goes
// out the same request, before the cookie is even read by the browser,
// so a hijacked credential surfaces an instant alert.
//
// Locked field same pattern as forgot-password / password-changed /
// verify-email — security disclosure phrasing is phishing-defence
// critical.

import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderStatusPill, spacer } from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface NewDeviceLoginParams {
  firstName?: string | null;
  accountEmail: string;
  /** "Chrome 120" or "Bilinmeyen tarayıcı" — describeDevice() output. */
  device: string;
  /** "88.123.x.x" or "—" — describeDevice() output (privacy-mindful). */
  location: string;
  /** Login wall-clock. */
  loggedInAt?: Date;
  /** Reset URL for the "wasn't you?" recovery path. */
  resetUrl: string;
}

export async function renderNewDeviceLogin(
  params: NewDeviceLoginParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const firstName = params.firstName ? escapeHtml(params.firstName) : '';
  const accountEmail = escapeHtml(params.accountEmail);
  const device = escapeHtml(params.device);
  const location = escapeHtml(params.location);
  const loggedInAt = (params.loggedInAt ?? new Date()).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const subject = isTr ? 'Yeni cihazdan giriş yapıldı' : 'New device sign-in detected';
  const preheader = isTr
    ? `${params.device} · ${params.location}. Sen değilsen hemen aksiyon al.`
    : `${params.device} · ${params.location}. If this wasn't you, act now.`;

  const inlineDefault = isTr ? {
    eyebrow: 'Güvenlik · Yeni cihaz',
    title: 'Yeni cihazdan',
    titleAccent: 'giriş yapıldı',
    intro: firstName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, hesabına daha önce görmediğimiz bir cihaz veya konumdan giriş yapıldı. Bu sen değilsen aşağıdaki adımları hemen uygula.`
      : 'Hesabına daha önce görmediğimiz bir cihaz veya konumdan giriş yapıldı. Bu sen değilsen aşağıdaki adımları hemen uygula.',
    cardEyebrow: 'Giriş detayı',
    statusText: 'Aktif oturum · Yeni cihaz',
    metaTime: 'Giriş saati',
    metaDevice: 'Cihaz',
    metaLocation: 'Konum (IP /16)',
    metaAccount: 'Hesap',
    notYouTitle: 'Sen değil misin?',
    notYouBody: 'Şifreni hemen sıfırla ve diğer oturumlardan çıkış yap. Şüpheli bir durum varsa support@buaze.com\'a yaz.',
    notYouLink: 'Şifreyi sıfırla →',
  } : {
    eyebrow: 'Security · New device',
    title: 'New device',
    titleAccent: 'sign-in',
    intro: firstName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, your account was just accessed from a device or location we haven't seen before. If this wasn't you, follow the steps below immediately.`
      : "Your account was just accessed from a device or location we haven't seen before. If this wasn't you, follow the steps below immediately.",
    cardEyebrow: 'Sign-in detail',
    statusText: 'Active session · New device',
    metaTime: 'Signed in at',
    metaDevice: 'Device',
    metaLocation: 'Location (IP /16)',
    metaAccount: 'Account',
    notYouTitle: "Wasn't you?",
    notYouBody: 'Reset your password immediately and sign out of other sessions. Email support@buaze.com if anything looks suspicious.',
    notYouLink: 'Reset password →',
  };

  const merged = await loadMailCopy('new-device-login', locale, inlineDefault);
  const vars = { firstName: params.firstName || '', device: params.device, location: params.location };
  const copy = deepSubstitute(merged, vars, 'html') as typeof inlineDefault;
  const copyText = deepSubstitute(merged, vars, 'text') as typeof inlineDefault;

  const content = `
    ${renderEyebrow(copy.eyebrow, PULSE.danger)}
    ${spacer(16)}
    <h1 style="margin:0;font-family:${FONTS.heading};font-size:42px;line-height:1.05;letter-spacing:-0.03em;font-weight:500;color:${PULSE.graphite};">
      ${copy.title} <span style="color:${PULSE.danger};">${copy.titleAccent}</span>
    </h1>
    ${spacer(20)}
    <p style="margin:0;font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};">${copy.intro}</p>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:18px;">
      <tr><td style="padding:24px;">
        <div style="font-family:${FONTS.label};font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:${PULSE.n500};">${copy.cardEyebrow}</div>
        ${spacer(12)}
        ${renderStatusPill({ text: copy.statusText, dotColor: PULSE.warning, textColor: PULSE.graphite, bgColor: '#FFFBEB' })}
        ${spacer(20)}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="stack-row">
          <tr>
            <td class="stack-col" width="50%" valign="top" style="padding-right:12px;">
              <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaTime}</div>
              <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${loggedInAt}</div>
            </td>
            <td class="stack-col" width="50%" valign="top" style="padding-left:12px;">
              <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaDevice}</div>
              <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${device}</div>
            </td>
          </tr>
          <tr>
            <td class="stack-col" width="50%" valign="top" style="padding-right:12px;padding-top:14px;">
              <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaLocation}</div>
              <div style="margin-top:4px;font-family:${FONTS.body};font-size:13px;color:${PULSE.graphite};">${location}</div>
            </td>
            <td class="stack-col" width="50%" valign="top" style="padding-left:12px;padding-top:14px;">
              <div style="font-family:${FONTS.label};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${PULSE.n500};">${copy.metaAccount}</div>
              <div style="margin-top:4px;font-family:${FONTS.label};font-size:13px;color:${PULSE.graphite};">${accountEmail}</div>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
    ${spacer(28)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FEF2F2;border-left:3px solid ${PULSE.danger};border-radius:12px;">
      <tr><td style="padding:18px 20px;">
        <div style="font-family:${FONTS.heading};font-size:15px;font-weight:500;color:${PULSE.graphite};">${copy.notYouTitle}</div>
        ${spacer(8)}
        <p style="margin:0;font-family:${FONTS.body};font-size:13px;line-height:1.55;color:${PULSE.n700};">${copy.notYouBody}</p>
        ${spacer(10)}
        <a href="${escapeHtml(params.resetUrl)}" style="font-family:${FONTS.body};font-size:13px;font-weight:500;color:${PULSE.danger};text-decoration:underline;">${copy.notYouLink}</a>
      </td></tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content });
  const text = [
    copyText.eyebrow, '', `${copy.title} ${copy.titleAccent}`, '',
    copyText.intro.replace(/<[^>]*>/g, ''), '',
    `${copy.cardEyebrow}:`,
    `  ${copy.metaTime}: ${loggedInAt}`,
    `  ${copy.metaDevice}: ${params.device}`,
    `  ${copy.metaLocation}: ${params.location}`,
    `  ${copy.metaAccount}: ${params.accountEmail}`,
    '',
    `${copy.notYouTitle}: ${copyText.notYouBody}`,
    `${copy.notYouLink} ${params.resetUrl}`,
  ].join('\n');
  return { subject, html, text };
}
