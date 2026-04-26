import { PULSE, FONTS } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderEyebrow, renderH1, renderP, renderButton, spacer } from '../components';

export interface ForgotPasswordParams {
  code: string;
  resetUrl: string;
  ip?: string | null;
  device?: string | null;
}

export function renderForgotPassword(params: ForgotPasswordParams, locale: 'tr' | 'en' = 'tr'): { subject: string; html: string; text: string } {
  const isTr = locale !== 'en';
  const subject = isTr ? 'Buaze · Şifre sıfırlama' : 'Buaze · Password reset';
  const preheader = isTr
    ? 'Doğrulama kodun ve hızlı sıfırlama bağlantın hazır.'
    : 'Your verification code and reset link are ready.';

  const copy = isTr ? {
    eyebrow: 'Güvenlik · Şifre sıfırlama',
    title: 'Şifreni<br/><span style="color:' + PULSE.success + ';">yenileyelim.</span>',
    intro: 'Hesabın için bir sıfırlama talebi aldık. Aşağıdaki 6 haneli kodu uygulamadaki ekrana gir veya butona tıkla.',
    codeLabel: 'Tek kullanımlık kodun',
    expire: 'Kod 15 dakika geçerli. Kullanılmazsa otomatik geçersizleşir.',
    cta: 'Şifreyi yenile →',
    securityTitle: 'Sen değil misin?',
    securityBody: 'Bu maili beklemiyorduysan kodu kullanma. Hesabın güvende — başka bir adım gerekmiyor.',
    metaTitle: 'Talebin meta verisi',
    metaIp: 'IP',
    metaDevice: 'Cihaz',
    metaTime: 'Zaman',
  } : {
    eyebrow: 'Security · Password reset',
    title: 'Let\'s reset<br/><span style="color:' + PULSE.success + ';">your password.</span>',
    intro: 'We received a reset request for your account. Use the 6-digit code below in the app or click the button.',
    codeLabel: 'Your one-time code',
    expire: 'Code is valid for 15 minutes. After that it expires automatically.',
    cta: 'Reset password →',
    securityTitle: 'Wasn\'t you?',
    securityBody: 'If you didn\'t expect this email, just ignore the code. Your account stays safe — no further action needed.',
    metaTitle: 'Request metadata',
    metaIp: 'IP',
    metaDevice: 'Device',
    metaTime: 'Time',
  };

  const ip = params.ip ? escapeHtml(params.ip) : '—';
  const device = params.device ? escapeHtml(params.device) : '—';
  const time = new Date().toLocaleString(isTr ? 'tr-TR' : 'en-US');

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td class="bz-pad" style="padding:36px 40px 32px;">
          ${renderEyebrow(copy.eyebrow)}
          ${spacer(14)}
          <h1 class="bz-h1" style="font-family:${FONTS.heading};font-size:38px;font-weight:500;letter-spacing:-0.025em;line-height:1.1;color:${PULSE.graphite};margin:0;">${copy.title}</h1>
          ${spacer(18)}
          ${renderP(copy.intro, { size: 15 })}
          ${spacer(28)}
          <div style="background:${PULSE.n50};border:1px solid ${PULSE.n200};border-radius:14px;padding:28px;text-align:center;">
            ${renderEyebrow(copy.codeLabel, PULSE.n500)}
            ${spacer(10)}
            <div style="font-family:${FONTS.mono};font-size:36px;font-weight:600;letter-spacing:0.4em;color:${PULSE.graphite};">${escapeHtml(params.code)}</div>
            ${spacer(8)}
            <div style="font-family:${FONTS.body};font-size:12px;color:${PULSE.n500};">${copy.expire}</div>
          </div>
          ${spacer(24)}
          ${renderButton({ href: params.resetUrl, label: copy.cta, size: 'lg' })}
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${PULSE.limeSoft};border-radius:14px;">
            <tr><td style="padding:20px 24px;">
              <div style="font-family:${FONTS.heading};font-size:16px;font-weight:600;color:${PULSE.graphite};margin-bottom:6px;">${copy.securityTitle}</div>
              <div style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n700};line-height:1.55;">${copy.securityBody}</div>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="bz-pad" style="padding:0 40px 36px;">
          ${renderEyebrow(copy.metaTitle)}
          ${spacer(10)}
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:${FONTS.body};font-size:13px;color:${PULSE.n700};">
            <tr><td style="padding:8px 0;border-bottom:1px solid ${PULSE.n200};color:${PULSE.n500};">${copy.metaIp}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${PULSE.n200};font-weight:600;">${ip}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid ${PULSE.n200};color:${PULSE.n500};">${copy.metaDevice}</td><td align="right" style="padding:8px 0;border-bottom:1px solid ${PULSE.n200};font-weight:600;">${device}</td></tr>
            <tr><td style="padding:8px 0;color:${PULSE.n500};">${copy.metaTime}</td><td align="right" style="padding:8px 0;font-weight:600;">${time}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const html = pulseLayout({ subject, preheader, content, eyebrow: isTr ? 'Güvenlik' : 'Security', footer: { locale } });
  const text = `${copy.intro}\n\n${copy.codeLabel}: ${params.code}\n${params.resetUrl}\n\n${copy.expire}`;
  return { subject, html, text };
}
