// Shared server body of /hesap, /hesap/giris and /hesap/kayit (CLAUDE.md §61).
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getCustomerFromCookies, toCustomerDto } from '@/lib/customer-auth';
import { listCustomerCards, safeNextPath } from '@/lib/customer-account';
import { loadPublicLoyaltyProgram } from '@/lib/loyalty-server';
import { pickPublicLocale } from '@/app/l/loyalty-public';
import AccountShell from './AccountShell';
import AuthView from './AuthView';
import AccountView from './AccountView';

export type AccountSearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export async function renderAccountPage(searchParams: AccountSearchParams, mode: 'login' | 'register') {
  const sp = await searchParams;
  const lang = one(sp.lang);
  const next = safeNextPath(one(sp.next));
  const account = await getCustomerFromCookies();

  if (account) {
    if (next !== '/hesap') redirect(next);
    const locale = lang === 'en' || lang === 'tr' ? lang : account.locale === 'en' ? 'en' : 'tr';
    const cards = await listCustomerCards(account.id);
    const verified = one(sp.verified);
    return (
      <AccountShell locale={locale} signedIn wide>
        <AccountView
          locale={locale}
          account={toCustomerDto(account)}
          cards={cards}
          verified={verified === '1' || verified === '0' ? verified : null}
        />
      </AccountShell>
    );
  }

  const locale = pickPublicLocale(lang, (await headers()).get('accept-language'));
  let intro: string | null = null;
  const slug = /^\/l\/([a-z0-9-]{1,80})/.exec(next)?.[1];
  if (slug) {
    const program = await loadPublicLoyaltyProgram(slug).catch(() => null);
    if (program) {
      intro =
        locale === 'tr'
          ? `${program.restaurant.name} kartınız hesabınızda saklanacak`
          : `Your ${program.restaurant.name} card will be kept in your account`;
    }
  }
  const deleted = one(sp.deleted) === '1';
  return (
    <AccountShell locale={locale} signedIn={false}>
      {deleted && (
        <p role="status" className="mb-4 rounded-[20px] bg-[#EFEAFB] px-4 py-3 text-[14px] text-[#3B1F8F]">
          {locale === 'tr' ? 'Hesabınız silindi.' : 'Your account was deleted.'}
        </p>
      )}
      <AuthView locale={locale} mode={one(sp.mode) === 'kayit' ? 'register' : mode} next={next} intro={intro} />
    </AccountShell>
  );
}
