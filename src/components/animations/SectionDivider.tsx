'use client';

/**
 * SectionDivider — editorial "Echo" divider between landing sections.
 *
 * 4 generic Buaze platform moments crossfade through center stage with
 * quiet supporting motion. Big italic serif quote marks (decorative,
 * desktop only) + lime corner glows + traveling pulse line + pagination
 * dots + live indicator (compliance-safe replacement for "1,2M YORUM"
 * counter, §38.148 paterni reuse).
 *
 * Compliance disipline (CLAUDE.md §35.10 + §35.8 + §19.1.1, Stage 49→72
 * zincirinde 9+ kez confirme): 4 hardcoded fake müşteri ismi + spesifik
 * claim'ler ("3.6→4.7 puan" / "müşteriyi kapıdan çıkmadan kazandık")
 * jenerik Buaze platform manifesto'larına çevrildi. Avatar "b" Buaze
 * brand mark (PII-safe). Stars decorative 5★ (Buaze brand reinforcement,
 * semantic rating claim DEĞİL).
 *
 * Pulse §11 disipline: synthetic italic Space Grotesk
 * (`fontFamily: 'var(--font-heading)' + fontStyle: 'italic'`, CLAUDE.md
 * §38.112 cookie banner + §38.122 hero + §38.146 primitive paterni reuse).
 * Instrument Serif italic YASAK (kullanıcı kararı §38.114 "Asla pivot
 * etme" intact).
 *
 * Animation: in 700ms → hold 4400ms → out 600ms → swap (5700ms toplam
 * loop). framer-motion `useReducedMotion` reduced motion altında static
 * (ilk moment görünür). Page Visibility API: tab gizliyken interval
 * pause (battery save, CLAUDE.md §5.1 paterni).
 *
 * Mobile responsive: clamp() font scale + flex stack header (top
 * kicker absolute corners → mobile inline row) + decorative serif quote
 * marks `hidden sm:block` (small viewport'ta gizli).
 */

import * as React from 'react';
import { useReducedMotion } from 'framer-motion';
import StarRow from '@/components/ui/StarRow';

interface SectionDividerProps {
  locale: 'tr' | 'en';
}

interface Moment {
  text: string;
  label: string;
  role: string;
  /** Words inside the quote that should receive a lime underline accent. */
  accents: string[];
}

