// ROI lead form spam guard — defense-in-depth.
//
// reCAPTCHA Enterprise (CLAUDE.md §14.1, /api/roi/save'de zaten aktif)
// score-based; bot'lar token üretebilir veya enforcement off mode'da
// (RECAPTCHA_ENFORCE !== 'true') sadece skor logla. Bu modülde 3 ek
// katman:
//
// 1. Honeypot field — formda hidden input bot'lar otomatik doldurur.
//    Gerçek kullanıcı görmez (display:none + tabindex=-1 + aria-hidden).
// 2. Disposable email guard — mailinator / tempmail / 10minutemail vb.
//    domain blocklist. Liste static; Resend tarafında zaten bounce olur
//    ama biz prematüre reddedip OpenAI/PDF maliyeti boşa harcamayız.
// 3. Submission velocity — formMountedAt → submittedAt deltası <3sn ise
//    muhtemelen bot. Tipik gerçek kullanıcı slider sürükleyip okuyor;
//    3 saniyenin altı şüpheli.
//
// Üç katman sessiz reject ile çalışır — `{ ok: false, reason }` döner;
// caller 200 status'la response göndererek bot'u "başarılı" yanıltır,
// gerçek müşteri akışını hiç tetiklemeden lead düşürür.

const DISPOSABLE_DOMAINS = new Set([
  // Genel-amaçlı disposable mail provider'ları (2024-2026 popüler)
  '0-mail.com',
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'binkmail.com',
  'cs.email',
  'discard.email',
  'discardmail.com',
  'dispostable.com',
  'dropmail.me',
  'emailondeck.com',
  'emailtemporanea.net',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'inboxbear.com',
  'inboxkitten.com',
  'mail-temporaire.fr',
  'mail.tm',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mailpoof.com',
  'mailsac.com',
  'mintemail.com',
  'mohmal.com',
  'mvrht.com',
  'nada.email',
  'sharklasers.com',
  'smailpro.com',
  'spam4.me',
  'tempail.com',
  'tempmail.com',
  'tempmail.net',
  'tempmail.plus',
  'tempmailo.com',
  'tempr.email',
  'temp-mail.io',
  'temp-mail.org',
  'throwawaymail.com',
  'tmail.io',
  'trashmail.com',
  'wegwerfemail.de',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

export type SpamGuardReason =
  | 'honeypot'
  | 'disposable_email'
  | 'too_fast'
  | 'invalid_field';

export interface SpamGuardInput {
  email: string;
  /** Hidden honeypot field — bot'lar doldurur, gerçek kullanıcı boş bırakır. */
  honeypot?: unknown;
  /** Form mount timestamp (client-set ms). Eksikse velocity check skip. */
  formStartedAt?: unknown;
  /** Şu anki ms (server-set, normalleştirilmiş). */
  now?: number;
  /** Min delta (ms) — default 3000 (3 saniye). Bunun altı bot şüphesi. */
  minDeltaMs?: number;
}

export interface SpamGuardResult {
  ok: boolean;
  reason?: SpamGuardReason;
}

export function checkSpamGuard(input: SpamGuardInput): SpamGuardResult {
  // 1. Honeypot — herhangi bir non-empty değer = bot
  if (input.honeypot !== undefined && input.honeypot !== null && input.honeypot !== '') {
    return { ok: false, reason: 'honeypot' };
  }

  // 2. Disposable email
  const email = (input.email || '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 0) {
    // Caller zaten format kontrolü yapıyor; yine de defansif.
    return { ok: false, reason: 'invalid_field' };
  }
  const domain = email.slice(at + 1);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { ok: false, reason: 'disposable_email' };
  }

  // 3. Submission velocity
  const startedRaw = input.formStartedAt;
  if (typeof startedRaw === 'number' && Number.isFinite(startedRaw)) {
    const now = typeof input.now === 'number' ? input.now : Date.now();
    const minDelta = input.minDeltaMs ?? 3_000;
    const delta = now - startedRaw;
    // Negatif delta (saat oynaması, fake input) veya çok hızlı = bot
    if (delta < minDelta) {
      return { ok: false, reason: 'too_fast' };
    }
  }

  return { ok: true };
}
