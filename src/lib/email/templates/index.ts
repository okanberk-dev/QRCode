export { renderForgotPassword } from './forgot-password';
export type { ForgotPasswordParams } from './forgot-password';

export { renderWelcome } from './welcome';
export type { WelcomeParams } from './welcome';

export { renderFormConfirmation } from './form-confirmation';
export type { FormConfirmationParams, FormType } from './form-confirmation';

export { renderLowRatingAlert } from './low-rating-alert';
export type { LowRatingAlertParams } from './low-rating-alert';

export { renderNewReview } from './new-review';
export type { NewReviewParams } from './new-review';

export { renderWeeklyReport } from './weekly-report';
export type { WeeklyReportParams } from './weekly-report';

export { renderNewsletter } from './newsletter';
export type { NewsletterParams, NewsletterPost } from './newsletter';

export { renderCustomerReply } from './customer-reply';
export type { CustomerReplyParams } from './customer-reply';

export { renderTrialEnding } from './trial-ending';
export type { TrialEndingParams } from './trial-ending';

export { renderContactAdmin } from './contact-admin';
export type { ContactAdminParams } from './contact-admin';

export { renderTeamInvite } from './team-invite';
export type { TeamInviteParams } from './team-invite';

export { renderVerifyEmail } from './verify-email';
export type { VerifyEmailParams } from './verify-email';

export { renderRoiCustomerReport } from './roi-customer-report';
export type { RoiCustomerReportParams } from './roi-customer-report';

export { renderRoiAdminNotification } from './roi-admin-notification';
export type { RoiAdminNotificationParams } from './roi-admin-notification';

// Wave B lifecycle emails (CLAUDE.md §21.34 + §23.7 Phase 11.30) — cron'la
// idempotent gönderim, LifecycleEmailLog ile dedupe.
export { renderQrNotDownloaded } from './qr-not-downloaded';
export type { QrNotDownloadedParams } from './qr-not-downloaded';

export { renderFirstFeedbackTips } from './first-feedback-tips';
export type { FirstFeedbackTipsParams } from './first-feedback-tips';

export { renderUpgradeSuggestion } from './upgrade-suggestion';
export type { UpgradeSuggestionParams } from './upgrade-suggestion';

// Ops-internal — Pazartesi 10:00 UTC weekly digest summary mail to
// hello@buaze.com (CLAUDE.md §21.x weekly digest summary cron).
export { renderWeeklyDigestSummary } from './weekly-digest-summary';
export type { WeeklyDigestSummaryParams } from './weekly-digest-summary';

// CLAUDE.md §42 Phase 3 — Denetim Merkezi yanıt tamamlandı bildirimi.
export { renderAuditCompleted } from './audit-completed';
export type { AuditCompletedParams } from './audit-completed';

// CLAUDE.md §X — Reputation OS Suite (monthly health report mail).
// Her ayın 1'i 09:00 UTC, owner'a aylık sağlık skoru + delta + öneriler.
export { renderMonthlyHealthReport } from './monthly-health-report';
export type {
  MonthlyHealthReportParams,
  MonthlyHealthReportRecommendation,
} from './monthly-health-report';

// Wave B1 (CLAUDE.md §38.B) — password-changed security alert.
// /api/user/profile PUT içinde şifre alanı set edildiğinde tetiklenir.
export { renderPasswordChanged } from './password-changed';
export type { PasswordChangedParams } from './password-changed';

// Wave B2 (CLAUDE.md §38.B) — team-member-joined owner confirmation.
// /api/team/accept-invite POST sonrası, davet eden owner'a bilgi.
export { renderTeamMemberJoined } from './team-member-joined';
export type { TeamMemberJoinedParams } from './team-member-joined';

// Wave B4 (CLAUDE.md §38.B + §38.193) — owner-initiated account deletion
// with 30-day grace + cancel-by-token. Two mails — one on schedule, one
// on cancel.
export { renderAccountDeletionScheduled } from './account-deletion-scheduled';
export type { AccountDeletionScheduledParams } from './account-deletion-scheduled';

export { renderAccountDeletionCanceled } from './account-deletion-canceled';
export type { AccountDeletionCanceledParams } from './account-deletion-canceled';

// Wave C (CLAUDE.md §38.194).
//   C2 rating-drop-alert          — cron (weekly Mon 11:00 UTC), 7g cooldown
//   C4 data-export-confirmation   — sync from /api/account/export-data POST, no cooldown
export { renderRatingDropAlert } from './rating-drop-alert';
export type { RatingDropAlertParams } from './rating-drop-alert';

export { renderDataExportConfirmation } from './data-export-confirmation';
export type { DataExportConfirmationParams } from './data-export-confirmation';

// Saved cards (billing spec §13.4) — renewal engine mails, DB-driven copy.
export { renderBillingRenewalUpcoming } from './billing-renewal-upcoming';
export type { BillingRenewalUpcomingParams } from './billing-renewal-upcoming';
export { renderBillingPeriodEnded } from './billing-period-ended';
export type { BillingPeriodEndedParams } from './billing-period-ended';
export { renderBillingCardRetention } from './billing-card-retention';
export type { BillingCardRetentionParams } from './billing-card-retention';
export { renderBillingAutoNotice } from './billing-renewal-upcoming';
export type { BillingAutoNoticeParams } from './billing-renewal-upcoming';
export { renderBillingRenewalPaid, renderBillingRenewalFailed } from './billing-renewal-result';
export type { BillingRenewalPaidParams, BillingRenewalFailedParams, BillingRenewalFailedVariant } from './billing-renewal-result';
export { renderBillingAutoRenewChanged } from './billing-auto-renew-changed';
export type { BillingAutoRenewChangedParams, BillingAutoRenewChangedVariant } from './billing-auto-renew-changed';

// Render-only security notice (CLAUDE.md §38.96) — admin impersonation start
// mail to the account owner. Not DB-driven, not in SUPPORTED_MAIL_KEYS.
export { renderImpersonationStart } from './impersonation-start';
export type { ImpersonationStartParams } from './impersonation-start';

// Render-only operator alerts (CLAUDE.md §21.33) — critical mail send failure
// and OpenAI billing failure. Not DB-driven, not in SUPPORTED_MAIL_KEYS.
export { renderOpsMailFailureAlert, renderOpsOpenAiBillingAlert } from './ops-alert';
export type { OpsMailFailureAlertParams, OpsOpenAiBillingAlertParams } from './ops-alert';
