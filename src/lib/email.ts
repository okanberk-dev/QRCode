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
  renderTeamInvite,
  renderVerifyEmail,
  renderQrNotDownloaded,
  renderFirstFeedbackTips,
  renderUpgradeSuggestion,
  renderInactiveReactivation,
  renderWeeklyDigestSummary,
  type FormType,
  type NewsletterPost,
  type WeeklyReportParams,
  type WelcomeParams,
  type CustomerReplyParams,
  type TrialEndingParams,
  type ContactAdminParams,
  type TeamInviteParams,
  type QrNotDownloadedParams,
  type FirstFeedbackTipsParams,
  type UpgradeSuggestionParams,
  type InactiveReactivationParams,
  type WeeklyDigestSummaryParams,
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
    data.platform === 'google'
      ? `/${locale}/dashboard/google-reviews`
      : `/${locale}/dashboard/feedbacks` + (data.feedbackId ? `?highlight=${data.feedbackId}` : '')
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
  /** Pulse AI çıkarımı (`extractWeeklyInsight()`) — boş ise mailde
   *  AI section'ı gizlenir. */
  aiInsight?: WeeklyReportParams['aiInsight'];
  /** Phase 8c+ (CLAUDE.md §38.21) — bu hafta yorum bırakan müşterilerin
   *  segment dağılımı. weekly-digest-runner deriveCustomerFields ile
   *  hesaplar; tüm değerler 0 ise mailde section gizlenir. */
  segmentCounts?: WeeklyReportParams['segmentCounts'];
}

