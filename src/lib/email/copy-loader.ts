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
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...fallback, ...cached.content } as T;
  }

  try {
    const row = await prisma.mailTemplate.findUnique({
      where: { key_locale: { key, locale } },
      select: { content: true },
    });
    const dbContent: Record<string, unknown> =
      row && row.content && typeof row.content === 'object' && !Array.isArray(row.content)
        ? (row.content as Record<string, unknown>)
        : {};
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
