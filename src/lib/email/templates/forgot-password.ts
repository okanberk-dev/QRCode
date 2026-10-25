import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, spacer } from '../components';
import {
  securityContent,
  securityHero,
  securityCard,
  securityMetaGrid,
  securityUrlBox,
  securityCodeBox,
  securityNotYou,
} from './security-mail-parts';
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

  const supportHref = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com'}/${isTr ? 'tr' : 'en'}/contact`;

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      title: copy.title,
      accent: copy.titleAccent,
      accentColor: PULSE.graphite,
      breakBeforeAccent: true,
      accentSuffix: `<span style="color:${PULSE.lime};">.</span>`,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'neutral',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.statusText, dotColor: PULSE.success, bgColor: PULSE.limeSoft },
      body: `
        ${securityUrlBox(escapeHtml(displayUrl))}
        ${spacer(16)}
        ${renderButton({ href: escapeHtml(params.resetUrl), label: copy.cta, size: 'lg' })}
        ${spacer(20)}
        <div style="border-top:1px solid ${PULSE.n200};font-size:1px;line-height:1px;">&nbsp;</div>
        ${spacer(16)}
        ${securityCodeBox(copy.altCodeLabel, escapeHtml(params.code))}
      `,
    })}
    ${spacer(20)}
    ${securityMetaGrid([
      { label: copy.metaTime, value: requestTime },
      { label: copy.metaIp, value: ip, code: true },
      { label: copy.metaDevice, value: device, breakable: true },
      { label: copy.metaAccount, value: account, breakable: true, full: (params.account ?? '').length > 24 },
    ])}
    ${spacer(24)}
    ${securityNotYou({
      tone: 'calm',
      title: copy.notYouTitle,
      body: `${copy.notYouBody} <a href="${supportHref}" style="color:${PULSE.graphite};font-weight:600;text-decoration:underline;">${copy.notYouLink}</a>.`,
    })}
  `);

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
