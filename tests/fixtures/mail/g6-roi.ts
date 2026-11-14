// g6 — ROI mails (roi-customer-report, roi-admin-notification).
// Param shapes mirror src/app/api/roi/save/route.ts: the calculator inputs are
// normalised with normalizeRoiInputs, the estimate is recomputed with
// computeRoi, the plan is a name or null, and the summary comes from
// buildRoiTemplateInsight — the same deterministic text the route uses when
// OpenAI is unavailable or its answer is rejected. firstName is always null
// in production.
import {
  renderRoiCustomerReport,
  type RoiCustomerReportParams,
} from '../../../src/lib/email/templates/roi-customer-report';
import {
  renderRoiAdminNotification,
  type RoiAdminNotificationParams,
} from '../../../src/lib/email/templates/roi-admin-notification';
import { computeRoi, normalizeRoiInputs, type RoiInputs } from '../../../src/lib/roi/roi-model';
import { buildRoiTemplateInsight } from '../../../src/lib/roi/generate-insight';
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

const NAME = 'Karaköy Balıkçısı';
const EMAIL = 'ahmet.yilmaz@karakoybalikcisi.com.tr';

interface Scenario {
  restaurantName?: string;
  sector?: string;
  planName?: string | null;
  inputs?: Partial<Record<keyof RoiInputs, unknown>>;
}

/** Calculator inputs → estimate → template summary, as the route builds them. */
function scenario(locale: MailFixtureLocale, s: Scenario = {}) {
  const restaurantName = s.restaurantName ?? NAME;
  const sector = s.sector ?? 'restaurant';
  const planName = s.planName === undefined ? 'Growth' : s.planName;
  const inputs = normalizeRoiInputs(
    {
      monthlyCustomers: 2400,
      ratingRatePct: 6,
      replySharePct: 60,
      minutesManual: 6,
      minutesWithDraft: 2,
      hourlyCostUsd: 8,
      planMonthlyUsd: planName === null ? null : 49,
      ...s.inputs,
    },
    locale,
  );
  const estimate = computeRoi(inputs);
  const insight = buildRoiTemplateInsight({
    data: {
      restaurantName,
      email: EMAIL,
      generatedAt: new Date('2026-11-01T09:00:00Z'),
      locale,
      sector,
      planName,
      inputs,
      result: estimate,
    },
    locale,
  });
  return { restaurantName, sector, planName, inputs, estimate, insight };
}

function customerParams(
  locale: MailFixtureLocale,
  s: Scenario = {},
  over: Partial<RoiCustomerReportParams> = {},
): RoiCustomerReportParams {
  const sc = scenario(locale, s);
  return {
    restaurantName: sc.restaurantName,
    firstName: null,
    inputs: sc.inputs,
    estimate: sc.estimate,
    planName: sc.planName,
    aiSummary: sc.insight.summary,
    aiHighlight: sc.insight.highlight,
    aiNextSteps: sc.insight.nextSteps,
    aiSource: 'template',
    hasPdf: true,
    contactUrl: `${APP_URL}/${locale}/contact`,
    pricingUrl: `${APP_URL}/${locale}/pricing`,
    registerUrl: `${APP_URL}/${locale}/auth/register`,
    ...over,
  };
}

function adminParams(
  locale: MailFixtureLocale,
  s: Scenario = {},
  over: Partial<RoiAdminNotificationParams> = {},
): RoiAdminNotificationParams {
  const sc = scenario(locale, s);
  return {
    email: EMAIL,
    restaurantName: sc.restaurantName,
    phone: '+90 532 123 45 67',
    sector: sc.sector,
    planName: sc.planName,
    inputs: sc.inputs,
    estimate: sc.estimate,
    aiSummary: sc.insight.summary,
    aiHighlight: sc.insight.highlight,
    aiNextSteps: sc.insight.nextSteps,
    aiSource: 'template',
    panelUrl: `${APP_URL}/admin/customers`,
    ip: '88.241.17.203',
    ...over,
  };
}

