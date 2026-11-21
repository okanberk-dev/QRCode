import { prisma } from '@/lib/prisma';

/**
 * DB-backed copy loader for selected mail templates (welcome, newsletter,
 * trial-ending). Render functions call this with a key+locale and an inline
 * default object; the loader merges any DB-stored content over the default.
 *
 * Fallback discipline: if the row is missing, the JSON is corrupt, or the
 * DB connection errors out, the default is returned unchanged so a single
 * misconfiguration never breaks transactional mail.
 *
 * Cache: process-local Map with a 60-second TTL. Mail sends rarely fire
 * back-to-back (cron throttles 120ms; transactional mail is request-scoped),
 * so this cache mostly serves admin "Test mail at" loops and never holds a
 * stale value longer than a minute. Vercel serverless instances reset the
 * cache on cold start; that's fine — TTL is short enough that drift between
 * instances is invisible to users.
 */

type CacheEntry = { content: Record<string, unknown>; expiresAt: number };
const cache = new Map<string, CacheEntry>();

// Process-local draft store — admin "Önizle" / "Test mail at" akışları için
// unsaved editor content'i geçici override eder. setMailCopyDraft sırasında
// cache'i de bypass eder (loader önce buraya bakar). try/finally ile
// clearMailCopyDraft çağrısı yapılır → state leak engellenir.
const draftOverrides = new Map<string, Record<string, unknown>>();
const TTL_MS = 60 * 1000;

/**
 * Source of truth for which template keys the CMS recognises. Phase 2
 * extended this from 3 (welcome / newsletter / trial-ending) to 8 — only
 * `form-confirmation` stays inline because its 4 formType variants need a
 * nested-JSON schema we'd rather build separately. Update this list +
 * `MailTemplateKey` together, then re-export points in API routes and the
 * admin editor wire automatically.
 */
export const SUPPORTED_MAIL_KEYS = [
  'welcome',
  'newsletter',
  'trial-ending',
  'forgot-password',
  'low-rating-alert',
  'new-review',
  'weekly-report',
  'customer-reply',
  // Phase 3: form-confirmation uses nested JSON
  // (`{ contact: {...}, career: {...}, roi: {...}, newsletter: {...} }`)
  // because it has 4 formType variants. Loader keeps the same signature;
  // validation below also accepts plain objects at the top level.
  'form-confirmation',
  // §22 davet akışı: e-posta onay gate'i için kullanılır.
  'verify-email',
  // ROI calculator akışı (§ROI Parça A-E). 2 dedikated template; admin
  // editor'a da bağlandı ki content değişiklikleri admin'den yapılabilsin.
  'roi-customer-report',
  'roi-admin-notification',
  // Wave B lifecycle emails — cron-driven, idempotent (CLAUDE.md §21.34).
  'qr-not-downloaded',
  'first-feedback-tips',
  'upgrade-suggestion',
  // CLAUDE.md §42 Phase 3 — Denetim Merkezi yanıt tamamlandı bildirimi.
  // Owner'a (Restaurant.notificationEmail) gönderilir. Skor + geçti/kaldı +
  // panel detay link.
  'audit-completed',
  // Wave B (CLAUDE.md §38.B) — security + team mails. Each ships with TR +
  // EN inline defaults; admin CMS edits override per-locale.
  'password-changed',         // B1 — security alert after /api/user/profile PUT.
  'team-member-joined',       // B2 — owner notification after /api/team/accept-invite.
  // Wave B4 (CLAUDE.md §38.193) — owner-initiated account deletion lifecycle.
  'account-deletion-scheduled', // 30-day grace start; carries cancel link.
  'account-deletion-canceled',  // confirmation that the schedule was revoked.
  // Wave C (CLAUDE.md §38.194).
  'rating-drop-alert',          // C2 weekly cron
  'data-export-confirmation',   // C4 sync from /api/account/export-data
  // Saved cards (billing spec §13.4, CLAUDE.md §44.4) — renewal engine mails.
  'billing-renewal-upcoming',   // reminder mode: E−7d / E−1d, leads to a 3D Secure payment
  'billing-period-ended',       // a renewal lapsed: the paid period ended
  'billing-card-retention',     // stored card deleted 180 days after the subscription ended
  'billing-renewal-paid',       // auto charge went through (or will be refunded: turned off mid-charge)
  'billing-renewal-failed',     // auto charge failed: retry announced, final, hard, action needed, unresolved
  'billing-auto-renew-changed', // instruction on (durable confirmation), card replaced, turned off
  // Retired 2026-11 (CLAUDE.md §21.39): new-device-login,
  // first-feedback-celebration, first-reply-celebration, team-member-removed,
  // qr-no-scans-reminder, inactive-reactivation. Their MailTemplate rows may
  // still exist in the DB; nothing reads them.
] as const;

