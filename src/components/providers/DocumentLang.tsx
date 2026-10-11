'use client';

import { useLayoutEffect } from 'react';

// The root layout serves `<html lang="tr">` for every route: it sits above the
// `[locale]` segment and must not read cookies()/headers() (that would make the
// ISR marketing tree dynamic). A tiny inline script in the root <head> fixes
// `lang` for `/en/*` before the first paint; this component keeps it right on
// client-side navigations between locales, where that script does not re-run.
// `lang` matters beyond SEO/screen readers: CSS `text-transform: uppercase`
// follows it, so English eyebrows rendered as "BUSİNESS" under lang="tr".
const ROOT_DEFAULT_LANG = 'tr';

export default function DocumentLang({ lang }: { lang: 'tr' | 'en' }) {
  useLayoutEffect(() => {
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = ROOT_DEFAULT_LANG;
    };
  }, [lang]);
  return null;
}
