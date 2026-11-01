'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Locale-aware text + links for the root 404 page.
 *
 * The root `not-found.tsx` is rendered into the React tree of EVERY route
 * under the root layout (Next.js pre-renders the not-found boundary of each
 * segment). It used to read `headers()` for Accept-Language, which is a
 * dynamic API: every marketing page silently stopped being statically
 * generated and was rendered per request (no ISR, metadata streamed into
 * <body>). The locale now comes from the URL on the client — `/en/...`
 * 404s get English copy, everything else Turkish (primary locale).
 */
export default function NotFoundContent() {
  const pathname = usePathname() ?? '';
  const isEn = /^\/en(\/|$)/.test(pathname);
  const locale = isEn ? 'en' : 'tr';

  return (
    <>
      <h1
        className="mt-4 text-[26px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[36px]"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {isEn ? 'This page has no pulse.' : 'Bu sayfa nabız vermiyor.'}
      </h1>

      <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-[1.6] text-[#A3A3A3] sm:text-[16px]">
        {isEn
          ? 'The page you are looking for may have been moved or removed, or it never existed.'
          : 'Aradığınız sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.'}
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={`/${locale}`}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-[#C6F24E] px-6 py-3 text-[14px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E]"
        >
          {isEn ? 'Back to home' : 'Ana sayfaya dön'}
        </Link>
        <Link
          href={`/${locale}/help`}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border border-[#333] px-6 py-3 text-[14px] font-medium text-white transition-colors hover:border-white/60"
        >
          {isEn ? 'Get help' : 'Yardım al'}
        </Link>
      </div>
    </>
  );
}
