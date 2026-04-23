'use client';

import { useEffect, useRef } from 'react';

interface Props {
  name: string;
  accent: string;
  logoUrl: string | null;
  durationMs?: number;
  onDone: () => void;
}

/**
 * Branded 3-second splash that appears when the menu is opened via QR scan
 * (?source=qr). Fires `onDone` after the full duration and is then unmounted
 * by the parent. The parent also cleans the URL so a refresh doesn't re-trigger.
 */
export default function MenuSplash({ name, accent, logoUrl, durationMs = 3000, onDone }: Props) {
  const doneRef = useRef(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, onDone]);

  const initial = name.trim().charAt(0).toUpperCase() || '·';

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-8 text-center"
      style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 60%, ${accent}88 100%)` }}
    >
      {/* Soft glow backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{ background: 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.25), transparent 60%)' }}
      />

      <div className="relative animate-in fade-in slide-in-from-bottom-6 duration-500">
        <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[32px] bg-white/95 shadow-2xl ring-1 ring-white/40 sm:h-32 sm:w-32">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-5xl font-extrabold tracking-tight sm:text-6xl" style={{ color: accent }}>
              {initial}
            </span>
          )}
        </div>

        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-4xl" style={{ fontFamily: 'var(--font-heading), inherit' }}>
          {name}
        </h1>
      </div>

      {/* Progress line */}
      <div className="absolute bottom-12 left-1/2 h-1 w-40 -translate-x-1/2 overflow-hidden rounded-full bg-white/25 sm:w-48">
        <span
          className="block h-full rounded-full bg-white"
          style={{ animation: `buaze-splash-fill ${durationMs}ms linear forwards` }}
        />
      </div>

      <style jsx global>{`
        @keyframes buaze-splash-fill {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