export async function sendWeeklyDigest(params: WeeklyDigestParams): Promise<boolean> {
  const dashboardUrl = `${appUrl()}/${params.locale}/dashboard`;
  const rendered = await renderWeeklyReport(
    {
      restaurantName: params.restaurantName,
      period: params.period,
      stats: params.stats,
      dashboardUrl,
      aiInsight: params.aiInsight,
      segmentCounts: params.segmentCounts,
    },
    params.locale,
  );
  return sendResendEmail({ to: params.to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

// ─── Weekly digest summary (ops mail to hello@buaze.com) ─────────────────

/**
 * Pazartesi 10:00 UTC'de hello@buaze.com'a haftalık digest gönderim
 * özetini iletir. CLAUDE.md §21.x — gönderim listesi + AI çalıştığı
 * restoranlar + skipped/failed sayıları.
 *
 * @returns true → mail Resend'e başarıyla gitti, false → fail.
 */
export async function sendWeeklyDigestSummary(args: {
  to: string;
  locale?: 'tr' | 'en';
  data: WeeklyDigestSummaryParams;
}): Promise<boolean> {
  const rendered = renderWeeklyDigestSummary(args.data, args.locale ?? 'tr');
  return sendResendEmail({
    to: args.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
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

// ─── Stage A4 §38.96 — Impersonation start mail (KVKK transparency) ─────

/**
 * Owner'a "Hesabınıza X yönetici Y nedeniyle eriştir, Z dakika boyunca aktif"
 * mailı gönderir. KVKK §13.9 transparency disipline + audit complementary.
 *
 * Inline minimal template (Pulse layout overhead'i bu kritik mail için
 * gereksiz — text-first body + hesap güvenliği bilgisi). recipient + reason
 * CRLF strip (CLAUDE.md §37.2 H + §37.7).
 */
function stripCtl(value: unknown, max = 1000): string | null {
  if (typeof value !== 'string') return null;
  return value.replace(/[\r\n\t]/g, ' ').trim().slice(0, max) || null;
}

export async function sendImpersonationStartEmail(params: {
  recipient: string;
  recipientName: string | null;
  adminUsername: string;
  reason: string;
  endsAt: Date;
  locale: 'tr' | 'en';
}): Promise<boolean> {
  const recipient = stripCtl(params.recipient, 256);
  if (!recipient) return false;
  const adminUsername = stripCtl(params.adminUsername, 80) ?? 'Yönetici';
  const reason = stripCtl(params.reason, 500) ?? '(belirtilmemiş)';
  const recipientName = stripCtl(params.recipientName, 100);
  const endsAtLabel = params.endsAt.toLocaleString(
    params.locale === 'en' ? 'en-US' : 'tr-TR',
    { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  );

  const subject =
    params.locale === 'en'
      ? `[Buaze] An admin opened a support session on your account`
      : `[Buaze] Hesabınıza destek erişimi açıldı`;

  const greeting = recipientName
    ? params.locale === 'en'
      ? `Hi ${recipientName},`
      : `Merhaba ${recipientName},`
    : params.locale === 'en'
      ? 'Hi there,'
      : 'Merhaba,';

  const html =
    params.locale === 'en'
      ? `
<p>${greeting}</p>
<p>A Buaze admin (${adminUsername}) just opened a 30-minute support
session on your account.</p>
<p><strong>Reason:</strong> ${reason}</p>
<p><strong>Session ends at:</strong> ${endsAtLabel} (auto-revoke).</p>
<p>This is part of KVKK / GDPR transparency — we always notify you when an
admin acts on your behalf. Your data is read-only during this session
unless the admin makes a change you explicitly approved with support.</p>
<p>If you didn't expect this contact our support team immediately at
support@buaze.com.</p>
<p>— Buaze Team</p>
`
      : `
<p>${greeting}</p>
<p>Bir Buaze yöneticisi (${adminUsername}) hesabınızda 30 dakikalık bir destek
oturumu açtı.</p>
<p><strong>Sebep:</strong> ${reason}</p>
<p><strong>Oturum bitiş:</strong> ${endsAtLabel} (otomatik kapanır).</p>
<p>Bu bildirim KVKK / GDPR şeffaflık disiplinin bir parçasıdır — bir
yönetici hesabınız üzerinden işlem yaptığında her zaman size haber
veririz. Bu oturumda yönetici varsayılan olarak yalnız okuyabilir;
müşteri talebiniz olmadan değişiklik yapmaz.</p>
<p>Bu erişimi bilmiyorsanız hemen support@buaze.com adresinden bize
ulaşın.</p>
<p>— Buaze Ekibi</p>
`;

  const text =
    params.locale === 'en'
      ? `${greeting}

A Buaze admin (${adminUsername}) just opened a 30-minute support session on
your account.

Reason: ${reason}
Session ends at: ${endsAtLabel} (auto-revoke).

This is part of KVKK / GDPR transparency. If you didn't expect this contact
support@buaze.com immediately.

— Buaze Team`
      : `${greeting}

Bir Buaze yöneticisi (${adminUsername}) hesabınızda 30 dakikalık bir destek
oturumu açtı.

Sebep: ${reason}
Oturum bitiş: ${endsAtLabel} (otomatik kapanır).

KVKK / GDPR şeffaflık. Bu erişimi bilmiyorsanız support@buaze.com
adresinden bize ulaşın.

— Buaze Ekibi`;

  return sendResendEmail({
    to: recipient,
    subject,
    html,
    text,
    headers: {
      // No marketing tracking for transactional security mail.
      'X-Buaze-Mail-Type': 'impersonation-start',
    },
  });
}

// ─── Team invite (Faz 4) ────────────────────────────────────────────────

/**
 * Section 5 — Team davet maili. POST /api/team + resend-invite endpoint'leri
 * tarafından çağrılır. Token URL'inde inviteToken olur, expiresInDays default 7.
 */
export async function sendTeamInviteEmail(params: TeamInviteParams & {
  to: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const rendered = renderTeamInvite(rest, locale ?? 'tr');
  return sendResendEmail({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

// ─── Verify email (§22 davet akışı) ─────────────────────────────────────

/**
 * §22 — E-posta onay maili. Davet kabul + register sonrası ZORUNLU gate.
 * Login akışı emailVerified=false ise 403 + check-email yönlendirir; bu mail
 * o gate'i açan tek-kullanımlık linki taşır (24 saat geçerli).
 *
 * Kritik mail: notifyOpsOfMailFailure ile wire'lı (CLAUDE.md §21.33). Resend
 * çakılırsa ops alert mailbox'una düşer; gönderilmediğinde kullanıcı hesabı
 * locked kalır → manuel müdahale gerekir.
 */
export async function sendVerifyEmail(params: {
  to: string;
  firstName?: string | null;
  verifyUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderVerifyEmail(
    { firstName: params.firstName, verifyUrl: params.verifyUrl },
    locale,
  );
  const ok = await sendResendEmail({
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'verify-email',
      recipient: params.to,
      reason: 'send_failed',
      metadata: { locale },
    });
  }
  return ok;
}

// ─── Form confirmation (contact / career / roi / newsletter) ────────────

export async function sendFormConfirmationEmail(params: {
  to: string;
  formType: FormType;
  name?: string | null;
  details?: Array<{ label: string; value: string }>;
  followUpUrl?: string;
  locale?: 'tr' | 'en';
  /** Opsiyonel ekler — örn. ROI lead'leri için generated PDF rapor.
   *  Resend HTTP attachments sözleşmesiyle birebir uyumlu (base64 content). */
  attachments?: Array<{ filename: string; content: string; contentType?: string }>;
}): Promise<boolean> {
  const rendered = await renderFormConfirmation(
    { formType: params.formType, name: params.name, details: params.details, followUpUrl: params.followUpUrl },
    params.locale ?? 'tr',
  );
  return sendResendEmail({
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    attachments: params.attachments,
  });
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

// ─── Wave B lifecycle senders (CLAUDE.md §21.34) ────────────────────────
// LifecycleEmailLog idempotency cron tarafında uygulanır; bu sender'lar
// stateless, çağıran sorumlu.

export async function sendQrNotDownloadedEmail(
  params: QrNotDownloadedParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const rendered = await renderQrNotDownloaded(rest, locale ?? 'tr');
  return sendResendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

export async function sendFirstFeedbackTipsEmail(
  params: FirstFeedbackTipsParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const rendered = await renderFirstFeedbackTips(rest, locale ?? 'tr');
  return sendResendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

export async function sendUpgradeSuggestionEmail(
  params: UpgradeSuggestionParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const rendered = await renderUpgradeSuggestion(rest, locale ?? 'tr');
  return sendResendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text });
}

export async function sendInactiveReactivationEmail(
  params: InactiveReactivationParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const rendered = await renderInactiveReactivation(rest, locale ?? 'tr');
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
