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
  renderAuditCompleted,
  renderMonthlyHealthReport,
  renderPasswordChanged,
  renderTeamMemberJoined,
  renderTeamMemberRemoved,
  renderFirstFeedbackCelebration,
  renderAccountDeletionScheduled,
  renderAccountDeletionCanceled,
  renderQrNoScansReminder,
  renderRatingDropAlert,
  renderFirstReplyCelebration,
  renderDataExportConfirmation,
  renderNewDeviceLogin,
  renderImpersonationStart,
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
  type MonthlyHealthReportParams,
  // Wave B (CLAUDE.md §38.B) — type imports omitted; public senders below
  // inline their param objects, so the template-side `*Params` types are
  // not re-exported through email.ts.
} from './email/templates';
import { escapeHtml as _escapeHtml } from './email/escape';
import { formatFullDateTimeInTimeZone } from './timezone';
import { sendResendEmail } from './email-internal';
import { notifyOpsOfMailFailure } from './email/ops-alert';

// Re-exported so existing imports of `escapeHtml` from this file keep working.
export const escapeHtml = _escapeHtml;

export async function sendMail(args: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string; headers?: Record<string, string> }): Promise<boolean> {
  return sendResendEmail(args);
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://www.buaze.com';
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
  /** Yorumun bırakıldığı an (`Feedback.createdAt`). Mail damgası bunu
   *  kullanır; verilmezse render anı damgalanır (cron/retry'da yanıltıcı). */
  submittedAt?: Date | string | null;
  /** Gösterim saat dilimi (IANA). Default `Europe/Istanbul`. */
  timeZone?: string | null;
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
      submittedAt: data.submittedAt ?? null,
      timeZone: data.timeZone ?? null,
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
      submittedAt: data.submittedAt ?? null,
      timeZone: data.timeZone ?? null,
    }, locale);
  }

  const ok = await sendResendEmail({
    template: data.rating <= 3 ? 'low-rating-alert' : 'new-review',
    locale,
    to: recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { rating: data.rating, feedbackId: data.feedbackId },
  });
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
  return sendResendEmail({
    template: 'weekly-report',
    locale: params.locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
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
    template: 'weekly-digest-summary',
    locale: args.locale ?? 'tr',
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
  const ok = await sendResendEmail({
    template: 'forgot-password',
    locale: params.locale ?? 'tr',
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { ip: params.ip ?? null, device: params.device ?? null },
  });
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
  return sendResendEmail({
    template: 'welcome',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

// ─── Stage A4 §38.96 — Impersonation start mail (KVKK transparency) ─────

/**
 * Owner'a "Hesabınıza X yönetici Y nedeniyle eriştir, Z dakika boyunca aktif"
 * mailı gönderir. KVKK §13.9 transparency disipline + audit complementary.
 *
 * HTML: Pulse `impersonation-start` render-only template (security notice
 * look). recipient + reason CRLF strip (CLAUDE.md §37.2 H + §37.7).
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
  // stripCtl removes CRLF/tab (header-injection defense). These stay RAW:
  // the plain-text body uses them as-is and renderImpersonationStart escapes
  // them for the HTML body, so an admin-supplied reason/username can't inject
  // markup into the recipient's mail client (§21.1 / §37.6 escape discipline).
  const adminUsername = stripCtl(params.adminUsername, 80) ?? 'Yönetici';
  const reason = stripCtl(params.reason, 500) ?? '(belirtilmemiş)';
  const recipientName = stripCtl(params.recipientName, 100);
  // §46 — event times are shown in the business display time zone, not the
  // server's (UTC on Vercel).
  const endsAtLabel = formatFullDateTimeInTimeZone(params.endsAt, params.locale === 'en' ? 'en' : 'tr');

  const subject =
    params.locale === 'en'
      ? `[Buaze] An admin opened a support session on your account`
      : `[Buaze] Hesabınıza destek erişimi açıldı`;

  const greeting =
    recipientName
      ? params.locale === 'en'
        ? `Hi ${recipientName},`
        : `Merhaba ${recipientName},`
      : params.locale === 'en'
        ? 'Hi there,'
        : 'Merhaba,';

  const { html } = renderImpersonationStart(
    { recipientName, adminUsername, reason, endsAt: params.endsAt },
    params.locale === 'en' ? 'en' : 'tr',
  );

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
    template: 'impersonation-start',
    locale: params.locale ?? 'tr',
    to: recipient,
    subject,
    html,
    text,
    logMetadata: { adminUsername },
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
    template: 'team-invite',
    locale: locale ?? 'tr',
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
    template: 'verify-email',
    locale,
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

// ─── Password changed confirmation (Wave B1, CLAUDE.md §38.B) ───────────
// Fires from /api/user/profile PUT whenever the owner saves a new password.
// Companion to forgot-password (reset flow). Same ops-alert wiring as
// forgot-password / verify-email — a missed delivery on a password change
// is a security observability gap, not just a UX hiccup.

export async function sendPasswordChangedEmail(params: {
  to: string;
  firstName?: string | null;
  resetUrl: string;
  ip?: string | null;
  device?: string | null;
  account?: string | null;
  changedAt?: Date;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderPasswordChanged(
    {
      firstName: params.firstName,
      resetUrl: params.resetUrl,
      ip: params.ip,
      device: params.device,
      account: params.account,
      changedAt: params.changedAt,
    },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'password-changed',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { account: params.account ?? null },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'password-changed',
      recipient: params.to,
      reason: 'send_failed',
      userLocale: locale,
      metadata: { locale, account: params.account ?? null },
    });
  }
  return ok;
}

// ─── Team membership changes (Wave B2/B3, CLAUDE.md §38.B) ──────────────
// Both senders fire-and-forget from the team management endpoints; they
// mail the OWNER (not the member). Ops alert wired because team changes
// surface security context — silent fail leaves the owner unaware of
// access changes.

export async function sendTeamMemberJoinedEmail(params: {
  to: string;
  ownerName?: string | null;
  memberName: string;
  roleLabel: string;
  locationNames: string[] | null;
  teamUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderTeamMemberJoined(
    {
      ownerName: params.ownerName,
      memberName: params.memberName,
      roleLabel: params.roleLabel,
      locationNames: params.locationNames,
      teamUrl: params.teamUrl,
    },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'team-member-joined',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { memberName: params.memberName, role: params.roleLabel },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'team-member-joined',
      recipient: params.to,
      reason: 'send_failed',
      userLocale: locale,
      metadata: { memberName: params.memberName, role: params.roleLabel },
    });
  }
  return ok;
}

export async function sendTeamMemberRemovedEmail(params: {
  to: string;
  ownerName?: string | null;
  memberName: string;
  memberEmail: string;
  roleLabel: string;
  teamUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderTeamMemberRemoved(
    {
      ownerName: params.ownerName,
      memberName: params.memberName,
      memberEmail: params.memberEmail,
      roleLabel: params.roleLabel,
      teamUrl: params.teamUrl,
    },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'team-member-removed',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { memberName: params.memberName, role: params.roleLabel },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'team-member-removed',
      recipient: params.to,
      reason: 'send_failed',
      userLocale: locale,
      metadata: { memberName: params.memberName, role: params.roleLabel },
    });
  }
  return ok;
}

// ─── First feedback celebration (Wave B5, CLAUDE.md §38.B) ──────────────
// Fires fire-and-forget from /api/feedback POST when count === 1 for the
// restaurant. Idempotency is enforced upstream via LifecycleEmailLog
// (lifetime cooldown on type='first_feedback_celebration').

export async function sendFirstFeedbackCelebrationEmail(params: {
  to: string;
  ownerName?: string | null;
  restaurantName: string;
  rating: number;
  comment?: string | null;
  feedbackUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderFirstFeedbackCelebration(
    {
      ownerName: params.ownerName,
      restaurantName: params.restaurantName,
      rating: params.rating,
      comment: params.comment,
      feedbackUrl: params.feedbackUrl,
    },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'first-feedback-celebration',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { restaurantName: params.restaurantName, rating: params.rating },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'first-feedback-celebration',
      recipient: params.to,
      reason: 'send_failed',
      userLocale: locale,
      metadata: { restaurantName: params.restaurantName, rating: params.rating },
    });
  }
  return ok;
}

// ─── Account deletion lifecycle (Wave B4, CLAUDE.md §38.B + §38.193) ────
// Owner-initiated soft-delete with a 30-day grace window. One mail fires
// when the deletion is scheduled (carries the cancel link); a second
// fires when the cancel is exercised. Hard-delete itself is executed by
// /api/cron/process-scheduled-deletions — no separate "deleted" mail
// because the inbox would be unreachable at that point.

export async function sendAccountDeletionScheduledEmail(params: {
  to: string;
  firstName?: string | null;
  accountEmail: string;
  scheduledFor: Date;
  daysRemaining: number;
  cancelUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderAccountDeletionScheduled(
    {
      firstName: params.firstName,
      accountEmail: params.accountEmail,
      scheduledFor: params.scheduledFor,
      daysRemaining: params.daysRemaining,
      cancelUrl: params.cancelUrl,
    },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'account-deletion-scheduled',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { account: params.accountEmail, daysRemaining: params.daysRemaining },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'account-deletion-scheduled',
      recipient: params.to,
      reason: 'send_failed',
      userLocale: locale,
      metadata: { account: params.accountEmail, daysRemaining: params.daysRemaining },
    });
  }
  return ok;
}

export async function sendAccountDeletionCanceledEmail(params: {
  to: string;
  firstName?: string | null;
  accountEmail: string;
  dashboardUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderAccountDeletionCanceled(
    {
      firstName: params.firstName,
      accountEmail: params.accountEmail,
      dashboardUrl: params.dashboardUrl,
    },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'account-deletion-canceled',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { account: params.accountEmail },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'account-deletion-canceled',
      recipient: params.to,
      reason: 'send_failed',
      userLocale: locale,
      metadata: { account: params.accountEmail },
    });
  }
  return ok;
}

// ─── Wave C lifecycle senders (CLAUDE.md §38.194) ───────────────────────
// Four new senders, all ops-alert wired. Crons (C1, C2) hit them with
// LifecycleEmailLog cooldown gates upstream; sync callers (C3, C4) wire
// their own idempotency.

export async function sendQrNoScansReminderEmail(params: {
  to: string;
  firstName?: string | null;
  restaurantName: string;
  daysSinceQr: number;
  qrUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderQrNoScansReminder(
    { firstName: params.firstName, restaurantName: params.restaurantName, daysSinceQr: params.daysSinceQr, qrUrl: params.qrUrl },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'qr-no-scans-reminder',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { restaurantName: params.restaurantName, daysSinceQr: params.daysSinceQr },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'qr-no-scans-reminder', recipient: params.to, reason: 'send_failed', userLocale: locale,
      metadata: { restaurantName: params.restaurantName, daysSinceQr: params.daysSinceQr },
    });
  }
  return ok;
}

export async function sendRatingDropAlertEmail(params: {
  to: string;
  firstName?: string | null;
  restaurantName: string;
  currentAvg: number;
  baselineAvg: number;
  delta: number;
  reviewCount: number;
  inboxUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderRatingDropAlert(
    {
      firstName: params.firstName, restaurantName: params.restaurantName,
      currentAvg: params.currentAvg, baselineAvg: params.baselineAvg,
      delta: params.delta, reviewCount: params.reviewCount, inboxUrl: params.inboxUrl,
    },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'rating-drop-alert',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: {
      restaurantName: params.restaurantName,
      currentAvg: params.currentAvg,
      baselineAvg: params.baselineAvg,
      delta: params.delta,
    },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'rating-drop-alert', recipient: params.to, reason: 'send_failed', userLocale: locale,
      metadata: { restaurantName: params.restaurantName, currentAvg: params.currentAvg, baselineAvg: params.baselineAvg, delta: params.delta },
    });
  }
  return ok;
}

export async function sendFirstReplyCelebrationEmail(params: {
  to: string;
  ownerName?: string | null;
  restaurantName: string;
  reviewsUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderFirstReplyCelebration(
    { ownerName: params.ownerName, restaurantName: params.restaurantName, reviewsUrl: params.reviewsUrl },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'first-reply-celebration',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { restaurantName: params.restaurantName },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'first-reply-celebration', recipient: params.to, reason: 'send_failed', userLocale: locale,
      metadata: { restaurantName: params.restaurantName },
    });
  }
  return ok;
}

export async function sendDataExportConfirmationEmail(params: {
  to: string;
  firstName?: string | null;
  accountEmail: string;
  ip?: string | null;
  device?: string | null;
  exportedAt?: Date;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderDataExportConfirmation(
    { firstName: params.firstName, accountEmail: params.accountEmail, ip: params.ip, device: params.device, exportedAt: params.exportedAt },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'data-export-confirmation',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { account: params.accountEmail },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'data-export-confirmation', recipient: params.to, reason: 'send_failed', userLocale: locale,
      metadata: { account: params.accountEmail },
    });
  }
  return ok;
}

// ─── Wave D — new-device login security alert (CLAUDE.md §38.195) ───────

export async function sendNewDeviceLoginEmail(params: {
  to: string;
  firstName?: string | null;
  accountEmail: string;
  device: string;
  location: string;
  loggedInAt?: Date;
  resetUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderNewDeviceLogin(
    {
      firstName: params.firstName,
      accountEmail: params.accountEmail,
      device: params.device,
      location: params.location,
      loggedInAt: params.loggedInAt,
      resetUrl: params.resetUrl,
    },
    locale,
  );
  const ok = await sendResendEmail({
    template: 'new-device-login',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { account: params.accountEmail, device: params.device, location: params.location },
  });
  if (!ok) {
    await notifyOpsOfMailFailure({
      template: 'new-device-login', recipient: params.to, reason: 'send_failed', userLocale: locale,
      metadata: { account: params.accountEmail, device: params.device, location: params.location },
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
    template: `form-confirmation:${params.formType}`,
    locale: params.locale ?? 'tr',
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    attachments: params.attachments,
    logMetadata: { formType: params.formType },
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
  return sendResendEmail({
    template: 'contact-admin',
    locale: locale ?? 'tr',
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo,
  });
}

// ─── Customer reply (low rating → customer) ─────────────────────────────

export async function sendCustomerReplyEmail(params: CustomerReplyParams & { to: string; locale?: 'tr' | 'en'; replyTo?: string }): Promise<boolean> {
  const { to, locale, replyTo, ...rest } = params;
  const rendered = await renderCustomerReply(rest, locale ?? 'tr');
  const ok = await sendResendEmail({
    template: 'customer-reply',
    locale: locale ?? 'tr',
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo,
    logMetadata: { restaurantName: params.restaurantName },
  });
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
  return sendResendEmail({
    template: 'trial-ending',
    locale: locale ?? 'tr',
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { daysLeft: params.daysLeft },
  });
}

// ─── Wave B lifecycle senders (CLAUDE.md §21.34) ────────────────────────
// LifecycleEmailLog idempotency cron tarafında uygulanır; bu sender'lar
// stateless, çağıran sorumlu.

export async function sendQrNotDownloadedEmail(
  params: QrNotDownloadedParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const loc = locale ?? 'tr';
  const rendered = await renderQrNotDownloaded(rest, loc);
  return sendResendEmail({
    template: 'qr-not-downloaded',
    locale: loc,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

export async function sendFirstFeedbackTipsEmail(
  params: FirstFeedbackTipsParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const loc = locale ?? 'tr';
  const rendered = await renderFirstFeedbackTips(rest, loc);
  return sendResendEmail({
    template: 'first-feedback-tips',
    locale: loc,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

export async function sendUpgradeSuggestionEmail(
  params: UpgradeSuggestionParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const loc = locale ?? 'tr';
  const rendered = await renderUpgradeSuggestion(rest, loc);
  return sendResendEmail({
    template: 'upgrade-suggestion',
    locale: loc,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
}

export async function sendInactiveReactivationEmail(
  params: InactiveReactivationParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const loc = locale ?? 'tr';
  const rendered = await renderInactiveReactivation(rest, loc);
  return sendResendEmail({
    template: 'inactive-reactivation',
    locale: loc,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });
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
    template: 'newsletter',
    locale: params.locale ?? 'tr',
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    headers: {
      'List-Unsubscribe': `<${params.unsubscribeUrl}>, <mailto:${mailtoUnsub}?subject=Unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Precedence': 'bulk',
    },
    logMetadata: { issueNumber: params.issueNumber ?? null },
  });
}

/**
 * CLAUDE.md §42 Phase 3 — Audit yanıtı sorunluysa (veya denetim bir testse)
 * owner'a bildirim. Best-effort sender; submit endpoint catch'le çağırır (mail
 * fail → submit yine başarılı dönsün).
 *
 * `score` `null` olabilir (puanlanabilir soru yok): konu satırı "/100" taşımaz,
 * skor bloğu "Puanlanmıyor" etiketi gösterir. `attentionCount > 0` ise "N madde
 * sorunlu" satırı eklenir.
 */
export async function sendAuditCompletedEmail(params: {
  to: string;
  restaurantName: string;
  auditTitle: string;
  respondentName?: string | null;
  score: number | null;
  passed: boolean | null;
  passingScore: number | null;
  attentionCount?: number | null;
  panelUrl: string;
  locale?: 'tr' | 'en';
}): Promise<boolean> {
  const locale = params.locale ?? 'tr';
  const rendered = await renderAuditCompleted(
    {
      restaurantName: params.restaurantName,
      auditTitle: params.auditTitle,
      respondentName: params.respondentName ?? null,
      score: params.score,
      passed: params.passed,
      passingScore: params.passingScore,
      attentionCount: params.attentionCount ?? null,
      panelUrl: params.panelUrl,
    },
    locale,
  );
  return sendResendEmail({
    template: 'audit-completed',
    locale,
    to: params.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { auditTitle: params.auditTitle, score: params.score },
  });
}

// ─── Monthly health report (Reputation OS Suite) ───────────────────────────
// Her ayın 1'i 09:00 UTC, owner'a aylık sağlık skoru + delta + öneriler.
// CLAUDE.md §X.

export async function sendMonthlyHealthReportEmail(
  params: MonthlyHealthReportParams & { to: string; locale?: 'tr' | 'en' },
): Promise<boolean> {
  const { to, locale, ...rest } = params;
  const loc = locale ?? 'tr';
  const rendered = renderMonthlyHealthReport(rest, loc);
  return sendResendEmail({
    template: 'monthly-health-report',
    locale: loc,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    logMetadata: { restaurantName: params.restaurantName, latestScore: params.latest?.score ?? null },
  });
}
