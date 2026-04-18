import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth';
import type { Locale } from '@/lib/translations';
import MarketingNavbarClient from './MarketingNavbarClient';

interface MarketingNavbarProps {
  locale: Locale;
  t: any;
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

  return <MarketingNavbarClient locale={locale} t={t} isLoggedIn={isLoggedIn} />;
}
