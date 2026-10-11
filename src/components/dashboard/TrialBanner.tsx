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
        cta: '#0A0A0A',
        ctaText: '#FFFFFF',
      }
    : {
        bg: '#FFFBEB',
        border: '#FDE68A',
        text: '#92400E',
        cta: '#0A0A0A',
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
    <div
      role="status"
      aria-live="polite"
      className="legal-print-hide flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b text-[13px] font-medium"
      style={{ background: palette.bg, borderColor: palette.border, color: palette.text }}
    >
      <Crown size={14} strokeWidth={2.2} className="shrink-0" />
      {/* Wraps instead of truncating: on a phone the ellipsis cut off the
          number of days, the one thing the banner is for. */}
      <span className="min-w-0 flex-1 leading-snug">
        {message}{' '}
        <span className="hidden sm:inline opacity-80">
          {isTr ? 'Aboneliğe geç, kesintisiz devam et.' : 'Upgrade to keep going.'}
        </span>
      </span>
      <Link
        href={`/${locale}/pricing`}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-1"
        style={{ background: palette.cta, color: palette.ctaText }}
      >
        {isTr ? 'Yükselt' : 'Upgrade'}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={isTr ? 'Uyarıyı kapat' : 'Dismiss notice'}
        className="bz-btn-icon shrink-0"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
