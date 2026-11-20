'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { reportBoundaryError, scheduleTransientRetry } from '@/lib/error-boundary';
import { getMenuCopy } from './_components/menu-i18n';

export default function MenuBuilderError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const locale = params?.locale === 'en' ? 'en' : 'tr';
  const copy = getMenuCopy(locale);

  useEffect(() => {
    reportBoundaryError('menu-builder-error-boundary', error);
    return scheduleTransientRetry('menu-builder', error, reset);
  }, [error, reset]);

  return (
    <div className="mx-auto max-w-[640px] px-4 py-12 sm:px-7 lg:py-16">
      <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-full bg-[#DC2626]/10 p-2">
            <AlertTriangle size={20} className="text-[#DC2626]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="bz-h-tight text-[20px] text-[#0A0A0A] sm:text-[22px]">{copy.errors.boundaryTitle}</h1>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{copy.errors.boundaryBody}</p>
            {error.digest && <p className="mt-2 font-mono text-[12px] text-[#737373]">ref: {error.digest}</p>}
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={reset} className="bz-btn-primary">
            <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
            {copy.errors.retry}
          </button>
          {/* There is no menu list to go back to (the menu hub only opens this builder). */}
          <Link href={`/${locale}/dashboard`} className="bz-btn-ghost">
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            {copy.errors.backToDashboard}
          </Link>
        </div>
      </div>
    </div>
  );
}
