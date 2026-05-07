'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, Home, Loader2, RefreshCw } from 'lucide-react';
import { isTransientNetworkError, reportBoundaryError, scheduleTransientRetry } from '@/lib/error-boundary';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';
  const transient = isTransientNetworkError(error);

  useEffect(() => {
    reportBoundaryError('dashboard-error-boundary', error);
    return scheduleTransientRetry('dashboard', error, reset);
  }, [error, reset]);

  return (
    <div className="mx-auto max-w-[640px] px-4 py-10 sm:px-8 lg:py-14">
      <div className="rounded-2xl border border-[#EDEDED] bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-[#FAFAFA] p-2 text-[#0A0A0A]">
            {transient ? <Loader2 size={20} className="animate-spin" /> : <AlertTriangle size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="bz-h-tight text-[20px] sm:text-[22px] text-[#0A0A0A]">
              {transient
                ? isTr
                  ? 'Bağlantı yenileniyor'
                  : 'Refreshing connection'
                : isTr
                  ? 'Panel sayfası yüklenemedi'
                  : 'Dashboard page could not load'}
            </h1>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">
              {transient
                ? isTr
                  ? 'Kısa süreli bir ağ hatası yakaladık. Sayfayı otomatik olarak bir kez daha deniyoruz.'
                  : 'A short network hiccup was detected. We are retrying the page once automatically.'
                : isTr
                  ? 'Sayfa yüklenirken geçici bir hata oluştu. Tekrar deneyebilir veya panele dönebilirsin.'
                  : 'A temporary error happened while loading this page. Try again or return to the dashboard.'}
            </p>
            {error.digest && (
              <p className="pulse-eyebrow mt-3 text-[#A3A3A3]">REFERANS · {error.digest}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="bz-btn-primary"
          >
            <RefreshCw size={14} strokeWidth={2} />
            {isTr ? 'Tekrar dene' : 'Try again'}
          </button>
          <Link
            href={`/${locale}/dashboard`}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#EDEDED] bg-white px-5 py-2.5 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:border-[#0A0A0A]"
          >
            <Home size={14} strokeWidth={2} />
            {isTr ? 'Panele dön' : 'Back to dashboard'}
          </Link>
        </div>
      </div>
    </div>
  );
}
