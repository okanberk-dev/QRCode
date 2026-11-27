// Frame of the customer account pages (CLAUDE.md §61): small header with
// the Buaze mark, content column, legal links. Purple + white (ui.tsx).
// Server component.
import Link from 'next/link';
import BuazeLogo from '@/components/marketing/BuazeLogo';
import { ACCOUNT_COPY, accountLegalLinks, type AccountLocale } from '../account-copy';
import HtmlLang from './HtmlLang';
import { CANVAS, INK, MUTED } from './ui';

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
    <div className={`min-h-dvh ${CANVAS} ${INK}`}>
      <HtmlLang locale={locale} />
      <header className="border-b border-[#EBEBEB] bg-white">
        <div className={`mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6 ${wide ? 'max-w-[1040px]' : 'max-w-[560px]'}`}>
          <Link
            href="/hesap"
            className="-mx-1 flex min-h-[44px] items-center gap-2 rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC] focus-visible:ring-offset-2"
          >
            <BuazeLogo size={26} />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">{c.brand}</span>
          </Link>
          {signedIn && (
            <Link
              href="/hesap#kartlar"
              className="inline-flex h-11 items-center rounded-full bg-[#EFEAFB] px-4 text-[13.5px] font-semibold text-[#5D3EBC] transition-colors duration-200 hover:bg-[#DCD3F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC] focus-visible:ring-offset-2"
            >
              {c.myCards}
            </Link>
          )}
        </div>
      </header>
      <main className={`mx-auto px-4 pb-16 pt-6 sm:px-6 sm:pt-10 ${wide ? 'max-w-[1040px]' : 'max-w-[560px]'}`}>{children}</main>
      <footer className="border-t border-[#EBEBEB] bg-white">
        <div className={`mx-auto flex flex-col gap-2 px-4 py-6 text-[13px] ${MUTED} sm:flex-row sm:items-center sm:justify-between sm:px-6 ${wide ? 'max-w-[1040px]' : 'max-w-[560px]'}`}>
          <span>{c.poweredBy}</span>
          <nav aria-label={c.legal} className="-mx-1 flex flex-wrap gap-x-2">
            <a href={legal.terms} className="inline-flex min-h-[40px] items-center rounded-full px-1 transition-colors hover:text-[#5D3EBC]">{c.terms}</a>
            <a href={legal.privacy} className="inline-flex min-h-[40px] items-center rounded-full px-1 transition-colors hover:text-[#5D3EBC]">{c.privacy}</a>
            <a
              href={locale === 'tr' ? '/hesap?lang=en' : '/hesap?lang=tr'}
              className="inline-flex min-h-[40px] items-center rounded-full px-1 transition-colors hover:text-[#5D3EBC]"
              hrefLang={locale === 'tr' ? 'en' : 'tr'}
            >
              {locale === 'tr' ? 'English' : 'Türkçe'}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
