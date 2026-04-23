'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface Props {
  locale: 'tr' | 'en';
  /** Scroll threshold before the bar appears. Matches site-premium.jsx: 600px. */
  threshold?: number;
}

/**
 * Conversion layer — sticky CTA bar at the bottom of the viewport. Appears
 * once the user has scrolled past `threshold` pixels, can be dismissed for
 * the session via `sessionStorage`. Mirrors `ConversionLayer` in
 * `.design/site/site-premium.jsx` (line 301).
 */
export default function StickyCtaBar({ locale, threshold = 600 }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isTr = locale === 'tr';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('buaze.sticky.dismissed') === '1') {
      setDismissed(true);
      return;
    }
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const onDismiss = () => {
    sessionStorage.setItem('buaze.sticky.dismissed', '1');
    setDismissed(true);
  };

  if (dismissed || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-slide-in border-t border-[#1F1F1F] bg-[#0A0A0A] text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:justify-between sm:px-10 sm:py-3.5">
        <div className="text-center sm:text-left">
          <p className="text-[15px] font-medium tracking-tight sm:text-[17px]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
            {isTr ? 'Bugün başla, ilk yorumunu yarın al.' : 'Start today, see your first review tomorrow.'}
          </p>
          <p className="mt-0.5 text-[11px] text-[#737373] sm:text-[12px]">
            {isTr
              ? '14 gün ücretsiz · Kredi kartı gerekmez · İstediğin zaman iptal et'
              : '14-day free trial · No credit card · Cancel anytime'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${locale}/auth/register`}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#C6F24E] px-5 py-2.5 text-[13px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] sm:text-[14px]"
          >
            {isTr ? 'Ücretsiz başla' : 'Start free'} →
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={isTr ? 'Kapat' : 'Dismiss'}
            className="rounded-full p-2 text-[#737373] transition-colors hover:bg-white/5 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
