// g6 — ROI mails (roi-customer-report, roi-admin-notification).
// Param shapes mirror src/app/api/roi/save/route.ts: currency is ₺ for TR and
// $ for EN, firstName is always null in production, plan price comes from the
// TR price table, AI insight is either the OpenAI result or the template
// fallback (3 next steps).
import {
  renderRoiCustomerReport,
  type RoiCustomerReportParams,
} from '../../../src/lib/email/templates/roi-customer-report';
import {
  renderRoiAdminNotification,
  type RoiAdminNotificationParams,
} from '../../../src/lib/email/templates/roi-admin-notification';
import {
  APP_URL,
  LONG_COMMENT,
  LONG_EMAIL,
  LONG_NAME,
  LONG_URL,
  LONG_WORD,
  type MailFixture,
  type MailFixtureLocale,
} from './_env';

const cur = (locale: MailFixtureLocale) => (locale === 'en' ? '$' : '₺');

const SUMMARY = {
  tr: 'Karaköy Balıkçısı için aylık yaklaşık 86 yeni yorum ve 14 düşük puanlı yorumun dahili forma yönlenmesi bekleniyor. Google puanının 4.2’den 4.6’ya çıkması, arama görünürlüğünü ve yeni müşteri akışını belirgin biçimde artırıyor.',
  en: 'For Karaköy Fish House we expect about 86 new reviews a month and 14 low-rated reviews routed to the private form. Lifting the Google rating from 4.2 to 4.6 meaningfully improves discovery and new customer flow.',
};
const HIGHLIGHT = {
  tr: 'Aylık 14 düşük puanlı geri bildirimi önce ekibinle konuşarak çözmek, puan ortalamasını en hızlı yükselten kaldıraç.',
  en: 'Resolving the 14 low-rated pieces of feedback a month with your team first is the fastest lever on your rating.',
};
const STEPS = {
  tr: [
    "QR'ı masa altlığı + kasa yanına yerleştir; ilk 7 gün tarama oranını ölç.",
    'Pulse AI taslak yanıtlarını ilk 2 hafta her yorum için onayla — model işletme tonuna kalibre olsun.',
    "Aktif platformların URL'lerini admin panelden gir; yüksek puan akışı doğru yere gitsin.",
  ],
  en: [
    'Place QR on table tents + cashier; measure scan rate during first 7 days.',
    'Approve every Pulse AI draft for the first 2 weeks so the model calibrates to your tone.',
    'Add URLs for all active platforms in admin so high-rating flow routes correctly.',
  ],
};

function customerParams(
  locale: MailFixtureLocale,
  over: Partial<RoiCustomerReportParams> = {},
): RoiCustomerReportParams {
  return {
    restaurantName: 'Karaköy Balıkçısı',
    firstName: null,
    currency: cur(locale),
    netGain: 482_750,
    roiMultiple: 4.5,
    monthlyUplift: 52_300,
    paybackMonths: 3,
    reviewers: 86,
    filteredLowReviews: 14,
    projectedGoogle: 4.6,
    currentGoogle: 4.2,
    newCustomers: 43,
    aiHoursSaved: 6.5,
    plan: 'growth',
    planPrice: 899,
    platforms: ['google', 'yemeksepeti', 'getir'],
    aiSummary: SUMMARY[locale],
    aiHighlight: HIGHLIGHT[locale],
    aiNextSteps: STEPS[locale],
    hasPdf: true,
    contactUrl: `${APP_URL}/${locale}/contact`,
    pricingUrl: `${APP_URL}/${locale}/pricing`,
    ...over,
  };
}

function adminParams(
  locale: MailFixtureLocale,
  over: Partial<RoiAdminNotificationParams> = {},
): RoiAdminNotificationParams {
  return {
    email: 'ahmet.yilmaz@karakoybalikcisi.com.tr',
    restaurantName: 'Karaköy Balıkçısı',
    phone: '+90 532 123 45 67',
    sector: 'restaurant',
    monthlyCustomers: 2400,
    avgTicket: 650,
    currentGoogle: 4.2,
    lowRatingsPerMonth: 18,
    platforms: ['google', 'yemeksepeti', 'getir'],
    plan: 'growth',
    planPrice: 899,
    currency: cur(locale),
    scanned: 410,
    reviewers: 86,
    filteredLowReviews: 14,
    projectedGoogle: 4.6,
    newCustomers: 43,
    monthlyUplift: 52_300,
    yearlyUplift: 627_600,
    netGain: 482_750,
    roiMultiple: 4.5,
    paybackMonths: 3,
    aiHoursSaved: 6.5,
    aiSummary: SUMMARY[locale],
    aiHighlight: HIGHLIGHT[locale],
    aiNextSteps: STEPS[locale],
    aiSource: 'ai',
    panelUrl: `${APP_URL}/admin/customers`,
    ip: '88.241.17.203',
    ...over,
  };
}

const ALL_PLATFORMS = [
  'google',
  'yemeksepeti',
  'getir',
  'trendyol_go',
  'tripadvisor',
  'airbnb',
  'booking',
  'yandex',
  'yelp',
  'foursquare',
];

