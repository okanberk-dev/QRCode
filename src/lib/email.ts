import { SYSTEM_FEEDBACK } from './constants';
import {
  renderForgotPassword,
  renderWelcome,
  renderFormConfirmation,
  renderLowRatingAlert,
  renderNewReview,
  renderWeeklyReport,
  renderNewsletter,
  renderCustomerReply,
  renderTrialEnding,
  renderContactAdmin,
  type FormType,
  type NewsletterPost,
  type WeeklyReportParams,
  type WelcomeParams,
  type CustomerReplyParams,
  type TrialEndingParams,
  type ContactAdminParams,
} from './email/templates';
import { escapeHtml as _escapeHtml } from './email/escape';
import { sendResendEmail } from './email-internal';
import { notifyOpsOfMailFailure } from './email/ops-alert';

// Re-exported so existing imports of `escapeHtml` from this file keep working.
export const escapeHtml = _escapeHtml;

export async function sendMail(args: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> }): Promise<boolean> {
  return sendResendEmail(args);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://buaze.com';
}

// ─── Public utility ─────────────────────────────────────────────────────
// Newsletter unsubscribe URL builder. Used by templates and the admin
// trigger endpoint alike — keep the route shape in one place.
export function getUnsubscribeUrl(token: string): string {
  return `${appUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

// ─── Feedback notifications ─────────────────────────────────────────────
// Branches by rating: ≤2 = low-rating-alert (red urgency), ≥4 = new-review
// (positive lime), 3 = low-rating-alert without the danger framing. The
// public NotificationParams interface is preserved so callers do not change.
export interface NotificationParams {
  rating: number;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  comment?: string | null;
  branch?: string | null;
  tableNumber?: string | null;
  restaurantName?: string;
  toEmail?: string | null;
  aspects?: { food?: number; service?: number; atmosphere?: number } | null;
  feedbackId?: string;
  locale?: 'tr' | 'en';
  platform?: string | null;
}

export async function sendFeedbackNotification(data: NotificationParams): Promise<boolean> {
  const recipientEmail = data.toEmail || process.env.NOTIFICATION_EMAIL || 'hello@buaze.com';
  if (!recipientEmail) return false;

  const restaurantName = data.restaurantName || 'Restoran';
  const locale = data.locale ?? 'tr';
  const reviewUrl = `${appUrl()}/${locale}/auth/login?redirect=${encodeURIComponent(
    `/${locale}/dashboard/feedbacks` + (data.feedbackId ? `?highlight=${data.feedbackId}` : ''),
  )}`;

  const safeComment = data.comment === SYSTEM_FEEDBACK.HIGH_RATING_REDIRECT ? null : data.comment ?? null;

  let rendered;
  if (data.rating >= 4) {
    rendered = await renderNewReview({
      rating: data.rating,
      restaurantName,
      customerName: data.name,
      comment: safeComment,
      branch: data.branch,
      platform: data.platform,
      reviewUrl,
    }, locale);
  } else {
    rendered = await renderLowRatingAlert({
      rating: data.rating,
      restaurantName,
      customerName: data.name,
      comment: safeComment,
      branch: data.branch,
      tableNumber: data.tableNumber,
      reviewUrl,
    }, locale);
  }

  const ok = await sendResendEmail({ to: recipientEmail, subject: rendered.subject, html: rendered.html, text: rendered.text });
  if (!ok) {
    // Phase 8: critical mail. Low-rating alert that doesn't reach the
    // owner means a complaint goes unanswered for hours; positive
    // 5-star notifications less urgent but still worth surfacing so
    // ops can check the recipient inbox / Resend dashboard.
    await notifyOpsOfMailFailure({
      template: data.rating >= 4 ? 'new-review' : 'low-rating-alert',
      recipient: recipientEmail,
      reason: 'sendResendEmail returned false (see app logs for HTTP status / network error)',
      metadata: {
        feedbackId: data.feedbackId,
        rating: data.rating,
        restaurantName,
        branch: data.branch,
      },
    });
  }
  return ok;
}

// ─── Weekly digest ──────────────────────────────────────────────────────

export interface WeeklyDigestParams {
  to: string;
  locale: 'tr' | 'en';
  restaurantName: string;
  period: { from: Date; to: Date };
  stats: WeeklyReportParams['stats'];
}

export async function sendWeeklyDigest(params: WeeklyDigestParams): Promise<boolean> {
  const dashboardUrl = `${appUrl()}/${params.locale}/dashboard`;
  const rendered = await renderWeeklyReport(
    {
      restaurantName: params.restaurantName,
      period: params.period,
      stats: params.stats,
      dashboardUrl,
    },
    params.locale,
  );
  return sendResendEmail({ to: params.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

// ─── Forgot password ────────────────────────────────────────────────────

export async function sendPasswordResetEmail(params: {
  to: string;
  code: string;
  resetUrl: string;
  locale?: 'tr' | 'en';
  ip?: string | null;
  device?: string | null;
}): Promise<boolean> {
  const rendered = await renderForgotPassword(
    { code: params.code, resetUrl: params.resetUrl, ip: params.ip, device: params.device },
    params.locale ?? 'tr',
  );
  const ok = await sendResendEmail({ to: params.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
  if (!ok) {
    // Phase 8: a forgot-password mail that bounces locks the user out
    // of their account. Surface to ops so support can manually issue
    // a recovery code via the admin panel.
    await notifyOpsOfMailFailure({
      template: 'forgot-password',
      recipient: params.to,
      reason: 'sendResendEmail returned false',
      metadata: { ip: params.ip ?? undefined, device: params.device ?? undefined },
    });
  }
  return ok;
}

// ─── Welcome ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to: string;
  firstName?: string | null;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const dashboardUrl = `${appUrl()}/${locale}/dashboard`;
  const rendered = await renderWelcome({ firstName: params.firstName, dashboardUrl } satisfies WelcomeParams, locale);
  return sendResendEmail({ to: params.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

// ─── Form confirmation (contact / career / roi / newsletter) ────────────

export async function sendFormConfirmationEmail(params: {
  to: string;
  formType: FormType;
  name?: string | null;
  details?: Array<{ label: string; value: string }>;
  followUpUrl?: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const rendered = await renderFormConfirmation(
    { formType: params.formType, name: params.name, details: params.details, followUpUrl: params.followUpUrl },
    params.locale ?? 'tr',
  );
  return sendResendEmail({ to: params.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

// ─── Contact form (admin notification) ──────────────────────────────────
// Fires when a user submits the public contact form. Sender helper is
// sync-rendering (no DB-driven copy) — the inline copy in the template is
// the source of truth for now. See CLAUDE.md §21.26 if you want to lift
// this into the MailTemplate CMS later.
export async function sendContactAdminEmail(params: ContactAdminParams & { to: string | string[]; replyTo?: string; locale?: 'tr' | 'en' }): Promise<boolean> {
  const { to, replyTo, locale, ...rest } = params;
  const rendered = renderContactAdmin(rest, locale ?? 'tr');
  return sendResendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, replyTo });
}

// ─── Customer reply (low rating → customer) ─────────────────────────────

export async function sendCustomerReplyEmail(params: CustomerReplyParams & { to: string; locale?: 'tr' | 'en'; replyTo?: string }): Promise<boolean> {
  const { to, locale, replyTo, ...rest } = params;
  const rendered = await renderCustomerReply(rest, locale ?? 'tr');
  const ok = await sendResendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, replyTo });
  if (!ok) {
    // Phase 8: a customer-reply mail that doesn't land means a low-
    // rating customer never hears back from the owner — direct hit on
    // the customer relationship. Owner should be told manually.
    await notifyOpsOfMailFailure({
      template: 'customer-reply',
      recipient: to,
      reason: 'sendResendEmail returned false',
      metadata: { restaurantName: params.restaurantName, customerName: params.customerName ?? undefined },
    });
  }
  return ok;
}

// ─── Trial ending ───────────────────────────────────────────────────────

export async function sendTrialEndingEmail(params: TrialEndingParams & { to: string; locale?: 'tr' | 'en' }): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const rendered = await renderTrialEnding(rest, locale ?? 'tr');
  return sendResendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

// ─── Newsletter (monthly cron) ──────────────────────────────────────────

export async function sendNewsletterEmail(params: {
  to: string;
  posts: NewsletterPost[];
  unsubscribeUrl: string;
  issueNumber?: number;
  locale?: 'tr' | 'en';
  /** Optional NewsletterCampaign overrides. When set the cron uses authored
   *  copy instead of the static "Sessiz misafiri…" hero / Pulse default. */
  title?: string | null;
  intro?: string | null;
  subject?: string | null;
}): Promise<boolean> {
  const rendered = await renderNewsletter(
    {
      posts: params.posts,
      unsubscribeUrl: params.unsubscribeUrl,
      issueNumber: params.issueNumber,
      customTitle: params.title,
      customIntro: params.intro,
      customSubject: params.subject,
    },
    params.locale ?? 'tr',
  );
  // RFC 2369 + RFC 8058 (Gmail/Yahoo Feb-2024 bulk sender requirements):
  //   - List-Unsubscribe: <https-link>, <mailto:link>
  //   - List-Unsubscribe-Post: List-Unsubscribe=One-Click
  // The HTTPS link is our token-based GET endpoint (idempotent, no auth);
  // the mailto: route is a fallback some clients prefer. The Post header
  // tells Gmail/Yahoo/Apple Mail's "Unsubscribe" button to fire a one-click
  // POST to the same URL — no extra confirmation page, which is required
  // for senders >5K mails/day.
  const mailtoUnsub = process.env.RESEND_REPLY_TO?.trim()
    || process.env.NOTIFICATION_EMAIL?.trim()
    || 'unsubscribe@buaze.com';
  return sendResendEmail({
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: {
      'List-Unsubscribe': `<${params.unsubscribeUrl}>, <mailto:${mailtoUnsub}?subject=Unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Precedence': 'bulk',
    },
  });
}
