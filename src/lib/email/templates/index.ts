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

export { renderInactiveReactivation } from './inactive-reactivation';
export type { InactiveReactivationParams } from './inactive-reactivation';

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

// Wave B3 (CLAUDE.md §38.B) — team-member-removed owner audit confirmation.
// /api/team/[id] DELETE sonrası, owner'a "kim çıkarıldı" kaydı + audit log link.
export { renderTeamMemberRemoved } from './team-member-removed';
export type { TeamMemberRemovedParams } from './team-member-removed';

// Wave B5 (CLAUDE.md §38.B) — first feedback activation celebration.
// /api/feedback POST sonrası `count === 1` durumunda fire-once.
export { renderFirstFeedbackCelebration } from './first-feedback-celebration';
export type { FirstFeedbackCelebrationParams } from './first-feedback-celebration';

// Wave B4 (CLAUDE.md §38.B + §38.193) — owner-initiated account deletion
// with 30-day grace + cancel-by-token. Two mails — one on schedule, one
// on cancel.
export { renderAccountDeletionScheduled } from './account-deletion-scheduled';
export type { AccountDeletionScheduledParams } from './account-deletion-scheduled';

export { renderAccountDeletionCanceled } from './account-deletion-canceled';
export type { AccountDeletionCanceledParams } from './account-deletion-canceled';

// Wave C (CLAUDE.md §38.194) — lifecycle expansion: 4 mails.
//   C1 qr-no-scans-reminder       — cron (daily 09:00 UTC), per-restaurant 14g cooldown
//   C2 rating-drop-alert          — cron (weekly Mon 11:00 UTC), 7g cooldown
//   C3 first-reply-celebration    — sync from /api/.../google/reviews/reply POST, lifetime
//   C4 data-export-confirmation   — sync from /api/account/export-data POST, no cooldown
export { renderQrNoScansReminder } from './qr-no-scans-reminder';
export type { QrNoScansReminderParams } from './qr-no-scans-reminder';

export { renderRatingDropAlert } from './rating-drop-alert';
export type { RatingDropAlertParams } from './rating-drop-alert';

export { renderFirstReplyCelebration } from './first-reply-celebration';
export type { FirstReplyCelebrationParams } from './first-reply-celebration';

export { renderDataExportConfirmation } from './data-export-confirmation';
export type { DataExportConfirmationParams } from './data-export-confirmation';

// Wave D (CLAUDE.md §38.195) — new-device login security alert.
export { renderNewDeviceLogin } from './new-device-login';
export type { NewDeviceLoginParams } from './new-device-login';

// Render-only security notice (CLAUDE.md §38.96) — admin impersonation start
// mail to the account owner. Not DB-driven, not in SUPPORTED_MAIL_KEYS.
export { renderImpersonationStart } from './impersonation-start';
export type { ImpersonationStartParams } from './impersonation-start';

// Render-only operator alerts (CLAUDE.md §21.33) — critical mail send failure
// and OpenAI billing failure. Not DB-driven, not in SUPPORTED_MAIL_KEYS.
export { renderOpsMailFailureAlert, renderOpsOpenAiBillingAlert } from './ops-alert';
export type { OpsMailFailureAlertParams, OpsOpenAiBillingAlertParams } from './ops-alert';

// Render-only — onboarding wizard finished ("panel is ready") mail.
export { renderOnboardingComplete } from './onboarding-complete';
export type { OnboardingCompleteParams } from './onboarding-complete';
