import './ritim/ritim.css';
import type { Locale, Translations } from '@/lib/translations';
import MarketingNavbarClient from './MarketingNavbarClient';
import { getSiteSettings } from '@/lib/site-settings';

interface MarketingNavbarProps {
  locale: Locale;
  /**
   * Unused. Kept optional so the existing callers that pass `t` still
   * compile; it is deliberately NOT forwarded to the client component,
   * where it would serialize the whole translations object (~38 KB) into
   * every page's HTML.
   */
  t?: Translations;
}

/**
 * Server wrapper for the marketing navbar. Reads only process-cached site
 * settings (no cookies/headers), so marketing pages stay statically
 * generated; the signed-in CTA swap happens on the client
 * (useMarketingAuth).
 */
export default async function MarketingNavbar({ locale }: MarketingNavbarProps) {
  const { logoUrl } = await getSiteSettings();
  return <MarketingNavbarClient locale={locale} logoUrl={logoUrl} />;
}
