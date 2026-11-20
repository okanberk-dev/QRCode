// TR / EN strings and formatters of the saved-card UI (billing spec §13.1).
// The single source lives in src/lib/billing (shared with the billing pages,
// the hand-off page and the mails); this module is the panel's entry point.
export { BILLING_COPY, billingText, reviewErrorCode, type BillingCopyKey, type ReviewErrorCode } from '@/lib/billing/billing-copy';
export {
  cardAriaLabel,
  cardBrandLabel,
  formatCardExpiry,
  formatIstanbulDate,
  formatTry,
  type BillingLocale,
} from '@/lib/billing/billing-format';
