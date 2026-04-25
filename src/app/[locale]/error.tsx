'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[locale-error-boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] font-sans px-6 py-12">
      <div className="w-full max-w-[460px] bg-white border border-[#EDEDED] rounded-[20px] p-8 sm:p-10 shadow-[0_8px_24px_rgba(10,10,10,0.04)] text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>
        <h1
          className="text-[28px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Bir şeyler ters gitti.
        </h1>
        <p className="mt-3 text-[14px] text-[#737373] leading-relaxed">
          Sayfa yüklenirken geçici bir hata oluştu. Lütfen tekrar deneyin — sorun sürerse birkaç dakika sonra tekrar bakın.
        </p>

        {error.digest && (
          <p className="pulse-eyebrow mt-4 text-[#A3A3A3]">
            REFERANS · {error.digest}
          </p>
        )}

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors"
          >
            <RefreshCw size={16} strokeWidth={2} />
            Tekrar dene
          </button>
          <Link
            href="/"
            className="min-h-[44px] w-full flex items-center justify-center gap-2 bg-white text-[#0A0A0A] border border-[#E5E5E5] font-medium py-3 rounded-full hover:border-[#0A0A0A] transition-colors text-[14px]"
          >
            <Home size={15} strokeWidth={2} />
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </div>
  );
}
