'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, X } from 'lucide-react';
import type { Locale } from '@/lib/translations';

/**
 * Trial countdown topbar banner. Sidebar Crown badge zaten ≤5g için
 * görünür; banner ek bir aksiyon yüzeyi: ≤7g warn (Pulse warn palette),
 * ≤3g danger (Pulse danger palette).
 *
 * Dismiss localStorage `bz_trial_banner_dismissed_${YYYY-MM-DD}` —
 * günlük reset, ertesi gün geri gelir. Owner trial bitiyor sinyalini
 * günde bir kez görür.
 */
export default function TrialBanner({
  locale,
  daysLeft,
}: {
  locale: Locale;
  daysLeft: number;
}) {
  const isTr = locale === 'tr';
  const isDanger = daysLeft <= 3;
  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Mount'a kadar gizle (SSR-safe). useEffect mount sonrası dismiss
  // state'ini localStorage'dan oku → flash önler.
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = localStorage.getItem(`bz_trial_banner_dismissed_${todayKey}`);
    setHidden(dismissed === '1');
  }, [todayKey]);

  if (hidden) return null;

  const palette = isDanger
    ? {
        bg: '#FEF2F2',
        border: '#FECACA',
        text: '#991B1B',
        cta: '#000000',
        ctaText: '#FFFFFF',
      }
    : {
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#92400E',
        cta: '#000000',
        ctaText: '#FFFFFF',
      };

  const message = (() => {
    if (daysLeft === 0) {
      return isTr ? 'Deneme süren bugün bitiyor.' : 'Your trial ends today.';
    }
    return isTr
      ? `Deneme sürende ${daysLeft} gün kaldı.`
      : daysLeft === 1
        ? '1 day left in your trial.'
        : `${daysLeft} days left in your trial.`;
  })();

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bz_trial_banner_dismissed_${todayKey}`, '1');
    }
    setHidden(true);
  };

  return (
    <div className="legal-print-hide mx-auto w-full max-w-[1440px] px-4 pt-4 sm:px-7">
      {/* Pano: a black pill with a white call to action (DASHBOARD_DESIGN.md §5.4). */}
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-[28px] bg-[#000000] py-2 pl-5 pr-2 text-[14px] text-white sm:rounded-full"
      >
        <Crown size={18} className="shrink-0 text-white" aria-hidden="true" />
        {/* Wraps instead of truncating: on a phone the ellipsis cut off the
            number of days, the one thing the banner is for. */}
        <span className="min-w-0 flex-1 leading-snug">
          <span className="font-medium" style={{ color: palette.text === '#991B1B' ? '#FFC4C0' : undefined }}>
            {message}
          </span>{' '}
          <span className="hidden text-white/60 sm:inline">
            {isTr ? 'Aboneliğe geç, kesintisiz devam et.' : 'Upgrade to keep going.'}
          </span>
        </span>
        <Link
          href={`/${locale}/pricing`}
          className="inline-flex h-10 shrink-0 items-center rounded-full bg-white px-5 text-[14px] font-medium text-pn-accent transition-colors hover:bg-pn-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {isTr ? 'Yükselt' : 'Upgrade'}
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label={isTr ? 'Uyarıyı kapat' : 'Dismiss notice'}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
