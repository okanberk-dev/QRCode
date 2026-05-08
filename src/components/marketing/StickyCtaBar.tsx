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
 * Conversion layer — sticky CTA bar at the bottom of the viewport.
 *
 * Stage 57 §38.138 — HANDOFF premium editorial redesign.
 * - HUGE italic Space Grotesk headline + lime highlight (CSS gradient trick).
 * - Pulse-dot eyebrow (compliance-safe: "YENİ · 14 GÜN ÜCRETSİZ DENEME"
 *   — HANDOFF "İLK 50 ŞUBEYE %30 İNDİRİM" promotion claim verifiable
 *   olmadığı için generic Pulse promise'a çevrildi).
 * - Meta row: 14 gün ücretsiz / Kart gerekmez / İstediğin zaman iptal
 *   (HANDOFF birebir, Buaze pricing'inde verifiable).
 * - Lime CTA button + shine animation + arrow icon.
 * - Lime aura sweep (radial gradient 320×160 blur) + hairline pulse
 *   (linear-gradient sweep), 8 yeni keyframe globals.css'te (scbDot/
 *   scbPulse/scbRing/scbHair/scbSweep/scbShine/scbWave/scbBlink).
 *
 * Compliance disipline (CLAUDE.md §35.8 + §35.10 + §19.1.1):
 * - Avatar stack (M/A/K initials) + "312 ŞUBE BU AY" social proof
 *   block KALDIRILDI (fake testimonial avatars + verifiable false
 *   cohort claim — Buaze gerçek müşteri 10-50 §19.4.4).
 * - Promotion eyebrow generic "14 GÜN ÜCRETSİZ DENEME" (verifiable).
 *
 * Backend kontrat intact:
 * - sessionStorage dismiss (`buaze.sticky.dismissed`)
 * - Scroll threshold 600px (HANDOFF default + mevcut Buaze paterni)
 * - `buaze:sticky-cta-visibility` CustomEvent dispatcher (ContactFloat
 *   positioning için)
 *
 * Mobile: `hidden md:block` intact (mobile'da MobileBottomNav §38.43
 * zaten bottom CTA sağlıyor; sticky CTA bar md+ desktop only).
 */
export default function StickyCtaBar({ locale, threshold = 600 }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isTr = locale === 'tr';
  const stickyVisible = !dismissed && visible;

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('buaze:sticky-cta-visibility', {
        detail: { visible: stickyVisible },
      }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent('buaze:sticky-cta-visibility', {
          detail: { visible: false },
        }),
      );
    };
  }, [stickyVisible]);

  const onDismiss = () => {
    sessionStorage.setItem('buaze.sticky.dismissed', '1');
    setDismissed(true);
  };

  if (!stickyVisible) return null;

  // Lime highlight gradient — HANDOFF spec birebir CSS trick
  // (transparent 60% → lime 60-92% → transparent 92%) son satıra
  // marker visual oluşturur.
  const limeHighlight: React.CSSProperties = {
    background:
      'linear-gradient(180deg, transparent 60%, #C6F24E 60%, #C6F24E 92%, transparent 92%)',
    color: '#0A0A0A',
    padding: '0 6px',
  };

  return (
    <div
      className="hidden md:block fixed inset-x-0 bottom-0 z-40 animate-slide-in overflow-hidden border-t bg-[#0A0A0A] text-white"
      style={{
        borderTopColor: 'rgba(198,242,78,0.18)',
        boxShadow: '0 -18px 48px -30px rgba(0,0,0,0.55)',
      }}
    >
      {/* Lime aura sweep — radial gradient, blur(20px), 9s ease-in-out
          infinite slide. Decorative-only, pointer-events:none. */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: -50,
          left: '38%',
          width: 320,
          height: 160,
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, rgba(198,242,78,0.18) 0%, rgba(198,242,78,0) 70%)',
          filter: 'blur(20px)',
          animation: 'scbSweep 9s ease-in-out infinite',
        }}
      />

      {/* Hairline pulse — top edge'de ince lime sweep gradient
          (transparent → lime → transparent), 5s linear infinite. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, #C6F24E 50%, transparent 100%)',
          opacity: 0.5,
          animation: 'scbHair 5s linear infinite',
        }}
      />

      <div
        className="relative z-[1] mx-auto grid max-w-[1440px] items-center gap-8 px-6 py-5 md:grid-cols-[1fr_auto_auto] md:gap-9"
        style={{
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
        }}
      >
        {/* LEFT: copy block — headline + minimal meta (compact).
            Stage 61 §38.142 — kullanıcı talebi: "yeni 14 gün ücretsiz
            yazısı olmasın altta ve üstte". Eyebrow ("YENİ · 14 GÜN
            ÜCRETSİZ DENEME") + meta'daki duplicate "14 gün ücretsiz"
            item silindi. Kalan 2 trust item (Kart gerekmez + İptal
            anytime) verifiable claim olarak intact (CLAUDE.md §35.8). */}
        <div className="flex flex-col gap-2">
          {/* Headline — italic Space Grotesk (synthetic italic, CLAUDE.md
              §38.112 paterni reuse) + lime highlight on second clause. */}
          <h3
            className="m-0 text-white"
            style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              fontSize: 'clamp(20px, 2.4vw, 30px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              fontWeight: 400,
            }}
          >
            {isTr ? (
              <>
                Bugün başla, <span style={limeHighlight}>ilk yorumunu yarın al.</span>
              </>
            ) : (
              <>
                Start today, get your first <span style={limeHighlight}>review tomorrow.</span>
              </>
            )}
          </h3>

          {/* Meta row — 2 verifiable trust items (lime check + mono).
              "14 gün ücretsiz" item Stage 61 §38.142 ile silindi
              (kullanıcı talebi: "yeni 14 gün ücretsiz yazısı olmasın
              altta ve üstte"). */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
            {[
              isTr ? 'Kart gerekmez' : 'No card required',
              isTr ? 'İstediğin zaman iptal' : 'Cancel anytime',
            ].map((label) => (
              <div key={label} className="inline-flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 14 14" className="shrink-0" aria-hidden>
                  <circle cx="7" cy="7" r="6" fill="#C6F24E" />
                  <path
                    d="M4 7l2 2 4-4"
                    stroke="#0A0A0A"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  className="pulse-eyebrow"
                  style={{
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    textTransform: 'none',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: lime CTA — shine animation + arrow icon.
            HANDOFF avatar stack + 312 ŞUBE BU AY social proof block
            KASITLI silindi (fake testimonial + verifiable false cohort
            claim — CLAUDE.md §35.8 + §35.10 + §19.1.1 disipline). */}
        <Link
          href={`/${locale}/auth/register`}
          className="relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full px-7"
          style={{
            background: '#C6F24E',
            color: '#0A0A0A',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            boxShadow:
              '0 14px 40px -12px rgba(198,242,78,0.7), inset 0 -2px 0 rgba(0,0,0,0.08)',
          }}
        >
          {/* Shine sweep — linear-gradient 110deg, 3.6s ease-in-out
              infinite. Pointer-events:none, decorative. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
              animation: 'scbShine 3.6s ease-in-out infinite',
            }}
          />
          <span className="relative z-[1]">
            {isTr ? 'ÜCRETSİZ BAŞLA' : 'START FREE'}
          </span>
          <svg
            width="14"
            height="11"
            viewBox="0 0 14 11"
            className="relative z-[1]"
            aria-hidden
          >
            <path
              d="M1 5.5h12m-4-4l4 4-4 4"
              stroke="#0A0A0A"
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        {/* RIGHT: dismiss button — minimal outline, hover white-12 border. */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={isTr ? 'Kapat' : 'Dismiss'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-transparent transition-colors hover:bg-white/5"
          style={{
            borderColor: 'rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <X size={11} />
        </button>
      </div>
    </div>
  );
}
