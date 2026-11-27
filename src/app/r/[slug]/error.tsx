'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { reportBoundaryError, scheduleTransientRetry } from '@/lib/error-boundary';

export default function QrLandingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportBoundaryError('qr-landing-error-boundary', error);
    return scheduleTransientRetry('qr-landing', error, reset);
  }, [error, reset]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F6F6F6]">
      <div
        className="shrink-0 bg-[#5D3EBC]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', height: 'calc(96px + env(safe-area-inset-top, 0px))' }}
        aria-hidden
      />
      <div className="relative z-[1] -mt-6 flex w-full flex-1 flex-col items-center rounded-t-[28px] bg-white px-6 pb-12 pt-10 text-center sm:mx-auto sm:mb-10 sm:max-w-[440px] sm:flex-none sm:rounded-[28px]">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#EFEAFB] text-[#5D3EBC]">
          <AlertTriangle size={24} strokeWidth={2} aria-hidden />
        </div>
        <h1
          className="text-[24px] font-bold leading-[1.2] tracking-[-0.02em] text-[#111110]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Sayfa yüklenemedi.
        </h1>
        <p className="mt-3 max-w-[320px] text-[14px] leading-relaxed text-[#737373]">
          Geri bildirim sayfası şu an hizmet dışı. Lütfen biraz sonra tekrar deneyin.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-7 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#5D3EBC] px-6 text-[16px] font-semibold text-white transition-colors duration-200 hover:bg-[#4C2FA3] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5D3EBC] focus-visible:ring-offset-2"
        >
          <RefreshCw size={16} strokeWidth={2} aria-hidden />
          Tekrar dene
        </button>
      </div>
    </div>
  );
}
