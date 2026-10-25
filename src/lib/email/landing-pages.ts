// Copy + state mapping for the standalone pages a mail link lands on. Pure and
// dependency-free (no Prisma / next) so the routes, the render fixtures and
// the visual audit all share it; the markup itself lives in landing-page.ts.
//
// Usage: renderMailLandingPage(newsletterUnsubscribeLanding('tr', 'success', email))

import type { MailLandingPageParams } from './landing-page';

type Locale = 'tr' | 'en';

function appBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com').replace(/\/+$/, '');
}

// ── /api/newsletter/unsubscribe ──────────────────────────────────────────
export type NewsletterUnsubscribeState = 'success' | 'invalid';

export function newsletterUnsubscribeLanding(
  locale: Locale,
  state: NewsletterUnsubscribeState,
  email?: string,
): MailLandingPageParams {
  const isTr = locale !== 'en';
  const eyebrow = isTr ? 'Buaze · Bülten' : 'Buaze · Newsletter';
  const cta = { href: appBase(), label: isTr ? 'Anasayfaya dön' : 'Back home' };

  if (state === 'success') {
    return {
      locale,
      tone: 'success',
      eyebrow,
      documentTitle: isTr ? 'Aboneliğin sonlandı · Buaze' : 'Unsubscribed · Buaze',
      title: isTr ? 'Aboneliğin sonlandı.' : "You're unsubscribed.",
      body: isTr
        ? 'Bundan sonra Pulse aylık bültenini almayacaksın. Fikrini değiştirirsen sitedeki abone formundan tekrar katılabilirsin.'
        : "You'll no longer receive the Pulse monthly digest. If you change your mind, sign up again from any newsletter form on the site.",
      detail: email ? { value: email } : undefined,
      cta,
    };
  }
  return {
    locale,
    tone: 'warn',
    eyebrow,
    documentTitle: isTr ? 'Bağlantı geçersiz · Buaze' : 'Invalid link · Buaze',
    title: isTr ? 'Bağlantı geçersiz.' : 'Invalid link.',
    body: isTr
      ? 'Bu bağlantı bulunamadı veya süresi dolmuş olabilir. Eğer Buaze\'den mail almak istemiyorsan herhangi bir mailimizdeki "buradan çık" bağlantısını kullanabilirsin.'
      : "This link couldn't be found or has expired. If you no longer want emails from Buaze, use the unsubscribe link in any of our messages.",
    cta,
  };
}

// ── /api/customers/unsubscribe ───────────────────────────────────────────
export type CustomerUnsubscribeState = 'success' | 'invalid';

export function customerUnsubscribeLanding(
  locale: Locale,
  state: CustomerUnsubscribeState,
): MailLandingPageParams {
  const isTr = locale !== 'en';
  const eyebrow = isTr ? 'İletişim tercihi' : 'Email preferences';
  const cta = { href: appBase(), label: isTr ? "Buaze'a dön" : 'Back to Buaze' };

  if (state === 'success') {
    return {
      locale,
      tone: 'success',
      eyebrow,
      documentTitle: isTr ? 'Aboneliğin sonlandı · Buaze' : "You're unsubscribed · Buaze",
      title: isTr ? 'Aboneliğin sonlandı.' : "You're unsubscribed.",
      body: isTr
        ? 'Artık bu listeden mail almayacaksın. Ne zaman istersen restoran sahibi seni tekrar listeye ekleyebilir.'
        : 'You will no longer receive emails from this list. The restaurant can add you back to the list whenever you wish.',
      cta,
    };
  }
  return {
    locale,
    tone: 'warn',
    eyebrow,
    documentTitle: isTr ? 'Bağlantı geçersiz · Buaze' : 'Invalid link · Buaze',
    title: isTr ? 'Bağlantı bulunamadı' : 'Link not found',
    body: isTr
      ? 'Bu link geçersiz veya süresi dolmuş olabilir. Daha yeni bir mail\'deki "buradan çık" bağlantısını kullanabilirsin.'
      : 'This link may be invalid or expired. You can use the "unsubscribe here" link in a more recent email.',
    cta,
  };
}

// ── /api/account/delete/cancel ───────────────────────────────────────────
// `invalid` = malformed token, `expired` = token no longer maps to a pending
// deletion (revoked, already cancelled, account active). Same visual state,
// different copy.
export type AccountDeleteCancelState = 'success' | 'invalid' | 'expired';

export function accountDeleteCancelLanding(opts: {
  locale: Locale;
  state: AccountDeleteCancelState;
  dashboardUrl: string;
}): MailLandingPageParams {
  const { locale, state, dashboardUrl } = opts;
  const isTr = locale !== 'en';
  const eyebrow = isTr ? 'Hesap silme · İptal' : 'Account delete · Cancel';
  const cta = { href: dashboardUrl, label: isTr ? 'Panele git' : 'Open dashboard' };

  if (state === 'success') {
    return {
      locale,
      tone: 'success',
      eyebrow,
      title: isTr ? 'Hesap silme iptal edildi' : 'Account deletion canceled',
      body: isTr
        ? "Hesabın aktif kalıyor. Tüm verin yerinde — restoranlar, yorumlar ve abonelik geçmişi olduğu gibi devam ediyor. Onay maili dakikalar içinde inbox'ına gelir."
        : 'Your account stays active. All data is intact — restaurants, reviews and subscription history continue unchanged. A confirmation mail will arrive in your inbox shortly.',
      cta,
    };
  }
  const body =
    state === 'invalid'
      ? isTr
        ? "Bu link geçersiz görünüyor. Mail'deki bağlantıyı tekrar dene veya destek ekibine yaz."
        : 'This link looks invalid. Try the link in your email again or contact support.'
      : isTr
        ? 'Bu link artık geçerli değil. İptal süresi dolmuş veya hesabın zaten aktif olabilir.'
        : 'This link is no longer valid. The cancellation window may have passed or your account may already be active.';
  return {
    locale,
    tone: 'danger',
    eyebrow,
    title: isTr ? 'Bağlantı geçersiz' : 'Link is invalid',
    body,
    cta,
  };
}
