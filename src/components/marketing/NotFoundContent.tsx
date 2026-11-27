'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const isEnPath = (path: string) => /^\/en(\/|$)/.test(path);

/**
 * Locale-aware text + links for the branded 404 (BrandedNotFound).
 *
 * Not-found boundaries are rendered into the React tree of every route, so
 * this must not read headers() (a dynamic API there once made every
 * marketing page render per request, §35.12.3). The locale comes from the
 * URL instead: `/en/...` 404s get English copy, everything else Turkish.
 */
export default function NotFoundContent({
  detectOnClient = false,
}: {
  /**
   * For app/global-not-found.tsx. That page is prerendered once, without the
   * requested URL, so the server always renders Turkish; reading the path
   * during the first render would make the client disagree with the server
   * HTML (React #418) for /en URLs. Start in Turkish and switch after mount.
   */
  detectOnClient?: boolean;
}) {
  const routerPath = usePathname() ?? '';
  const [clientIsEn, setClientIsEn] = useState(false);
  useEffect(() => {
    if (detectOnClient) setClientIsEn(isEnPath(window.location.pathname));
  }, [detectOnClient]);
  const isEn = detectOnClient ? clientIsEn : isEnPath(routerPath);
  const locale = isEn ? 'en' : 'tr';

  return (
    <>
      <h1
        className="mt-4 text-[26px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[36px]"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {isEn ? 'This page has no pulse.' : 'Bu sayfa nabız vermiyor.'}
      </h1>

      <p className="mx-auto mt-3 max-w-[480px] text-[15px] leading-[1.6] text-white/75 sm:text-[16px]">
        {isEn
          ? 'The page you are looking for may have been moved or removed, or it never existed.'
          : 'Aradığınız sayfa taşınmış, silinmiş ya da hiç var olmamış olabilir.'}
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={`/${locale}`}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-[#5D3EBC] transition-colors hover:bg-[#EFEAFB]"
        >
          {isEn ? 'Back to home' : 'Ana sayfaya dön'}
        </Link>
        <Link
          href={`/${locale}/help`}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border border-white/40 px-6 py-3 text-[14px] font-medium text-white transition-colors hover:border-white/60"
        >
          {isEn ? 'Get help' : 'Yardım al'}
        </Link>
      </div>
    </>
  );
}
