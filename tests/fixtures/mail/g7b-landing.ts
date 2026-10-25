// g7b — standalone pages reached from a mail link (newsletter unsubscribe,
// customer-campaign unsubscribe, account-deletion cancel). Each fixture's
// `subject` / `text` is the page title so the shared audit can report on it.
import { renderMailLandingPage, type MailLandingPageParams } from '../../../src/lib/email/landing-page';
import {
  accountDeleteCancelLanding,
  customerUnsubscribeLanding,
  newsletterUnsubscribeLanding,
} from '../../../src/lib/email/landing-pages';
import { APP_URL, LONG_EMAIL, LONG_NAME, LONG_URL, LONG_WORD, type MailFixture, type MailFixtureLocale } from './_env';

const DASHBOARD = (locale: MailFixtureLocale) => `${APP_URL}/${locale}/dashboard`;

function page(
  id: string,
  build: (locale: MailFixtureLocale) => MailLandingPageParams,
  stress = false,
): MailFixture {
  return {
    id: `landing:${id}`,
    template: 'landing',
    stress,
    render: async (locale) => {
      const params = build(locale);
      const title = params.documentTitle ?? params.title;
      return { subject: title, html: renderMailLandingPage(params), text: title };
    },
  };
}

export const FIXTURES_G7B: MailFixture[] = [
  // ── /api/newsletter/unsubscribe ──────────────────────────────────────
  page('newsletter-unsubscribe-success', (l) =>
    newsletterUnsubscribeLanding(l, 'success', 'ayse.demir@kahvedukkani.com.tr'),
  ),
  page('newsletter-unsubscribe-success:stress', (l) => newsletterUnsubscribeLanding(l, 'success', LONG_EMAIL), true),
  page(
    'newsletter-unsubscribe-success:unbroken-email',
    (l) => newsletterUnsubscribeLanding(l, 'success', `${LONG_WORD}@${LONG_WORD}.com`),
    true,
  ),
  page('newsletter-unsubscribe-invalid', (l) => newsletterUnsubscribeLanding(l, 'invalid')),

  // ── /api/customers/unsubscribe ───────────────────────────────────────
  page('customer-unsubscribe-success', (l) => customerUnsubscribeLanding(l, 'success')),
  page('customer-unsubscribe-invalid', (l) => customerUnsubscribeLanding(l, 'invalid')),

  // ── /api/account/delete/cancel ───────────────────────────────────────
  page('account-delete-cancel-success', (l) =>
    accountDeleteCancelLanding({ locale: l, state: 'success', dashboardUrl: DASHBOARD(l) }),
  ),
  page('account-delete-cancel-invalid', (l) =>
    accountDeleteCancelLanding({ locale: l, state: 'invalid', dashboardUrl: DASHBOARD(l) }),
  ),
  page(
    'account-delete-cancel-invalid:stress',
    (l) => accountDeleteCancelLanding({ locale: l, state: 'invalid', dashboardUrl: LONG_URL }),
    true,
  ),
  page('account-delete-cancel-expired', (l) =>
    accountDeleteCancelLanding({ locale: l, state: 'expired', dashboardUrl: DASHBOARD(l) }),
  ),

  // ── helper under pathological input (every optional part populated) ──
  page(
    'helper:stress',
    (l) => ({
      locale: l,
      tone: 'success',
      eyebrow: `${LONG_WORD} · ${LONG_NAME}`,
      title: `${LONG_WORD} ${LONG_NAME}`,
      body: `${LONG_NAME} ${LONG_URL}`,
      detail: { label: 'E-posta adresi', value: LONG_EMAIL },
      cta: { href: LONG_URL, label: `${LONG_NAME} ${LONG_WORD}` },
    }),
    true,
  ),
  page('helper:neutral', (l) => ({
    locale: l,
    tone: 'neutral',
    eyebrow: l === 'tr' ? 'Bilgi' : 'Notice',
    title: l === 'tr' ? 'Bağlantı kullanıldı' : 'Link already used',
    body:
      l === 'tr'
        ? 'Bu işlem zaten tamamlanmış. Başka bir şey yapmana gerek yok.'
        : 'This action is already complete. There is nothing else you need to do.',
    cta: { href: APP_URL, label: l === 'tr' ? 'Anasayfaya dön' : 'Back home' },
  })),
  page('helper:no-cta', (l) => ({
    locale: l,
    tone: 'warn',
    eyebrow: l === 'tr' ? 'Uyarı' : 'Warning',
    title: l === 'tr' ? 'İşlem tamamlanamadı' : 'We could not finish that',
    body:
      l === 'tr'
        ? 'Bir şeyler ters gitti. Lütfen birkaç dakika sonra tekrar dene.'
        : 'Something went wrong. Please try again in a few minutes.',
  })),
];
