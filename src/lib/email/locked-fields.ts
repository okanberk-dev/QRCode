import type { MailTemplateKey } from './copy-loader';

/**
 * Field-level KVKK / security lock for mail templates.
 *
 * Locked fields are:
 *  - shown as `disabled` inputs in the admin editor with a 🔒 KVKK badge
 *    so the operator immediately understands why they can't edit them
 *  - dropped server-side on PATCH (`/api/admin/mail-templates/[key]/[locale]`)
 *    so a malicious or naive client that bypasses the UI still can't write
 *    to those keys — defence in depth
 *
 * Adding a new locked field: add the field key to the Set below, add a
 * matching `locked: true` + `lockReason` entry in `FIELDS_BY_TEMPLATE`
 * (`MailTemplateEditor.tsx`), and that's it. Render fns don't need to
 * know — they read merged copy, the lock just controls who can write.
 */
export const LOCKED_MAIL_FIELDS: Partial<Record<MailTemplateKey, Set<string>>> = {
  // Forgot-password security messaging. Reword these and a phishing-attempt
  // recipient might mistake the mail for genuine, or vice versa.
  'forgot-password': new Set([
    'statusText', // "Aktif · 30 dk geçerli" — token expiry warning
    'notYouTitle', // "Sen değil misin?" — abuse-recovery prompt
    'notYouBody', // "Bu maili görmezden gel..." — security guidance
    'notYouLink', // "destek ekibine yaz" — support escalation link
  ]),
  // Customer-reply Buaze-attribution disclosure. Required so recipients
  // understand the reply was relayed via Buaze (KVKK / GDPR transparency).
  'customer-reply': new Set([
    'sentLine', // "Bu yanıt"
    'sentSuffix', // "ile gönderildi"
  ]),
  // Verify-email security messaging. Same logic as forgot-password —
  // tampering with these strings opens phishing avenues.
  'verify-email': new Set([
    'statusText', // "Aktif · 24 saat geçerli" — token expiry warning
    'notYouTitle', // "Sen değil misin?" — abuse-recovery prompt
    'notYouBody', // ignore-mail security guidance
  ]),
  // Wave B1 (CLAUDE.md §38.B) — password-changed security disclosure.
  // Same phishing-defence rationale as forgot-password / verify-email.
  'password-changed': new Set([
    'statusText',  // "Başarılı · Şifre güncel" — change confirmation
    'notYouTitle', // "Sen değil misin?" — abuse-recovery prompt
    'notYouBody',  // security guidance copy
    'notYouLink',  // reset CTA — must point at the genuine reset flow
  ]),
};

export function isFieldLocked(templateKey: string, fieldKey: string): boolean {
  const set = LOCKED_MAIL_FIELDS[templateKey as MailTemplateKey];
  return set?.has(fieldKey) ?? false;
}

/**
 * Filter a content payload by removing any locked field values. Used by
 * the PATCH endpoint to enforce server-side write protection regardless
 * of whether the UI gates the input.
 */
export function stripLockedFields(
  templateKey: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  const locked = LOCKED_MAIL_FIELDS[templateKey as MailTemplateKey];
  if (!locked || locked.size === 0) return content;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content)) {
    if (!locked.has(k)) out[k] = v;
  }
  return out;
}
