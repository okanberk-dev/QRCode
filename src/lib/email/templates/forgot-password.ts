import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import {
  renderEyebrow,
  renderButton,
  renderStatusPill,
  spacer,
} from '../components';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface ForgotPasswordParams {
  /** 6-digit fallback code; preserved for the existing sender contract.
   *  In the new template the link card is primary; the code is shown small
   *  underneath as an alternate way to authenticate inside the app. */
  code: string;
  resetUrl: string;
  firstName?: string | null;
  ip?: string | null;
  device?: string | null;
  account?: string | null;
}

export async function renderForgotPassword(
  params: ForgotPasswordParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr ? 'Şifreni sıfırlamak için tek tık' : 'One click to reset your password';
  const preheader = isTr
    ? 'Linki 30 dakika içinde kullan. Sen istemediysen, görmezden gel.'
    : 'Use the link within 30 minutes. If you didn\'t request this, ignore.';

  const firstName = params.firstName ? escapeHtml(params.firstName) : '';
  const account = params.account ? escapeHtml(params.account) : '—';
  const ip = params.ip ? escapeHtml(params.ip) : '—';
  const device = params.device ? escapeHtml(params.device) : '—';
  const requestTime = new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Display-friendly truncation of the reset URL (matches the JSX prototype's
  // "buaze.com/reset?t=9c2f-4a8e-bd71-pulse" treatment).
  const displayUrl = (() => {
    try {
      const u = new URL(params.resetUrl);
      const tail = (u.searchParams.get('token') || u.searchParams.get('t') || '').slice(0, 24);
      return `${u.host}${u.pathname}?t=${tail || '••••'}`;
    } catch {
      return params.resetUrl.slice(0, 80);
    }
  })();

  const inlineDefault = isTr ? {
    eyebrow: '01 · Talep alındı',
    title: 'Şifreni',
    titleAccent: 'sıfırlayalım',
    intro: firstName
      ? `Merhaba <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, az önce bu adres için yeni bir şifre talep edildi. Aşağıdaki butonla 30 dakika içinde yeni bir şifre belirleyebilirsin.`
      : 'Hesabın için az önce bir şifre sıfırlama talebi geldi. Aşağıdaki butonla 30 dakika içinde yeni bir şifre belirleyebilirsin.',
    cardEyebrow: 'Tek kullanımlık link',
    statusText: 'Aktif · 30 dk geçerli',
    cta: 'Yeni şifre belirle →',
    metaTitle: '',
    metaTime: 'Talep saati',
    metaIp: 'IP',
    metaDevice: 'Cihaz',
    metaAccount: 'Hesap',
    notYouTitle: 'Sen değil misin?',
    notYouBody: 'Bu maili görmezden gel. Şifren değişmez, hesabın güvende. Kaygılıysan',
    notYouLink: 'destek ekibine yaz',
    altCodeLabel: 'Uygulamada kullanmak için kod',
  } : {
    eyebrow: '01 · Request received',
    title: 'Let\'s reset',
    titleAccent: 'your password',
    intro: firstName
      ? `Hi <span style="color:${PULSE.graphite};font-weight:500;">${firstName}</span>, we just got a password reset request for this address. Use the button below within 30 minutes.`
      : 'We just got a password reset request for your account. Use the button below within 30 minutes.',
    cardEyebrow: 'One-time link',
    statusText: 'Active · 30 min valid',
    cta: 'Pick a new password →',
    metaTitle: '',
    metaTime: 'Request time',
    metaIp: 'IP',
    metaDevice: 'Device',
    metaAccount: 'Account',
    notYouTitle: 'Wasn\'t you?',
    notYouBody: 'Just ignore this email. Your password stays the same. If you\'re worried,',
    notYouLink: 'contact support',
    altCodeLabel: 'Or use this code in the app',
  };

  // DB-merged copy. Security-critical strings (notYou*, statusText) are
  // server-side locked: even if an admin rewrites them in the editor, the
  // PATCH endpoint drops them — see locked-fields.ts.
  const merged = await loadMailCopy('forgot-password', locale, inlineDefault);
  const vars = { firstName: params.firstName || (isTr ? 'orada' : 'there') };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const supportHref = `${process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com'}/${isTr ? 'tr' : 'en'}/contact`;

  // 2x2 meta grid — matches forgot-password.jsx:65-82
  const metaCells: Array<[string, string]> = [
    [copy.metaTime, requestTime],
    [copy.metaIp, ip],
    [copy.metaDevice, device],
    [copy.metaAccount, account],
  ];
  const metaRow = (a: [string, string], b: [string, string]) => `
    <tr>
      <td class="col-half" valign="top" style="width:50%;padding:10px 12px 10px 0;border-top:1px solid ${PULSE.n200};">
        <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;">${a[0]}</div>
        <div style="font-family:${FONTS.mono};font-size:13px;color:${PULSE.n700};margin-top:4px;">${a[1]}</div>
      </td>
      <td class="col-half" valign="top" style="width:50%;padding:10px 0 10px 12px;border-top:1px solid ${PULSE.n200};">
        <div style="font-family:${FONTS.mono};font-size:11px;letter-spacing:0.18em;color:${PULSE.n500};text-transform:uppercase;font-weight:500;">${b[0]}</div>
        <div style="font-family:${FONTS.mono};font-size:13px;color:${PULSE.n700};margin-top:4px;">${b[1]}</div>
      </td>
    </tr>`;

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:40px 40px 8px;">
          ${renderEyebrow(copy.eyebrow)}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:36px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">
            ${copy.title}<br/>${copy.titleAccent}<span style="color:${PULSE.lime};">.</span>
          </h1>
          ${spacer(20)}
          <p style="font-family:${FONTS.body};font-size:15px;line-height:1.6;color:${PULSE.n600};margin:0;letter-spacing:-0.005em;">${copy.intro}</p>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:32px 40px 12px;">
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td valign="middle" align="left">${renderEyebrow(copy.cardEyebrow)}</td>
                <td valign="middle" align="right">${renderStatusPill({ text: copy.statusText, dotColor: PULSE.success, textColor: PULSE.success })}</td>
              </tr>
            </table>
            ${spacer(16)}
            <div style="font-family:${FONTS.mono};font-size:12px;color:${PULSE.n500};background:${PULSE.pure};border:1px solid ${PULSE.n200};border-radius:8px;padding:12px 14px;word-break:break-all;line-height:1.5;">
              ${escapeHtml(displayUrl)}
            </div>
            ${spacer(16)}
            ${renderButton({ href: params.resetUrl, label: copy.cta, size: 'lg' })}
            ${spacer(14)}
            <div style="font-family:${FONTS.mono};font-size:11px;color:${PULSE.n500};">
              ${copy.altCodeLabel}: <span style="color:${PULSE.graphite};font-weight:600;letter-spacing:0.2em;">${escapeHtml(params.code)}</span>
            </div>
          </div>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:24px 40px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="stack-row">
            ${metaRow(metaCells[0], metaCells[1])}
            ${metaRow(metaCells[2], metaCells[3])}
          </table>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:24px 40px 40px;">
          <div style="margin-top:8px;padding:16px;background:${PULSE.limeSoft};border-radius:10px;border-left:3px solid ${PULSE.limeDeep};">
            <p style="font-family:${FONTS.body};font-size:13px;line-height:1.6;color:${PULSE.n700};margin:0;letter-spacing:-0.005em;">
              <strong style="color:${PULSE.graphite};font-weight:600;">${copy.notYouTitle}</strong> ${copy.notYouBody}
              <a href="${supportHref}" style="color:${PULSE.graphite};font-weight:500;">${copy.notYouLink}</a>.
            </p>
          </div>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({
    subject,
    preheader,
    content,
    eyebrow: isTr ? 'Güvenlik · Şifre sıfırlama' : 'Security · Password reset',
    footer: { locale },
  });
  const text = `${copyText.title} ${copyText.titleAccent}.\n\n${copyText.intro.replace(/<[^>]+>/g, '')}\n\n${copyText.cta} ${params.resetUrl}\n\n${copyText.altCodeLabel}: ${params.code}`;
  return { subject, html, text };
}
