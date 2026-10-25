import { renderWeeklyReport, type WeeklyReportParams } from '../../../src/lib/email/templates/weekly-report';
import {
  renderMonthlyHealthReport,
  type MonthlyHealthReportParams,
} from '../../../src/lib/email/templates/monthly-health-report';
import {
  renderWeeklyDigestSummary,
  type WeeklyDigestSummaryParams,
} from '../../../src/lib/email/templates/weekly-digest-summary';
import { renderAuditCompleted, type AuditCompletedParams } from '../../../src/lib/email/templates/audit-completed';
import type { WeeklyDigestRecipient } from '../../../src/lib/weekly-digest-runner';
import { APP_URL, LONG_COMMENT, LONG_EMAIL, LONG_NAME, LONG_WORD, type MailFixture } from './_env';

const DASH = `${APP_URL}/tr/dashboard`;
const FROM = new Date('2026-10-12T00:00:00Z');
const TO = new Date('2026-10-18T23:59:00Z');

// ─── weekly-report ─────────────────────────────────────────────────────────

const WR_BASE: WeeklyReportParams = {
  restaurantName: 'Kadıköy Bistro',
  period: { from: FROM, to: TO },
  weekNumber: 42,
  stats: {
    total: 47,
    avgRating: 4.6,
    highRatings: 38,
    lowRatings: 4,
    distribution: { 5: 28, 4: 10, 3: 5, 2: 3, 1: 1 },
    conversionRate: 78,
    aspects: { food: 4.7, service: 4.5, atmosphere: 4.6 },
  },
  trend: [12, 18, 15, 22, 28, 31, 24],
  quotes: [
    { rating: 5, name: 'Selin K.', platform: 'Google', text: 'Pazar brunch sırası uzundu ama servis hâlâ ilgiliydi. Tatlılar ev yapımı.' },
    { rating: 5, name: 'Eren A.', platform: 'Yemeksepeti', text: "Masa QR'ı çok pratik. Garson çağırmadan ödedik." },
    { rating: 2, name: 'Defne T.', platform: 'Google', text: 'Kahve soğuk geldi, ısıttırmaya çalışınca biraz beklettiler.', warn: true },
  ],
  deltas: { totalDelta: '+18%', avgDelta: '+0.2', responseDelta: '−24%' },
  dashboardUrl: DASH,
  aiInsight: {
    summary:
      'Hafta sonu brunch yoğunluğu yorumların büyük kısmını getirdi; müşteriler tatlıları ve ilgili servisi öne çıkarıyor. Kahve sıcaklığı tek tekrar eden şikayet.',
    recommendation: 'Cumartesi ve pazar sabahı barista vardiyasına bir kişi ekleyip kahve servis sıcaklığını kontrol edin.',
    source: 'openai',
  },
  segmentCounts: { vip: 3, loyal: 12, new: 21, risk: 4, churned: 2 },
};

// What sendWeeklyDigest() actually passes today: no trend / quotes / deltas.
const WR_PROD: WeeklyReportParams = {
  ...WR_BASE,
  trend: undefined,
  quotes: undefined,
  deltas: undefined,
};

// ─── monthly-health-report ─────────────────────────────────────────────────

