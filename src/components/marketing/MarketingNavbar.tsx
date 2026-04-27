import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import type { Locale, Translations } from '@/lib/translations';
import MarketingNavbarClient from './MarketingNavbarClient';
import { getSiteSettings } from '@/lib/site-settings';

interface MarketingNavbarProps {
  locale: Locale;
  t: Translations;
}

export default async function MarketingNavbar({ locale, t }: MarketingNavbarProps) {
  let isLoggedIn = false;

  const cookieStore = await cookies();
  const token = cookieStore.get('user_token')?.value;

  if (token) {
    const payload = await verifyJwt(token);
    if (payload && typeof payload.userId === 'string') {
      isLoggedIn = true;
    }
  }

  const { logoUrl } = await getSiteSettings();

  return <MarketingNavbarClient locale={locale} t={t} isLoggedIn={isLoggedIn} logoUrl={logoUrl} />;
}
