'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import type { MenuCopy } from '../menu-i18n';

/** First load failed (spec §12): what happened, "Tekrar dene" and the way back to the business. */
export function LoadErrorView({
  copy, message, onRetry, backHref,
}: {
  copy: MenuCopy;
  message: string | null;
  onRetry: () => void;
  backHref: string;
}) {
  return (
    <div className="mx-auto max-w-[640px] px-4 py-12 sm:px-7 lg:py-16">
      <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="shrink-0 rounded-full bg-[#DC2626]/10 p-2">
            <AlertTriangle size={20} strokeWidth={2} className="text-[#DC2626]" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="bz-h-tight text-[20px] text-[#0A0A0A] sm:text-[22px]">{copy.errors.loadTitle}</h1>
            <p className="mt-2 text-[14px] leading-[1.6] text-[#525252]">{message ?? copy.errors.loadBody}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onRetry} className="bz-btn-primary">
            <RefreshCw size={14} strokeWidth={2} aria-hidden="true" />
            {copy.errors.retry}
          </button>
          <Link href={backHref} className="bz-btn-ghost">
            <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
            {copy.errors.backToBusiness}
          </Link>
        </div>
      </div>
    </div>
  );
}
