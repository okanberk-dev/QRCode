/**
 * Owner-facing copy for the result of a PayNKolay payment
 * (`?payment=<status>` set by the return and checkout routes). Shared by the
 * dashboard billing card and the pricing page, where a lapsed owner lands
 * (billing spec §8.6). Pure; safe to import from client components.
 */

export type PaymentNoticeKind = 'success' | 'danger';

const MESSAGES: Record<string, { kind: PaymentNoticeKind; tr: string; en: string }> = {
  success: { kind: 'success', tr: 'Ödeme alındı, paketiniz etkin.', en: 'Payment received, your plan is active.' },
  failed: {
    kind: 'danger',
    tr: 'Ödeme tamamlanmadı. Kartınızdan tutar çekilmedi.',
    en: 'The payment was not completed. Your card was not charged.',
  },
  pending: {
    kind: 'danger',
    tr: 'Ödemenin sonucu henüz doğrulanamadı. Birkaç dakika içinde bu sayfayı yenileyin; sorun sürerse destek ekibine yazın. Tekrar ödemeden önce sonucu bekleyin.',
    en: 'The payment could not be confirmed yet. Refresh this page in a few minutes; contact support if it persists. Please wait for the result before paying again.',
  },
  review: {
    kind: 'danger',
    tr: 'Ödemeniz incelemeye alındı. Gerekirse tutar kartınıza iade edilir; destek ekibimiz sizinle iletişime geçer.',
    en: 'Your payment is under review. If needed, the amount is refunded to your card; our support team will contact you.',
  },
  unavailable: { kind: 'danger', tr: 'Bu paket için kartla ödeme şu an açık değil.', en: 'Card payment is not available for this plan right now.' },
  owner_only: { kind: 'danger', tr: 'Ödemeyi yalnızca hesap sahibi yapabilir.', en: 'Only the account owner can pay.' },
  plan_too_small: {
    kind: 'danger',
    tr: 'Bu plan, sahip olduğunuz işletme sayısından az işletmeyi kapsıyor. Daha büyük bir plan seçin.',
    en: 'This plan covers fewer businesses than you already have. Choose a larger plan.',
  },
  rate_limited: { kind: 'danger', tr: 'Çok fazla deneme yapıldı. Biraz sonra tekrar deneyin.', en: 'Too many attempts. Please try again shortly.' },
};

export function paymentResultMessage(
  status: string | null | undefined,
  locale: 'tr' | 'en',
): { kind: PaymentNoticeKind; message: string } | null {
  if (!status || !Object.prototype.hasOwnProperty.call(MESSAGES, status)) return null;
  const m = MESSAGES[status];
  return { kind: m.kind, message: locale === 'en' ? m.en : m.tr };
}
