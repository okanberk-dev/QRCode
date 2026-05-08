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
 * Stage 79 §38.157 — kullanıcı talebi: meta row tamamen silindi
 * ("İstediğin zaman iptal" + "Kart gerekmez" UX clutter); headline lime
 * highlight tüm "ilk yorumunu yarın al." cümlesini kapsayacak şekilde
 * solid lime marker'a çevrildi (eski yarı-band gradient'ten); padding
 * + CTA height + headline scale daraltıldı (UX kompakt deneyim).
 *
 * - HUGE italic Space Grotesk headline + solid lime highlight marker
 *   (Stage 79: full-coverage; eski transparent 60-92% gradient yarı-band).
 * - Lime CTA button + shine animation + arrow icon.
 * - Lime aura sweep (radial gradient 320×160 blur) + hairline pulse
 *   (linear-gradient sweep), 8 yeni keyframe globals.css'te (scbDot/
 *   scbPulse/scbRing/scbHair/scbSweep/scbShine/scbWave/scbBlink).
 *
 * Compliance disipline (CLAUDE.md §35.8 + §35.10 + §19.1.1):
 * - Avatar stack (M/A/K initials) + "312 ŞUBE BU AY" social proof
 *   block KALDIRILDI (fake testimonial avatars + verifiable false
 *   cohort claim — Buaze gerçek müşteri 10-50 §19.4.4).
 * - Eyebrow + meta row Stage 79 tamamen kaldırıldı (kullanıcı talebi
 *   "yeni 14 gün ücretsiz yazısı olmasın altta ve üstte" Stage 61
 *   §38.142 + Stage 79 §38.157 finalize).
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

  // Stage 79 §38.157 — Lime highlight tüm cümleyi kapsasın (kullanıcı
  // talebi: "ilk yorumunu yarın al. cümlesinin yarısı lime arka plan
  // rengi onun tamamını gösterir yap"). Eski transparent 60-92% gradient
  // yarı-band marker idi (sadece bottom 32% lime); şimdi solid lime
  // background tüm text yüksekliğini kaplıyor + minimal border-radius +
  // generous horizontal padding (sticker visual). Pulse §11 hex intact.
  const limeHighlight: React.CSSProperties = {
    background: '#C6F24E',
    color: '#0A0A0A',
    padding: '0.05em 0.35em',
    borderRadius: 4,
    boxDecorationBreak: 'clone',
    WebkitBoxDecorationBreak: 'clone',
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
        className="relative z-[1] mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-3.5 md:gap-8"
        style={{
          paddingLeft: 'max(1.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(1.5rem, env(safe-area-inset-right))',
        }}
      >
        {/* LEFT: headline only (Stage 79 §38.157 — meta row + eyebrow
            tamamen silindi: "İstediğin zaman iptal" + "Kart gerekmez" UX
            clutter, kullanıcı talebi). Lime highlight solid marker tüm
            cümleyi kapsar (eski yarı-band gradient yerine). */}
        <h3
          className="m-0 flex-1 text-white"
          style={{
            fontFamily: 'var(--font-heading)',
            fontStyle: 'italic',
            fontSize: 'clamp(17px, 2vw, 26px)',
            lineHeight: 1.15,
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

        {/* CENTER: lime CTA — shine animation + arrow icon. Stage 79
            §38.157 — h-14 → h-12 daralt + px-7 → px-6 (kompakt UX).
            HANDOFF avatar stack + 312 ŞUBE BU AY social proof block
            KASITLI silindi (fake testimonial + verifiable false cohort
            claim — CLAUDE.md §35.8 + §35.10 + §19.1.1 disipline). */}
        <Link
          href={`/${locale}/auth/register`}
          className="relative inline-flex h-12 shrink-0 items-center gap-2.5 overflow-hidden rounded-full px-6"
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

        {/* RIGHT: dismiss button — minimal outline (Stage 79 §38.157
            kompakt: h-9 w-9 → h-8 w-8). */}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={isTr ? 'Kapat' : 'Dismiss'}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-transparent transition-colors hover:bg-white/5"
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