const MH_BASE: MonthlyHealthReportParams = {
  ownerName: 'Mert Demir',
  restaurantName: 'Kadıköy Bistro',
  reportMonth: new Date('2026-10-01T00:00:00Z'),
  baseline: { score: 38, capturedAt: new Date('2026-05-02T09:00:00Z') },
  latest: { score: 74, capturedAt: new Date('2026-10-01T02:00:00Z') },
  previous: { score: 69, capturedAt: new Date('2026-09-01T02:00:00Z') },
  metrics: {
    googleRating: 4.6,
    googleReviewCount: 312,
    googleMediaCount: 18,
    googleUnansweredQs: 2,
    feedbackTotal: 142,
    feedbackAvgRating: 4.5,
    feedbackReplied: 97,
    feedbackLowRated: 9,
  },
  delta: { googleReviewCount: 21, feedbackTotal: 34, feedbackAvgRating: 0.12 },
  recommendations: [
    {
      severity: 'critical',
      title: 'Cevaplanmamış 2 Google sorusu var',
      body: 'Müşteriler profil üzerinden soru soruyor; yanıtlanmayan sorular güven ve arama görünürlüğü kaybettirir.',
    },
    {
      severity: 'warn',
      title: 'Düşük puanlı 9 yorumun 3\'ü yanıtsız',
      body: 'Düşük puanlı yorumlara 48 saat içinde verilen yanıt, müşteriyi geri kazanma şansını belirgin biçimde artırır.',
    },
    {
      severity: 'tip',
      title: 'Profiline 4 fotoğraf daha ekle',
      body: 'Yeni fotoğraflar profil gösterimlerini artırır. Menü, mekan ve ekip fotoğrafları iyi başlangıçtır.',
    },
    {
      severity: 'tip',
      title: 'QR kodunu kasa yanına da yerleştir',
      body: 'Hesap anında yapılan taramalar masa taramalarından daha yüksek yorum oranı getiriyor.',
    },
  ],
  appUrl: APP_URL,
};

// ─── weekly-digest-summary ─────────────────────────────────────────────────

function recipient(i: number, over: Partial<WeeklyDigestRecipient> = {}): WeeklyDigestRecipient {
  return {
    restaurantId: `rest_${i}`,
    restaurantName: `Restoran ${i}`,
    ownerEmail: `sahip${i}@ornek.com`,
    recipientEmail: `sahip${i}@ornek.com`,
    total: 40 - i,
    avgRating: 4.2,
    highRatings: 30,
    lowRatings: 3,
    hasAi: i % 2 === 0,
    emailSent: true,
    ...over,
  };
}

const DS_RECIPIENTS: WeeklyDigestRecipient[] = [
  recipient(1, { restaurantName: 'Kadıköy Bistro', recipientEmail: 'mert@kadikoybistro.co', total: 47, avgRating: 4.6, hasAi: true }),
  recipient(2, { restaurantName: 'Moda Kahve Evi', recipientEmail: 'info@modakahve.com', total: 31, avgRating: 4.4, hasAi: true }),
  recipient(3, { restaurantName: 'Bomonti Pizza', recipientEmail: 'sahip@bomontipizza.com', total: 22, avgRating: 3.9, hasAi: false }),
  recipient(4, { restaurantName: 'Çengelköy Balık', recipientEmail: 'ayse@cengelkoybalik.com', total: 15, avgRating: 4.8, hasAi: false, emailSent: false }),
  recipient(5, { restaurantName: 'Alsancak Meyhane', recipientEmail: 'ahmet@alsancakmeyhane.com', total: 9, avgRating: 4.1, hasAi: true }),
];

const DS_BASE: WeeklyDigestSummaryParams = {
  triggeredAt: new Date('2026-10-19T10:00:00Z'),
  recipients: DS_RECIPIENTS,
  totals: { totalRestaurants: 9, sent: 4, skipped: 3, optedOut: 1, failed: 1 },
};

const DS_MANY: WeeklyDigestRecipient[] = Array.from({ length: 24 }, (_, i) =>
  recipient(i + 1, {
    restaurantName: i % 5 === 0 ? `Ahmet Usta Balık Lokantası ve Meyhanesi ${i + 1}` : `Restoran ${i + 1}`,
    total: 140 - i * 5,
    avgRating: 3.4 + ((i * 7) % 16) / 10,
    emailSent: i % 7 !== 3,
    hasAi: i % 3 !== 0,
  }),
);

// ─── audit-completed ───────────────────────────────────────────────────────

const AC_BASE: AuditCompletedParams = {
  restaurantName: 'Kadıköy Bistro',
  auditTitle: 'Günlük Mutfak Hijyen Kontrolü',
  respondentName: 'Zeynep Aydın',
  score: 86,
  passed: true,
  passingScore: 80,
  attentionCount: null,
  panelUrl: `${APP_URL}/tr/dashboard/audits/clx9f3k2a0001/responses/clx9f3k2a0002`,
};

