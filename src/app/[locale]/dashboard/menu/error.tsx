'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { reportBoundaryError, scheduleTransientRetry } from '@/lib/error-boundary';

export default function DashboardMenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';

  useEffect(() => {
    reportBoundaryError('dashboard-menu-error-boundary', error);
    return scheduleTransientRetry('dashboard-menu', error, reset);
  }, [error, reset]);

  return (
    <div className="mx-auto max-w-[640px] px-4 py-12 sm:px-8 lg:py-16">
      <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-[#DC2626]/10 p-2">
            <AlertTriangle size={20} className="text-[#DC2626]" />
          </div>
          <div className="min-w-0 flex-1">
            <h1
              className="text-[20px] sm:text-[22px] font-medium tracking-[-0.015em] text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {isTr ? 'Menü yüklenemedi' : 'Menu could not load'}
            </h1>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">
              {isTr
                ? 'Bir şeyler ters gitti. Sayfayı tekrar deneyebilir veya işletme listesine dönebilirsin.'
                : 'Something went wrong. Try again or go back to your locations.'}
            </p>
            {error.digest && (
              <p className="mt-2 text-[11px] text-[#737373] font-mono">
                ref: {error.digest}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1A1A1A]"
          >
            <RefreshCw size={14} strokeWidth={2} />
            {isTr ? 'Tekrar dene' : 'Try again'}
          </button>
          <Link
            href={`/${locale}/dashboard/restaurants`}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:border-[#0A0A0A]"
          >
            <ArrowLeft size={14} strokeWidth={2} />
            {isTr ? 'İşletmelere dön' : 'Back to locations'}
          </Link>
        </div>
      </div>
    </div>
  );
}
