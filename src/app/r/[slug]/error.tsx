'use client';

import { useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function QrLandingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[qr-landing-error-boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] font-sans px-6 py-12">
      <div className="w-full max-w-[420px] bg-white border border-[#EDEDED] rounded-[20px] p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>
        <h1
          className="text-[24px] font-medium leading-[1.15] tracking-[-0.025em] text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Sayfa yüklenemedi.
        </h1>
        <p className="mt-3 text-[13px] text-[#737373] leading-relaxed">
          Geri bildirim sayfası şu an hizmet dışı. Lütfen biraz sonra tekrar deneyin.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 min-h-[48px] w-full flex items-center justify-center gap-2 bg-[#0A0A0A] text-white font-medium py-3.5 rounded-full hover:bg-[#1A1A1A] transition-colors"
        >
          <RefreshCw size={16} strokeWidth={2} />
          Tekrar dene
        </button>
      </div>
    </div>
  );
}