export default function SectionDivider({ locale }: SectionDividerProps) {
  const isTr = locale === 'tr';
  const prefersReducedMotion = useReducedMotion();

  // Compliance-safe: 4 generic Buaze platform manifesto'ları.
  // Fake müşteri testimonial YOK (CLAUDE.md §35.10 disipline).
  const moments: Moment[] = React.useMemo(
    () =>
      isTr
        ? [
            {
              text: 'Bir QR. Bir yorum. Bir kazanç.',
              label: 'BUAZE PANELİ',
              role: 'İşletmenin sesi tek panelde',
              accents: ['kazanç.'],
            },
            {
              text: 'Düşük puan geldiğinde ekibiniz anında e-postayla haberdar olur.',
              label: 'ANINDA UYARI',
              role: 'Düşük puan bildirimi',
              accents: ['haberdar'],
            },
            {
              text: 'Pulse AI seçtiğiniz tonda yanıt taslağı hazırlar; son kararı siz verirsiniz.',
              label: 'BUAZE AI',
              role: 'Yapay zeka asistanı',
              accents: ['taslağı'],
            },
            {
              text: 'QR ile gelen her geri bildirim tek panelde toplanır.',
              label: 'TEK PANEL',
              role: 'Tek gelen kutusu',
              accents: ['toplanır.'],
            },
          ]
        : [
            {
              text: 'One QR. One review. One win.',
              label: 'BUAZE PANEL',
              role: 'The voice of your business',
              accents: ['win.'],
            },
            {
              text: 'When a low rating comes in, your team gets an e-mail right away.',
              label: 'INSTANT ALERT',
              role: 'Low-rating alert',
              accents: ['e-mail'],
            },
            {
              text: 'Pulse AI drafts replies in the tone you choose; you make the final call.',
              label: 'BUAZE AI',
              role: 'AI assistant',
              accents: ['drafts'],
            },
            {
              text: 'Every piece of QR feedback in one searchable inbox.',
              label: 'ONE INBOX',
              role: 'One inbox',
              accents: ['inbox.'],
            },
          ],
    [isTr],
  );

  const [idx, setIdx] = React.useState(0);
  const [phase, setPhase] = React.useState<'in' | 'hold' | 'out'>('in');

  // Crossfade rotation: in 700 → hold 4400 → out 600 → swap.
  // framer-motion useReducedMotion: reduced motion altında static.
  React.useEffect(() => {
    if (prefersReducedMotion) return;

    const inMs = 700;
    const holdMs = 4400;
    const outMs = 600;

    let visibilityPaused = document.visibilityState === 'hidden';
    let cancelled = false;

    const handleVisibility = () => {
      visibilityPaused = document.visibilityState === 'hidden';
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const t1 = window.setTimeout(() => {
      if (!cancelled && !visibilityPaused) setPhase('hold');
    }, inMs);
    const t2 = window.setTimeout(() => {
      if (!cancelled && !visibilityPaused) setPhase('out');
    }, inMs + holdMs);
    const t3 = window.setTimeout(() => {
      if (!cancelled && !visibilityPaused) {
        setIdx((i) => (i + 1) % moments.length);
        setPhase('in');
      }
    }, inMs + holdMs + outMs);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [idx, moments.length, prefersReducedMotion]);

  const moment = moments[idx];

  // Phase-driven opacity + transform (reduced motion: static).
  let opacity = 1;
  let translateY = 0;
  if (!prefersReducedMotion) {
    if (phase === 'in') {
      opacity = 0;
      translateY = 14;
    }
    if (phase === 'out') {
      opacity = 0;
      translateY = -14;
    }
  }

  return (
    <section
      role="region"
      aria-label={isTr ? 'Buaze platform öne çıkanları' : 'Buaze platform highlights'}
      className="relative w-full overflow-hidden bg-[#FAFAFA]"
    >
      {/* Hairline rules (top + bottom) */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-[rgba(10,10,10,0.07)]" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-[rgba(10,10,10,0.07)]" />

      {/* Lime corner glows — barely visible */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[120px] -top-[120px] h-[320px] w-[320px]"
        style={{
          background: 'radial-gradient(circle, rgba(198,242,78,0.18) 0%, transparent 60%)',
          filter: 'blur(20px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[120px] -right-[120px] h-[320px] w-[320px]"
        style={{
          background: 'radial-gradient(circle, rgba(198,242,78,0.14) 0%, transparent 60%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Top kicker row — mobile inline; desktop absolute corners */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 sm:absolute sm:inset-x-0 sm:top-6 sm:px-8 sm:pt-0">
        {/* Left: brand kicker */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="block h-1.5 w-1.5 rounded-full bg-[#C6F24E] bz-pulse-dot"
            style={{ boxShadow: '0 0 0 4px #EAF9B8' }}
          />
          <span className="pulse-eyebrow text-[10px] text-[#737373]">
            {isTr ? 'BUAZE PLATFORMU' : 'BUAZE PLATFORM'}
          </span>
        </div>

        {/* Right: live indicator (compliance-safe — replaces "1,2M YORUM"
            counter, CLAUDE.md §38.148 AnalyticsLiveIndicator paterni reuse) */}
        <div className="flex items-center gap-2" role="status" aria-live="polite">
          <span aria-hidden className="relative block h-1.5 w-1.5 rounded-full bg-[#16A34A]">
            <span
              className="absolute inset-0 rounded-full bg-[#16A34A] bz-pulse-dot"
              style={{ opacity: 0.4 }}
            />
          </span>
          <span className="pulse-eyebrow text-[10px] text-[#737373]">
            {isTr ? 'GÜNCEL · BU SAYFA' : 'LIVE · THIS PAGE'}
          </span>
        </div>
      </div>

      {/* Center stage — Stage 136 §38.216 padding kompakt
          (kullanıcı: "componenti aşağıdan yukardan biraz küçült çok büyük
          durmasın"): mobile py-16 → py-12, sm py-24 → py-16, lg py-28 →
          py-20. Pulse §11 hierarchy korunur, sadece visual weight azaltıldı. */}
      <div className="relative flex flex-col items-center justify-center px-5 py-12 text-center sm:px-12 sm:py-16 lg:px-24 lg:py-20">
        {/* Decorative serif quote marks — desktop only */}
        <span
          aria-hidden
          className="pointer-events-none absolute hidden select-none text-[#C6F24E] sm:block"
          style={{
            top: '14%',
            left: '8%',
            fontFamily: 'var(--font-heading)',
            fontStyle: 'italic',
            fontSize: 'clamp(80px, 12vw, 180px)',
            lineHeight: 1,
            opacity: 0.35,
          }}
        >
          “
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute hidden select-none text-[#C6F24E] sm:block"
          style={{
            bottom: '6%',
            right: '8%',
            fontFamily: 'var(--font-heading)',
            fontStyle: 'italic',
            fontSize: 'clamp(80px, 12vw, 180px)',
            lineHeight: 1,
            opacity: 0.35,
          }}
        >
          ”
        </span>

        {/* Animated quote stage */}
        <div
          className="max-w-[920px]"
          style={{
            opacity,
            transform: `translateY(${translateY}px)`,
            transition: prefersReducedMotion
              ? 'none'
              : phase === 'in'
                ? 'opacity 700ms ease-out, transform 700ms cubic-bezier(0.2,0.8,0.2,1)'
                : 'opacity 600ms ease-in, transform 600ms cubic-bezier(0.6,0,0.8,0.2)',
          }}
        >
          <p
            className="m-0 text-[#0A0A0A]"
            style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              // Stage 136 §38.216 — quote font kompakt: clamp 22-44 → 20-36px,
              // section padding küçültmesiyle dengeli görsel hierarchy.
              fontSize: 'clamp(20px, 4.4vw, 36px)',
              lineHeight: 1.22,
              letterSpacing: '-0.012em',
              fontWeight: 400,
              textWrap: 'balance',
            }}
          >
            {moment.text.split(' ').map((word, i) => {
              const isAccent = moment.accents.some((a) => word.includes(a));
              return (
                <span
                  key={i}
                  className="relative mr-1.5 inline-block"
                  style={
                    isAccent
                      ? {
                          paddingBottom: 2,
                          borderBottom: '2px solid #C6F24E',
                        }
                      : undefined
                  }
                >
                  {word}
                </span>
              );
            })}
          </p>

          {/* Attribution — Stage 136 §38.216 mt-7 sm:mt-8 → mt-5 sm:mt-6 */}
          <div className="mt-5 flex items-center justify-center gap-3.5 sm:mt-6">
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#0A0A0A] sm:h-10 sm:w-10"
              style={{
                background: 'linear-gradient(135deg, #C6F24E 0%, #A8D62E 100%)',
                fontFamily: 'var(--font-heading)',
                fontStyle: 'italic',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              b
            </span>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span
                  className="text-[12px] font-semibold text-[#0A0A0A] sm:text-[13px]"
                  style={{ letterSpacing: '-0.005em' }}
                >
                  {moment.label}
                </span>
                <StarRow value={5} size={10} />
              </div>
              <span className="pulse-eyebrow mt-0.5 inline-block text-[9px] text-[#737373]">
                {moment.role}
              </span>
            </div>
          </div>
        </div>

        {/* Pagination dots — Stage 136 §38.216 mt-10 sm:mt-12 → mt-7 sm:mt-9 */}
        <div className="mt-7 flex gap-1.5 sm:mt-9">
          {moments.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="block h-1.5 rounded-full"
              style={{
                width: i === idx ? 20 : 6,
                background: i === idx ? '#0A0A0A' : 'rgba(10,10,10,0.18)',
                transition: prefersReducedMotion
                  ? 'none'
                  : 'width 500ms cubic-bezier(0.2,0.8,0.2,1), background-color 500ms cubic-bezier(0.2,0.8,0.2,1)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Subtle traveling pulse line on bottom hairline (mevcut keyframe
          bzEchoSweep, CLAUDE.md §38.123 paterni reuse — reduced-motion
          blanket §38.123 + §38.61'de zaten kapsanıyor). */}
      <div
        aria-hidden
        className="absolute -left-[15%] bottom-0 h-px w-[15%]"
        style={{
          background: 'linear-gradient(90deg, transparent, #C6F24E, transparent)',
          boxShadow: '0 0 8px #C6F24E',
          animation: 'bzEchoSweep 5.7s linear infinite',
        }}
      />
    </section>
  );
}
