// Frame of the customer account pages (CLAUDE.md §61): small header with
// the Buaze mark, content column, legal links. Server component.
import Link from 'next/link';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { ACCOUNT_COPY, accountLegalLinks, type AccountLocale } from '../account-copy';
import HtmlLang from './HtmlLang';

export default function AccountShell({
  locale,
  signedIn,
  children,
  wide = false,
}: {
  locale: AccountLocale;
  signedIn: boolean;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const c = ACCOUNT_COPY[locale];
  const legal = accountLegalLinks(locale);
  return (
    <div className="min-h-dvh bg-[#F6F6F4] text-[#0A0A0A]">
      <HtmlLang locale={locale} />
      <header className="border-b border-[#EDEDED] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className={`mx-auto flex h-14 items-center justify-between px-4 sm:px-6 ${wide ? 'max-w-[1040px]' : 'max-w-[560px]'}`}>
          <Link href="/hesap" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8D62E]">
            <BuazeLogo size={26} />
            <span className="text-[14px] font-semibold tracking-[-0.01em]">{c.brand}</span>
          </Link>
          {signedIn && (
            <Link href="/hesap#kartlar" className="rounded-full border border-[#EDEDED] px-3 py-1.5 text-[13px] font-medium hover:border-[#0A0A0A]">
              {c.myCards}
            </Link>
          )}
        </div>
      </header>
      <main className={`mx-auto px-4 pb-16 pt-6 sm:px-6 sm:pt-10 ${wide ? 'max-w-[1040px]' : 'max-w-[560px]'}`}>{children}</main>
      <footer className="border-t border-[#EDEDED] bg-white">
        <div className={`mx-auto flex flex-col gap-2 px-4 py-6 text-[12.5px] text-[#737373] sm:flex-row sm:items-center sm:justify-between sm:px-6 ${wide ? 'max-w-[1040px]' : 'max-w-[560px]'}`}>
          <span>{c.poweredBy}</span>
          <nav aria-label={c.legal} className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={legal.terms} className="hover:text-[#0A0A0A]">{c.terms}</a>
            <a href={legal.privacy} className="hover:text-[#0A0A0A]">{c.privacy}</a>
            <a href={locale === 'tr' ? '/hesap?lang=en' : '/hesap?lang=tr'} className="hover:text-[#0A0A0A]" hrefLang={locale === 'tr' ? 'en' : 'tr'}>
              {locale === 'tr' ? 'English' : 'Türkçe'}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
