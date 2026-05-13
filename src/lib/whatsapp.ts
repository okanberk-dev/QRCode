// Stage 97 — WhatsApp deep-link helpers (CLAUDE.md §19.1).
//
// Three pure, dep-free, runtime-agnostic functions powering the
// WhatsApp-on-low-rating opt-in flow:
//
//  - `normalizeWhatsAppUrl` accepts the messy human shapes owners type
//    (national phone with spaces, international with `+`, wa.me URLs,
//    api.whatsapp.com URLs, whatsapp.com/{num}) and emits a canonical
//    `https://wa.me/<digits>` form. We do NOT use `new URL` so the
//    helper is safe in edge runtime + browser bundle without polyfills.
//
//  - `buildWhatsAppMessage` substitutes `{restaurant_name}`, `{rating}`,
//    `{stars}`, `{reference_number}` placeholders into an owner-supplied
//    template, falling back to a locale-aware system default. Unknown
//    placeholders are LEFT UNTOUCHED (predictable, no crash).
//
//  - `appendWhatsAppText` adds an `?text=` parameter to a wa.me URL,
//    correctly handling the `?` vs `&` split and idempotency.
//
// Brand colour `WHATSAPP_BRAND_GREEN` is exported as a single source —
// used by the Wizard preview + public surface button icon stroke. Pulse
// design (CLAUDE.md §11) keeps the green to <14px icon strokes only;
// large surfaces stay graphite.

export const WHATSAPP_BRAND_GREEN = '#25D366';

export const DEFAULT_WHATSAPP_MESSAGE_TR =
  'Merhaba {restaurant_name}, {reference_number} numaralı değerlendirmem hakkında konuşmak istiyorum.';

export const DEFAULT_WHATSAPP_MESSAGE_EN =
  "Hi {restaurant_name}, I'd like to talk about my feedback (ref: {reference_number}).";

export const WHATSAPP_MESSAGE_MAX_CHARS = 500;
export const WHATSAPP_DEEPLINK_MAX_CHARS = 1024;

export type NormalizeWhatsAppResult =
  | { ok: true; url: string; e164: string }
  | { ok: false; reason: 'EMPTY' | 'TOO_SHORT' | 'INVALID' };

const WA_DOMAIN_REGEX = /(?:wa\.me|api\.whatsapp\.com|whatsapp\.com)\/(?:send\?phone=|\+?)?([0-9]{6,20})/i;

/**
 * Normalise an owner-typed WhatsApp identifier into a canonical
 * `https://wa.me/<digits>` URL. Accepts:
 *
 *  - `+90 555 111 22 33` / `+1 (415) 555-2671`  → strips spaces/dashes/parens
 *  - `905551112233` / `15554441234`              → bare digit strings
 *  - `https://wa.me/905551112233`                → wa.me URL
 *  - `https://api.whatsapp.com/send?phone=...`   → api URL
 *  - `https://whatsapp.com/+1...`                → web URL
 *
 * E.164 ITU range: 8–15 digits (we accept this exact range).
 */
export function normalizeWhatsAppUrl(input: string): NormalizeWhatsAppResult {
  if (typeof input !== 'string') return { ok: false, reason: 'INVALID' };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'EMPTY' };

  // 1) URL-shape: pull digits out of the path/query via regex.
  const urlMatch = trimmed.match(WA_DOMAIN_REGEX);
  if (urlMatch) {
    const digits = urlMatch[1];
    if (digits.length < 8) return { ok: false, reason: 'TOO_SHORT' };
    if (digits.length > 15) return { ok: false, reason: 'INVALID' };
    return { ok: true, url: `https://wa.me/${digits}`, e164: digits };
  }

  // 2) Bare phone — strip everything except digits and the leading `+`.
  // Reject any input that contains non-phone characters (letters, etc.)
  // before stripping, so "abc1234" doesn't sneak through as 1234.
  const cleaned = trimmed.replace(/[\s\-().]/g, '');
  if (!/^\+?\d+$/.test(cleaned)) return { ok: false, reason: 'INVALID' };
  const digitsOnly = cleaned.replace(/^\+/, '');
  if (digitsOnly.length < 8) return { ok: false, reason: 'TOO_SHORT' };
  if (digitsOnly.length > 15) return { ok: false, reason: 'INVALID' };
  return { ok: true, url: `https://wa.me/${digitsOnly}`, e164: digitsOnly };
}

interface BuildMessageArgs {
  /** Owner-supplied template; null/empty → locale default. */
  template: string | null | undefined;
  /** Restaurant name — substituted for `{restaurant_name}`. */
  restaurantName: string;
  /** Customer rating 1–5 — substituted for `{rating}`. */
  rating: number;
  /** Reference / feedback id (last 6 chars typically). */
  referenceNumber: string;
  /** Locale for the default fallback. */
  locale: 'tr' | 'en';
}

/**
 * Substitute placeholders into a WhatsApp deep-link message.
 *
 * Supported placeholders:
 *  - `{restaurant_name}`   → `args.restaurantName`
 *  - `{rating}`            → numeric rating ("2")
 *  - `{stars}`             → unicode stars ("★★")
 *  - `{reference_number}`  → `args.referenceNumber`
 *
 * Unknown placeholders (e.g. `{customer_email}`) are left in place
 * verbatim. This is intentional — the message still goes through and
 * the owner sees that one of their tokens didn't match. Result is
 * hard-capped at WHATSAPP_DEEPLINK_MAX_CHARS to keep iOS deep-link
 * URLs tractable.
 */
export function buildWhatsAppMessage(args: BuildMessageArgs): string {
  const fallback =
    args.locale === 'en' ? DEFAULT_WHATSAPP_MESSAGE_EN : DEFAULT_WHATSAPP_MESSAGE_TR;
  const tpl = (args.template ?? '').trim() || fallback;
  const ratingClamped = Math.max(0, Math.min(5, Math.round(args.rating)));
  const stars = ratingClamped > 0 ? '★'.repeat(ratingClamped) : '';
  const subs: Record<string, string> = {
    '{restaurant_name}': args.restaurantName || '',
    '{rating}': ratingClamped.toString(),
    '{stars}': stars,
    '{reference_number}': args.referenceNumber || '',
  };
  let out = tpl;
  for (const [key, value] of Object.entries(subs)) {
    // Global string replace — `key` is a literal, no regex injection risk.
    out = out.split(key).join(value);
  }
  if (out.length > WHATSAPP_DEEPLINK_MAX_CHARS) {
    out = out.slice(0, WHATSAPP_DEEPLINK_MAX_CHARS);
  }
  return out;
}

/**
 * Append a `text` query parameter to a WhatsApp deep-link URL,
 * picking `?` vs `&` correctly and replacing any existing `text` param.
 */
export function appendWhatsAppText(url: string, text: string): string {
  if (!url) return url;
  const trimmed = text.trim();
  if (trimmed.length === 0) return url;
  const encoded = encodeURIComponent(trimmed);
  // Strip any existing `text` parameter (idempotent).
  const stripped = url
    .replace(/([?&])text=[^&]*&?/i, (_match, sep) => (sep === '?' ? '?' : ''))
    .replace(/[?&]$/, '');
  const sep = stripped.includes('?') ? '&' : '?';
  return `${stripped}${sep}text=${encoded}`;
}