export const FIXTURES_G6: MailFixture[] = [
  // ── roi-customer-report ─────────────────────────────────────────────
  {
    id: 'roi-customer-report',
    template: 'roi-customer-report',
    render: (locale) => renderRoiCustomerReport(customerParams(locale), locale),
  },
  {
    id: 'roi-customer-report:stress',
    template: 'roi-customer-report',
    stress: true,
    render: (locale) =>
      renderRoiCustomerReport(
        customerParams(locale, {
          restaurantName: LONG_NAME,
          firstName: LONG_WORD,
          netGain: 1_250_000_000,
          roiMultiple: 128.4,
          monthlyUplift: 104_166_667,
          paybackMonths: 12,
          reviewers: 1_234_567,
          filteredLowReviews: 1_234_567,
          projectedGoogle: 5.0,
          currentGoogle: 1.0,
          aiHoursSaved: 1234.5,
          plan: 'enterprise-plus-custom',
          platforms: ALL_PLATFORMS,
          aiSummary: LONG_COMMENT,
          aiHighlight: LONG_COMMENT,
          aiNextSteps: [LONG_COMMENT, LONG_WORD, LONG_COMMENT.slice(0, 160), `${LONG_URL}`],
          contactUrl: LONG_URL,
          pricingUrl: LONG_URL,
        }),
        locale,
      ),
  },
  {
    id: 'roi-customer-report:named',
    template: 'roi-customer-report',
    render: (locale) => renderRoiCustomerReport(customerParams(locale, { firstName: 'Ayşe' }), locale),
  },
  {
    id: 'roi-customer-report:no-pdf',
    template: 'roi-customer-report',
    render: (locale) => renderRoiCustomerReport(customerParams(locale, { hasPdf: false }), locale),
  },
  {
    id: 'roi-customer-report:no-payback',
    template: 'roi-customer-report',
    render: (locale) =>
      renderRoiCustomerReport(customerParams(locale, { paybackMonths: null, plan: 'pro', planPrice: 1499 }), locale),
  },
  {
    id: 'roi-customer-report:no-steps',
    template: 'roi-customer-report',
    render: (locale) =>
      renderRoiCustomerReport(
        customerParams(locale, {
          aiNextSteps: [],
          aiSummary:
            locale === 'en'
              ? 'Your 12-month projection for Karaköy Fish House shows $482,750 net gain at 4.5× ROI.'
              : 'Karaköy Balıkçısı için 12 aylık projeksiyon ₺482.750 net kazanç ve 4.5× ROI yansıtıyor.',
          platforms: [],
        }),
        locale,
      ),
  },
  {
    id: 'roi-customer-report:small',
    template: 'roi-customer-report',
    render: (locale) =>
      renderRoiCustomerReport(
        customerParams(locale, {
          restaurantName: 'Ç',
          netGain: -1250,
          roiMultiple: 0,
          monthlyUplift: 0,
          paybackMonths: null,
          reviewers: 0,
          filteredLowReviews: 0,
          projectedGoogle: 4.2,
          aiHoursSaved: 0,
          plan: 'starter',
          planPrice: 499,
          platforms: ['google'],
        }),
        locale,
      ),
  },

  // ── roi-admin-notification ──────────────────────────────────────────
  {
    id: 'roi-admin-notification',
    template: 'roi-admin-notification',
    render: (locale) => renderRoiAdminNotification(adminParams(locale), locale),
  },
  {
    id: 'roi-admin-notification:stress',
    template: 'roi-admin-notification',
    stress: true,
    render: (locale) =>
      renderRoiAdminNotification(
        adminParams(locale, {
          email: LONG_EMAIL,
          restaurantName: LONG_NAME,
          phone: '+90 (532) 123 45 67 dahili 1234567890123456789012345678901234567890',
          sector: 'hotel',
          monthlyCustomers: 1_234_567,
          avgTicket: 12_345_678,
          lowRatingsPerMonth: 1_234_567,
          platforms: ALL_PLATFORMS,
          plan: 'enterprise-plus-custom',
          planPrice: 1_499_000,
          scanned: 9_999_999,
          reviewers: 1_234_567,
          filteredLowReviews: 1_234_567,
          monthlyUplift: 104_166_667,
          yearlyUplift: 1_250_000_000,
          netGain: 1_250_000_000,
          roiMultiple: 128.4,
          paybackMonths: 12,
          aiHoursSaved: 1234.5,
          aiSummary: LONG_COMMENT,
          aiHighlight: LONG_COMMENT,
          aiNextSteps: [LONG_COMMENT, LONG_WORD, LONG_COMMENT.slice(0, 160), LONG_URL],
          panelUrl: LONG_URL,
          ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        }),
        locale,
      ),
  },
  {
    id: 'roi-admin-notification:no-phone',
    template: 'roi-admin-notification',
    render: (locale) => renderRoiAdminNotification(adminParams(locale, { phone: null }), locale),
  },
  {
    id: 'roi-admin-notification:ai-template',
    template: 'roi-admin-notification',
    render: (locale) =>
      renderRoiAdminNotification(
        adminParams(locale, { aiSource: 'template', sector: 'clinic', plan: 'pro', planPrice: 1499 }),
        locale,
      ),
  },
  {
    id: 'roi-admin-notification:no-steps',
    template: 'roi-admin-notification',
    render: (locale) =>
      renderRoiAdminNotification(
        adminParams(locale, { aiNextSteps: [], paybackMonths: null, platforms: [], sector: 'cafe' }),
        locale,
      ),
  },
  {
    id: 'roi-admin-notification:small',
    template: 'roi-admin-notification',
    render: (locale) =>
      renderRoiAdminNotification(
        adminParams(locale, {
          email: 'a@b.co',
          restaurantName: 'Ç',
          phone: '5',
          sector: 'other',
          monthlyCustomers: 40,
          avgTicket: 85,
          currentGoogle: 4.8,
          lowRatingsPerMonth: 0,
          platforms: ['google'],
          plan: 'starter',
          planPrice: 499,
          scanned: 0,
          reviewers: 0,
          filteredLowReviews: 0,
          projectedGoogle: 4.8,
          newCustomers: 0,
          monthlyUplift: 0,
          yearlyUplift: 0,
          netGain: -1250,
          roiMultiple: 0,
          paybackMonths: null,
          aiHoursSaved: 0,
        }),
        locale,
      ),
  },
];
