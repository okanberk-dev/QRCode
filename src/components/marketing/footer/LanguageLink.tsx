'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Locale } from '@/lib/translations';
import {
  LANGUAGE_NAMES,
  alternateLocalePath,
  otherLocale,
  rememberLocaleChoice,
} from './locale-switch';

function trimSlash(path: string) {
  return path.replace(/\/+$/, '') || '/';
}

/**
 * The same page in the other language. The first render (server HTML and
 * hydration) uses the path-based guess from `alternateLocalePath`; after
 * mount, if the page's own <link rel="alternate" hreflang> names the exact
 * counterpart (blog posts with a different slug), the link switches to it.
 * The head is only trusted when its canonical matches the current path, so
 * a half-updated head during client navigation can never produce a wrong
 * link.
 */
export function useAlternateLocaleHref(locale: Locale): string {
  const pathname = usePathname() || `/${locale}`;
  const computed = alternateLocalePath(pathname, locale);
  const [fromHead, setFromHead] = useState<{ path: string; href: string } | null>(null);

  useEffect(() => {
    const target = otherLocale(locale);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const alternate = document.querySelector<HTMLLinkElement>(
      `link[rel="alternate"][hreflang="${target}"]`,
    );
    if (!canonical || !alternate) return;
    try {
      const canonicalPath = trimSlash(new URL(canonical.href).pathname);
      const alternatePath = trimSlash(new URL(alternate.href).pathname);
      if (canonicalPath !== trimSlash(pathname)) return;
      if (!new RegExp(`^/${target}(/|$)`).test(alternatePath)) return;
      setFromHead({ path: pathname, href: alternatePath });
    } catch {
      /* malformed URL in the head: keep the computed link */
    }
  }, [locale, pathname]);

  return fromHead && fromHead.path === pathname ? fromHead.href : computed;
}

/**
 * Crawlable language switch: a real <a href> with hreflang/lang, shown in the
 * target language's own name ("English" on Turkish pages, "Türkçe" on
 * English ones). Clicking also remembers the choice for the `/` redirect.
 */
export default function LanguageLink({
  locale,
  className = '',
  icon,
  onNavigate,
}: {
  locale: Locale;
  className?: string;
  icon?: ReactNode;
  onNavigate?: () => void;
}) {
  const target = otherLocale(locale);
  const href = useAlternateLocaleHref(locale);
  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      prefetch={false}
      onClick={() => {
        rememberLocaleChoice(target);
        onNavigate?.();
      }}
      className={className}
    >
      {icon}
      <span>{LANGUAGE_NAMES[target]}</span>
    </Link>
  );
}
