// Reply API error → user copy, shared by the owner inbox
// (/dashboard/feedbacks) and the admin inbox (/admin/reviews). The raw
// `data.error` key is never shown to the user.

import { blockedReplyMessage, issuesFromBody } from './ReplyRiskNotice';

export function replyErrorMessage(data: unknown, isTr: boolean, status?: number): string {
  const code = typeof data === 'object' && data !== null ? (data as { error?: unknown }).error : null;
  if (status === 401) {
    return isTr
      ? 'Oturum süresi doldu. Lütfen yeniden giriş yapın.'
      : 'Session expired. Please sign in again.';
  }
  switch (code) {
    case 'content_blocked':
      // §48 — say exactly which rule blocked it (copy is ours, from the issue keys).
      return blockedReplyMessage(issuesFromBody(data), isTr ? 'tr' : 'en');
    case 'consent_required':
      return isTr
        ? 'Göndermeden önce sorumluluk onayını işaretleyin.'
        : 'Confirm the responsibility checkbox before sending.';
    case 'body_too_long':
      return isTr
        ? 'Yanıt en fazla 2000 karakter olabilir.'
        : 'Replies can be at most 2,000 characters.';
    case 'empty_body':
      return isTr ? 'Boş yanıt gönderilemez.' : "A reply can't be empty.";
    case 'no_customer_email':
      return isTr
        ? 'Müşteri e-posta bırakmadığı için bu geri bildirime yanıt gönderilemez.'
        : 'The customer left no e-mail, so this feedback cannot be answered.';
    case 'rate_limited':
      return isTr
        ? 'Çok fazla yanıt gönderildi. Lütfen biraz sonra tekrar deneyin.'
        : 'Too many replies sent. Please try again in a moment.';
    default:
      // 403 without a known code: read-only team member (owner panel) or an
      // admin without the reviews grant — retrying will not help.
      if (status === 403) {
        return isTr
          ? 'Bu yoruma yanıt verme yetkiniz yok.'
          : 'You are not allowed to reply to this review.';
      }
      return isTr
        ? 'Yanıt gönderilemedi. Lütfen tekrar deneyin.'
        : 'The reply could not be sent. Please try again.';
  }
}
