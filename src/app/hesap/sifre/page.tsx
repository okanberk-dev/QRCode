import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { pickPublicLocale } from '@/app/l/loyalty-public';
import AccountShell from '../_components/AccountShell';
import PasswordView from '../_components/PasswordView';

// Forgot password (no token) and set a new one from the e-mail link (CLAUDE.md §61).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Şifre · Buaze hesabım', robots: { index: false, follow: false } };

export default async function AccountPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const lang = Array.isArray(sp.lang) ? sp.lang[0] : sp.lang;
  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  const locale = pickPublicLocale(lang, (await headers()).get('accept-language'));
  return (
    <AccountShell locale={locale} signedIn={false}>
      <PasswordView locale={locale} token={token && token.length < 2000 ? token : null} />
    </AccountShell>
  );
}
