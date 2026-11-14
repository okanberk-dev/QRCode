import type { Locale } from '@/lib/translations';
import { resolveBlogPair } from '@/lib/blog-translation-pairs-static';

/**
 * Where "the same page in the other language" lives, for the language links
 * in the navbar and the footer. Pure and server-safe: the result is what the
 * server HTML carries, so crawlers get a real <a href> to an existing page.
 *
 * - Most marketing routes share their path in both languages.
 * - A few legal pages use a different slug per language.
 * - Blog posts may have a different slug (or no translation at all). Unless
 *   the static pair map knows the counterpart, link to the other language's
 *   blog index instead of guessing a URL that would 404 or redirect. The
 *   language-link hook upgrades this to the exact post after mount when the
 *   page's own hreflang tags name one.
 */

const LOCALE_SPECIFIC_PATHS: ReadonlyArray<Record<Locale, string>> = [
  { tr: '/gizlilik', en: '/privacy' },
];

export function otherLocale(locale: Locale): Locale {
  return locale === 'tr' ? 'en' : 'tr';
}

export function alternateLocalePath(pathname: string, locale: Locale): string {
  const target = otherLocale(locale);
  const trimmed = (pathname || '').replace(/\/+$/, '');
  const rest = trimmed.replace(/^\/(?:tr|en)(?=\/|$)/, '');

  for (const pair of LOCALE_SPECIFIC_PATHS) {
    if (rest === pair[locale]) return `/${target}${pair[target]}`;
  }

  const blogPost = rest.match(/^\/blog\/([^/]+)$/);
  if (blogPost) {
    let slug = blogPost[1];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      /* keep the raw segment */
    }
    const paired = resolveBlogPair(slug, locale, target);
    return paired ? `/${target}/blog/${paired}` : `/${target}/blog`;
  }

  return `/${target}${rest}`;
}

/** Remember an explicit language choice (read by middleware for `/`). */
export function rememberLocaleChoice(locale: Locale) {
  try {
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
  } catch {
    /* cookies blocked: the link still navigates */
  }
}

/** Native name of each language, shown in its own language. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
};
