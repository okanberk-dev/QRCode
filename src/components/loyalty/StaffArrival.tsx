'use client';

// Staff mode arrival (CLAUDE.md §61): a panel user scanned a customer's card
// with the phone's camera. A short "card read" moment — the viewfinder
// locks in, a check draws, the customer's name rises — then the counter.
// Server-rendered so it covers the page from the first paint; fades out by
// itself (CSS, ~1.5 s) even without JavaScript; a tap skips it. Never shown
// under prefers-reduced-motion. Silent: browsers allow sound only after a
// tap, and the counter's first tap unlocks it.
import { useEffect, useState } from 'react';
import { unlockAudio } from '@/lib/loyalty-sound';

const SHOW_MS = 1500;
const CORNER = 'absolute h-9 w-9 border-[#C6F24E]';

export default function StaffArrival({
  locale,
  customerName,
  code,
}: {
  locale: 'tr' | 'en';
  customerName: string | null;
  code: string;
}) {
  const tr = locale === 'tr';
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShow(false);
      return;
    }
    const timer = window.setTimeout(() => setShow(false), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div
      className="bzl-staff-arrival bzl-tap fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#0A0A0A] px-6 text-center text-white"
      onPointerUp={() => {
        unlockAudio();
        setShow(false);
      }}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-[150px] w-[150px]" aria-hidden="true">
        <div className="bzl-lock absolute inset-0">
          <span className={`${CORNER} left-0 top-0 rounded-tl-[26px] border-l-4 border-t-4`} />
          <span className={`${CORNER} right-0 top-0 rounded-tr-[26px] border-r-4 border-t-4`} />
          <span className={`${CORNER} bottom-0 left-0 rounded-bl-[26px] border-b-4 border-l-4`} />
          <span className={`${CORNER} bottom-0 right-0 rounded-br-[26px] border-b-4 border-r-4`} />
        </div>
        {/* Glow as its own soft layer: a box-shadow on the scaling disc smears into a square on some GPUs. */}
        <span className="bzl-fade absolute inset-[6px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(198,242,78,0.34) 0%, rgba(198,242,78,0) 68%)' }} />
        <span className="bzl-pop absolute inset-[34px] flex items-center justify-center rounded-full bg-[#C6F24E]">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path className="bzl-draw" d="M5 12.5l4.2 4.2L19 7" stroke="#0A0A0A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <p className="bzl-rise mt-9 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#C6F24E]" style={{ animationDelay: '120ms' }}>
        {tr ? 'Kasa modu' : 'Staff mode'}
      </p>
      <p
        className="bzl-rise mt-2 text-[28px] font-semibold leading-tight tracking-[-0.02em]"
        style={{ fontFamily: 'var(--font-heading)', animationDelay: '200ms' }}
      >
        {tr ? 'Kart okundu' : 'Card read'}
      </p>
      <p className="bzl-rise mt-2 text-[15px] text-white/70" style={{ animationDelay: '280ms' }}>
        {customerName ? `${customerName} · ` : ''}
        <span className="font-mono tracking-[0.12em]">{code}</span>
      </p>
    </div>
  );
}