export type MailTemplateKey = (typeof SUPPORTED_MAIL_KEYS)[number];
export type MailLocale = 'tr' | 'en';

const SUPPORTED_KEYS = new Set<string>(SUPPORTED_MAIL_KEYS);

export function isSupportedMailTemplateKey(value: string): value is MailTemplateKey {
  return SUPPORTED_KEYS.has(value);
}

export async function loadMailCopy<T extends Record<string, unknown>>(
  key: MailTemplateKey,
  locale: MailLocale,
  fallback: T,
): Promise<T> {
  const cacheKey = `${key}:${locale}`;

  // Admin "Test mail at" + "Önizle" akışları için process-local draft
  // override. send-test endpoint setMailCopyDraft → render → finally
  // clearMailCopyDraft pattern'iyle kullanır. DB'ye yazmadan unsaved
  // değişiklikleri test etme imkanı sağlar (audit Fix A).
  // Race window: aynı (key, locale) için 2 paralel send-test → birinin
  // draft'ı diğerini görür. Kabul edilen risk (admin-only, low traffic).
  const draft = draftOverrides.get(cacheKey);
  if (draft) {
    return { ...fallback, ...draft } as T;
  }

  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...fallback, ...cached.content } as T;
  }

  try {
    const row = await prisma.mailTemplate.findUnique({
      where: { key_locale: { key, locale } },
      select: { content: true },
    });
    const rawContent: Record<string, unknown> =
      row && row.content && typeof row.content === 'object' && !Array.isArray(row.content)
        ? (row.content as Record<string, unknown>)
        : {};
    // Defensive normalisation: render functions interpolate copy fields into
    // HTML strings, so anything non-string from the DB must NOT reach the
    // template. Two shapes are accepted:
    //   1) string                  — flat copy field (most templates)
    //   2) plain object of strings — variant container (form-confirmation
    //      style: { contact: { titleA: '...', ... }, career: {...}, ... })
    // Anything else (number / null / array / nested object beyond depth 1)
    // is dropped + warn-logged. Render falls back to inline default for
    // that key. Keeps merge runtime-safe even when admin somehow PATCHes a
    // bad shape.
    const dbContent: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rawContent)) {
      if (typeof v === 'string') {
        dbContent[k] = v;
      } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        // Variant object: keep only string children, drop any other shape.
        const inner: Record<string, string> = {};
        for (const [ik, iv] of Object.entries(v as Record<string, unknown>)) {
          if (typeof iv === 'string') inner[ik] = iv;
        }
        if (Object.keys(inner).length > 0) dbContent[k] = inner;
      } else {
        console.warn('[loadMailCopy] non-string field dropped', { key, locale, field: k, type: typeof v });
      }
    }
    cache.set(cacheKey, { content: dbContent, expiresAt: Date.now() + TTL_MS });
    return { ...fallback, ...dbContent } as T;
  } catch (err) {
    // Any DB / Prisma issue (table missing on a fresh deploy, network, etc.):
    // log and fall back to inline default. Mail send must not break here.
    console.error('[loadMailCopy] DB read failed, using inline default', { key, locale, err });
    return fallback;
  }
}

export function invalidateMailCopyCache(key: MailTemplateKey, locale: MailLocale) {
  cache.delete(`${key}:${locale}`);
}

/** Test helper / admin-triggered full reset (no auth here — caller gates). */
export function clearMailCopyCache() {
  cache.clear();
}

/**
 * Set process-local draft override for a (key, locale). Used by admin
 * preview/test endpoints to render unsaved editor content without writing
 * to DB. ALWAYS pair with `clearMailCopyDraft` in a try/finally to avoid
 * state leak. Caller responsibility — no auto-expire.
 */
export function setMailCopyDraft(
  key: MailTemplateKey,
  locale: MailLocale,
  draft: Record<string, unknown>,
) {
  draftOverrides.set(`${key}:${locale}`, draft);
}

export function clearMailCopyDraft(key: MailTemplateKey, locale: MailLocale) {
  draftOverrides.delete(`${key}:${locale}`);
}
