'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import { reportBoundaryError, scheduleTransientRetry } from '@/lib/error-boundary';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportBoundaryError('admin-error-boundary', error);
    return scheduleTransientRetry('admin', error, reset);
  }, [error, reset]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] font-sans px-6 py-12">
      <div className="w-full max-w-[460px] bg-white border border-[#EDEDED] rounded-[20px] p-8 sm:p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF9B8] text-[#0A0A0A]">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>
        <h1 className="text-[26px] font-medium leading-[1.1] tracking-[-0.025em] text-[#0A0A0A]">
          Panel yüklenemedi.
        </h1>
        <p className="mt-3 text-[14px] text-[#737373] leading-relaxed">
          Admin panelinde geçici bir hata oluştu. Veritabanı bağlantısı yavaşlamış olabilir.
        </p>

        {error.digest && (
          <p className="pulse-eyebrow mt-4 text-[#A3A3A3]">REFERANS · {error.digest}</p>
        )}

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="bz-btn-primary w-full"
          >
            <RefreshCw size={16} strokeWidth={2} />
            Tekrar dene
          </button>
          <Link
            href="/admin/dashboard"
            className="min-h-[44px] w-full flex items-center justify-center gap-2 bg-white text-[#0A0A0A] border border-[#E5E5E5] font-medium py-3 rounded-full hover:border-[#0A0A0A] transition-colors text-[14px]"
          >
            <Home size={15} strokeWidth={2} />
            Dashboard&apos;a dön
          </Link>
        </div>
      </div>
    </div>
  );
}
