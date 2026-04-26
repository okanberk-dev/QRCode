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
  type FormType,
  type NewsletterPost,
  type WeeklyReportParams,
  type WelcomeParams,
  type CustomerReplyParams,
  type TrialEndingParams,
} from './email/templates';
import { escapeHtml as _escapeHtml } from './email/escape';

// Re-exported so existing imports of `escapeHtml` from this file keep working.
export const escapeHtml = _escapeHtml;

// ─── Resend HTTP layer ──────────────────────────────────────────────────
// This is the ONLY email-sending method. No SMTP fallback.
async function sendResendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (!resendKey) {
    console.error('[Buaze Email] RESEND_API_KEY missing — cannot send email.');
    return false;
  }

  try {
    const payload: Record<string, unknown> = {
      from: process.env.RESEND_FROM_EMAIL?.trim() || 'Buaze <noreply@buaze.com>',
      to,
      subject,
      html,
      text,
    };
    if (replyTo) payload.reply_to = replyTo;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[Buaze Email] Resend HTTP ${response.status}:`, responseText);
      return false;
    }

    let parsed: { id?: string } | null = null;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.error('[Buaze Email] Resend non-JSON 2xx body:', responseText);
      return false;
    }
    if (!parsed || typeof parsed.id !== 'string' || !parsed.id) {
      console.error('[Buaze Email] Resend 2xx without id:', responseText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[Buaze Email] Network exception:', error);
    return false;
  }
}

export async function sendMail(args: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string }): Promise<boolean> {
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
    rendered = renderNewReview({
      rating: data.rating,
      restaurantName,
      customerName: data.name,
      comment: safeComment,
      branch: data.branch,
      platform: data.platform,
      reviewUrl,
    }, locale);
  } else {
    rendered = renderLowRatingAlert({
      rating: data.rating,
      restaurantName,
      customerName: data.name,
      comment: safeComment,
      branch: data.branch,
      tableNumber: data.tableNumber,
      reviewUrl,
    }, locale);
  }

  return sendResendEmail({ to: recipientEmail, subject: rendered.subject, html: rendered.html, text: rendered.text });
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
  const rendered = renderWeeklyReport(
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
  const rendered = renderForgotPassword(
    { code: params.code, resetUrl: params.resetUrl, ip: params.ip, device: params.device },
    params.locale ?? 'tr',
  );
  return sendResendEmail({ to: params.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

// ─── Welcome ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to: string;
  firstName?: string | null;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const dashboardUrl = `${appUrl()}/${locale}/dashboard`;
  const rendered = renderWelcome({ firstName: params.firstName, dashboardUrl } satisfies WelcomeParams, locale);
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
  const rendered = renderFormConfirmation(
    { formType: params.formType, name: params.name, details: params.details, followUpUrl: params.followUpUrl },
    params.locale ?? 'tr',
  );
  return sendResendEmail({ to: params.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

// ─── Customer reply (low rating → customer) ─────────────────────────────

export async function sendCustomerReplyEmail(params: CustomerReplyParams & { to: string; locale?: 'tr' | 'en'; replyTo?: string }): Promise<boolean> {
  const { to, locale, replyTo, ...rest } = params;
  const rendered = renderCustomerReply(rest, locale ?? 'tr');
  return sendResendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, replyTo });
}

// ─── Trial ending ───────────────────────────────────────────────────────

export async function sendTrialEndingEmail(params: TrialEndingParams & { to: string; locale?: 'tr' | 'en' }): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const rendered = renderTrialEnding(rest, locale ?? 'tr');
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
  const rendered = renderNewsletter(
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
  return sendResendEmail({ to: params.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}
