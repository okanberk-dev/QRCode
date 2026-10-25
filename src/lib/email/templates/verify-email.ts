import { PULSE } from '../tokens';
import { pulseLayout } from '../layout';
import { escapeHtml } from '../escape';
import { renderButton, spacer } from '../components';
import {
  securityContent,
  securityHero,
  securityCard,
  securityUrlBox,
  securityNotYou,
} from './security-mail-parts';
import { loadMailCopy } from '../copy-loader';
import { deepSubstitute } from '../placeholders';

export interface VerifyEmailParams {
  firstName?: string | null;
  verifyUrl: string;
}

export async function renderVerifyEmail(
  params: VerifyEmailParams,
  locale: 'tr' | 'en' = 'tr',
): Promise<{ subject: string; html: string; text: string }> {
  const isTr = locale !== 'en';
  const subject = isTr ? 'E-postanı onayla — Buaze' : 'Verify your email — Buaze';
  const preheader = isTr
    ? 'Linki 24 saat içinde kullan. Sen istemediysen, görmezden gel.'
    : 'Use the link within 24 hours. If you didn\'t request this, ignore.';

  // Display-friendly truncation of the verify URL (matches forgot-password pattern).
  const displayUrl = (() => {
    try {
      const u = new URL(params.verifyUrl);
      const tail = (u.searchParams.get('token') || u.searchParams.get('t') || '').slice(0, 24);
      return `${u.host}${u.pathname}?t=${tail || '••••'}`;
    } catch {
      return params.verifyUrl.slice(0, 80);
    }
  })();

  const inlineDefault = isTr ? {
    eyebrow: 'E-POSTA ONAYI',
    title: 'Hesabını birkaç',
    titleAccent: 'saniyede aç',
    intro: 'Merhaba <strong style="color:' + PULSE.graphite + ';font-weight:500;">${firstName}</strong>. Buaze hesabını oluşturduğun için teşekkürler. Devam edebilmek için aşağıdaki butonla e-posta adresini onayla. Bağlantı 24 saat geçerli.',
    cardEyebrow: 'Tek kullanımlık link',
    statusText: 'Aktif · 24 saat geçerli',
    cta: 'E-postamı onayla →',
    notYouTitle: 'Sen değil misin?',
    notYouBody: 'Bu maili görmezden gel. Hesap aktive edilmez, daha sonra otomatik silinir.',
  } : {
    eyebrow: 'EMAIL VERIFICATION',
    title: 'Activate your account',
    titleAccent: 'in seconds',
    intro: 'Hi <strong style="color:' + PULSE.graphite + ';font-weight:500;">${firstName}</strong>. Thanks for creating a Buaze account. To continue, confirm your email address with the button below. The link is valid for 24 hours.',
    cardEyebrow: 'One-time link',
    statusText: 'Active · 24h valid',
    cta: 'Verify my email →',
    notYouTitle: 'Not you?',
    notYouBody: 'Ignore this email. The account stays inactive and is removed automatically.',
  };

  const merged = await loadMailCopy('verify-email', locale, inlineDefault);
  const fallbackName = isTr ? 'merhaba' : 'hi';
  const vars = { firstName: params.firstName || fallbackName };
  const copy = deepSubstitute(merged, vars, 'html');
  const copyText = deepSubstitute(merged, vars, 'text');

  const verifyHrefSafe = escapeHtml(params.verifyUrl);
  const displayUrlSafe = escapeHtml(displayUrl);

  const content = securityContent(`
    ${securityHero({
      eyebrow: copy.eyebrow,
      title: copy.title,
      accent: copy.titleAccent,
      accentColor: PULSE.graphite,
      accentHighlight: true,
      breakBeforeAccent: true,
      intro: copy.intro,
    })}
    ${spacer(28)}
    ${securityCard({
      tone: 'neutral',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.statusText, dotColor: PULSE.success, bgColor: PULSE.limeSoft },
      body: `
        ${securityUrlBox(displayUrlSafe)}
        ${spacer(16)}
        ${renderButton({ href: verifyHrefSafe, label: copy.cta, size: 'lg' })}
      `,
    })}
    ${spacer(24)}
    ${securityNotYou({ tone: 'calm', title: copy.notYouTitle, body: copy.notYouBody })}
  `);

  const html = pulseLayout({
    subject,
    preheader,
    content,
    footer: { locale },
  });

  const text = `${copyText.title} ${copyText.titleAccent}\n\n${copyText.intro.replace(/<[^>]+>/g, '')}\n\n${copyText.cta} ${params.verifyUrl}\n\n${copyText.notYouTitle}\n${copyText.notYouBody}`;

  return { subject, html, text };
}