export const FIXTURES_G3: MailFixture[] = [
  // ── weekly-report ────────────────────────────────────────────────────
  { id: 'weekly-report', template: 'weekly-report', render: (l) => renderWeeklyReport(WR_BASE, l) },
  { id: 'weekly-report:prod', template: 'weekly-report', render: (l) => renderWeeklyReport(WR_PROD, l) },
  {
    id: 'weekly-report:no-ai',
    template: 'weekly-report',
    render: (l) => renderWeeklyReport({ ...WR_BASE, aiInsight: undefined }, l),
  },
  {
    id: 'weekly-report:ai-fallback',
    template: 'weekly-report',
    render: (l) =>
      renderWeeklyReport({ ...WR_BASE, aiInsight: { summary: '', recommendation: '', source: 'fallback' } }, l),
  },
  {
    id: 'weekly-report:ai-summary-only',
    template: 'weekly-report',
    render: (l) =>
      renderWeeklyReport(
        { ...WR_BASE, aiInsight: { summary: WR_BASE.aiInsight!.summary, recommendation: '', source: 'openai' }, segmentCounts: undefined },
        l,
      ),
  },
  {
    id: 'weekly-report:empty',
    template: 'weekly-report',
    render: (l) =>
      renderWeeklyReport(
        {
          restaurantName: 'Yeni Açılan Kafe',
          period: { from: FROM, to: TO },
          weekNumber: 42,
          stats: {
            total: 0,
            avgRating: 0,
            highRatings: 0,
            lowRatings: 0,
            distribution: {},
            conversionRate: null,
            aspects: { food: null, service: null, atmosphere: null },
          },
          dashboardUrl: DASH,
        },
        l,
      ),
  },
  {
    id: 'weekly-report:rough-week',
    template: 'weekly-report',
    render: (l) =>
      renderWeeklyReport(
        {
          ...WR_BASE,
          stats: {
            total: 19,
            avgRating: 2.9,
            highRatings: 4,
            lowRatings: 11,
            distribution: { 5: 3, 4: 1, 3: 4, 2: 5, 1: 6 },
            conversionRate: 21,
            aspects: { food: 3.4, service: 2.1, atmosphere: null },
          },
          trend: [0, 1, 2, 9, 3, 2, 2],
          deltas: { totalDelta: '−32%', avgDelta: '−0.8' },
          quotes: [
            { rating: 1, name: 'Burak Ç.', platform: 'Google', text: 'Rezervasyon vardı ama bir saat bekledik, kimse ilgilenmedi.', warn: true },
          ],
          segmentCounts: { vip: 0, loyal: 1, new: 5, risk: 9, churned: 4 },
        },
        l,
      ),
  },
  {
    id: 'weekly-report:stress',
    template: 'weekly-report',
    stress: true,
    render: (l) =>
      renderWeeklyReport(
        {
          ...WR_BASE,
          restaurantName: LONG_NAME,
          stats: {
            total: 1234567,
            avgRating: 4.9,
            highRatings: 1100000,
            lowRatings: 34567,
            distribution: { 5: 900000, 4: 200000, 3: 100000, 2: 30000, 1: 4567 },
            conversionRate: 99,
            aspects: { food: 4.9, service: 3.1, atmosphere: 5 },
          },
          trend: [1234567, 9, 120000, 5, 99999, 8000, 700],
          deltas: { totalDelta: '+1234%', avgDelta: '+0.2' },
          quotes: [
            { rating: 5, name: LONG_NAME, platform: 'Yemeksepeti', text: LONG_COMMENT },
            { rating: 1, name: LONG_WORD, platform: LONG_WORD, text: LONG_COMMENT, warn: true },
            { rating: 4, name: LONG_EMAIL, text: LONG_WORD },
          ],
          aiInsight: {
            summary: `${WR_BASE.aiInsight!.summary} ${WR_BASE.aiInsight!.summary} ${LONG_WORD}`,
            recommendation: `${WR_BASE.aiInsight!.recommendation} ${LONG_WORD}`,
            source: 'openai',
          },
          segmentCounts: { vip: 1234567, loyal: 9876543, new: 7654321, risk: 123456, churned: 8765432 },
        },
        l,
      ),
  },

  // ── monthly-health-report ────────────────────────────────────────────
  { id: 'monthly-health-report', template: 'monthly-health-report', render: async (l) => renderMonthlyHealthReport(MH_BASE, l) },
  {
    id: 'monthly-health-report:low',
    template: 'monthly-health-report',
    render: async (l) =>
      renderMonthlyHealthReport(
        {
          ...MH_BASE,
          latest: { score: 31, capturedAt: new Date('2026-10-01T02:00:00Z') },
          baseline: { score: 33, capturedAt: new Date('2026-05-02T09:00:00Z') },
          previous: { score: 40, capturedAt: new Date('2026-09-01T02:00:00Z') },
          delta: { googleReviewCount: -2, feedbackTotal: -11, feedbackAvgRating: -0.31 },
        },
        l,
      ),
  },
  {
    id: 'monthly-health-report:first-month',
    template: 'monthly-health-report',
    render: async (l) =>
      renderMonthlyHealthReport(
        {
          ...MH_BASE,
          ownerName: null,
          baseline: null,
          previous: null,
          delta: { googleReviewCount: null, feedbackTotal: null, feedbackAvgRating: null },
          recommendations: [],
        },
        l,
      ),
  },
  {
    id: 'monthly-health-report:no-data',
    template: 'monthly-health-report',
    render: async (l) =>
      renderMonthlyHealthReport(
        {
          ownerName: null,
          restaurantName: 'Yeni Açılan Kafe',
          reportMonth: new Date('2026-10-01T00:00:00Z'),
          baseline: null,
          latest: null,
          previous: null,
          metrics: {
            googleRating: null,
            googleReviewCount: null,
            googleMediaCount: null,
            googleUnansweredQs: null,
            feedbackTotal: null,
            feedbackAvgRating: null,
            feedbackReplied: null,
            feedbackLowRated: null,
          },
          delta: { googleReviewCount: null, feedbackTotal: null, feedbackAvgRating: null },
          recommendations: [
            { severity: 'tip', title: 'Google profilini bağla', body: 'Profilini bağladığında sağlık skorun ve öneriler burada görünür.' },
          ],
          appUrl: APP_URL,
        },
        l,
      ),
  },
  {
    id: 'monthly-health-report:stress',
    template: 'monthly-health-report',
    stress: true,
    render: async (l) =>
      renderMonthlyHealthReport(
        {
          ...MH_BASE,
          ownerName: LONG_NAME,
          restaurantName: LONG_NAME,
          latest: { score: 100, capturedAt: new Date('2026-10-01T02:00:00Z') },
          baseline: { score: 1, capturedAt: new Date('2026-05-02T09:00:00Z') },
          metrics: {
            googleRating: 5,
            googleReviewCount: 1234567,
            googleMediaCount: 99999,
            googleUnansweredQs: 123,
            feedbackTotal: 9876543,
            feedbackAvgRating: 4.9,
            feedbackReplied: 9000000,
            feedbackLowRated: 34567,
          },
          delta: { googleReviewCount: 123456, feedbackTotal: -1234567, feedbackAvgRating: -0.31 },
          recommendations: [
            { severity: 'critical', title: `${LONG_NAME} ${LONG_WORD}`, body: `${LONG_COMMENT} ${LONG_WORD}` },
            { severity: 'warn', title: LONG_WORD, body: LONG_COMMENT },
            { severity: 'tip', title: LONG_EMAIL, body: LONG_COMMENT },
            { severity: 'tip', title: 'Dördüncü öneri', body: 'Kısa gövde.' },
            { severity: 'warn', title: 'Beşinci öneri', body: 'Kısa gövde.' },
            { severity: 'tip', title: 'Altıncı öneri (kesilmeli)', body: 'Bu satır 5 öneri sınırı yüzünden görünmemeli.' },
          ],
        },
        l,
      ),
  },

  // ── weekly-digest-summary ────────────────────────────────────────────
  { id: 'weekly-digest-summary', template: 'weekly-digest-summary', render: async (l) => renderWeeklyDigestSummary(DS_BASE, l) },
  {
    id: 'weekly-digest-summary:many',
    template: 'weekly-digest-summary',
    render: async (l) =>
      renderWeeklyDigestSummary(
        { ...DS_BASE, recipients: DS_MANY, totals: { totalRestaurants: 31, sent: 21, skipped: 5, optedOut: 3, failed: 2 } },
        l,
      ),
  },
  {
    id: 'weekly-digest-summary:empty',
    template: 'weekly-digest-summary',
    render: async (l) =>
      renderWeeklyDigestSummary(
        { ...DS_BASE, recipients: [], totals: { totalRestaurants: 4, sent: 0, skipped: 4, optedOut: 0, failed: 0 } },
        l,
      ),
  },
  {
    id: 'weekly-digest-summary:stress',
    template: 'weekly-digest-summary',
    stress: true,
    render: async (l) =>
      renderWeeklyDigestSummary(
        {
          ...DS_BASE,
          recipients: [
            recipient(1, { restaurantName: LONG_NAME, recipientEmail: LONG_EMAIL, total: 1234567, avgRating: 4.9, hasAi: true }),
            recipient(2, { restaurantName: LONG_WORD, recipientEmail: `${LONG_WORD}@ornek.com`, total: 99999, avgRating: 1.1, emailSent: false }),
            recipient(3, { restaurantName: 'Kısa Ad', recipientEmail: 'a@b.co', total: 3, avgRating: 5 }),
          ],
          totals: { totalRestaurants: 1234567, sent: 1234567, skipped: 987654, optedOut: 123456, failed: 99999 },
        },
        l,
      ),
  },

  // ── audit-completed ──────────────────────────────────────────────────
  { id: 'audit-completed', template: 'audit-completed', render: (l) => renderAuditCompleted(AC_BASE, l) },
  {
    id: 'audit-completed:failed',
    template: 'audit-completed',
    render: (l) =>
      renderAuditCompleted(
        { ...AC_BASE, auditTitle: 'Akşam Servis Kalite Denetimi', score: 54, passed: false, passingScore: 70, attentionCount: 6 },
        l,
      ),
  },
  {
    id: 'audit-completed:one-attention',
    template: 'audit-completed',
    render: (l) => renderAuditCompleted({ ...AC_BASE, score: 78, passed: true, passingScore: 70, attentionCount: 1 }, l),
  },
  {
    id: 'audit-completed:unscored',
    template: 'audit-completed',
    render: (l) =>
      renderAuditCompleted(
        { ...AC_BASE, auditTitle: 'Haftalık Notlar ve Fotoğraflar', score: null, passed: null, passingScore: null, attentionCount: null },
        l,
      ),
  },
  {
    id: 'audit-completed:no-threshold',
    template: 'audit-completed',
    render: (l) => renderAuditCompleted({ ...AC_BASE, score: 100, passed: null, passingScore: null, respondentName: null }, l),
  },
  {
    id: 'audit-completed:stress',
    template: 'audit-completed',
    stress: true,
    render: (l) =>
      renderAuditCompleted(
        {
          restaurantName: LONG_NAME,
          auditTitle: `${LONG_NAME} ${LONG_WORD}`,
          respondentName: LONG_NAME,
          score: 100,
          passed: false,
          passingScore: 100,
          attentionCount: 1234567,
          panelUrl: `${APP_URL}/tr/dashboard/audits/${LONG_WORD}/responses/${LONG_WORD}`,
        },
        l,
      ),
  },
];
