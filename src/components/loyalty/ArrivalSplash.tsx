'use client';

// Arrival screen of a QR scan or NFC tap (CLAUDE.md §61). Branded, full
// screen, one tap: the tap unlocks sound (browsers allow audio only after a
// touch), plays the welcome chime + a short vibration, and the screen
// closes into the point that was touched. Without a tap it fades away after
// a few seconds, silently. Hidden entirely under prefers-reduced-motion.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Hand, Nfc, ScanLine, Volume2, VolumeX } from 'lucide-react';
import { haptic, isSoundOn, playSound, setSoundOn, soundSupported, unlockAudio } from '@/lib/loyalty-sound';

const AUTO_CLOSE_MS = 7000;
const EXIT_MS = 760;

export default function ArrivalSplash({
  locale,
  mode,
  source,
  businessName,
  logoUrl,
  coverUrl,
  band,
  onBand,
  accent,
  firstName,
  headline,
}: {
  locale: 'tr' | 'en';
  /** `join`: first visit; `card`: a returning customer's card. */
  mode: 'join' | 'card';
  source: 'qr' | 'nfc' | 'link';
  businessName: string;
  logoUrl: string | null;
  coverUrl: string | null;
  band: string;
  onBand: string;
  accent: string;
  firstName?: string | null;
  headline?: string | null;
}) {
  const tr = locale === 'tr';
  const [open, setOpen] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [sound, setSound] = useState(true);
  const [audioOk, setAudioOk] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((withSound: boolean, x?: number, y?: number) => {
    if (leaving) return;
    if (withSound) {
      unlockAudio();
      playSound(mode === 'join' ? 'welcome' : 'card');
      haptic([10, 40, 18]);
    }
    const el = rootRef.current;
    if (el && x !== undefined && y !== undefined) {
      el.style.setProperty('--bzl-x', `${x}px`);
      el.style.setProperty('--bzl-y', `${y}px`);
    }
    setLeaving(true);
    window.setTimeout(() => setOpen(false), EXIT_MS);
  }, [leaving, mode]);

  useEffect(() => {
    // CSS hides the screen under reduced motion; drop it without locking scroll.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setOpen(false);
      return;
    }
    setSound(isSoundOn());
    setAudioOk(soundSupported());
    buttonRef.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = window.setTimeout(() => close(false), AUTO_CLOSE_MS);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = prev;
    };
    // close is stable enough for the timer; run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) document.body.style.overflow = '';
  }, [open]);

  if (!open) return null;

  const initial = businessName.trim().charAt(0).toLocaleUpperCase(tr ? 'tr-TR' : 'en-GB') || 'B';
  // Tile and button stand out from the band: the band's own text colour as
  // background, the band colour as ink (white on dark brands, graphite on light).
  const chipBg = coverUrl ? '#FFFFFF' : onBand;
  const chipInk = coverUrl ? '#0A0A0A' : band;
  const title =
    mode === 'card'
      ? firstName
        ? tr
          ? `Tekrar hoş geldiniz, ${firstName}`
          : `Welcome back, ${firstName}`
        : tr
          ? 'Kartınız hazır'
          : 'Your card is ready'
      : headline || (tr ? 'Sadakat kartınıza hoş geldiniz' : 'Welcome to your loyalty card');
  const sourceLabel =
    source === 'nfc' ? (tr ? 'NFC ile bağlandınız' : 'Connected by NFC') : tr ? 'QR kod okundu' : 'QR code scanned';

  return (
    <div
      ref={rootRef}
      data-leaving={leaving ? 'true' : 'false'}
      className="bzl-splash bzl-tap fixed inset-0 z-[90] flex flex-col overflow-hidden"
      style={{ background: band, color: onBand }}
      onPointerUp={(e) => close(true, e.clientX, e.clientY)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close(false);
      }}
    >
      {/* Background: blurred cover photo or a slow aurora of the brand colour. */}
      {coverUrl ? (
        <>
          { }
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl" aria-hidden="true" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.7))' }} aria-hidden="true" />
        </>
      ) : (
        <div className="absolute inset-0" aria-hidden="true">
          <div
            className="bzl-aurora absolute -left-1/4 -top-1/4 h-[80vh] w-[80vh] rounded-full opacity-60 blur-3xl"
            style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 65%)` }}
          />
          <div
            className="bzl-aurora absolute -bottom-1/4 -right-1/4 h-[70vh] w-[70vh] rounded-full opacity-40 blur-3xl [animation-delay:-6s]"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, transparent 60%)' }}
          />
        </div>
      )}

      <div
        className="relative flex flex-1 flex-col items-center justify-center px-6 text-center"
        style={{
          paddingTop: 'max(24px, env(safe-area-inset-top))',
          color: coverUrl ? '#FFFFFF' : onBand,
        }}
      >
        <p
          className="bzl-rise mb-8 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium backdrop-blur-md"
          style={{ background: 'rgba(255,255,255,0.16)', animationDelay: '120ms' }}
        >
          {source === 'nfc' ? <Nfc size={14} aria-hidden="true" /> : <ScanLine size={14} aria-hidden="true" />}
          {sourceLabel}
        </p>

        <div className="relative flex h-[132px] w-[132px] items-center justify-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="bzl-ripple absolute inset-0 rounded-[38px] border-2"
              style={{ borderColor: 'rgba(255,255,255,0.55)', animationDelay: `${i * 0.8}s` }}
            />
          ))}
          <div
            className="bzl-pop relative flex h-[112px] w-[112px] items-center justify-center overflow-hidden rounded-[32px] text-[46px] font-semibold shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]"
            style={{ background: logoUrl ? '#FFFFFF' : chipBg, color: chipInk, fontFamily: 'var(--font-space-grotesk), var(--font-inter), sans-serif' }}
          >
            {logoUrl ? (
               
              <img src={logoUrl} alt="" className="h-full w-full object-contain p-2" />
            ) : (
              <span aria-hidden="true">{initial}</span>
            )}
          </div>
        </div>

        <p
          role="heading"
          aria-level={2}
          className="bzl-rise mt-8 max-w-[340px] text-[32px] font-semibold leading-[1.05] tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-space-grotesk), var(--font-inter), system-ui, sans-serif', animationDelay: '220ms' }}
        >
          {businessName}
        </p>
        <p className="bzl-rise mt-3 max-w-[320px] text-[16px] leading-snug opacity-85" style={{ animationDelay: '320ms' }}>
          {title}
        </p>
      </div>

      <div
        className="relative flex flex-col items-center gap-3 px-6"
        style={{ paddingBottom: 'max(28px, calc(env(safe-area-inset-bottom) + 20px))', color: coverUrl ? '#FFFFFF' : onBand }}
      >
        <button
          ref={buttonRef}
          type="button"
          onClick={(e) => {
            // Keyboard activation (Enter / Space) arrives as a click with no pointer.
            if (e.detail === 0) close(true);
          }}
          className="bzl-breathe flex h-[84px] w-[84px] items-center justify-center rounded-full shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/60"
          style={{ background: chipBg, color: chipInk }}
          aria-label={tr ? 'Devam etmek için dokunun' : 'Tap to continue'}
        >
          <Hand size={32} aria-hidden="true" />
        </button>
        <p className="text-[15px] font-semibold">{tr ? 'Devam etmek için dokunun' : 'Tap to continue'}</p>
        {audioOk && (
          <span
            role="switch"
            aria-checked={sound}
            tabIndex={0}
            onPointerUp={(e) => {
              e.stopPropagation();
              const next = !sound;
              setSound(next);
              setSoundOn(next);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                const next = !sound;
                setSound(next);
                setSoundOn(next);
              }
            }}
            className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium opacity-80"
            style={{ background: 'rgba(255,255,255,0.14)' }}
          >
            {sound ? <Volume2 size={14} aria-hidden="true" /> : <VolumeX size={14} aria-hidden="true" />}
            {sound ? (tr ? 'Sesli karşılama açık' : 'Sound on') : tr ? 'Ses kapalı' : 'Sound off'}
          </span>
        )}
      </div>
    </div>
  );
}
