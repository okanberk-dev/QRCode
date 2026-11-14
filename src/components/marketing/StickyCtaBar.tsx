'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface Props {
  locale: 'tr' | 'en';
  /** Scroll distance (px) before the bar appears. */
  threshold?: number;
}

const DESKTOP_QUERY = '(min-width: 1024px)';
const DISMISS_KEY = 'buaze.sticky.dismissed';

/**
 * Desktop-only trial reminder pinned to the bottom of the viewport.
 *
 * - Shows from `lg` up only: below that the floating MobileBottomNav already
 *   carries the trial CTA, and both would overlap at 768–1023 px.
 * - Appears after `threshold` px of scrolling, hides while the site footer is
 *   on screen (so it never covers the legal links or cookie preferences),
 *   and stays dismissed for the session.
 * - Broadcasts `buaze:sticky-cta-visibility` so ContactFloat can move above
 *   it; the event reports what is really on screen.
 * - A plain sentence and one button — no heading element, no looping
 *   animation.
 */
export default function StickyCtaBar({ locale, threshold = 600 }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [footerInView, setFooterInView] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isTr = locale === 'tr';
  const visible = desktop && scrolled && !footerInView && !dismissed;

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch {
      /* storage blocked: the bar can be dismissed for this page only */
    }
  }, []);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);

  useEffect(() => {
    const footer = document.getElementById('site-footer') ?? document.querySelector('footer');
    if (!footer || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      setFooterInView(Boolean(entries[entries.length - 1]?.isIntersecting));
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('buaze:sticky-cta-visibility', { detail: { visible } }));
    return () => {
      window.dispatchEvent(
        new CustomEvent('buaze:sticky-cta-visibility', { detail: { visible: false } }),
      );
    };
  }, [visible]);

  const onDismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* storage blocked */
    }
    setDismissed(true);
    // Synchronous notice so ContactFloat moves down in the same frame.
    window.dispatchEvent(new CustomEvent('buaze:sticky-cta-visibility', { detail: { visible: false } }));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 hidden animate-slide-in border-t border-white/10 bg-[#0A0A0A] text-white shadow-[0_-18px_48px_-30px_rgba(0,0,0,0.55)] lg:block"
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center gap-6 px-10 py-3.5">
        <p className="m-0 flex-1 text-[17px] font-medium leading-[1.35] tracking-[-0.01em] text-white">
          {isTr
            ? 'QR geri bildirim akışınızı 14 gün ücretsiz deneyin'
            : 'Try the QR feedback flow free for 14 days'}
        </p>
        <Link
          href={`/${locale}/auth/register`}
          rel="nofollow"
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-full bg-[#C6F24E] px-6 text-[15px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#A8D62E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
        >
          {isTr ? 'Ücretsiz deneyin' : 'Start free trial'}
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={isTr ? 'Bu çubuğu kapat' : 'Dismiss this bar'}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E]"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
