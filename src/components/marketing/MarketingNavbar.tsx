import type { Locale, Translations } from '@/lib/translations';
import MarketingNavbarClient from './MarketingNavbarClient';
import { getSiteSettings } from '@/lib/site-settings';

interface MarketingNavbarProps {
  locale: Locale;
  t: Translations;
}

// Stage 83 §38.163 — server cookies() read removed (was: jwt-verify of
// `user_token` to flip the login chip server-side). The login chip swap
// moved to the client via `useMarketingAuth` inside MarketingNavbarClient,
// which unblocks ISR for the entire marketing tree.
//
// `getSiteSettings()` is process-cached (CLAUDE.md §38.101 Stage 25 cache,
// 60s TTL) and contains no per-request data — safe under ISR.
//
// The `isLoggedIn` prop is no longer passed; the client component now
// owns the probe and renders the correct CTA after hydration. Anonymous
// visitors (≥90% of cold marketing traffic) see the right state on first
// paint without waiting for a fetch.
export default async function MarketingNavbar({ locale, t }: MarketingNavbarProps) {
  const { logoUrl } = await getSiteSettings();

  return <MarketingNavbarClient locale={locale} t={t} logoUrl={logoUrl} />;
}
