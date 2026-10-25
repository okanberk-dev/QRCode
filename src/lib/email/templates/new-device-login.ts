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
    ? `${device} · ${location}. Sen değilsen hemen aksiyon al.`
    : `${device} · ${location}. If this wasn't you, act now.`;

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
      tone: 'neutral',
      eyebrow: copy.cardEyebrow,
      pill: { text: copy.statusText, dotColor: PULSE.warning, bgColor: '#FFFBEB' },
      body: securityMetaGrid([
        { label: copy.metaTime, value: loggedInAt },
        { label: copy.metaDevice, value: device, breakable: true },
        { label: copy.metaLocation, value: location, code: true },
        { label: copy.metaAccount, value: accountEmail, breakable: true, full: params.accountEmail.length > 24 },
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
