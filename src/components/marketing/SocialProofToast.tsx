'use client';

import { useEffect, useState } from 'react';

interface Toast {
  biz: string;
  city: string;
  action: string;
}

interface Props {
  locale: 'tr' | 'en';
  /** Delay before the first toast appears (ms). */
  initialDelay?: number;
  /** Visibility duration per toast (ms). */
  visibleMs?: number;
  /** Gap between toasts (ms). */
  intervalMs?: number;
}

const TOASTS_TR: Toast[] = [
  { biz: 'Kadıköy Bistro', city: 'İstanbul', action: 'az önce 14 günlük denemeye başladı' },
  { biz: 'Hotel Nora', city: 'Bodrum', action: 'bu ay 284 yeni yorum topladı' },
  { biz: 'Derma+ Klinik', city: 'Ankara', action: 'Google puanını 4.9\'a yükseltti' },
  { biz: 'Ark Kahve', city: 'Beşiktaş', action: 'şimdi kaydoldu' },
  { biz: 'Ren Spa', city: 'Nişantaşı', action: 'Yemeksepeti entegrasyonunu aktifleştirdi' },
];

const TOASTS_EN: Toast[] = [
  { biz: 'Kadıköy Bistro', city: 'Istanbul', action: 'just started a 14-day trial' },
  { biz: 'Hotel Nora', city: 'Bodrum', action: 'collected 284 new reviews this month' },
  { biz: 'Derma+ Clinic', city: 'Ankara', action: 'lifted their Google rating to 4.9' },
  { biz: 'Ark Coffee', city: 'Beşiktaş', action: 'just signed up' },
  { biz: 'Ren Spa', city: 'Nişantaşı', action: 'activated Yemeksepeti integration' },
];

/**
 * Rotating social-proof toast, bottom-left. Shows once after `initialDelay`,
 * stays for `visibleMs`, then cycles every `intervalMs`. Hides when the user
 * dismisses it (session-scoped).
 *
 * Mirrors `ConversionLayer` toast logic in `.design/site/site-premium.jsx`
 * (line 301).
 */
export default function SocialProofToast({
  locale,
  initialDelay = 3000,
  visibleMs = 4200,
  intervalMs = 8000,
}: Props) {
  const [current, setCurrent] = useState<Toast | null>(null);
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [blockedBySticky, setBlockedBySticky] = useState(false);
  const [resumeKey, setResumeKey] = useState(0);
  const toasts = locale === 'tr' ? TOASTS_TR : TOASTS_EN;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem('buaze.toast.dismissed') === '1') {
      setDismissed(true);
      return;
    }

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let nextTimer: ReturnType<typeof setTimeout> | null = null;

    const show = () => {
      setIdx((i) => {
        const next = i % toasts.length;
        setCurrent(toasts[next]);
        return i + 1;
      });
      hideTimer = setTimeout(() => setCurrent(null), visibleMs);
      nextTimer = setTimeout(show, intervalMs);
    };

    const initTimer = setTimeout(show, initialDelay);

    return () => {
      clearTimeout(initTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (nextTimer) clearTimeout(nextTimer);
    };
  }, [toasts, initialDelay, visibleMs, intervalMs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStickyVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ visible?: boolean }>;
      const isVisible = Boolean(customEvent.detail?.visible);
      setBlockedBySticky(isVisible);
      if (!isVisible) {
        setResumeKey((currentKey) => currentKey + 1);
      }
    };

    window.addEventListener('buaze:sticky-cta-visibility', handleStickyVisibility as EventListener);
    return () => {
      window.removeEventListener(
        'buaze:sticky-cta-visibility',
        handleStickyVisibility as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (dismissed || blockedBySticky || resumeKey === 0) return;

    const fallbackToast =
      current ?? toasts[(Math.max(idx - 1, 0)) % toasts.length] ?? toasts[0];

    if (!fallbackToast) return;

    setCurrent(fallbackToast);
    const hideTimer = setTimeout(() => setCurrent(null), visibleMs);
    return () => clearTimeout(hideTimer);
  }, [blockedBySticky, current, dismissed, idx, resumeKey, toasts, visibleMs]);

  const onDismiss = () => {
    sessionStorage.setItem('buaze.toast.dismissed', '1');
    setDismissed(true);
    setCurrent(null);
  };

  if (dismissed || !current || blockedBySticky) return null;

  return (
    <div
      className="fixed bottom-6 left-6 z-30 hidden max-w-[360px] animate-slide-in items-start gap-3 rounded-2xl border border-[#EDEDED] bg-white px-4 py-3 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.2)] sm:flex"
      role="status"
      aria-live="polite"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[15px] font-semibold text-[#0A0A0A]"
        style={{ fontFamily: 'var(--font-space-grotesk)' }}
      >
        {current.biz.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#0A0A0A]" style={{ fontFamily: 'var(--font-space-grotesk)' }}>
          {current.biz}
        </p>
        <p className="mt-0.5 text-[11px] leading-tight text-[#737373]">
          {current.city} · {current.action}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="pulse-eyebrow shrink-0 text-[#A3A3A3] transition-colors hover:text-[#0A0A0A]"
        aria-label={locale === 'tr' ? 'Bildirimleri kapat' : 'Dismiss notifications'}
      >
        {locale === 'tr' ? 'ŞİMDİ' : 'NOW'}
      </button>
    </div>
  );
}
