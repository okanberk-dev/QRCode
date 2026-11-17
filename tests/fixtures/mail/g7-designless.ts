// g7a — mails that used to bypass pulseLayout: impersonation-start (admin
// support session notice) and ops-alert (mail failure + OpenAI billing).
import { renderImpersonationStart } from '../../../src/lib/email/templates/impersonation-start';
import {
  renderOpsMailFailureAlert,
  renderOpsOpenAiBillingAlert,
} from '../../../src/lib/email/templates/ops-alert';
import { LONG_NAME, LONG_URL, LONG_WORD, LONG_EMAIL, type MailFixture } from './_env';

const ENDS_AT = new Date('2026-10-25T14:30:00+03:00');
const FAILED_AT = new Date('2026-10-25T11:32:07.412Z');

const IMPERSONATION_REASON =
  'Müşteri destek talebi #4821: QR kodlarının platform bağlantıları yanlış görünüyor, ekran paylaşımı yerine hesabı birlikte inceleyeceğiz.';

const LONG_COMMENT_SHORT =
  'Your account is not active, please check your plan and billing details on the platform dashboard.';

export const FIXTURES_G7: MailFixture[] = [
  // ── impersonation-start ──────────────────────────────────────────────
  {
    id: 'impersonation-start',
    template: 'impersonation-start',
    render: async (l) =>
      renderImpersonationStart(
        { recipientName: 'Mert Yılmaz', adminUsername: 'ayse.destek', reason: IMPERSONATION_REASON, endsAt: ENDS_AT },
        l,
      ),
  },
  {
    id: 'impersonation-start:no-name',
    template: 'impersonation-start',
    render: async (l) =>
      renderImpersonationStart(
        { recipientName: null, adminUsername: 'ayse.destek', reason: 'Fatura sorusu', endsAt: ENDS_AT },
        l,
      ),
  },
  {
    id: 'impersonation-start:stress',
    template: 'impersonation-start',
    stress: true,
    render: async (l) =>
      renderImpersonationStart(
        {
          recipientName: LONG_NAME,
          adminUsername: LONG_WORD.slice(0, 80),
          reason: `${LONG_URL} <script>alert("x")</script> ${LONG_WORD}`.slice(0, 500),
          endsAt: ENDS_AT,
        },
        l,
      ),
  },

  // ── ops-alert · mail failure ─────────────────────────────────────────
  {
    id: 'ops-alert:mail-failure',
    template: 'ops-alert',
    render: async (l) =>
      renderOpsMailFailureAlert(
        {
          template: 'low-rating-alert',
          recipient: 'mert.yilmaz@kahvedukkani.com.tr',
          reason: 'Resend HTTP 422: The `to` address is invalid.',
          metadata: { restaurantId: 'clx9f3k2a0001abcd', feedbackId: 'clx9f3k2a0007wxyz', rating: 2 },
          occurredAt: FAILED_AT,
        },
        l,
      ),
  },
  {
    id: 'ops-alert:mail-failure:no-metadata',
    template: 'ops-alert',
    render: async (l) =>
      renderOpsMailFailureAlert(
        { template: 'forgot-password', recipient: 'ayse@example.com', occurredAt: FAILED_AT },
        l,
      ),
  },
  {
    id: 'ops-alert:mail-failure:stress',
    template: 'ops-alert',
    stress: true,
    render: async (l) =>
      renderOpsMailFailureAlert(
        {
          template: `lifecycle:${LONG_WORD}`,
          recipient: LONG_EMAIL,
          reason: `Resend HTTP 500: ${LONG_URL}\nUpstream timeout after 8000ms <b>raw</b> & more\n${LONG_WORD}`,
          metadata: {
            restaurantId: 'clx9f3k2a0001abcdefghijklmnop',
            feedbackId: 'clx9f3k2a0007wxyz',
            [`veryLongMetadataKeyName_${LONG_WORD.slice(0, 40)}`]: LONG_URL,
            rating: 1,
            attempt: 1234567,
            note: LONG_WORD,
          },
          occurredAt: FAILED_AT,
        },
        l,
      ),
  },

  // ── ops-alert · OpenAI billing ───────────────────────────────────────
  {
    id: 'ops-alert:openai-billing',
    template: 'ops-alert',
    render: async (l) =>
      renderOpsOpenAiBillingAlert(
        {
          status: 429,
          errorType: 'insufficient_quota',
          message: 'You exceeded your current quota, please check your plan and billing details.',
          source: 'suggest-reply',
          occurredAt: FAILED_AT,
        },
        l,
      ),
  },
  {
    id: 'ops-alert:openai-billing:minimal',
    template: 'ops-alert',
    render: async (l) => renderOpsOpenAiBillingAlert({ status: 402, occurredAt: FAILED_AT }, l),
  },
  {
    id: 'ops-alert:openai-billing:stress',
    template: 'ops-alert',
    stress: true,
    render: async (l) =>
      renderOpsOpenAiBillingAlert(
        {
          status: 1234567,
          errorType: `billing_not_active_${LONG_WORD}`,
          message: `${LONG_URL} ${LONG_COMMENT_SHORT} <script>1</script>`,
          source: `analytics-themes/${LONG_WORD}`,
          occurredAt: FAILED_AT,
        },
        l,
      ),
  },

];
