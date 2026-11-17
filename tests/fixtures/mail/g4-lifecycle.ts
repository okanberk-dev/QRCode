// g4 — lifecycle & onboarding mails (welcome, trial-ending, upgrade-suggestion,
// qr-not-downloaded, first-feedback-tips).
import { renderWelcome } from '../../../src/lib/email/templates/welcome';
import { renderTrialEnding } from '../../../src/lib/email/templates/trial-ending';
import { renderUpgradeSuggestion } from '../../../src/lib/email/templates/upgrade-suggestion';
import { renderQrNotDownloaded } from '../../../src/lib/email/templates/qr-not-downloaded';
import { renderFirstFeedbackTips } from '../../../src/lib/email/templates/first-feedback-tips';
import { APP_URL, LONG_NAME, LONG_URL, LONG_WORD, type MailFixture } from './_env';

const DASHBOARD_URL = `${APP_URL}/tr/dashboard`;
const QR_URL = `${APP_URL}/tr/dashboard/qr`;
const PRICING_URL = `${APP_URL}/tr/dashboard/account?section=billing`;
const RESTAURANT = 'Kahve Dükkanı Moda';

export const FIXTURES_G4: MailFixture[] = [
  // ── welcome ──────────────────────────────────────────────────────────
  {
    id: 'welcome',
    template: 'welcome',
    render: (locale) => renderWelcome({ firstName: 'Mert', dashboardUrl: DASHBOARD_URL }, locale),
  },
  {
    id: 'welcome:stress',
    template: 'welcome',
    stress: true,
    render: (locale) =>
      renderWelcome({ firstName: LONG_WORD, dashboardUrl: `${APP_URL}/tr/dashboard?next=${LONG_WORD}` }, locale),
  },
  {
    id: 'welcome:no-name',
    template: 'welcome',
    render: (locale) => renderWelcome({ firstName: null, dashboardUrl: DASHBOARD_URL }, locale),
  },

  // ── trial-ending ─────────────────────────────────────────────────────
  {
    id: 'trial-ending',
    template: 'trial-ending',
    render: (locale) =>
      renderTrialEnding(
        {
          firstName: 'Mert',
          daysLeft: 3,
          usage: { reviews: 128, avgRating: 4.6, aiReplies: 37, growthPct: 24 },
          upgradeUrl: PRICING_URL,
        },
        locale,
      ),
  },
  {
    id: 'trial-ending:one-day',
    template: 'trial-ending',
    render: (locale) =>
      renderTrialEnding(
        {
          firstName: 'Ayşe',
          daysLeft: 1,
          usage: { reviews: 41, avgRating: 4.2, aiReplies: 9, growthPct: -6 },
          upgradeUrl: PRICING_URL,
          comparisonUrl: `${APP_URL}/tr/pricing`,
        },
        locale,
      ),
  },
  {
    id: 'trial-ending:no-data',
    template: 'trial-ending',
    render: (locale) =>
      renderTrialEnding(
        {
          firstName: null,
          daysLeft: 3,
          usage: { reviews: null, avgRating: null, aiReplies: null, growthPct: null },
          upgradeUrl: PRICING_URL,
        },
        locale,
      ),
  },
  {
    id: 'trial-ending:usd-prices',
    template: 'trial-ending',
    render: (locale) =>
      renderTrialEnding(
        {
          firstName: 'Deniz',
          daysLeft: 2,
          usage: { reviews: 312, avgRating: 4.8, aiReplies: 120, growthPct: 63 },
          upgradeUrl: PRICING_URL,
          prices: { starter: '$19', pro: '$49', starterPeriod: '/ mo · 1 location', proPeriod: '/ mo · 5 locations' },
        },
        locale,
      ),
  },
  {
    id: 'trial-ending:stress',
    template: 'trial-ending',
    stress: true,
    render: (locale) =>
      renderTrialEnding(
        {
          firstName: LONG_NAME,
          daysLeft: 14,
          usage: { reviews: 1234567, avgRating: 4.7, aiReplies: 9876543, growthPct: 1234 },
          upgradeUrl: LONG_URL,
          comparisonUrl: LONG_URL,
          prices: {
            starter: '₺124.499,90',
            pro: '₺1.249.999,00',
            starterPeriod: '/ ay · 1 şube · yıllık ödemede',
            proPeriod: '/ ay · 5 şube · yıllık ödemede',
          },
        },
        locale,
      ),
  },

  // ── upgrade-suggestion ───────────────────────────────────────────────
  {
    id: 'upgrade-suggestion',
    template: 'upgrade-suggestion',
    render: (locale) =>
      renderUpgradeSuggestion(
        { firstName: 'Mert', restaurantName: RESTAURANT, feedbackCount: 124, pricingUrl: PRICING_URL },
        locale,
      ),
  },
  {
    id: 'upgrade-suggestion:no-name',
    template: 'upgrade-suggestion',
    render: (locale) =>
      renderUpgradeSuggestion(
        { firstName: null, restaurantName: RESTAURANT, feedbackCount: 1204, pricingUrl: PRICING_URL },
        locale,
      ),
  },
  {
    id: 'upgrade-suggestion:stress',
    template: 'upgrade-suggestion',
    stress: true,
    render: (locale) =>
      renderUpgradeSuggestion(
        { firstName: LONG_WORD, restaurantName: LONG_NAME, feedbackCount: 1234567, pricingUrl: LONG_URL },
        locale,
      ),
  },

  // ── qr-not-downloaded ────────────────────────────────────────────────
  {
    id: 'qr-not-downloaded',
    template: 'qr-not-downloaded',
    render: (locale) =>
      renderQrNotDownloaded({ firstName: 'Mert', restaurantName: RESTAURANT, qrUrl: QR_URL }, locale),
  },
  {
    id: 'qr-not-downloaded:no-name',
    template: 'qr-not-downloaded',
    render: (locale) =>
      renderQrNotDownloaded({ firstName: null, restaurantName: RESTAURANT, qrUrl: QR_URL }, locale),
  },
  {
    id: 'qr-not-downloaded:stress',
    template: 'qr-not-downloaded',
    stress: true,
    render: (locale) =>
      renderQrNotDownloaded({ firstName: LONG_WORD, restaurantName: LONG_NAME, qrUrl: LONG_URL }, locale),
  },

  // ── first-feedback-tips ──────────────────────────────────────────────
  {
    id: 'first-feedback-tips',
    template: 'first-feedback-tips',
    render: (locale) =>
      renderFirstFeedbackTips({ firstName: 'Mert', restaurantName: RESTAURANT, dashboardUrl: DASHBOARD_URL }, locale),
  },
  {
    id: 'first-feedback-tips:no-name',
    template: 'first-feedback-tips',
    render: (locale) =>
      renderFirstFeedbackTips({ firstName: null, restaurantName: RESTAURANT, dashboardUrl: DASHBOARD_URL }, locale),
  },
  {
    id: 'first-feedback-tips:stress',
    template: 'first-feedback-tips',
    stress: true,
    render: (locale) =>
      renderFirstFeedbackTips({ firstName: LONG_WORD, restaurantName: LONG_NAME, dashboardUrl: LONG_URL }, locale),
  },
];
