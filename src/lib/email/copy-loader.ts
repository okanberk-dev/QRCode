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

const SUPPORTED_KEYS = new Set(['welcome', 'newsletter', 'trial-ending']);

export type MailTemplateKey = 'welcome' | 'newsletter' | 'trial-ending';
export type MailLocale = 'tr' | 'en';

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