/** Every input at its upper limit (normalizeRoiInputs clamps the rest). */
const MAX_INPUTS = {
  monthlyCustomers: 1_000_000,
  ratingRatePct: 100,
  replySharePct: 100,
  minutesManual: 99,
  minutesWithDraft: 1,
  hourlyCostUsd: 1000,
  planMonthlyUsd: 1_000_000,
};

/** Draft time equal to manual time: no time saved, plan costs more. */
const NO_SAVING_INPUTS = {
  monthlyCustomers: 100,
  ratingRatePct: 1,
  replySharePct: 10,
  minutesManual: 3,
  minutesWithDraft: 3,
  hourlyCostUsd: 1,
};

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
        customerParams(
          locale,
          { restaurantName: LONG_NAME, planName: 'enterprise-plus-custom', inputs: MAX_INPUTS },
          {
            firstName: LONG_WORD,
            aiSummary: LONG_COMMENT,
            aiHighlight: LONG_COMMENT,
            aiNextSteps: [LONG_COMMENT, LONG_WORD, LONG_COMMENT.slice(0, 160), LONG_URL],
            contactUrl: LONG_URL,
            pricingUrl: LONG_URL,
            registerUrl: LONG_URL,
          },
        ),
        locale,
      ),
  },
  {
    id: 'roi-customer-report:named',
    template: 'roi-customer-report',
    render: (locale) => renderRoiCustomerReport(customerParams(locale, {}, { firstName: 'Ayşe' }), locale),
  },
  {
    id: 'roi-customer-report:no-pdf',
    template: 'roi-customer-report',
    render: (locale) => renderRoiCustomerReport(customerParams(locale, {}, { hasPdf: false }), locale),
  },
  {
    id: 'roi-customer-report:no-plan',
    template: 'roi-customer-report',
    render: (locale) => renderRoiCustomerReport(customerParams(locale, { planName: null }), locale),
  },
  {
    id: 'roi-customer-report:no-steps',
    template: 'roi-customer-report',
    render: (locale) =>
      renderRoiCustomerReport(customerParams(locale, {}, { aiNextSteps: [], registerUrl: undefined }), locale),
  },
  {
    id: 'roi-customer-report:small',
    template: 'roi-customer-report',
    render: (locale) =>
      renderRoiCustomerReport(
        customerParams(locale, { restaurantName: 'Ç', planName: 'Starter', inputs: NO_SAVING_INPUTS }),
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
        adminParams(
          locale,
          { restaurantName: LONG_NAME, sector: 'hotel', planName: 'enterprise-plus-custom', inputs: MAX_INPUTS },
          {
            email: LONG_EMAIL,
            phone: '+90 (532) 123 45 67 dahili 1234567890123456789012345678901234567890',
            aiSummary: LONG_COMMENT,
            aiHighlight: LONG_COMMENT,
            aiNextSteps: [LONG_COMMENT, LONG_WORD, LONG_COMMENT.slice(0, 160), LONG_URL],
            panelUrl: LONG_URL,
            ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          },
        ),
        locale,
      ),
  },
  {
    id: 'roi-admin-notification:no-phone',
    template: 'roi-admin-notification',
    render: (locale) => renderRoiAdminNotification(adminParams(locale, {}, { phone: null }), locale),
  },
  {
    id: 'roi-admin-notification:ai',
    template: 'roi-admin-notification',
    render: (locale) =>
      renderRoiAdminNotification(adminParams(locale, { sector: 'clinic' }, { aiSource: 'ai' }), locale),
  },
  {
    id: 'roi-admin-notification:no-steps',
    template: 'roi-admin-notification',
    render: (locale) =>
      renderRoiAdminNotification(adminParams(locale, { sector: 'cafe', planName: null }, { aiNextSteps: [] }), locale),
  },
  {
    id: 'roi-admin-notification:small',
    template: 'roi-admin-notification',
    render: (locale) =>
      renderRoiAdminNotification(
        adminParams(
          locale,
          { restaurantName: 'Ç', sector: 'other', planName: 'Starter', inputs: NO_SAVING_INPUTS },
          { email: 'a@b.co', phone: '5' },
        ),
        locale,
      ),
  },
];
